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

async function processJurnalStatus(supabase: any, user: any, activeRegistration: any) {
  let streakCount = 0;

  // Get juz from confirmed_chosen_juz from daftar_ulang, or chosen_juz from registration
  const juzCode = activeRegistration.daftar_ulang?.confirmed_chosen_juz ||
                  activeRegistration.chosen_juz

  if (!juzCode) {
    return NextResponse.json(
      { success: false, error: 'No juz assigned' },
      { status: 404 }
    )
  }

  // Get juz info
  const { data: juzInfo, error: juzError } = await supabase
    .from('juz_options')
    .select('*')
    .eq('code', juzCode)
    .single()

  if (juzError || !juzInfo) {
    return NextResponse.json(
      { success: false, error: 'Juz not found' },
      { status: 404 }
    )
  }

  // Generate all blocks for this juz dynamically
  const allBlocks: JurnalBlockStatus[] = []
  const parts = ['A', 'B', 'C', 'D']
  const ziyadahWeeks = 10
  const blockOffset = juzInfo.part === 'B' ? 10 : 0

  // 1. Ziyadah Weeks (Pekan 1-10)
  for (let week = 1; week <= ziyadahWeeks; week++) {
    const blockNumber = week + blockOffset
    const weekPage = Math.min(juzInfo.start_page + (week - 1), juzInfo.end_page)
    for (let i = 0; i < 4; i++) {
      allBlocks.push({
        block_code: `H${blockNumber}${parts[i]}`,
        week_number: week,
        part: parts[i],
        start_page: weekPage,
        end_page: weekPage,
        is_completed: false,
        jurnal_count: 0
      })
    }
  }

  // 2. Murajaah Week (Pekan 11)
  // Berdasarkan jadwal 7 hari: Senin-Ahad
  const murajaahSchedule = [
    { day: 'Senin', range: [1, 3], parts: ['A', 'B'], target: '4×', code: 'M1' },
    { day: 'Selasa', range: [3, 5], parts: ['C', 'D'], target: '4×', code: 'M2' },
    { day: 'Rabu', range: [1, 5], parts: ['A', 'D'], target: '2×', code: 'M3' },
    { day: 'Kamis', range: [6, 8], parts: ['A', 'B'], target: '4×', code: 'M4' },
    { day: 'Jum\'at', range: [8, 10], parts: ['C', 'D'], target: '4×', code: 'M5' },
    { day: 'Sabtu', range: [6, 10], parts: ['A', 'D'], target: '2×', code: 'M6' },
    { day: 'Ahad', range: [1, 10], parts: ['A', 'D'], target: '1×', code: 'M7' },
  ]

  for (const item of murajaahSchedule) {
    const startWeek = item.range[0]
    const endWeek = item.range[1]
    const startPage = Math.min(juzInfo.start_page + (startWeek - 1), juzInfo.end_page)
    const endPage = Math.min(juzInfo.start_page + (endWeek - 1), juzInfo.end_page)
    
    // Label untuk UI
    const startBlok = `H${startWeek + blockOffset}${item.parts[0]}`
    const endBlok = `H${endWeek + blockOffset}${item.parts[1] || item.parts[0]}`

    allBlocks.push({
      block_code: item.code,
      week_number: 11,
      part: item.day, // Gunakan part untuk nama hari
      start_page: startPage,
      end_page: endPage,
      is_completed: false,
      jurnal_count: 0,
      target: item.target,
      label: `${item.day}: ${startBlok}-${endBlok} (${item.target})`
    } as any)
  }

  // Get date filter from batch
  let dateFilter = '1970-01-01'
  if (activeRegistration.batch?.opening_class_date) {
    dateFilter = activeRegistration.batch.opening_class_date
  } else if (activeRegistration.batch?.start_date) {
    dateFilter = activeRegistration.batch.start_date
  }

  if (activeRegistration.id !== 'preview-id') {
    let jurnalQuery = supabase
      .from('jurnal_records')
      .select('blok, tanggal_setor, juz_code')
      .eq('user_id', user.id)
      .gte('tanggal_setor', dateFilter)
      .order('tanggal_setor', { ascending: true })

    if (juzCode) {
      jurnalQuery = jurnalQuery.or(`juz_code.eq.${juzCode},juz_code.is.null`)
    }

    const { data: jurnalRecords, error: jurnalError } = await jurnalQuery

    if (!jurnalError && jurnalRecords) {
      const blockStatus = new Map<string, { is_completed: boolean; jurnal_count: number; jurnal_date?: string }>()
      allBlocks.forEach(block => blockStatus.set(block.block_code, { is_completed: false, jurnal_count: 0 }))

      jurnalRecords.forEach((record: any) => {
        if (record.blok) {
          const blocksInRecord: string[] = typeof record.blok === 'string'
            ? record.blok.split(',').map((b: string) => b.trim()).filter((b: string) => b)
            : (Array.isArray(record.blok) ? record.blok : [])

          blocksInRecord.forEach((blockCode: string) => {
            const current = blockStatus.get(blockCode)
            if (current) {
              current.is_completed = true
              current.jurnal_count += 1
              if (!current.jurnal_date || new Date(record.tanggal_setor) < new Date(current.jurnal_date)) {
                current.jurnal_date = record.tanggal_setor
              }
              blockStatus.set(blockCode, current)
            }
          })
        }
      })

      allBlocks.forEach(block => {
        const status = blockStatus.get(block.block_code)
        if (status) {
          block.is_completed = status.is_completed
          block.jurnal_count = status.jurnal_count
          block.jurnal_date = status.jurnal_date
        }
      })

      // Calculate streak dynamically
      const uniqueDates: string[] = Array.from(new Set<string>(jurnalRecords.map((r: any) => String(r.tanggal_setor))));
      streakCount = calculateJurnalStreak(uniqueDates);
    }
  }

  // Get current active SP
  let activeSP = null
  if (activeRegistration.id !== 'preview-id') {
    const { data: spRecords } = await supabase
      .from('surat_peringatan')
      .select('sp_level, week_number, issued_at, reason, is_blacklisted, sp_type')
      .eq('thalibah_id', user.id)
      .eq('status', 'active')
      .order('sp_level', { ascending: false })
      .limit(1)
    
    if (spRecords && spRecords.length > 0) {
      activeSP = spRecords[0]
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
  })
}

