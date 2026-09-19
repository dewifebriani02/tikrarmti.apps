import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthorizationContext, isUserAdmin } from '@/lib/rbac'

export interface TashihBlockStatus {
  block_code: string
  week_number: number
  part: string
  start_page: number
  end_page: number
  is_completed: boolean
  tashih_date?: string
  tashih_count: number
}

function calculateTashihStreak(tanggalTashihList: string[]): number {
  if (tanggalTashihList.length === 0) return 0;
  
  const submittedDates = new Set(tanggalTashihList);
  
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

async function processJuzStatus(user: any, activeRegistration: any) {
  let streakCount = 0;
  const juzCode = activeRegistration.confirmed_chosen_juz || activeRegistration.chosen_juz;

  if (!juzCode) {
    return NextResponse.json(
      { success: false, error: 'No juz assigned' },
      { status: 200 }
    );
  }

  // Get juz info via direct SQL
  const { rows: juzRows } = await import('@/lib/db').then(m => m.query(
    'SELECT * FROM juz_options WHERE code = $1 LIMIT 1',
    [juzCode]
  ));
  const juzInfo = juzRows[0];

  if (!juzInfo) {
    return NextResponse.json(
      { success: false, error: 'Juz not found' },
      { status: 200 }
    );
  }

  // Generate all blocks for this juz dynamically
  const allBlocks: TashihBlockStatus[] = [];
  const parts = ['A', 'B', 'C', 'D'];
  const totalWeeks = 10;
  const blockOffset = juzInfo.part === 'B' ? 10 : 0;

  for (let week = 1; week <= totalWeeks; week++) {
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
        tashih_count: 0
      });
    }
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

  // Get all tashih records for this user (skip for preview-id mock)
  if (activeRegistration.id !== 'preview-id') {
    const { rows: tashihRecords } = await import('@/lib/db').then(m => m.query(
      `SELECT blok, waktu_tashih 
       FROM tashih_records 
       WHERE user_id = $1 
         AND (waktu_tashih >= $2 OR created_at >= $2)
       ORDER BY waktu_tashih ASC`,
      [user.id, dateFilter]
    ));

    if (tashihRecords && tashihRecords.length > 0) {
      const blockStatus = new Map<string, { is_completed: boolean; tashih_count: number; tashih_date?: string }>();
      allBlocks.forEach(block => blockStatus.set(block.block_code, { is_completed: false, tashih_count: 0 }));

      tashihRecords.forEach((record: any) => {
        if (record.blok) {
          const blocksInRecord: string[] = typeof record.blok === 'string'
            ? record.blok.split(',').map((b: string) => b.trim()).filter((b: string) => b)
            : (Array.isArray(record.blok) ? record.blok : []);

          blocksInRecord.forEach((blockCode: string) => {
            const current = blockStatus.get(blockCode);
            if (current) {
              current.is_completed = true;
              current.tashih_count += 1;
              if (!current.tashih_date || new Date(record.waktu_tashih) < new Date(current.tashih_date)) {
                current.tashih_date = record.waktu_tashih;
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
          block.tashih_count = status.tashih_count;
          block.tashih_date = status.tashih_date;
        }
      });
      
      // Calculate streak dynamically
      const uniqueDates: string[] = Array.from(new Set<string>(tashihRecords.map((r: any) => String(r.waktu_tashih).split('T')[0])));
      streakCount = calculateTashihStreak(uniqueDates);
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      juz_code: juzCode,
      juz_info: juzInfo,
      blocks: allBlocks,
      summary: {
        total_blocks: allBlocks.length,
        completed_blocks: allBlocks.filter(b => b.is_completed).length,
        pending_blocks: allBlocks.filter(b => !b.is_completed).length,
        streak_count: streakCount
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
        console.log(`[Tashih Status] Admin Preview activated for ${user.email}`);
        return processJuzStatus(user, {
          id: 'preview-id',
          status: 'approved',
          batch_id: 'preview-batch',
          chosen_juz: '30A',
          b_start_date: new Date().toISOString(),
          b_status: 'open',
          confirmed_chosen_juz: '30A'
        });
      }

      console.log(`[Tashih Status] No admin access and no registrations for ${user.email}`);
      return NextResponse.json({ success: false, error: 'No active registration found' }, { status: 200 });
    }

    const activeRegistration = registrations[0];
    return processJuzStatus(user, activeRegistration);

  } catch (error) {
    console.error('[Tashih Status] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tashih status' }, { status: 500 });
  }
}
