import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { query } from '@/lib/db';
import { whatsappService } from '@/lib/services/whatsapp';
import { calculateMurojaahDebt, buildMurojaahAfternoonReminder } from '@/lib/murojaah';
import { getAuthorizationContext } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const MIN_SECRET_LENGTH = 32;

function secretsMatch(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

async function isAuthorized(request: Request): Promise<{ authorized: boolean; reason?: string }> {
  const cronSecret = process.env.CRON_SECRET;
  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
  const provided = bearer || searchParams.get('secret') || searchParams.get('key') || '';

  if (provided && cronSecret && cronSecret.length >= MIN_SECRET_LENGTH) {
    if (secretsMatch(provided, cronSecret)) {
      return { authorized: true, reason: 'cron_secret' };
    }
  }

  try {
    const authContext = await getAuthorizationContext();
    if (authContext && (authContext.roles.includes('admin') || authContext.roles.includes('musyrifah'))) {
      return { authorized: true, reason: `user_${authContext.userId}` };
    }
  } catch {
    // Ignore context error
  }

  return { authorized: false };
}

/**
 * GET/POST /api/cron/reminder-sore-murojaah
 * Triggered at 16:30 WIB (09:30 UTC)
 * Sends WhatsApp notification to thalibah who haven't completed 2 rounds today,
 * with detailed breakdown of past days' debt and total accumulated debt.
 */
export async function GET(request: Request) {
  return handleReminder(request);
}

export async function POST(request: Request) {
  return handleReminder(request);
}

async function handleReminder(request: Request) {
  try {
    const auth = await isAuthorized(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized cron/admin access' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dry_run') === 'true' || searchParams.get('test') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Fetch active Murojaah 40x participants with incomplete rounds today
    const { rows: candidates } = await query(`
      SELECT 
        p.id as progress_id,
        p.user_id,
        p.juz_code,
        p.started_at,
        p.expires_at,
        p.total_completed,
        p.status,
        p.is_reminder_active,
        u.full_name,
        u.whatsapp,
        b.name as batch_name,
        COALESCE(today_log.today_count, 0) as today_count
      FROM murojaah_40x_progress p
      JOIN users u ON u.id = p.user_id
      JOIN batches b ON b.id = p.batch_id
      LEFT JOIN (\n        SELECT progress_id, COUNT(*) as today_count
        FROM murojaah_40x_logs
        WHERE completed_at = CURRENT_DATE
        GROUP BY progress_id
      ) today_log ON today_log.progress_id = p.id
      WHERE p.status = 'active'
        AND p.total_completed < 40
        AND COALESCE(p.is_reminder_active, true) = true
        AND COALESCE(today_log.today_count, 0) < 2
        AND u.whatsapp IS NOT NULL
        AND TRIM(u.whatsapp) != ''
        -- Hanya kirim ke peserta Muroja'ah Warrior/Alumni yang sah (bukan pendaftar baru)
        AND EXISTS (
          SELECT 1 FROM pendaftaran_tikrar_tahfidz past_reg
          JOIN batches past_b ON past_b.id = past_reg.batch_id
          WHERE past_reg.user_id = p.user_id
            AND past_reg.status = 'approved'
            AND past_b.status IN ('closed', 'ongoing')
        )
      ORDER BY p.updated_at DESC
      LIMIT $1
    `, [limit]);

    const results: Array<{
      userId: string;
      fullName: string;
      phone: string;
      juzCode: string;
      debt: any;
      sent: boolean;
      error?: string;
    }> = [];

    for (const c of candidates) {
      const now = new Date();
      const expiryDate = c.expires_at ? new Date(c.expires_at) : new Date(new Date(c.started_at).getTime() + 20 * 86400000);
      const remainingTime = expiryDate.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(remainingTime / (1000 * 60 * 60 * 24)));

      const debt = calculateMurojaahDebt({
        startedAt: c.started_at,
        totalCompleted: Number(c.total_completed || 0),
        todayLogsCount: Number(c.today_count || 0),
      });

      const message = buildMurojaahAfternoonReminder({
        userName: c.full_name,
        juzCode: c.juz_code,
        todayCount: debt.todayCount,
        todayRemaining: debt.todayRemaining,
        previousDebt: debt.previousDebt,
        totalDebt: debt.totalDebt,
        currentRound: Number(c.total_completed || 0),
        daysRemaining: daysRemaining,
      });

      if (dryRun) {
        results.push({
          userId: c.user_id,
          fullName: c.full_name,
          phone: c.whatsapp,
          juzCode: c.juz_code,
          debt,
          sent: false,
        });
        continue;
      }

      // Send actual WhatsApp message via WatZap
      try {
        const sendRes = await whatsappService.sendTextMessage(c.whatsapp, message);
        results.push({
          userId: c.user_id,
          fullName: c.full_name,
          phone: c.whatsapp,
          juzCode: c.juz_code,
          debt,
          sent: sendRes.success,
          error: sendRes.error,
        });

        // Throttle 1 second to avoid rate limiting
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err: any) {
        results.push({
          userId: c.user_id,
          fullName: c.full_name,
          phone: c.whatsapp,
          juzCode: c.juz_code,
          debt,
          sent: false,
          error: err.message,
        });
      }
    }

    const successfulCount = results.filter((r) => r.sent).length;
    return NextResponse.json({
      success: true,
      mode: dryRun ? 'dry_run' : 'production',
      totalCandidates: candidates.length,
      sentCount: successfulCount,
      failedCount: results.length - successfulCount,
      results,
    });
  } catch (error: any) {
    console.error('Error in reminder-sore-murojaah cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
