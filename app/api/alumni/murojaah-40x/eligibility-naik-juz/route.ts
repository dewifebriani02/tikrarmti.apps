import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/alumni/murojaah-40x/eligibility-naik-juz
 * Validate whether an alumnus/alumna is eligible to progress (naik juz)
 * based on Murojaah 40X completion for their previous juz.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chosenJuz = searchParams.get('chosen_juz');
    const batchId = searchParams.get('batch_id');

    // 1. Fetch user's previous approved/completed registrations
    let queryStr = `
      SELECT p.id, p.batch_id, p.chosen_juz, p.status, p.selection_status,
             d.confirmed_chosen_juz,
             b.id as b_id, b.name as batch_name, b.status as batch_status, b.end_date as batch_end_date, b.created_at as batch_created_at
      FROM pendaftaran_tikrar_tahfidz p
      LEFT JOIN batches b ON b.id = p.batch_id
      LEFT JOIN daftar_ulang_submissions d ON d.registration_id = p.id
      WHERE p.user_id = $1
    `;
    const params: any[] = [user.id];

    if (batchId) {
      // Exclude current registering batch if already partially submitted or selected
      queryStr += ` AND p.batch_id != $2`;
      params.push(batchId);
    }

    queryStr += ` ORDER BY b.created_at DESC NULLS LAST, p.created_at DESC`;

    const { rows: pastRegs } = await query(queryStr, params);

    // If user has no previous registration, they are a fresh participant
    if (!pastRegs || pastRegs.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          is_alumni: false,
          previous_juz: null,
          previous_batch_name: null,
          chosen_juz: chosenJuz || null,
          is_naik_juz: false,
          is_repeating: false,
          total_completed: 0,
          target_completed: 40,
          is_40x_completed: true, // Not applicable, so allowed
          can_proceed: true,
          is_deadline_strict: false,
          deadline_message: null
        }
      });
    }

    // Pick the most relevant previous registration
    const prevReg = pastRegs[0];
    const previousJuz = prevReg.confirmed_chosen_juz || prevReg.chosen_juz || null;
    const previousBatchName = prevReg.batch_name || 'Batch Sebelumnya';

    // 2. Fetch Murojaah 40X progress for that previous juz
    let totalCompleted = 0;
    let isWarriorEligible = false;

    if (previousJuz) {
      const prog = await queryOne(
        `SELECT total_completed, is_warrior_eligible, completed_at
         FROM murojaah_40x_progress
         WHERE user_id = $1 AND (juz_code = $2 OR juz_code ILIKE $3)
         ORDER BY updated_at DESC LIMIT 1`,
        [user.id, previousJuz, `%${previousJuz.replace(/[^0-9]/g, '')}%`]
      );

      if (prog) {
        totalCompleted = Number(prog.total_completed || 0);
        isWarriorEligible = !!prog.is_warrior_eligible;
      }
    }

    const is40xCompleted = totalCompleted >= 40;

    // 3. Determine if the new chosen_juz constitutes "Naik Juz" or "Mengulang"
    const normalizeJuz = (code: string | null) => (code ? code.trim().toUpperCase() : '');
    const normChosen = normalizeJuz(chosenJuz);
    const normPrev = normalizeJuz(previousJuz);

    let isNaikJuz = false;
    let isRepeating = false;

    if (normChosen && normPrev) {
      if (normChosen === normPrev) {
        isRepeating = true;
        isNaikJuz = false;
      } else {
        // Different juz or section (e.g. 28A -> 28B, 28B -> 29A, etc.)
        isNaikJuz = true;
        isRepeating = false;
      }
    }

    // 4. Check target batch number to evaluate deadline strictly (Batch 4 or higher)
    let isDeadlineStrict = false;
    let targetBatchName = '';

    if (batchId) {
      const currentBatch = await queryOne(`SELECT id, name FROM batches WHERE id = $1`, [batchId]);
      if (currentBatch) {
        targetBatchName = currentBatch.name || '';
        const match = targetBatchName.match(/batch\s*(\d+)/i) || targetBatchName.match(/(\d+)/);
        const batchNum = match ? parseInt(match[1] || match[0], 10) : 0;
        if (batchNum >= 4) {
          isDeadlineStrict = true;
        }
      }
    }

    // Can proceed if 40x is complete OR if they're repeating OR if deadline is not yet strict (prior to Batch 4)
    const canProceed = is40xCompleted || !isNaikJuz || !isDeadlineStrict;

    return NextResponse.json({
      success: true,
      data: {
        is_alumni: true,
        previous_juz: previousJuz,
        previous_batch_name: previousBatchName,
        chosen_juz: chosenJuz || null,
        is_naik_juz: isNaikJuz,
        is_repeating: isRepeating,
        total_completed: totalCompleted,
        target_completed: 40,
        is_40x_completed: is40xCompleted,
        is_warrior_eligible: isWarriorEligible,
        can_proceed: canProceed,
        is_deadline_strict: isDeadlineStrict,
        deadline_message: isDeadlineStrict
          ? 'Murojaah 40X untuk juz sebelumnya wajib tuntas 40 putaran untuk mendaftar Batch 4 ke atas.'
          : 'Murojaah 40X adalah syarat wajib naik juz. Ukhti dapat melanjutkan pendaftaran ini dan menyelesaikan sisa putaran hingga pembukaan Batch 4.'
      }
    });
  } catch (error: any) {
    console.error('[Eligibility Naik Juz GET] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
