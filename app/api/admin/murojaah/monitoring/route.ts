import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { query } from '@/lib/db';
import { calculateMurojaahDebt } from '@/lib/murojaah';
import { parseBlokField } from '@/lib/blok';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    let batchId = searchParams.get('batch_id');

    // 1. Fetch all batches with count of approved thalibah
    const { rows: batches } = await query(
      `SELECT b.id, b.name, b.status, b.start_date, b.end_date,
              COUNT(p.id)::int as thalibah_count
       FROM batches b
       LEFT JOIN pendaftaran_tikrar_tahfidz p ON p.batch_id = b.id AND p.status = 'approved'
       GROUP BY b.id, b.name, b.status, b.start_date, b.end_date, b.created_at
       ORDER BY b.created_at DESC`
    );

    // Default to the batch that actually has thalibah (e.g. Batch 3) or ongoing batch
    if ((!batchId || batchId === 'default') && batches.length > 0) {
      const batchWithData = batches.find(b => Number(b.thalibah_count) > 0) || batches.find(b => b.status === 'ongoing') || batches[0];
      batchId = batchWithData.id;
    }

    const isAll = batchId === 'all';

    // 2. Fetch Weekly Murojaah (M1..M7) for the selected batch
    const weeklyQuery = `
      SELECT 
        u.id as user_id, 
        u.full_name, 
        u.whatsapp,
        COALESCE(p.final_juz, p.chosen_juz, '30A') as juz_code,
        h.name as halaqah_name,
        ARRAY_AGG(DISTINCT j.blok) FILTER (WHERE j.blok IS NOT NULL) as bloks
      FROM pendaftaran_tikrar_tahfidz p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN halaqah_students hs ON hs.thalibah_id = u.id AND hs.status = 'active'
      LEFT JOIN halaqah h ON h.id = hs.halaqah_id
      LEFT JOIN jurnal_records j ON j.user_id = u.id AND j.blok ILIKE '%M%'
      WHERE p.status = 'approved' ${isAll ? '' : 'AND p.batch_id = $1'}
      GROUP BY u.id, u.full_name, u.whatsapp, p.final_juz, p.chosen_juz, h.name
      ORDER BY u.full_name ASC
    `;

    const { rows: weeklyRows } = await query(
      weeklyQuery,
      isAll ? [] : [batchId]
    );

    const weeklyMurojaah = weeklyRows.map((row: any) => {
      const rawBloks: string[] = row.bloks || [];
      const completedSet = new Set<string>();

      rawBloks.forEach(b => {
        const parsed = parseBlokField(b);
        parsed.forEach(code => {
          const upper = code.toUpperCase();
          if (/^M[1-7]$/.test(upper)) {
            completedSet.add(upper);
          }
        });
      });

      const completedCodes = Array.from(completedSet).sort();
      const completedCount = completedCodes.length;
      const isComplete = completedCount >= 7;

      return {
        userId: row.user_id,
        fullName: row.full_name,
        whatsapp: row.whatsapp,
        juzCode: row.juz_code,
        halaqahName: row.halaqah_name || 'Belum Masuk Halaqah',
        completedCodes,
        completedCount,
        totalRequired: 7,
        isComplete,
      };
    });

    // 3. Fetch Murojaah Warrior 40X Progress
    const warriorQuery = `
      SELECT 
        p.id as progress_id,
        p.user_id,
        u.full_name,
        u.whatsapp,
        b.name as batch_name,
        p.batch_id,
        p.juz_code,
        p.total_completed,
        p.started_at,
        p.expires_at,
        p.status,
        p.is_reminder_active,
        (SELECT count(*) FROM user_badges ub WHERE ub.user_id = p.user_id AND ub.badge_code = 'murojaah_warrior') > 0 as has_warrior_badge,
        (SELECT max(completed_at) FROM murojaah_40x_logs WHERE progress_id = p.id) as last_setoran,
        (SELECT count(*) FROM murojaah_40x_logs WHERE progress_id = p.id AND completed_at = CURRENT_DATE) as today_count
      FROM murojaah_40x_progress p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN batches b ON b.id = p.batch_id
      ${isAll ? '' : 'WHERE p.batch_id = $1'}
      ORDER BY p.total_completed DESC, p.updated_at DESC
    `;

    const { rows: warriorRows } = await query(
      warriorQuery,
      isAll ? [] : [batchId]
    );

    const now = new Date();
    const warriorMurojaah = warriorRows.map((row: any) => {
      const totalCompleted = Number(row.total_completed || 0);
      const isCompleted = totalCompleted >= 40;
      const startDate = new Date(row.started_at);
      const expiryDate = row.expires_at ? new Date(row.expires_at) : new Date(startDate.getTime() + 20 * 86400000);

      const remainingTime = expiryDate.getTime() - now.getTime();
      const daysRemaining = totalCompleted === 0 ? 20 : Math.max(0, Math.ceil(remainingTime / (1000 * 60 * 60 * 24)));
      
      const debt = calculateMurojaahDebt({
        startedAt: startDate,
        totalCompleted,
        todayLogsCount: Number(row.today_count || 0),
      });

      const isExpired = totalCompleted > 0 && !isCompleted && (daysRemaining <= 0 || now > expiryDate);

      return {
        progressId: row.progress_id,
        userId: row.user_id,
        fullName: row.full_name,
        whatsapp: row.whatsapp,
        batchName: row.batch_name || 'Umum',
        batchId: row.batch_id,
        juzCode: row.juz_code,
        totalCompleted,
        daysElapsed: debt.daysElapsed,
        daysRemaining,
        hasWarriorBadge: Boolean(row.has_warrior_badge),
        isCompleted,
        isExpired,
        isReminderActive: row.is_reminder_active ?? true,
        lastSetoran: row.last_setoran,
        debt,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        batches,
        selectedBatchId: batchId,
        weeklyMurojaah,
        warriorMurojaah,
      },
    });
  } catch (error: any) {
    console.error('[Admin Murojaah Monitoring Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
