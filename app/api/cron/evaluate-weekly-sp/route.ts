import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { evaluateWeeklyJurnalSP } from '@/lib/services/sp-evaluation';

// =========================================================================
// CRON ROUTE: Auto-evaluate & Issue SP every Monday for previous week
// Can be invoked via Vercel Cron, Linux Crontab, or external scheduler
// Auth: `Authorization: Bearer <CRON_SECRET>` (preferred) or `?secret=` for
// legacy schedulers. Fails closed when CRON_SECRET is not configured.
// =========================================================================
const MIN_SECRET_LENGTH = 32;

function secretsMatch(provided: string, expected: string): boolean {
  // Hash both sides so lengths are equal and the comparison is constant-time
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || cronSecret.length < MIN_SECRET_LENGTH) {
      console.error('[CRON] CRON_SECRET is not configured (min 32 chars) — refusing to run');
      return NextResponse.json({ error: 'Cron is not configured' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization') || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    const provided = bearer || searchParams.get('secret') || searchParams.get('key') || '';

    if (!provided || !secretsMatch(provided, cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized cron access' }, { status: 401 });
    }

    const weekParam = searchParams.get('week_number');
    const targetWeek = weekParam ? parseInt(weekParam, 10) : undefined;
    const batchIdParam = searchParams.get('batch_id') || undefined;

    console.log(`[CRON] Starting Monday SP Auto-Evaluation for batch=${batchIdParam || 'active'}, week=${targetWeek || 'auto'}`);

    const result = await evaluateWeeklyJurnalSP({
      batchId: batchIdParam,
      weekNumber: targetWeek,
      execute: true,
    });

    console.log(`[CRON] SP Auto-Evaluation complete. Newly issued: ${result.issued_sp_count}, Total pending: ${result.sp_to_issue_count}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        batch_name: result.batch_name,
        target_week: result.target_week,
        total_active_thalibah: result.total_active_thalibah,
        completed_count: result.completed_thalibah_count,
        incomplete_count: result.incomplete_thalibah_count,
        newly_issued_sp: result.issued_sp_count,
        already_issued_sp: result.already_issued_sp_count,
      },
      data: result.thalibah_list.filter(t => !t.is_complete),
    });
  } catch (error: any) {
    console.error('[CRON Error] Error executing SP auto-evaluation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error during cron execution',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
