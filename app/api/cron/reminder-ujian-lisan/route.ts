import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { sendH1ExamReminders, getTomorrowWibDateString, getH1ExamCandidates } from '@/lib/services/exam-reminder';
import { getAuthorizationContext } from '@/lib/rbac';

// =========================================================================
// CRON ROUTE: Auto Reminder H-1 Ujian Lisan via WhatsApp
// Schedulable via crontab VPS / Vercel Cron or manual admin trigger.
// Auth: `Authorization: Bearer <CRON_SECRET>` or `?secret=` or Admin Session
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

  // 1. Check CRON_SECRET if provided
  if (provided && cronSecret && cronSecret.length >= MIN_SECRET_LENGTH) {
    if (secretsMatch(provided, cronSecret)) {
      return { authorized: true, reason: 'cron_secret' };
    }
  }

  // 2. Fallback check: Admin/Musyrifah session
  try {
    const authContext = await getAuthorizationContext();
    if (authContext && (authContext.roles.includes('admin') || authContext.roles.includes('musyrifah'))) {
      return { authorized: true, reason: `user_${authContext.userId}` };
    }
  } catch {
    // Ignore auth context check errors
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

    const targetDate = targetDateParam || getTomorrowWibDateString();

    // If caller just wants to inspect candidate list without executing
    if (viewCandidatesOnly) {
      const candidates = await getH1ExamCandidates(targetDate);
      return NextResponse.json({
        success: true,
        target_date: targetDate,
        total_candidates: candidates.length,
        already_sent_count: candidates.filter(c => c.alreadySent).length,
        pending_count: candidates.filter(c => !c.alreadySent).length,
        candidates,
      });
    }

    console.log(`[CRON Exam Reminder] Processing H-1 oral exam reminder for target_date=${targetDate}, dryRun=${dryRun}, force=${force}`);

    const result = await sendH1ExamReminders({
      targetDate,
      dryRun,
      force,
    });

    console.log(`[CRON Exam Reminder] Complete. Target=${targetDate}, Total=${result.totalCandidates}, Sent=${result.sentCount}, Failed=${result.failedCount}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        target_date: result.targetDate,
        dry_run: result.dryRun,
        total_candidates: result.totalCandidates,
        sent_count: result.sentCount,
        failed_count: result.failedCount,
        skipped_count: result.skippedCount,
      },
      results: result.results,
    });
  } catch (error: any) {
    console.error('[CRON Exam Reminder Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal Server Error during exam reminder execution',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
