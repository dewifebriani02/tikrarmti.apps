import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { getTomorrowWibDateString } from '@/lib/services/exam-reminder';
import {
  getH1PaidClassThalibahCandidates,
  getH1PaidClassUstadzahCandidates,
  sendH1PaidClassThalibahReminders,
  sendH1PaidClassUstadzahReminders,
} from '@/lib/services/paid-class-reminder';
import { getAuthorizationContext } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

// =========================================================================
// CRON ROUTE: Auto Reminder H-1 Kelas Berbayar via WhatsApp (Ustadzah & Thalibah)
// Scheduled daily via VPS crontab (e.g. 08:30 WIB / 01:30 UTC).
// Auth: `Authorization: Bearer <CRON_SECRET>` or `?secret=` or Admin/Musyrifah Session
// =========================================================================
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
    // Ignore context errors
  }

  return { authorized: false };
}

export async function GET(request: Request) {
  try {
    const auth = await isAuthorized(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized cron/admin access' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetDateParam = searchParams.get('target_date') || undefined;
    const dryRun = searchParams.get('dry_run') === 'true';
    const force = searchParams.get('force') === 'true';
    const viewCandidatesOnly = searchParams.get('view') === 'candidates';
    const targetType = (searchParams.get('type') || 'all').toLowerCase(); // 'all' | 'thalibah' | 'ustadzah'

    const targetDate = targetDateParam || getTomorrowWibDateString();

    if (viewCandidatesOnly) {
      const [thalibahCandidates, ustadzahCandidates] = await Promise.all([
        getH1PaidClassThalibahCandidates(targetDate),
        getH1PaidClassUstadzahCandidates(targetDate),
      ]);

      return NextResponse.json({
        success: true,
        target_date: targetDate,
        thalibah: {
          total: thalibahCandidates.length,
          already_sent_count: thalibahCandidates.filter(c => c.alreadySent).length,
          pending_count: thalibahCandidates.filter(c => !c.alreadySent).length,
          candidates: thalibahCandidates,
        },
        ustadzah: {
          total: ustadzahCandidates.length,
          already_sent_count: ustadzahCandidates.filter(u => u.alreadySent).length,
          pending_count: ustadzahCandidates.filter(u => !u.alreadySent).length,
          candidates: ustadzahCandidates,
        },
      });
    }

    console.log(
      `[CRON Paid Class Reminder] Processing H-1 reminder for target_date=${targetDate}, targetType=${targetType}, dryRun=${dryRun}, force=${force}`
    );

    let thalibahResult: any = null;
    let ustadzahResult: any = null;

    if (targetType === 'all' || targetType === 'ustadzah') {
      ustadzahResult = await sendH1PaidClassUstadzahReminders({
        targetDate,
        dryRun,
        force,
      });
    }

    if (targetType === 'all' || targetType === 'thalibah') {
      thalibahResult = await sendH1PaidClassThalibahReminders({
        targetDate,
        dryRun,
        force,
      });
    }

    const totalSent = (ustadzahResult?.sentCount || 0) + (thalibahResult?.sentCount || 0);
    const totalFailed = (ustadzahResult?.failedCount || 0) + (thalibahResult?.failedCount || 0);
    const totalSkipped = (ustadzahResult?.skippedCount || 0) + (thalibahResult?.skippedCount || 0);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        target_date: targetDate,
        dry_run: dryRun,
        target_type: targetType,
        total_sent: totalSent,
        total_failed: totalFailed,
        total_skipped: totalSkipped,
        ustadzah: ustadzahResult
          ? {
              total: ustadzahResult.totalClasses,
              sent: ustadzahResult.sentCount,
              failed: ustadzahResult.failedCount,
              skipped: ustadzahResult.skippedCount,
              stopped_early: Boolean(ustadzahResult.stoppedEarly),
              stop_reason: ustadzahResult.stopReason || null,
            }
          : null,
        thalibah: thalibahResult
          ? {
              total: thalibahResult.totalCandidates,
              sent: thalibahResult.sentCount,
              failed: thalibahResult.failedCount,
              skipped: thalibahResult.skippedCount,
              stopped_early: Boolean(thalibahResult.stoppedEarly),
              stop_reason: thalibahResult.stopReason || null,
            }
          : null,
      },
      results: {
        ustadzah: ustadzahResult?.results || [],
        thalibah: thalibahResult?.results || [],
      },
    });
  } catch (error: any) {
    console.error('[CRON Paid Class Reminder Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal Server Error during paid class reminder execution',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
