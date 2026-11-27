import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import {
  sendH1ExamReminders,
  sendH1ExaminerReminders,
  sendWrittenExamReminders,
  getTomorrowWibDateString,
  getTodayWibDateString,
  getH1ExamCandidates,
  getH1ExaminerCandidates,
  getWrittenExamReminderCandidates,
} from '@/lib/services/exam-reminder';
import { getAuthorizationContext } from '@/lib/rbac';

// =========================================================================
// CRON ROUTE: Auto Reminder Ujian Akhir (Lisan H-1 & Tulisan Pembukaan/Deadline)
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
    const batchIdParam = searchParams.get('batch_id') || undefined;
    const dryRun = searchParams.get('dry_run') === 'true';
    const force = searchParams.get('force') === 'true';
    const viewCandidatesOnly = searchParams.get('view') === 'candidates';
    // 'all' | 'thalibah' | 'examiner' | 'written' | 'written_open' | 'written_deadline'
    const targetType = (searchParams.get('type') || 'all').toLowerCase();

    const targetDate = targetDateParam || getTomorrowWibDateString();
    const todayDate = targetDateParam || getTodayWibDateString();

    // If caller just wants to inspect candidate lists without executing
    if (viewCandidatesOnly) {
      const [candidates, examinerCandidates, writtenOpenCandidates, writtenDeadlineCandidates] = await Promise.all([
        getH1ExamCandidates(targetDate),
        getH1ExaminerCandidates(targetDate),
        getWrittenExamReminderCandidates({ mode: 'open', targetDate: todayDate, batchId: batchIdParam, force }),
        getWrittenExamReminderCandidates({ mode: 'deadline', targetDate: todayDate, batchId: batchIdParam, force }),
      ]);

      return NextResponse.json({
        success: true,
        target_date: targetDate,
        today_date: todayDate,
        thalibah: {
          total: candidates.length,
          already_sent_count: candidates.filter(c => c.alreadySent).length,
          pending_count: candidates.filter(c => !c.alreadySent).length,
          candidates,
        },
        examiners: {
          total: examinerCandidates.length,
          already_sent_count: examinerCandidates.filter(e => e.alreadySent).length,
          pending_count: examinerCandidates.filter(e => !e.alreadySent).length,
          candidates: examinerCandidates,
        },
        written_open: {
          total: writtenOpenCandidates.length,
          candidates: writtenOpenCandidates,
        },
        written_deadline: {
          total: writtenDeadlineCandidates.length,
          candidates: writtenDeadlineCandidates,
        },
        // Backward compatibility properties
        total_candidates: candidates.length,
        already_sent_count: candidates.filter(c => c.alreadySent).length,
        pending_count: candidates.filter(c => !c.alreadySent).length,
        candidates,
      });
    }

    console.log(`[CRON Exam Reminder] Processing exam reminders for target_date=${targetDate}, today=${todayDate}, targetType=${targetType}, dryRun=${dryRun}, force=${force}`);

    let thalibahResult: any = null;
    let examinerResult: any = null;
    let writtenOpenResult: any = null;
    let writtenDeadlineResult: any = null;

    if (targetType === 'all' || targetType === 'thalibah') {
      thalibahResult = await sendH1ExamReminders({
        targetDate,
        dryRun,
        force,
      });
    }

    if (targetType === 'all' || targetType === 'examiner') {
      examinerResult = await sendH1ExaminerReminders({
        targetDate,
        dryRun,
        force,
      });
    }

    if (targetType === 'all' || targetType === 'written' || targetType === 'written_open') {
      writtenOpenResult = await sendWrittenExamReminders({
        mode: 'open',
        targetDate: todayDate,
        batchId: batchIdParam,
        dryRun,
        force,
      });
    }

    if (targetType === 'all' || targetType === 'written' || targetType === 'written_deadline') {
      writtenDeadlineResult = await sendWrittenExamReminders({
        mode: 'deadline',
        targetDate: todayDate,
        batchId: batchIdParam,
        dryRun,
        force,
      });
    }

    const totalSent =
      (thalibahResult?.sentCount || 0) +
      (examinerResult?.sentCount || 0) +
      (writtenOpenResult?.sentCount || 0) +
      (writtenDeadlineResult?.sentCount || 0);
    const totalFailed =
      (thalibahResult?.failedCount || 0) +
      (examinerResult?.failedCount || 0) +
      (writtenOpenResult?.failedCount || 0) +
      (writtenDeadlineResult?.failedCount || 0);
    const totalSkipped =
      (thalibahResult?.skippedCount || 0) +
      (examinerResult?.skippedCount || 0) +
      (writtenOpenResult?.skippedCount || 0) +
      (writtenDeadlineResult?.skippedCount || 0);

    console.log(`[CRON Exam Reminder] Complete. Target=${targetDate}, TotalSent=${totalSent}, TotalFailed=${totalFailed}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        target_date: targetDate,
        today_date: todayDate,
        dry_run: dryRun,
        target_type: targetType,
        total_sent: totalSent,
        total_failed: totalFailed,
        total_skipped: totalSkipped,
        thalibah: thalibahResult ? {
          total: thalibahResult.totalCandidates,
          sent: thalibahResult.sentCount,
          failed: thalibahResult.failedCount,
          skipped: thalibahResult.skippedCount,
          stopped_early: Boolean(thalibahResult.stoppedEarly),
          stop_reason: thalibahResult.stopReason || null,
        } : null,
        examiners: examinerResult ? {
          total: examinerResult.totalExaminers,
          sent: examinerResult.sentCount,
          failed: examinerResult.failedCount,
          skipped: examinerResult.skippedCount,
          stopped_early: Boolean(examinerResult.stoppedEarly),
          stop_reason: examinerResult.stopReason || null,
        } : null,
        written_open: writtenOpenResult ? {
          total: writtenOpenResult.totalCandidates,
          sent: writtenOpenResult.sentCount,
          failed: writtenOpenResult.failedCount,
          skipped: writtenOpenResult.skippedCount,
          stopped_early: Boolean(writtenOpenResult.stoppedEarly),
          stop_reason: writtenOpenResult.stopReason || null,
        } : null,
        written_deadline: writtenDeadlineResult ? {
          total: writtenDeadlineResult.totalCandidates,
          sent: writtenDeadlineResult.sentCount,
          failed: writtenDeadlineResult.failedCount,
          skipped: writtenDeadlineResult.skippedCount,
          stopped_early: Boolean(writtenDeadlineResult.stoppedEarly),
          stop_reason: writtenDeadlineResult.stopReason || null,
        } : null,
        // Backward compatibility
        total_candidates: thalibahResult?.totalCandidates || 0,
        sent_count: totalSent,
        failed_count: totalFailed,
        skipped_count: totalSkipped,
      },
      results: {
        thalibah: thalibahResult?.results || [],
        examiners: examinerResult?.results || [],
        written_open: writtenOpenResult?.results || [],
        written_deadline: writtenDeadlineResult?.results || [],
      },
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
