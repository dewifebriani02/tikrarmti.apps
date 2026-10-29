import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

/**
 * POST /api/alumni/murojaah-40x/enroll
 * Enrollment and activation of a 20-Day Murojaah 40X challenge
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Silakan login kembali.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      juz_code,
      time_slot_main = '04-06',
      time_slot_backup = '06-09',
      partner_matching_active = true,
      infaq_amount = 0,
      infaq_payment_proof = null
    } = body;

    if (!juz_code) {
      return NextResponse.json({ success: false, error: 'Pilihan porsi juz wajib ditentukan' }, { status: 400 });
    }

    // 1. Check if user is an active thalibah in Tikrar Tahfidz / Pra-Tikrar
    const activeReg = await queryOne(
      `SELECT p.id, p.batch_id, p.status, b.status as batch_status
       FROM pendaftaran_tikrar_tahfidz p
       JOIN batches b ON p.batch_id = b.id
       WHERE p.user_id = $1
         AND p.status IN ('approved', 'selected', 'registered')
         AND b.status IN ('open', 'ongoing')
       LIMIT 1`,
      [user.id]
    );

    // 2. Check if user is a Mu'allimah
    const isMuallimah = (user.roles || []).includes('muallimah') || user.role === 'muallimah';

    // 3. Check if user has an existing completed 40x progress with warrior eligibility
    const previousWarrior = await queryOne(
      `SELECT id, is_warrior_eligible, total_completed 
       FROM murojaah_40x_progress 
       WHERE user_id = $1 AND is_warrior_eligible = true AND total_completed >= 40
       ORDER BY completed_at DESC LIMIT 1`,
      [user.id]
    );

    // Determine free status
    const isFreeEligible = Boolean(activeReg) || isMuallimah || Boolean(previousWarrior);
    const isFreeExtension = Boolean(previousWarrior);

    const finalInfaqAmount = isFreeEligible ? 0 : Number(infaq_amount || 0);
    const finalInfaqStatus = isFreeEligible 
      ? 'free' 
      : (infaq_payment_proof || finalInfaqAmount === 0 ? 'verified' : 'pending');

    // 4. Determine batch_id (use active batch or latest batch)
    let batchId = activeReg?.batch_id;
    if (!batchId) {
      const latestBatch = await queryOne(`SELECT id FROM batches ORDER BY created_at DESC LIMIT 1`);
      batchId = latestBatch?.id || '00000000-0000-0000-0000-000000000000';
    }

    const cleanJuzCode = juz_code.toUpperCase().trim();
    const isPartB = cleanJuzCode.endsWith('B');

    // 5. Upsert or update progress
    const existingProgress = await queryOne(
      `SELECT id, total_completed, status FROM murojaah_40x_progress
       WHERE user_id = $1 AND juz_code = $2`,
      [user.id, cleanJuzCode]
    );

    let resultProgress;

    if (existingProgress) {
      // Re-enroll or extend this juz cycle
      const { rows } = await query(
        `UPDATE murojaah_40x_progress
         SET started_at = NOW(),
             expires_at = NOW() + INTERVAL '20 days',\n             status = 'active',\n             total_completed = 0,\n             completed_at = NULL,\n             is_warrior_eligible = false,\n             infaq_amount = $1,\n             infaq_status = $2,\n             infaq_payment_proof = $3,\n             is_free_extension = $4,\n             time_slot_main = $5,\n             time_slot_backup = $6,\n             partner_matching_active = $7,\n             updated_at = NOW()\n         WHERE id = $8\n         RETURNING *`,
        [
          finalInfaqAmount,
          finalInfaqStatus,
          infaq_payment_proof,
          isFreeExtension,
          time_slot_main,
          time_slot_backup,
          partner_matching_active,
          existingProgress.id
        ]
      );
      resultProgress = rows[0];

      // Reset logs for new 20-day cycle of this progress
      await query(`DELETE FROM murojaah_40x_logs WHERE progress_id = $1`, [existingProgress.id]);
    } else {
      // Fresh new progress for this juz
      const { rows } = await query(
        `INSERT INTO murojaah_40x_progress
         (user_id, batch_id, juz_code, is_part_b, include_part_a, started_at, expires_at, status, total_completed,
          infaq_amount, infaq_status, infaq_payment_proof, is_free_extension, time_slot_main, time_slot_backup,
          partner_matching_active, is_warrior_eligible, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '20 days', 'active', 0,
                 $6, $7, $8, $9, $10, $11, $12, false, NOW(), NOW())
         RETURNING *`,
        [
          user.id,
          batchId,
          cleanJuzCode,
          isPartB,
          isPartB,
          finalInfaqAmount,
          finalInfaqStatus,
          infaq_payment_proof,
          isFreeExtension,
          time_slot_main,
          time_slot_backup,
          partner_matching_active
        ]
      );
      resultProgress = rows[0];
    }

    revalidatePath('/murojaah');
    revalidatePath('/alumni');
    revalidatePath('/dashboard');

    let successMessage = `Alhamdulillah, tantangan 20 hari Murojaah 40x untuk Juz ${cleanJuzCode} berhasil diaktifkan!`;
    if (isFreeExtension) {
      successMessage = `Alhamdulillah, Ukhti Warrior berhak atas perpanjangan porsi Juz ${cleanJuzCode} secara Bebas Biaya!`;
    } else if (isFreeEligible) {
      successMessage = `Alhamdulillah, sebagai santriwati aktif / mu'allimah MTI, porsi Murojaah Juz ${cleanJuzCode} aktif 100% Bebas Biaya!`;
    }

    return NextResponse.json({
      success: true,
      message: successMessage,
      data: {
        progress: resultProgress,
        is_free_eligible: isFreeEligible,
        is_free_extension: isFreeExtension
      }
    });
  } catch (error: any) {
    console.error('[Murojaah 40x Enroll] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
