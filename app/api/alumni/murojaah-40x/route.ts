import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { MurojaahMethod, MurojaahSegment } from '@/types/database';
import { parseBlokField } from '@/lib/blok';
import { getTimeSlotLabel, calculateMurojaahDebt, getWibDateString } from '@/lib/murojaah';

export const dynamic = 'force-dynamic';

const VALID_METHODS: MurojaahMethod[] = ['pasangan', 'tarteel', 'sholat', 'aktifitas_lain'];

/**
 * Helper to check Murojaah Wajib status (M1..M7).
 * Muroja'ah 40x is independent and non-blocking for thalibah.
 * Muroja'ah Sepekan (M1-M7) is separately monitored on admin presensi.
 */
async function checkMurojaahWajibStatus(userId: string, targetBatchId?: string | null, isAdmin?: boolean): Promise<{
  is_locked: boolean;
  reason?: string;
  wajib_completed: number;
  wajib_total: number;
  completed_codes: string[];
}> {
  try {
    let batchId = targetBatchId;
    if (!batchId) {
      const reg = await queryOne(
        `SELECT batch_id FROM pendaftaran_tikrar_tahfidz WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );
      batchId = reg?.batch_id;
    }

    if (!batchId) {
      return {
        is_locked: false,
        wajib_completed: 7,
        wajib_total: 7,
        completed_codes: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7']
      };
    }

    const batch = await queryOne(`SELECT id, name, start_date, opening_class_date FROM batches WHERE id = $1`, [batchId]);
    let dateFilter = '1970-01-01';
    if (batch?.opening_class_date) {
      const d = new Date(batch.opening_class_date);
      d.setDate(d.getDate() - 1);
      dateFilter = d.toISOString().split('T')[0];
    } else if (batch?.start_date) {
      const d = new Date(batch.start_date);
      d.setDate(d.getDate() - 1);
      dateFilter = d.toISOString().split('T')[0];
    }

    const { rows: jurnalRows } = await query(
      `SELECT blok FROM jurnal_records WHERE user_id = $1 AND (tanggal_setor >= $2 OR created_at >= $2)`,
      [userId, dateFilter]
    );

    const completedCodes = new Set<string>();
    jurnalRows.forEach((r) => {
      const bloks = parseBlokField(r.blok);
      bloks.forEach(b => {
        const upper = b.toUpperCase();
        if (/^M[1-7]$/.test(upper)) {
          completedCodes.add(upper);
        }
      });
    });

    return {
      is_locked: false, // Never lock Murojaah 40x; Murojaah sepekan is monitored via admin presensi
      wajib_completed: completedCodes.size,
      wajib_total: 7,
      completed_codes: Array.from(completedCodes)
    };
  } catch (err) {
    return {
      is_locked: false,
      wajib_completed: 7,
      wajib_total: 7,
      completed_codes: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7']
    };
  }
}

/**
 * GET /api/alumni/murojaah-40x
 * Fetch user's Murojaah 40x progress, logs, and warrior status
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('user_id') || searchParams.get('target_user_id');
    const selectedJuzParam = (searchParams.get('juz_code') || searchParams.get('juz'))?.trim().toUpperCase();

    // Allow staff/admin to view other user's progress
    const isAdminOrStaff = (user.roles || []).some((r: string) => ['admin', 'musyrifah', 'muallimah'].includes(r)) || user.role === 'admin';
    const targetId = (isAdminOrStaff && targetUserId) ? targetUserId : user.id;

    // 1. Fetch user profile & batch info safely
    const studentProfile = await queryOne(
      `SELECT p.batch_id, 
              COALESCE(d.confirmed_chosen_juz, p.final_juz, p.chosen_juz) as chosen_juz, 
              b.name as batch_name
       FROM pendaftaran_tikrar_tahfidz p
       LEFT JOIN batches b ON b.id = p.batch_id
       LEFT JOIN daftar_ulang_submissions d ON d.registration_id = p.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC LIMIT 1`,
      [targetId]
    );

    let batchId = studentProfile?.batch_id;
    let batchName = studentProfile?.batch_name || 'Alumni / Umum';
    let defaultJuzCode = studentProfile?.chosen_juz || '30A';

    // 2. Fetch all enrolled juz records for this user
    const { rows: allEnrolledRows } = await query(
      `SELECT id, batch_id, juz_code, status, total_completed, started_at, expires_at, is_warrior_eligible, time_slot_main, time_slot_backup, is_reminder_active
       FROM murojaah_40x_progress
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [targetId]
    );

    // Determine which progress to view
    let progress: any = null;
    if (selectedJuzParam) {
      progress = allEnrolledRows.find(p => p.juz_code === selectedJuzParam);
    }
    if (!progress && allEnrolledRows.length > 0) {
      progress = allEnrolledRows[0];
    }

    let juzCode = progress?.juz_code || defaultJuzCode;
    if (progress?.batch_id) {
      batchId = progress.batch_id;
    }

    if (!batchId) {
      // Find open or latest batch
      const latestBatch = await queryOne(`SELECT id, name FROM batches ORDER BY created_at DESC LIMIT 1`);
      if (latestBatch) {
        batchId = latestBatch.id;
        batchName = latestBatch.name;
      } else {
        batchId = '00000000-0000-0000-0000-000000000000';
      }
    }

    const isPartB = juzCode.toUpperCase().endsWith('B');

    // Cek apakah user adalah alumni/peserta sah dari batch sebelumnya
    const isApprovedAlumni = await queryOne(
      `SELECT id FROM pendaftaran_tikrar_tahfidz 
       WHERE user_id = $1 AND status = 'approved' 
       LIMIT 1`,
      [targetId]
    );

    // If still no progress, auto-initialize
    // Pengingat WhatsApp hanya diaktifkan untuk alumni sah, bukan pendaftar baru
    const autoReminderActive = !!isApprovedAlumni;

    if (!progress) {
      const { rows: newProgressRows } = await query(
        `INSERT INTO murojaah_40x_progress 
         (user_id, batch_id, juz_code, is_part_b, include_part_a, total_completed, started_at, expires_at, status, is_reminder_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 0, NOW(), NOW() + INTERVAL '20 days', 'active', $6, NOW(), NOW())
         ON CONFLICT (user_id, batch_id, juz_code) 
         DO UPDATE SET updated_at = NOW()
         RETURNING *`,
        [targetId, batchId, juzCode, isPartB, isPartB, autoReminderActive]
      );
      progress = newProgressRows[0];
    } else {
      // Fetch fresh full progress row
      progress = await queryOne(`SELECT * FROM murojaah_40x_progress WHERE id = $1`, [progress.id]);
    }

    // Ensure expires_at is present
    if (!progress.expires_at && progress.started_at) {
      const { rows: expRows } = await query(
        `UPDATE murojaah_40x_progress 
         SET expires_at = started_at + INTERVAL '20 days'
         WHERE id = $1
         RETURNING expires_at`,
        [progress.id]
      );
      progress.expires_at = expRows[0]?.expires_at;
    }

    // 3. Fetch all round logs for this progress
    const { rows: logs } = await query(
      `SELECT id, progress_id, user_id, round_number, juz_segment, completed_at, methods, notes, created_at
       FROM murojaah_40x_logs
       WHERE progress_id = $1
       ORDER BY round_number ASC`,
      [progress.id]
    );

    const primaryLogs = logs.filter(l => l.juz_segment === 'primary');
    const partALogs = logs.filter(l => l.juz_segment === 'part_a_optional');

    // 4. Calculate Warrior Challenge Status (<= 20 Days)
    const totalCompletedNum = Number(progress.total_completed || 0);
    const startDate = logs.length > 0 ? new Date(logs[0].completed_at) : new Date(progress.started_at);
    const now = new Date();
    const expiryDate = progress.expires_at ? new Date(progress.expires_at) : new Date(startDate.getTime() + 20 * 86400000);

    let daysElapsed = 1;
    let daysRemaining = 20;

    if (totalCompletedNum > 0) {
      const endDateForElapsed = progress.completed_at ? new Date(progress.completed_at) : now;
      const diffTime = Math.max(0, endDateForElapsed.getTime() - startDate.getTime());
      daysElapsed = Math.min(20, Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24))));

      const remainingTime = expiryDate.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(remainingTime / (1000 * 60 * 60 * 24)));
    }

    const isCompleted = totalCompletedNum >= 40;
    const isExpired = totalCompletedNum > 0 && !isCompleted && (daysRemaining <= 0 || now > expiryDate);
    const isWarriorEligible = isCompleted && daysElapsed <= 20;

    // 5. Fetch user badge if already awarded
    const userBadge = await queryOne(
      `SELECT * FROM user_badges WHERE user_id = $1 AND badge_code = 'murojaah_warrior'`,
      [targetId]
    );

    const isWarriorAchieved = !!userBadge || progress.is_warrior_eligible || isWarriorEligible;

    // 6. Check if user is eligible for free renewal / extension
    const hasAnyWarriorBadge = Boolean(userBadge) || Boolean(progress.is_warrior_eligible);

    // Cek apakah user adalah peserta aktif di batch berjalan (open / ongoing)
    const activeBatchReg = await queryOne(
      `SELECT p.id, p.batch_id, b.name as batch_name, b.status as batch_status
       FROM pendaftaran_tikrar_tahfidz p
       JOIN batches b ON b.id = p.batch_id
       WHERE p.user_id = $1
         AND p.status IN ('approved', 'selected', 'registered')
         AND b.status IN ('open', 'ongoing')
       LIMIT 1`,
      [targetId]
    );

    const isActiveBatchThalibah = Boolean(activeBatchReg);
    const hasTimeSlot = Boolean(progress?.time_slot_main);
    const needsTimeSlot = !isActiveBatchThalibah && !hasTimeSlot;

    // Check if user is a Mu'allimah
    const isMuallimah = (user.roles || []).includes('muallimah') || user.role === 'muallimah';
    const isFreeEligible = isActiveBatchThalibah || isMuallimah || hasAnyWarriorBadge;

    // 7. Check if Murojaah 40x is locked pending mandatory murojaah (M1..M7)
    const wajibStatus = await checkMurojaahWajibStatus(targetId, batchId, isAdminOrStaff);

    // 8. Calculate Today's Progress & Total Debt (Target: 2 rounds/day)
    const todayDateStr = getWibDateString(new Date());
    const todayLogs = logs.filter(l => {
      const compDate = getWibDateString(l.completed_at);
      return compDate === todayDateStr;
    });

    const primaryTodayLogs = primaryLogs.filter(l => {
      const compDate = getWibDateString(l.completed_at);
      return compDate === todayDateStr;
    });

    const debtInfo = calculateMurojaahDebt({
      startedAt: startDate,
      totalCompleted: totalCompletedNum,
      todayLogsCount: primaryTodayLogs.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        progress: {
          ...progress,
          is_reminder_active: progress.is_reminder_active ?? true,
          time_slot_main_label: getTimeSlotLabel(progress.time_slot_main),
          time_slot_backup_label: getTimeSlotLabel(progress.time_slot_backup),
        },
        primary_logs: primaryLogs,
        part_a_logs: partALogs,
        today_logs: todayLogs,
        debt: debtInfo,
        all_enrolled_juz: allEnrolledRows,
        wajib_murojaah: wajibStatus,
        warrior: {
          is_eligible: isWarriorEligible,
          has_badge: isWarriorAchieved,
          badge: userBadge || null,
          days_elapsed: daysElapsed,
          days_remaining: daysRemaining,
          target_days: 20,
          is_expired: isExpired,
          is_completed: isCompleted,
          can_log_round: !isExpired,
          free_extension_unlocked: hasAnyWarriorBadge
        },
        batch: {
          id: batchId,
          name: batchName
        },
        juz_info: {
          code: juzCode,
          is_part_b: isPartB,
          optional_part_a_code: isPartB ? juzCode.replace(/B$/i, 'A') : null
        },
        is_active_batch_thalibah: isActiveBatchThalibah,
        is_free_eligible: isFreeEligible,
        needs_time_slot: needsTimeSlot
      }
    });
  } catch (error: any) {
    console.error('[Murojaah 40x GET] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

/**
 * POST /api/alumni/murojaah-40x
 * Log a new round of 1/2 juz murojaah with selected methods
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      progress_id, 
      batch_id, 
      juz_code,
      juz_segment = 'primary', 
      methods = [], 
      notes = '', 
      completed_at = new Date().toISOString().split('T')[0] 
    } = body;

    // 1. Validate segment
    const validSegments: MurojaahSegment[] = ['primary', 'part_a_optional'];
    if (!validSegments.includes(juz_segment)) {
      return NextResponse.json({ success: false, error: 'Segmen juz tidak valid' }, { status: 400 });
    }

    // 2. Validate methods
    if (!Array.isArray(methods) || methods.length === 0) {
      return NextResponse.json({ success: false, error: 'Pilih minimal satu metode murojaah (Pasangan, Tarteel, Sholat, atau Aktifitas Lain)' }, { status: 400 });
    }

    const isValidMethods = methods.every((m: any) => VALID_METHODS.includes(m));
    if (!isValidMethods) {
      return NextResponse.json({ success: false, error: 'Metode yang dipilih tidak sesuai ketentuan' }, { status: 400 });
    }

    // 3. Find progress record
    let progress: any = null;
    if (progress_id) {
      progress = await queryOne(`SELECT * FROM murojaah_40x_progress WHERE id = $1 AND user_id = $2`, [progress_id, user.id]);
    } else {
      progress = await queryOne(
        `SELECT * FROM murojaah_40x_progress 
         WHERE user_id = $1 
         ORDER BY updated_at DESC LIMIT 1`,
        [user.id]
      );
    }

    if (!progress) {
      return NextResponse.json({ success: false, error: 'Data progres Murojaah 40x tidak ditemukan. Silakan muat ulang halaman.' }, { status: 404 });
    }

    // Check if user is an active thalibah in an open/ongoing Tikrar Tahfidz batch
    const activeBatchReg = await queryOne(
      `SELECT p.id
       FROM pendaftaran_tikrar_tahfidz p
       JOIN batches b ON b.id = p.batch_id
       WHERE p.user_id = $1
         AND p.status IN ('approved', 'selected', 'registered')
         AND b.status IN ('open', 'ongoing')
       LIMIT 1`,
      [user.id]
    );

    const isActiveBatchThalibah = Boolean(activeBatchReg);

    // Non-batch participants MUST register / set their simak time slot before logging presensi
    if (!isActiveBatchThalibah && !progress.time_slot_main) {
      return NextResponse.json({
        success: false,
        error: "Afwan Ukhti, silakan daftar / atur jam luang simak terlebih dahulu sebelum mengisi presensi Muroja'ah 40x.",
        needs_time_slot: true
      }, { status: 400 });
    }

    // 4. Check if 20-day challenge has expired (only after first round started)
    if (progress.expires_at && Number(progress.total_completed || 0) > 0) {
      const expiry = new Date(progress.expires_at);
      const now = new Date();
      if (now > expiry && Number(progress.total_completed || 0) < 40) {
        return NextResponse.json({
          success: false,
          error: 'Batas waktu tantangan 20 hari untuk porsi ini telah berakhir. Silakan lakukan re-registrasi porsi untuk memulai siklus 20 hari yang baru.'
        }, { status: 400 });
      }
    }

    // 5. Calculate next round number for this segment
    const { rows: maxRoundRows } = await query(
      `SELECT COALESCE(MAX(round_number), 0) as max_round 
       FROM murojaah_40x_logs 
       WHERE progress_id = $1 AND juz_segment = $2`,
      [progress.id, juz_segment]
    );

    const currentMax = Number(maxRoundRows[0]?.max_round || 0);
    const nextRound = currentMax + 1;

    if (nextRound > 40) {
      return NextResponse.json({ 
        success: false, 
        error: `Target 40 putaran untuk ${juz_segment === 'primary' ? 'Juz Utama' : 'Bagian A'} sudah terpenuhi (40/40).` 
      }, { status: 400 });
    }

    // 6. Insert round log
    const { rows: insertedLogs } = await query(
      `INSERT INTO murojaah_40x_logs 
       (progress_id, user_id, round_number, juz_segment, completed_at, methods, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [progress.id, user.id, nextRound, juz_segment, completed_at, methods, notes ? notes.trim() : null]
    );

    const newLog = insertedLogs[0];

    // 7. If primary segment, update progress and check badge
    let isWarriorAwarded = false;
    let updatedProgress = progress;

    if (juz_segment === 'primary') {
      const newTotal = nextRound;
      const isCompleted = newTotal >= 40;
      const isFirstRound = currentMax === 0;

      const startDate = isFirstRound ? new Date(completed_at) : new Date(progress.started_at);
      const completionDate = new Date();
      const diffTime = Math.abs(completionDate.getTime() - startDate.getTime());
      const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isEligibleWarrior = isCompleted && durationDays <= 20;

      const { rows: progRows } = await query(
        `UPDATE murojaah_40x_progress
         SET total_completed = $1,
             started_at = CASE WHEN $5 = true THEN $6::timestamptz ELSE started_at END,
             expires_at = CASE WHEN $5 = true THEN $6::timestamptz + INTERVAL '20 days' ELSE expires_at END,
             completed_at = CASE WHEN $2 = true THEN NOW() ELSE completed_at END,
             status = CASE WHEN $2 = true THEN 'completed' ELSE status END,
             is_warrior_eligible = CASE WHEN $3 = true THEN true ELSE is_warrior_eligible END,
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [newTotal, isCompleted, isEligibleWarrior, progress.id, isFirstRound, completed_at]
      );
      updatedProgress = progRows[0];

      // Award badge if qualified
      if (isEligibleWarrior) {
        await query(
          `INSERT INTO user_badges (user_id, badge_code, badge_name, description, awarded_at, metadata)
           VALUES ($1, 'murojaah_warrior', 'Murojaah Warrior', 'Menyelesaikan 40x Murojaah 1/2 Juz dalam waktu ≤ 20 hari', NOW(), $2)
           ON CONFLICT (user_id, badge_code) DO NOTHING`,
          [
            user.id,
            JSON.stringify({
              days_taken: durationDays,
              juz: progress.juz_code,
              batch_id: progress.batch_id,
              completed_at: new Date().toISOString()
            })
          ]
        );
        isWarriorAwarded = true;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Putaran ke-${nextRound} (${juz_segment === 'primary' ? 'Juz Utama' : 'Bagian A'}) berhasil dicatat! Barakallahu fiik.`,
      data: {
        log: newLog,
        progress: updatedProgress,
        warrior_awarded: isWarriorAwarded
      }
    });
  } catch (error: any) {
    console.error('[Murojaah 40x POST] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/alumni/murojaah-40x
 * Update settings (e.g. toggle WhatsApp reminder active/inactive)
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { progress_id, is_reminder_active } = body;

    if (!progress_id || typeof is_reminder_active !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Parameter tidak valid' }, { status: 400 });
    }

    const { rows } = await query(
      `UPDATE murojaah_40x_progress
       SET is_reminder_active = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [is_reminder_active, progress_id, user.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Data progress tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: is_reminder_active 
        ? 'Pengingat sore WhatsApp diaktifkan' 
        : 'Pengingat sore WhatsApp dinonaktifkan',
      data: rows[0],
    });
  } catch (error: any) {
    console.error('[Murojaah 40x PATCH] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/alumni/murojaah-40x
 * Undo last round log for the user in this segment
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const progressId = searchParams.get('progress_id');
    const segment = (searchParams.get('segment') || 'primary') as MurojaahSegment;

    if (!progressId) {
      return NextResponse.json({ success: false, error: 'progress_id diperlukan' }, { status: 400 });
    }

    // Find the latest round for this segment
    const latestRound = await queryOne(
      `SELECT id, round_number FROM murojaah_40x_logs
       WHERE progress_id = $1 AND user_id = $2 AND juz_segment = $3
       ORDER BY round_number DESC LIMIT 1`,
      [progressId, user.id, segment]
    );

    if (!latestRound) {
      return NextResponse.json({ success: false, error: 'Tidak ada putaran yang dapat dihapus' }, { status: 404 });
    }

    // Delete the log
    await query(`DELETE FROM murojaah_40x_logs WHERE id = $1`, [latestRound.id]);

    // If primary, decrement total_completed in progress
    if (segment === 'primary') {
      const { rows: countRows } = await query(
        `SELECT COUNT(*) as count FROM murojaah_40x_logs
         WHERE progress_id = $1 AND juz_segment = 'primary'`,
        [progressId]
      );
      const newTotal = Number(countRows[0]?.count || 0);

      await query(
        `UPDATE murojaah_40x_progress
         SET total_completed = $1,
             completed_at = NULL,
             status = 'active',
             is_warrior_eligible = false,
             updated_at = NOW()
         WHERE id = $2`,
        [newTotal, progressId]
      );
    }

    return NextResponse.json({
      success: true,
      message: `Putaran ke-${latestRound.round_number} berhasil dibatalkan`
    });
  } catch (error: any) {
    console.error('[Murojaah 40x DELETE] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
