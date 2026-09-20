import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAnyRole, getAuthorizationContext } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { NextResponse } from 'next/server';

// Helper to normalize block code (ensure it starts with H or M)
function normalizeBlokCode(code: string): string {
  if (!code) return code;
  const cleanCode = code.trim().toUpperCase();
  if (cleanCode.startsWith('H') || cleanCode.startsWith('M')) return cleanCode;
  return `H${cleanCode}`;
}

// Helper function to calculate week number from blok code
function calculateWeekFromBlok(blok: string | null): number | null {
  if (!blok) return null;

  let blokCode: string | null = blok;

  // Handle array format like "[\"H11A\"]"
  if (blokCode.startsWith('[')) {
    try {
      const parsed = JSON.parse(blokCode);
      if (Array.isArray(parsed) && parsed.length > 0) {
        blokCode = parsed[0];
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }

  if (!blokCode) return null;

  // Normalize code first
  blokCode = normalizeBlokCode(blokCode);

  // Handle Murajaah blocks (M1-M7)
  if (blokCode.startsWith('M')) {
    const murajaahMatch = blokCode.match(/M(\d+)/);
    if (murajaahMatch) {
      const mNumber = parseInt(murajaahMatch[1], 10);
      if (mNumber >= 1 && mNumber <= 7) return 11;
    }
  }

  // Extract number from blok code (e.g., "H1A" -> 1, "H11B" -> 11)
  const match = blokCode.match(/H(\d+)/) || blokCode.match(/^(\d+)/);
  if (!match) return null;

  const blockNumber = parseInt(match[1], 10);

  // Map block number to week (H1-H10 = pekan 1-10, H11-H20 = pekan 1-10 for juz 2)
  if (blockNumber >= 1 && blockNumber <= 10) {
    return blockNumber; 
  } else if (blockNumber >= 11 && blockNumber <= 20) {
    return blockNumber - 10; 
  }

  return null;
}

// Helper to generate all blocks (Ziyadah 10 weeks + Murajaah 2 weeks) for a juz
function generateAllBlocks(juzInfo: any) {
  const allBlocks: any[] = [];
  const parts = ['A', 'B', 'C', 'D'];
  const blockOffset = juzInfo.part === 'B' ? 10 : 0;

  // 1. Ziyadah Weeks (1-10)
  for (let week = 1; week <= 10; week++) {
    const blockNumber = week + blockOffset;
    const weekStartPage = juzInfo.start_page + (week - 1);

    for (let i = 0; i < 4; i++) {
      const part = parts[i];
      const blockCode = `H${blockNumber}${part}`;

      allBlocks.push({
        block_code: blockCode,
        week_number: week,
        part,
        start_page: Math.min(weekStartPage, juzInfo.end_page),
        end_page: Math.min(weekStartPage, juzInfo.end_page),
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
    });
  }

  return allBlocks;
}

// Helper to calculate weekly status
function calculateWeeklyStatus(allBlocks: any[], jurnalRecords: any[]) {
  const blockStatus = new Map<string, { is_completed: boolean; jurnal_count: number; jurnal_date?: string }>();

  // Initialize all blocks as not completed
  allBlocks.forEach(block => {
    blockStatus.set(normalizeBlokCode(block.block_code), { is_completed: false, jurnal_count: 0 });
  });

  // Mark blocks that have jurnal records
  jurnalRecords.forEach(record => {
    if (record.blok) {
      // Handle both string and array format for blok field
      let blokCodes: string[] = [];
      if (typeof record.blok === 'string' && record.blok.startsWith('[')) {
        try {
          const parsed = JSON.parse(record.blok);
          blokCodes = Array.isArray(parsed) ? parsed : [record.blok];
        } catch {
          blokCodes = [record.blok];
        }
      } else {
        blokCodes = [record.blok];
      }

      // Mark each blok as completed
      blokCodes.forEach(rawBlokCode => {
        if (!rawBlokCode) return;
        
        let subBloks: string[] = [];
        if (typeof rawBlokCode === 'string') {
          // If the element itself is comma-separated (legacy or bulk input)
          subBloks = rawBlokCode.split(',').map(s => s.trim()).filter(Boolean);
        } else {
          subBloks = [String(rawBlokCode)];
        }

        subBloks.forEach(sCode => {
          const blokCode = normalizeBlokCode(sCode);
          const current = blockStatus.get(blokCode);
          if (current) {
            current.is_completed = true;
            current.jurnal_count += 1;
            if (!current.jurnal_date || new Date(record.tanggal_setor || record.created_at) > new Date(current.jurnal_date)) {
              current.jurnal_date = record.tanggal_setor || record.created_at;
            }
            blockStatus.set(blokCode, current);
          }
        });
      });
    }
  });

  const weeklyStatus: any[] = [];
  const maxWeek = Math.max(...allBlocks.map(b => b.week_number), 10);
  
  for (let week = 1; week <= maxWeek; week++) {
    const weekBlocks = allBlocks.filter(b => b.week_number === week);
    if (weekBlocks.length === 0 && week > 10) continue; // Skip empty weeks after 10

    const completedBlocks = weekBlocks.filter(b => {
      const status = blockStatus.get(normalizeBlokCode(b.block_code));
      return status?.is_completed || false;
    });

    weeklyStatus.push({
      week_number: week,
      total_blocks: weekBlocks.length,
      completed_blocks: completedBlocks.length,
      is_completed: weekBlocks.length > 0 && completedBlocks.length === weekBlocks.length,
      blocks: weekBlocks.map(b => ({
        ...b,
        is_completed: blockStatus.get(normalizeBlokCode(b.block_code))?.is_completed || false,
        jurnal_count: blockStatus.get(normalizeBlokCode(b.block_code))?.jurnal_count || 0
      }))
    });
  }

  return weeklyStatus;
}

// Validation schema for jurnal record
const jurnalRecordSchema = z.object({
  user_id: z.string().uuid(),
  tanggal_jurnal: z.string().optional(),
  tanggal_setor: z.string().optional(),
  juz_code: z.string().nullable().optional(),
  blok: z.string().nullable().optional(),
  pekan: z.number().nullable().optional(),
  tashih_completed: z.boolean().optional(),
  rabth_completed: z.boolean().optional(),
  rabth_methods: z.array(z.string()).optional(),
  tafsir_options: z.array(z.string()).optional(),
  murajaah_count: z.number().optional(),
  simak_murattal_count: z.number().optional(),
  tikrar_bi_an_nadzar_completed: z.boolean().optional(),
  tasmi_record_count: z.number().optional(),
  simak_record_completed: z.boolean().optional(),
  tikrar_bi_al_ghaib_count: z.number().optional(),
  total_duration_minutes: z.number().optional(),
  catatan_tambahan: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    // 1. Authorization check - Standardized via requireAnyRole
    const authError = await requireAnyRole(['admin', 'musyrifah']);
    if (authError) return authError;

    const context = await getAuthorizationContext();
    if (!context) return ApiResponses.unauthorized('Unable to get authorization context');

    const supabase = createClient();

    // Get URL parameters for filtering
    const { searchParams } = new URL(request.url);
    const debugMode = searchParams.get('debug') === 'true';

    // DEBUG MODE: Return raw data for specific users to troubleshoot
    if (debugMode) {
      const debugNames = ['Afifah', 'Aam', 'Agustina', 'Meyntie', 'Enih'];
      const debugData: any = {
        timestamp: new Date().toISOString(),
        target_names: debugNames,
        users: [],
        juz_options: []
      };

      for (const name of debugNames) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name, nama_kunyah')
          .ilike('full_name', `%${name}%`);

        if (users && users.length > 0) {
          for (const u of users) {
            const { data: submission } = await supabase
              .from('daftar_ulang_submissions')
              .select('*')
              .eq('user_id', u.id)
              .maybeSingle();

            const { data: records } = await supabase
              .from('jurnal_records')
              .select('*')
              .eq('user_id', u.id)
              .order('created_at', { ascending: false });

            let generatedBlocks: any[] = [];
            let debugWeeklyStatus: any[] = [];
            let blockStatusDump: any = {};

            if (submission?.confirmed_chosen_juz) {
              const { data: juz } = await supabase
                .from('juz_options')
                .select('*')
                .eq('code', submission.confirmed_chosen_juz)
                .maybeSingle();

              if (juz) {
                generatedBlocks = generateAllBlocks(juz);
                debugWeeklyStatus = calculateWeeklyStatus(generatedBlocks, records || []);

                generatedBlocks.filter(b => b.week_number <= 2).forEach(b => {
                  const status = debugWeeklyStatus.find(w => w.week_number === b.week_number)?.blocks.find((ib: any) => ib.block_code === b.block_code);
                  const hasJurnal = records?.some(r => normalizeBlokCode(r.blok) === b.block_code);

                  blockStatusDump[b.block_code] = {
                    in_generated: true,
                    has_record_match: hasJurnal,
                    final_status_is_completed: status?.is_completed
                  };
                });
              }
            }

            debugData.users.push({
              info: u,
              submission,
              records_count: records?.length,
              block_status_dump: blockStatusDump,
              weekly_status_summary: debugWeeklyStatus.map(w => `W${w.week_number}: ${w.completed_blocks}/${w.total_blocks}`),
              records: records?.map(r => ({
                id: r.id,
                blok: r.blok,
                normalized_blok: normalizeBlokCode(r.blok || ''),
                tanggal_setor: r.tanggal_setor
              })),
              generated_blocks_sample: generatedBlocks.slice(0, 5)
            });
          }
        }
      }

      const { data: allJuz } = await supabase.from('juz_options').select('*');
      debugData.juz_options = allJuz;

      return ApiResponses.success(debugData);
    }

    const blok = searchParams.get('blok');
    const pekan = searchParams.get('pekan');
    const batchId = searchParams.get('batch_id');
    const statusParam = searchParams.get('status');
    const isBlacklisted = searchParams.get('is_blacklisted') === 'true';
    const isDropout = searchParams.get('is_dropout') === 'true';
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let activeBatchId = batchId;
    let currentWeek = 0;
    let activeBatchData: any = null;

    // Define allowed statuses based on the request
    let targetStatuses = ['approved', 'submitted'];
    if (statusParam === 'dropout' || isDropout) {
      targetStatuses = ['dropout', 'mengundurkan_diri'];
    }

    if (!activeBatchId) {
      const { rows: batchRows } = await import('@/lib/db').then(m => m.query(
        `SELECT id, start_date, first_week_start_date, end_date FROM batches WHERE status = 'open' ORDER BY created_at DESC LIMIT 1`
      ));
      activeBatchData = batchRows[0] || null;
      activeBatchId = activeBatchData?.id;
    } else {
      const { rows: batchRows } = await import('@/lib/db').then(m => m.query(
        `SELECT id, start_date, first_week_start_date, end_date FROM batches WHERE id = $1`,
        [activeBatchId]
      ));
      activeBatchData = batchRows[0] || null;
    }

    if (activeBatchData?.first_week_start_date) {
      const firstWeekStart = new Date(activeBatchData.first_week_start_date);
      // Use WIB (UTC+7) time to avoid off-by-one on Monday 00:00-06:59 WIB
      const nowUtc = new Date();
      const nowWib = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000);
      const diffTime = nowWib.getTime() - firstWeekStart.getTime();
      const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
      currentWeek = Math.max(1, diffWeeks + 1);
    }

    // Build WHERE clauses for SQL query
    const whereClauses: string[] = ['du.status = ANY($1::text[])'];
    const params: any[] = [targetStatuses];

    if (isBlacklisted) {
      params.push(true);
      whereClauses.push(`u.is_blacklisted = $${params.length}`);
    } else if (!isDropout && statusParam !== 'dropout') {
      params.push(false);
      whereClauses.push(`u.is_blacklisted = $${params.length}`);
    }

    if (activeBatchId) {
      params.push(activeBatchId);
      whereClauses.push(`du.batch_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      whereClauses.push(`(LOWER(u.full_name) LIKE $${params.length} OR LOWER(COALESCE(u.nama_kunyah, '')) LIKE $${params.length} OR LOWER(COALESCE(du.confirmed_full_name, '')) LIKE $${params.length})`);
    }

    const whereSql = whereClauses.join(' AND ');

    // 1. Total Count Query
    const { rows: countRows } = await import('@/lib/db').then(m => m.query(
      `SELECT COUNT(*) as cnt
       FROM daftar_ulang_submissions du
       JOIN users u ON du.user_id = u.id
       WHERE ${whereSql}`,
      params
    ));
    const totalCount = parseInt(countRows[0]?.cnt || '0', 10);

    // 2. Approved Count Query
    const { rows: approvedCountRows } = await import('@/lib/db').then(m => m.query(
      `SELECT COUNT(*) as cnt
       FROM daftar_ulang_submissions du
       JOIN users u ON du.user_id = u.id
       WHERE du.status = 'approved' ${activeBatchId ? `AND du.batch_id = '${activeBatchId}'` : ''} AND u.is_blacklisted = false`
    ));
    const approvedCount = parseInt(approvedCountRows[0]?.cnt || '0', 10);

    // 3. Dropout Count Query
    const { rows: dropoutRows } = await import('@/lib/db').then(m => m.query(
      `SELECT COUNT(*) as cnt FROM daftar_ulang_submissions WHERE status = 'dropout' ${activeBatchId ? `AND batch_id = '${activeBatchId}'` : ''}`
    ));
    const dropoutCount = parseInt(dropoutRows[0]?.cnt || '0', 10);

    // 4. Resign Count Query
    const { rows: resignRows } = await import('@/lib/db').then(m => m.query(
      `SELECT COUNT(*) as cnt FROM daftar_ulang_submissions WHERE status = 'mengundurkan_diri' ${activeBatchId ? `AND batch_id = '${activeBatchId}'` : ''}`
    ));
    const resignCount = parseInt(resignRows[0]?.cnt || '0', 10);

    // 5. Paginated Submissions Query
    const queryParams = [...params, limit, offset];
    const { rows: daftarUlangUsers } = await import('@/lib/db').then(m => m.query(
      `SELECT 
         du.user_id,
         du.confirmed_full_name,
         du.confirmed_wa_phone,
         du.confirmed_chosen_juz,
         du.status,
         du.submitted_at,
         du.reviewed_at,
         u.full_name,
         u.nama_kunyah,
         u.avatar_url,
         u.whatsapp,
         u.email,
         u.is_blacklisted,
         h.name as halaqah_name
       FROM daftar_ulang_submissions du
       JOIN users u ON du.user_id = u.id
       LEFT JOIN halaqah h ON du.tashih_halaqah_id = h.id
       WHERE ${whereSql}
       ORDER BY du.confirmed_full_name ASC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    ));

    const daftarUlangUserIds = daftarUlangUsers.map((d: any) => d.user_id);

    // 6. Jurnal Records for these users
    let entries: any[] = [];
    if (daftarUlangUserIds.length > 0) {
      const jParams: any[] = [daftarUlangUserIds];
      let jWhere = 'user_id = ANY($1::uuid[])';
      if (blok && blok !== 'all') {
        jParams.push(blok);
        jWhere += ` AND blok = $${jParams.length}`;
      }
      if (activeBatchData?.start_date) {
        const filterStartDate = new Date(activeBatchData.start_date);
        filterStartDate.setDate(filterStartDate.getDate() - 1);
        jParams.push(filterStartDate.toISOString());
        jWhere += ` AND created_at >= $${jParams.length}`;
      }
      if (activeBatchData?.end_date) {
        const filterEndDate = new Date(activeBatchData.end_date);
        filterEndDate.setDate(filterEndDate.getDate() + 7);
        jParams.push(filterEndDate.toISOString());
        jWhere += ` AND created_at <= $${jParams.length}`;
      }
      const { rows: jRows } = await import('@/lib/db').then(m => m.query(
        `SELECT id, user_id, tanggal_jurnal, tanggal_setor, juz_code, blok,
                tashih_completed, rabth_completed, murajaah_count, simak_murattal_count,
                tikrar_bi_an_nadzar_completed, tasmi_record_count, simak_record_completed,
                tikrar_bi_al_ghaib_count, tafsir_completed, menulis_completed,
                total_duration_minutes, catatan_tambahan, created_at, updated_at
         FROM jurnal_records
         WHERE ${jWhere}
         ORDER BY tanggal_setor DESC`,
        jParams
      ));
      entries = jRows;
    }

    const userMap = new Map();
    daftarUlangUsers.forEach((u: any) => {
      userMap.set(u.user_id, {
        id: u.user_id,
        full_name: u.full_name,
        nama_kunyah: u.nama_kunyah,
        avatar_url: u.avatar_url,
        whatsapp: u.whatsapp,
        email: u.email,
        is_blacklisted: u.is_blacklisted,
      });
    });

    const daftarUlangMap = new Map();
    daftarUlangUsers.forEach((d: any) => {
      daftarUlangMap.set(d.user_id, {
        ...d,
        tashih_halaqah: d.halaqah_name ? { name: d.halaqah_name } : null
      });
    });

    const jurnalByUser = new Map();
    entries.forEach((record: any) => {
      if (!jurnalByUser.has(record.user_id)) {
        jurnalByUser.set(record.user_id, []);
      }
      jurnalByUser.get(record.user_id).push(record);
    });

    const allBloks = new Set<string>();
    entries.forEach((record: any) => {
      if (record.blok) {
        try {
          const bloks = typeof record.blok === 'string' && record.blok.startsWith('[')
            ? JSON.parse(record.blok)
            : [record.blok];
          bloks.forEach((b: any) => allBloks.add(normalizeBlokCode(b)));
        } catch {
          allBloks.add(normalizeBlokCode(record.blok));
        }
      }
    });

    const uniqueJuzCodes = Array.from(new Set(
      daftarUlangUsers.map((d: any) => d.confirmed_chosen_juz).filter(Boolean)
    ));

    const juzInfoMap = new Map();
    if (uniqueJuzCodes.length > 0) {
      const { rows: juzRows } = await import('@/lib/db').then(m => m.query(
        `SELECT * FROM juz_options WHERE code = ANY($1::text[])`,
        [uniqueJuzCodes]
      ));
      juzRows.forEach((juz: any) => {
        juzInfoMap.set(juz.code, juz);
      });
    }

    let spRecords: any[] = [];
    if (daftarUlangUserIds.length > 0) {
      const { rows: spRows } = await import('@/lib/db').then(m => m.query(
        `SELECT thalibah_id, sp_level, week_number, status, issued_at, reason, is_blacklisted, sp_type
         FROM surat_peringatan
         WHERE status = 'active' AND thalibah_id = ANY($1::uuid[])`,
        [daftarUlangUserIds]
      ));
      spRecords = spRows;
    }

    const spByUserAndWeek = new Map();
    const spByUser = new Map();
    spRecords?.forEach((sp: any) => {
      if (!spByUser.has(sp.thalibah_id)) {
        spByUser.set(sp.thalibah_id, []);
      }
      spByUser.get(sp.thalibah_id).push(sp);
      
      const key = `${sp.thalibah_id}-${sp.week_number}`;
      spByUserAndWeek.set(key, sp);
    });

    const combinedEntries = daftarUlangUserIds.map((userId: string) => {
      const daftarUlang = daftarUlangMap.get(userId);
      const userJurnalRecords = jurnalByUser.get(userId) || [];
      const latestJurnal = userJurnalRecords.length > 0
        ? [...userJurnalRecords].sort((a: any, b: any) =>
          new Date(b.tanggal_setor || b.created_at).getTime() -
          new Date(a.tanggal_setor || a.created_at).getTime()
        )[0]
        : null;
      const juzCode = daftarUlang?.confirmed_chosen_juz;
      const juzInfo = juzCode ? juzInfoMap.get(juzCode) : null;

      let weeklyStatus: any[] = [];
      let totalBlocks = 0;
      let completedBlocks = 0;

      if (juzInfo) {
        const allBlocks = generateAllBlocks(juzInfo);
        weeklyStatus = calculateWeeklyStatus(allBlocks, userJurnalRecords);
        const ziyadahBlocks = allBlocks.filter(b => !b.block_code.startsWith('M'));
        totalBlocks = ziyadahBlocks.length;
        completedBlocks = ziyadahBlocks.filter(b => {
          const targetCode = normalizeBlokCode(b.block_code);
          return userJurnalRecords.some((record: any) => {
            if (!record.blok) return false;
            
            // Get all block codes from this record
            let blokCodes: string[] = [];
            if (typeof record.blok === 'string') {
              if (record.blok.startsWith('[')) {
                try {
                  const parsed = JSON.parse(record.blok);
                  blokCodes = Array.isArray(parsed) ? parsed : [record.blok];
                } catch {
                  blokCodes = [record.blok];
                }
              } else {
                // Split multi-block strings
                blokCodes = record.blok.split(',').map((s: string) => s.trim()).filter(Boolean);
              }
            } else if (Array.isArray(record.blok)) {
              blokCodes = record.blok;
            } else {
              blokCodes = [String(record.blok)];
            }

            // Check if any code in the record matches the target block
            return blokCodes.some(c => normalizeBlokCode(String(c)) === targetCode);
          });
        }).length;

        weeklyStatus.forEach((week: any) => {
          const spKey = `${userId}-${week.week_number}`;
          const spForWeek = spByUserAndWeek.get(spKey);
          week.sp_info = spForWeek ? {
            sp_level: spForWeek.sp_level,
            status: spForWeek.status,
            issued_at: spForWeek.issued_at,
            reason: spForWeek.reason,
            is_blacklisted: spForWeek.is_blacklisted,
            sp_type: spForWeek.sp_type,
          } : null;

          week.entries = userJurnalRecords.filter((e: any) => {
            const pekanResult = calculateWeekFromBlok(e.blok);
            return pekanResult === week.week_number;
          }).map((e: any) => ({
            ...e,
            pekan: calculateWeekFromBlok(e.blok),
          }));
        });
      } else {
        for (let week = 1; week <= 10; week++) {
          const spKey = `${userId}-${week}`;
          const spForWeek = spByUserAndWeek.get(spKey);
          weeklyStatus.push({
            week_number: week,
            total_blocks: 0,
            completed_blocks: 0,
            is_completed: false,
            blocks: [],
            sp_info: spForWeek ? {
              sp_level: spForWeek.sp_level,
              status: spForWeek.status,
              issued_at: spForWeek.issued_at,
              reason: spForWeek.reason,
              is_blacklisted: spForWeek.is_blacklisted,
            } : null,
            entries: [],
          });
        }
      }

      const userSPRecords = spByUser.get(userId) || [];
      const latestSP = userSPRecords.length > 0
        ? userSPRecords.reduce((latest: any, current: any) =>
          current.sp_level > latest.sp_level ? current : latest
        )
        : null;

      return {
        user_id: userId,
        confirmed_chosen_juz: juzCode || null,
        juz_info: juzInfo || null,
        daftar_ulang_status: daftarUlang?.status,
        halaqah_name: daftarUlang?.tashih_halaqah?.name || null,
        submitted_at: daftarUlang?.submitted_at,
        reviewed_at: daftarUlang?.reviewed_at,
        user: userMap.get(userId) || null,
        weekly_status: weeklyStatus,
        summary: {
          total_blocks: totalBlocks,
          completed_blocks: completedBlocks,
          pending_blocks: totalBlocks - completedBlocks,
          completion_percentage: totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0,
          current_week: currentWeek,
          target_blocks: Math.max(0, Math.min(currentWeek * 4, totalBlocks)),
          completion_percentage_target: (currentWeek > 0) 
            ? Math.min(100, Math.round((completedBlocks / Math.min(currentWeek * 4, totalBlocks)) * 100))
            : 0
        },
        jurnal_count: userJurnalRecords.length,
        weeks_with_jurnal: weeklyStatus.filter((w: any) => w.completed_blocks > 0).length,
        has_jurnal: userJurnalRecords.length > 0,
        latest_jurnal: latestJurnal ? {
          id: latestJurnal.id,
          tanggal_setor: latestJurnal.tanggal_setor,
          blok: latestJurnal.blok,
          pekan: calculateWeekFromBlok(latestJurnal.blok),
          juz_code: latestJurnal.juz_code,
        } : null,
        jurnal_records: userJurnalRecords.map((r: any) => ({
          ...r,
          pekan: calculateWeekFromBlok(r.blok),
        })),
        sp_summary: latestSP ? {
          sp_level: latestSP.sp_level,
          week_number: latestSP.week_number,
          issued_at: latestSP.issued_at,
          reason: latestSP.reason,
          is_blacklisted: latestSP.is_blacklisted,
          sp_type: latestSP.sp_type,
          total_active_sp: userSPRecords.length,
        } : null,
      };
    });

    const uniqueBloks = Array.from(allBloks).sort();

    // Get global blacklist count for stats
    const { count: globalBlacklistCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('is_blacklisted', true);

    const stats = {
      total_active_thalibah: totalCount || 0,
      total_approved_thalibah: approvedCount || 0,
      total_dropout: dropoutCount || 0,
      total_resign: resignCount || 0,
      total_blacklist: globalBlacklistCount || 0,
      overall_avg_progress: combinedEntries.length > 0
        ? Math.round(combinedEntries.reduce((acc: number, curr: any) => acc + (curr.summary?.completion_percentage_target || 0), 0) / combinedEntries.length)
        : 0
    };

    return ApiResponses.success({
      entries: combinedEntries,
      currentWeek: currentWeek,
      meta: {
        totalCount: totalCount || 0,
        page,
        limit,
        totalPages: Math.ceil((totalCount || 0) / limit),
        stats
      }
    }, undefined, 200);
  } catch (error) {
    console.error('[Musyrifah Jurnal API] Unexpected error:', error);
    return ApiResponses.handleUnknown(error);
  }
}

// POST - Create a new jurnal record
export async function POST(request: Request) {
  try {
    const authError = await requireAnyRole(['admin', 'musyrifah']);
    if (authError) return authError;

    const supabase = createClient();
    const body = await request.json();
    const validatedData = jurnalRecordSchema.parse(body);

    const { data: targetUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', validatedData.user_id)
      .maybeSingle();

    if (!targetUser) {
      return ApiResponses.notFound('User not found');
    }

    // Check for duplicate record
    if (validatedData.blok) {
      const supabaseAdmin = createSupabaseAdmin();
      const { data: existingRecords } = await supabaseAdmin
        .from('jurnal_records')
        .select('id')
        .eq('user_id', validatedData.user_id)
        .eq('blok', validatedData.blok);
        
      if (existingRecords && existingRecords.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Data jurnal untuk blok ini sudah ada. Silakan hapus atau gunakan fitur edit jika ingin mengubah.' },
          { status: 400 }
        );
      }
    }

    const { data: newRecord, error } = await supabase
      .from('jurnal_records')
      .insert({
        ...validatedData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('[Create Jurnal API] Database error:', error);
      return ApiResponses.databaseError(error);
    }

    return ApiResponses.success(newRecord, 'Jurnal record created successfully', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponses.validationError(error.issues);
    }
    console.error('[Create Jurnal API] Unexpected error:', error);
    return ApiResponses.handleUnknown(error);
  }
}

// PUT - Update an existing jurnal record
export async function PUT(request: Request) {
  try {
    const authError = await requireAnyRole(['admin', 'musyrifah']);
    if (authError) return authError;

    const supabase = createClient();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return ApiResponses.error('VALIDATION_ERROR', 'Record ID is required', {}, 400);
    }

    const validatedData = jurnalRecordSchema.partial().parse(updateData);

    const { data: existingRecord } = await supabase
      .from('jurnal_records')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!existingRecord) {
      return ApiResponses.notFound('Jurnal record not found');
    }

    const { data: updatedRecord, error } = await supabase
      .from('jurnal_records')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[Update Jurnal API] Database error:', error);
      return ApiResponses.databaseError(error);
    }

    revalidatePath('/panel-musyrifah');
    revalidatePath('/dashboard');

    return ApiResponses.success(updatedRecord, 'Jurnal record updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponses.validationError(error.issues);
    }
    console.error('[Update Jurnal API] Unexpected error:', error);
    return ApiResponses.handleUnknown(error);
  }
}

// DELETE - Delete a jurnal record
export async function DELETE(request: Request) {
  try {
    const authError = await requireAnyRole(['admin', 'musyrifah']);
    if (authError) return authError;

    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return ApiResponses.error('VALIDATION_ERROR', 'Record ID is required', {}, 400);
    }

    const { error } = await supabase
      .from('jurnal_records')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Delete Jurnal API] Database error:', error);
      return ApiResponses.databaseError(error);
    }

    revalidatePath('/panel-musyrifah');
    revalidatePath('/dashboard');

    return ApiResponses.success({ id }, 'Jurnal record deleted successfully');
  } catch (error) {
    console.error('[Delete Jurnal API] Unexpected error:', error);
    return ApiResponses.handleUnknown(error);
  }
}
