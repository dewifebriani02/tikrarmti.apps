import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthorizationContext, isUserAdmin } from '@/lib/rbac'

export interface JurnalBlockStatus {
  block_code: string
  week_number: number
  part: string
  start_page: number
  end_page: number
  is_completed: boolean
  jurnal_date?: string
  jurnal_count: number
}

function calculateJurnalStreak(tanggalSetorList: string[]): number {
  if (tanggalSetorList.length === 0) return 0;
  
  const submittedDates = new Set(tanggalSetorList);
  
  const getJakartaDateStr = (date: Date) => {
    return new Date(date.getTime() + (7 * 3600000) + (date.getTimezoneOffset() * 60000))
      .toISOString().split('T')[0];
  };

  const today = new Date();
  let streak = 0;
  let checkDate = new Date(today);

  for (let i = 0; i < 365; i++) {
    const dateStr = getJakartaDateStr(checkDate);
    const dayOfWeek = checkDate.getDay();

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6; // Sun (0), Fri (5), Sat (6)

    if (isWeekend) {
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }

    const hasReport = submittedDates.has(dateStr);

    if (hasReport) {
      streak++;
    } else {
      const getMonday = (d: Date) => {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(date.setDate(diff));
      };
      
      const todayMondayStr = getJakartaDateStr(getMonday(today));
      const checkMondayStr = getJakartaDateStr(getMonday(checkDate));
      const isCurrentWeek = todayMondayStr === checkMondayStr;

      if (isCurrentWeek) {
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      } else {
        break;
      }
    }

    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

async function processJurnalStatus(user: any, activeRegistration: any) {
  let streakCount = 0;

  // Get juz from confirmed_chosen_juz from daftar_ulang, or chosen_juz from registration
  const juzCode = activeRegistration.confirmed_chosen_juz || activeRegistration.chosen_juz;

  if (!juzCode) {
    return NextResponse.json(
      { success: false, error: 'No juz assigned' },
      { status: 404 }
    );
  }

  // Get juz info
  const { rows: juzRows } = await import('@/lib/db').then(m => m.query(
    'SELECT * FROM juz_options WHERE code = $1 LIMIT 1',
    [juzCode]
  ));
  const juzInfo = juzRows[0];

  if (!juzInfo) {
    return NextResponse.json(
      { success: false, error: 'Juz not found' },
      { status: 404 }
    );
  }

  // Generate all blocks for this juz dynamically
  const allBlocks: JurnalBlockStatus[] = [];
  const parts = ['A', 'B', 'C', 'D'];
  const ziyadahWeeks = 10;
  const blockOffset = juzInfo.part === 'B' ? 10 : 0;

  // 1. Ziyadah Weeks (Pekan 1-10)
  for (let week = 1; week <= ziyadahWeeks; week++) {
    const blockNumber = week + blockOffset;
    const weekPage = Math.min(juzInfo.start_page + (week - 1), juzInfo.end_page);
    for (let i = 0; i < 4; i++) {
      allBlocks.push({
        block_code: `H${blockNumber}${parts[i]}`,
        week_number: week,
        part: parts[i],
        start_page: weekPage,
        end_page: weekPage,
        is_completed: false,
        jurnal_count: 0
      });
    }
  }

  // 2. Murajaah Week (Pekan 11)
  const murajaahSchedule = [
    { day: 'Senin', range: [1, 3], parts: ['A', 'B'], target: '4×', code: 'M1' },
    { day: 'Selasa', range: [3, 5], parts: ['C', 'D'], target: '4×', code: 'M2' },
    { day: 'Rabu', range: [1, 5], parts: ['A', 'D'], target: '2×', code: 'M3' },
    { day: 'Kamis', range: [6, 8], parts: ['A', 'B'], target: '4×', code: 'M4' },
    { day: 'Jum\'at', range: [8, 10], parts: ['C', 'D'], target: '4×', code: 'M5' },
    { day: 'Sabtu', range: [6, 10], parts: ['A', 'D'], target: '2×', code: 'M6' },
    { day: 'Ahad', range: [1, 10], parts: ['A', 'D'], target: '1×', code: 'M7' },
  ];

  for (const item of murajaahSchedule) {
    const startWeek = item.range[0];
    const endWeek = item.range[1];
    const startPage = Math.min(juzInfo.start_page + (startWeek - 1), juzInfo.end_page);
    const endPage = Math.min(juzInfo.start_page + (endWeek - 1), juzInfo.end_page);
    
    const startBlok = `H${startWeek + blockOffset}${item.parts[0]}`;
    const endBlok = `H${endWeek + blockOffset}${item.parts[1] || item.parts[0]}`;

    allBlocks.push({
      block_code: item.code,
      week_number: 11,
      part: item.day,
      start_page: startPage,
      end_page: endPage,
      is_completed: false,
      jurnal_count: 0,
      target: item.target,
      label: `${item.day}: ${startBlok}-${endBlok} (${item.target})`
    } as any);
  }

  // Get date filter from batch
  let dateFilter = '1970-01-01';
  if (activeRegistration.b_opening_class_date) {
    const d = new Date(activeRegistration.b_opening_class_date);
    d.setDate(d.getDate() - 1);
    dateFilter = d.toISOString().split('T')[0];
  } else if (activeRegistration.b_start_date) {
    const d = new Date(activeRegistration.b_start_date);
    d.setDate(d.getDate() - 1);
    dateFilter = d.toISOString().split('T')[0];
  }

  if (activeRegistration.id !== 'preview-id') {
    const { rows: jurnalRecords } = await import('@/lib/db').then(m => m.query(
      `SELECT blok, tanggal_setor, juz_code 
       FROM jurnal_records 
       WHERE user_id = $1 
         AND (tanggal_setor >= $2 OR created_at >= $2)
       ORDER BY tanggal_setor ASC`,
      [user.id, dateFilter]
    ));

    if (jurnalRecords && jurnalRecords.length > 0) {
      const blockStatus = new Map<string, { is_completed: boolean; jurnal_count: number; jurnal_date?: string }>();
      allBlocks.forEach(block => blockStatus.set(block.block_code, { is_completed: false, jurnal_count: 0 }));

      jurnalRecords.forEach((record: any) => {
        if (record.blok) {
          const blocksInRecord: string[] = typeof record.blok === 'string'
            ? record.blok.split(',').map((b: string) => b.trim()).filter((b: string) => b)
            : (Array.isArray(record.blok) ? record.blok : []);

          blocksInRecord.forEach((blockCode: string) => {
            const current = blockStatus.get(blockCode);
            if (current) {
              current.is_completed = true;
              current.jurnal_count += 1;
              if (!current.jurnal_date || new Date(record.tanggal_setor) < new Date(current.jurnal_date)) {
                current.jurnal_date = record.tanggal_setor;
              }
              blockStatus.set(blockCode, current);
            }
          });
        }
      });

      allBlocks.forEach(block => {
        const status = blockStatus.get(block.block_code);
        if (status) {
          block.is_completed = status.is_completed;
          block.jurnal_count = status.jurnal_count;
          block.jurnal_date = status.jurnal_date;
        }
      });

      // Calculate streak dynamically
      const uniqueDates: string[] = Array.from(new Set<string>(jurnalRecords.map((r: any) => String(r.tanggal_setor))));
      streakCount = calculateJurnalStreak(uniqueDates);
    }
  }

  // Get current active SP
  let activeSP = null;
  if (activeRegistration.id !== 'preview-id') {
    const { rows: spRecords } = await import('@/lib/db').then(m => m.query(
      `SELECT sp_level, week_number, issued_at, reason, is_blacklisted, sp_type
       FROM surat_peringatan
       WHERE thalibah_id = $1 AND status = 'active'
       ORDER BY sp_level DESC
       LIMIT 1`,
      [user.id]
    ));
    
    if (spRecords && spRecords.length > 0) {
      activeSP = spRecords[0];
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      juz_code: juzCode,
      juz_info: juzInfo,
      blocks: allBlocks,
      summary: {
        total_blocks: allBlocks.filter(b => !b.block_code.startsWith('M')).length,
        completed_blocks: allBlocks.filter(b => b.is_completed && !b.block_code.startsWith('M')).length,
        pending_blocks: allBlocks.filter(b => !b.is_completed && !b.block_code.startsWith('M')).length,
        streak_count: streakCount,
        sp_summary: activeSP ? {
          sp_level: activeSP.sp_level,
          week_number: activeSP.week_number,
          issued_at: activeSP.issued_at,
          reason: activeSP.reason,
          is_blacklisted: activeSP.is_blacklisted,
          sp_type: activeSP.sp_type,
        } : null
      }
    }
  });
}

export async function GET(request: Request) {
  try {
    const response = new NextResponse();
    const context = await getAuthorizationContext({ response });

    if (!context) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('user_id');
    const targetBatchId = searchParams.get('batch_id');
    
    // Authorization: Use provided user_id only if requester is admin
    const isAdmin = isUserAdmin(context);
    const impersonatedUserId = (isAdmin && targetUserId) ? targetUserId : context.userId;
    const user = { id: impersonatedUserId, email: context.email };

    const batchFilterSql = targetBatchId ? `AND p.batch_id = '${targetBatchId}'` : '';
    const { rows: registrations } = await import('@/lib/db').then(m => m.query(
      `SELECT 
         p.id,
         p.status,
         p.batch_id,
         COALESCE(du.confirmed_chosen_juz, p.chosen_juz) as chosen_juz,
         b.id as b_id,
         b.start_date as b_start_date,
         b.opening_class_date as b_opening_class_date,
         b.first_week_start_date as b_first_week_start_date,
         b.status as b_status,
         du.confirmed_chosen_juz
       FROM pendaftaran_tikrar_tahfidz p
       JOIN batches b ON p.batch_id = b.id
       LEFT JOIN daftar_ulang_submissions du ON du.user_id = p.user_id AND du.batch_id = p.batch_id
       WHERE p.user_id = $1
         AND p.status IN ('approved', 'selected', 'registered', 'pending')
         ${batchFilterSql}
       ORDER BY (b.status = 'open' OR b.status = 'ongoing') DESC, p.created_at DESC
       LIMIT 1`,
      [user.id]
    ));

    if (!registrations || registrations.length === 0) {
      // Admin Preview Fallback
      if (isUserAdmin(context)) {
        console.log(`[Jurnal Status] Admin Preview activated for ${user.email}`);
        return processJurnalStatus(user, {
          id: 'preview-id',
          status: 'approved',
          batch_id: 'preview-batch',
          chosen_juz: '30A',
          b_start_date: new Date().toISOString(),
          b_status: 'open',
          confirmed_chosen_juz: '30A'
        });
      }

      console.log(`[Jurnal Status] No admin access and no registrations for ${user.email}`);
      return NextResponse.json({ success: true, data: null, message: 'No active registration found' }, { status: 200 });
    }

    const activeRegistration = registrations[0];
    return processJurnalStatus(user, activeRegistration);

  } catch (error) {
    console.error('[Jurnal Status] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch jurnal status' }, { status: 500 });
  }
}
