import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { getTimeSlotLabel } from '@/lib/murojaah';

export const dynamic = 'force-dynamic';

/**
 * GET /api/alumni/murojaah-40x/partners
 * Directory of community partners available for Murojaah 40x simak
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterJuz = searchParams.get('juz_code')?.trim().toUpperCase();
    const filterTimeSlot = searchParams.get('time_slot');

    // 1. Fetch current user's active progress to get their time slots and target juz
    const myProgress = await queryOne(
      `SELECT juz_code, time_slot_main, time_slot_backup, partner_matching_active
       FROM murojaah_40x_progress
       WHERE user_id = $1 AND status = 'active'
       ORDER BY updated_at DESC LIMIT 1`,
      [user.id]
    );

    const myMainSlot = myProgress?.time_slot_main || '';
    const myBackupSlot = myProgress?.time_slot_backup || '';
    const myJuzCode = myProgress?.juz_code || '';

    // 2. Build query for active community participants
    let whereConditions = [
      `m.user_id != $1`,
      `m.status = 'active'`,
      `m.partner_matching_active = true`,
      `(m.expires_at IS NULL OR m.expires_at > NOW())`
    ];
    let params: any[] = [user.id];

    if (filterJuz && filterJuz !== 'ALL') {
      params.push(filterJuz);
      whereConditions.push(`m.juz_code = $${params.length}`);
    }

    if (filterTimeSlot && filterTimeSlot !== 'ALL') {
      params.push(filterTimeSlot);
      whereConditions.push(`(m.time_slot_main = $${params.length} OR m.time_slot_backup = $${params.length})`);
    }

    const querySql = `
      SELECT m.id as progress_id, m.user_id, m.juz_code, m.total_completed,
             m.time_slot_main, m.time_slot_backup, m.started_at, m.expires_at,
             u.full_name, u.whatsapp, u.domicile
      FROM murojaah_40x_progress m
      JOIN users u ON m.user_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY m.updated_at DESC
      LIMIT 100
    `;

    const { rows: partnerRows } = await query(querySql, params);

    // 3. Annotate matching and format
    const partners = partnerRows.map((p: any) => {
      const isMainMatch = Boolean(myMainSlot && p.time_slot_main === myMainSlot);
      const isBackupMatch = Boolean(
        (myMainSlot && p.time_slot_backup === myMainSlot) ||
        (myBackupSlot && p.time_slot_main === myBackupSlot) ||
        (myBackupSlot && p.time_slot_backup === myBackupSlot)
      );
      const isSameJuz = Boolean(myJuzCode && p.juz_code === myJuzCode);
      const isScheduleMatch = isMainMatch || isBackupMatch;

      return {
        progress_id: p.progress_id,
        user_id: p.user_id,
        full_name: p.full_name || 'Hamba Allah',
        whatsapp: p.whatsapp || null,
        domicile: p.domicile || null,
        juz_code: p.juz_code,
        total_completed: Number(p.total_completed || 0),
        time_slot_main: p.time_slot_main,
        time_slot_main_label: getTimeSlotLabel(p.time_slot_main),
        time_slot_backup: p.time_slot_backup,
        time_slot_backup_label: getTimeSlotLabel(p.time_slot_backup),
        is_same_juz: isSameJuz,
        is_main_match: isMainMatch,
        is_backup_match: isBackupMatch,
        is_schedule_match: isScheduleMatch,
        match_score: (isSameJuz ? 2 : 0) + (isMainMatch ? 3 : (isBackupMatch ? 1 : 0))
      };
    });

    // Sort by match_score descending
    partners.sort((a, b) => b.match_score - a.match_score);

    return NextResponse.json({
      success: true,
      data: {
        my_profile: {
          user_id: user.id,
          full_name: user.full_name,
          juz_code: myJuzCode,
          time_slot_main: myMainSlot,
          time_slot_main_label: getTimeSlotLabel(myMainSlot),
          time_slot_backup: myBackupSlot,
          time_slot_backup_label: getTimeSlotLabel(myBackupSlot)
        },
        partners,
        total_partners: partners.length,
        matching_count: partners.filter(p => p.is_schedule_match).length
      }
    });
  } catch (error: any) {
    console.error('[Murojaah 40x Partners] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
