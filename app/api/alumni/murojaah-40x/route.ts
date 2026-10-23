import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { MurojaahMethod, MurojaahSegment } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_METHODS: MurojaahMethod[] = ['pasangan', 'tarteel', 'sholat', 'aktifitas_lain'];

/**
 * GET /api/alumni/murojaah-40x
 * Retrieve user's Murojaah 40X progress, logs per segment, and warrior badge status
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('target_user_id');
    const batchIdParam = searchParams.get('batch_id');

    // Admin / Musyrifah can inspect other thalibah
    let targetId = user.id;
    const isAdminOrStaff = (user.roles || []).some((r: string) => ['admin', 'musyrifah', 'muallimah'].includes(r)) || user.role === 'admin';
    if (targetUserId && targetUserId !== user.id) {
      if (!isAdminOrStaff) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
      targetId = targetUserId;
    }

    // 1. Get latest or matching registration to determine batch and chosen juz
    let regQuery = `
      SELECT p.id as registration_id, p.batch_id, p.chosen_juz, p.status, p.selection_status,
             d.confirmed_chosen_juz,
             b.id as b_id, b.name as batch_name, b.status as batch_status, b.end_date as batch_end_date
      FROM pendaftaran_tikrar_tahfidz p
      LEFT JOIN batches b ON b.id = p.batch_id
      LEFT JOIN daftar_ulang_submissions d ON d.registration_id = p.id
      WHERE p.user_id = $1
    `;
    const regParams: any[] = [targetId];

    if (batchIdParam) {
      regQuery += ` AND p.batch_id = $2`;
      regParams.push(batchIdParam);
    }

    regQuery += ` ORDER BY p.created_at DESC LIMIT 1`;

    const { rows: regRows } = await query(regQuery, regParams);
    const reg = regRows[0];

    // Fallback if no registration exists (e.g. admin test view)
    let batchId = reg?.batch_id || batchIdParam;
    let batchName = reg?.batch_name || 'Batch 2 MTI';
    let juzCode = reg?.confirmed_chosen_juz || reg?.chosen_juz || '28B';

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

    // 2. Fetch or auto-initialize progress record
    let progress = await queryOne(
      `SELECT * FROM murojaah_40x_progress 
       WHERE user_id = $1 AND batch_id = $2 AND juz_code = $3`,
      [targetId, batchId, juzCode]
    );

    if (!progress) {
      const { rows: newProgressRows } = await query(
        `INSERT INTO murojaah_40x_progress 
         (user_id, batch_id, juz_code, is_part_b, include_part_a, total_completed, started_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 0, NOW(), NOW(), NOW())
         ON CONFLICT (user_id, batch_id, juz_code) 
         DO UPDATE SET updated_at = NOW()
         RETURNING *`,
        [targetId, batchId, juzCode, isPartB, isPartB]
      );
      progress = newProgressRows[0];
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
    const startDate = new Date(progress.started_at);
    const endDate = progress.completed_at ? new Date(progress.completed_at) : new Date();
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const daysElapsed = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, 20 - daysElapsed);

    // 5. Fetch user badge if already awarded
    const userBadge = await queryOne(
      `SELECT * FROM user_badges WHERE user_id = $1 AND badge_code = 'murojaah_warrior'`,
      [targetId]
    );

    const isWarriorAchieved = !!userBadge || progress.is_warrior_eligible || (progress.total_completed >= 40 && daysElapsed <= 20);

    return NextResponse.json({
      success: true,
      data: {
        progress,
        primary_logs: primaryLogs,
        part_a_logs: partALogs,
        warrior: {
          is_eligible: progress.total_completed >= 40 && daysElapsed <= 20,
          has_badge: isWarriorAchieved,
          badge: userBadge || null,
          days_elapsed: daysElapsed,
          days_remaining: daysRemaining,
          target_days: 20
        },
        batch: {
          id: batchId,
          name: batchName
        },
        juz_info: {
          code: juzCode,
          is_part_b: isPartB,
          optional_part_a_code: isPartB ? juzCode.replace(/B$/i, 'A') : null
        }
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

    // 3. Find or ensure progress record
    let progress: any = null;
    if (progress_id) {
      progress = await queryOne(`SELECT * FROM murojaah_40x_progress WHERE id = $1 AND user_id = $2`, [progress_id, user.id]);
    } else {
      // Find latest progress
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

    // 4. Calculate next round number for this segment
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

    // 5. Insert round log
    const { rows: insertedLogs } = await query(
      `INSERT INTO murojaah_40x_logs 
       (progress_id, user_id, round_number, juz_segment, completed_at, methods, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [progress.id, user.id, nextRound, juz_segment, completed_at, methods, notes ? notes.trim() : null]
    );

    const newLog = insertedLogs[0];

    // 6. If primary segment, update progress and check badge
    let isWarriorAwarded = false;
    let updatedProgress = progress;

    if (juz_segment === 'primary') {
      const newTotal = nextRound;
      const isCompleted = newTotal >= 40;

      const startDate = new Date(progress.started_at);
      const completionDate = new Date();
      const diffTime = Math.abs(completionDate.getTime() - startDate.getTime());
      const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isEligibleWarrior = isCompleted && durationDays <= 20;

      const { rows: progRows } = await query(
        `UPDATE murojaah_40x_progress
         SET total_completed = $1,
             completed_at = CASE WHEN $2 = true THEN NOW() ELSE completed_at END,
             is_warrior_eligible = CASE WHEN $3 = true THEN true ELSE is_warrior_eligible END,
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [newTotal, isCompleted, isEligibleWarrior, progress.id]
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
      message: `Putaran ke-${nextRound} (${juz_segment === 'primary' ? 'Juz Utama' : 'Bagian A'}) berhasil dicatat!`,
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
 * DELETE /api/alumni/murojaah-40x
 * Undo the last recorded round for a segment
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