export async function GET(request: Request) {
  try {
    const response = new NextResponse()
    const context = await getAuthorizationContext({ response })

    if (!context) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient({ response })
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('user_id')
    const targetBatchId = searchParams.get('batch_id')
    
    // Authorization: Use provided user_id only if requester is admin
    const isAdmin = isUserAdmin(context)
    const impersonatedUserId = (isAdmin && targetUserId) ? targetUserId : context.userId
    const user = { id: impersonatedUserId, email: context.email }

    if (isAdmin && targetUserId) {
      console.log(`[Jurnal Status] Admin ${context.email} impersonating user_id: ${targetUserId}`)
    }

    let query = supabase
      .from('pendaftaran_tikrar_tahfidz')
      .select(`
        id,
        status,
        batch_id,
        chosen_juz,
        batch:batches(id, start_date, status, opening_class_date),
        daftar_ulang:daftar_ulang_submissions(
          id,
          user_id,
          batch_id,
          registration_id,
          confirmed_chosen_juz,
          status
        )
      `)
      .eq('user_id', user.id)
      .in('status', ['approved', 'selected', 'registered', 'pending']) // Include pending so it can show empty state
      .order('created_at', { ascending: false })

    if (targetBatchId) {
      query = query.eq('batch_id', targetBatchId)
    }

    // Get user's active registration with daftar ulang
    const { data: registrations, error: regsError } = await query

    if (regsError) {
      return NextResponse.json({ success: false, error: 'Failed to fetch registrations', details: regsError }, { status: 500 })
    }

    if (!registrations || registrations.length === 0) {
      // Admin Preview Fallback
      if (isUserAdmin(context)) {
        console.log(`[Jurnal Status] Admin Preview activated for ${user.email}`)
        return processJurnalStatus(supabase, user, {
          id: 'preview-id',
          status: 'approved',
          batch_id: 'preview-batch',
          chosen_juz: '30A',
          batch: { id: 'preview-batch', start_date: new Date().toISOString(), status: 'open' },
          daftar_ulang: { confirmed_chosen_juz: '30A' }
        })
      }

      console.log(`[Jurnal Status] No admin access and no registrations for ${user.email}`)
      return NextResponse.json({ success: true, data: null, message: 'No active registration found' }, { status: 200 })
    }

    // Process first registration
    const reg = registrations[0]
    const daftarUlang = reg.daftar_ulang && Array.isArray(reg.daftar_ulang)
      ? reg.daftar_ulang.find((du: any) => du.batch_id === reg.batch_id)
      : null

    const activeRegistration = { ...reg, daftar_ulang: daftarUlang || null }
    return processJurnalStatus(supabase, user, activeRegistration)

  } catch (error) {
    console.error('[Jurnal Status] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch jurnal status' }, { status: 500 })
  }
}
