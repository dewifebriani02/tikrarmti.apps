import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { requireAnyRole, getAuthorizationContext } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseBlokField } from '@/lib/blok';

// Validation schema for tashih record
const tashihRecordSchema = z.object({
  user_id: z.string().uuid(),
  blok: z.string().nullable().optional(),
  lokasi: z.string().optional(),
  lokasi_detail: z.string().nullable().optional(),
  ustadzah_id: z.string().nullable().optional(),
  nama_pemeriksa: z.string().nullable().optional(),
  jumlah_kesalahan_tajwid: z.number().optional(),
  masalah_tajwid: z.array(z.string()).optional(),
  catatan_tambahan: z.string().nullable().optional(),
  waktu_tashih: z.string().optional(),
});

// Helper to generate all blocks (10 weeks, 4 blocks per week) for a juz
function generateAllBlocks(juzInfo: any) {
  const allBlocks: any[] = [];
  const parts = ['A', 'B', 'C', 'D'];
  const blockOffset = juzInfo.part === 'B' ? 10 : 0;

  for (let week = 1; week <= 10; week++) {
    const blockNumber = week + blockOffset;
    const weekStartPage = juzInfo.start_page + (week - 1);

    for (let i = 0; i < 4; i++) {
      const part = parts[i];
      const blockCode = `H${blockNumber}${part}`;
      const blockPage = Math.min(weekStartPage, juzInfo.end_page);

      allBlocks.push({
        block_code: blockCode,
        week_number: week,
        part,
        start_page: blockPage,
        end_page: blockPage,
        is_completed: false,
        tashih_count: 0
      });
    }
  }

  return allBlocks;
}

// Helper to calculate weekly status
function calculateWeeklyStatus(allBlocks: any[], tashihRecords: any[]) {
  const blockStatus = new Map<string, { is_completed: boolean; tashih_count: number; tashih_date?: string }>();

  allBlocks.forEach(block => {
    blockStatus.set(block.block_code, { is_completed: false, tashih_count: 0 });
  });

  tashihRecords.forEach(record => {
    if (record.blok) {
      const blocksInRecord = parseBlokField(record.blok);
      blocksInRecord.forEach(blockCode => {
        const current = blockStatus.get(blockCode);
        if (current) {
          current.is_completed = true;
          current.tashih_count += 1;
          if (!current.tashih_date || new Date(record.waktu_tashih) > new Date(current.tashih_date)) {
            current.tashih_date = record.waktu_tashih;
          }
          blockStatus.set(blockCode, current);
        }
      });
    }
  });

  const weeklyStatus: any[] = [];
  for (let week = 1; week <= 10; week++) {
    const weekBlocks = allBlocks.filter(b => b.week_number === week);
    const completedBlocks = weekBlocks.filter(b => {
      const status = blockStatus.get(b.block_code);
      return status?.is_completed || false;
    });

    weeklyStatus.push({
      week_number: week,
      total_blocks: weekBlocks.length,
      completed_blocks: completedBlocks.length,
      is_completed: completedBlocks.length === weekBlocks.length,
      blocks: weekBlocks.map(b => ({
        ...b,
        is_completed: blockStatus.get(b.block_code)?.is_completed || false,
        tashih_count: blockStatus.get(b.block_code)?.tashih_count || 0
      }))
    });
  }

  return weeklyStatus;
}

export async function GET(request: Request) {
  try {
    // 1. Authorization check - Standardized via requireAnyRole
    const authError = await requireAnyRole(['admin', 'musyrifah']);
    if (authError) return authError;

    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const blok = searchParams.get('blok');
    const batchId = searchParams.get('batch_id');
    const statusParam = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let activeBatchId = batchId;
    let currentWeek = 0;

    // Define allowed statuses based on the request
    let targetStatuses = ['approved', 'submitted'];
    const isBlacklisted = searchParams.get('is_blacklisted') === 'true';
    if (statusParam === 'dropout') {
      targetStatuses = ['dropout', 'mengundurkan_diri'];
    }

    let activeBatchData: any = null;

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
      // Tashih runs 1 week ahead of Ziyadah for upcoming week prep
      const nowUtc = new Date();
      const nowWib = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000);
      const diffTime = nowWib.getTime() - firstWeekStart.getTime();
      const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
      currentWeek = Math.max(1, diffWeeks + 2);
    }

    // Build WHERE clauses for SQL query
    const whereClauses: string[] = ['du.status = ANY($1::text[])'];
    const params: any[] = [targetStatuses];

    if (isBlacklisted) {
      params.push(true);
      whereClauses.push(`u.is_blacklisted = $${params.length}`);
    } else if (statusParam !== 'dropout') {
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
         u.is_blacklisted
       FROM daftar_ulang_submissions du
       JOIN users u ON du.user_id = u.id
       WHERE ${whereSql}
       ORDER BY du.confirmed_full_name ASC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    ));

    const userIds = daftarUlangUsers.map((d: any) => d.user_id);
    if (userIds.length === 0) {
      return ApiResponses.success({
        entries: [],
        meta: {
          totalCount: 0,
          page,
          limit,
          totalPages: 0,
          stats: {
            total_active_thalibah: 0,
            total_approved_thalibah: 0,
            total_dropout: 0,
            total_resign: 0,
            total_blacklist: 0,
            overall_avg_progress: 0
          }
        }
      }, 'No thalibah found');
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
      daftarUlangMap.set(d.user_id, d);
    });

    // 6. Fetch Tashih Records
    const tParams: any[] = [userIds];
    let tWhere = 'user_id = ANY($1::uuid[])';
    if (activeBatchData?.start_date) {
      const filterStartDate = new Date(activeBatchData.start_date);
      filterStartDate.setDate(filterStartDate.getDate() - 1);
      tParams.push(filterStartDate.toISOString());
      tWhere += ` AND created_at >= $${tParams.length}`;
    }
    if (activeBatchData?.end_date) {
      const filterEndDate = new Date(activeBatchData.end_date);
      filterEndDate.setDate(filterEndDate.getDate() + 7);
      tParams.push(filterEndDate.toISOString());
      tWhere += ` AND created_at <= $${tParams.length}`;
    }

    const { rows: allTashihRecords } = await import('@/lib/db').then(m => m.query(
      `SELECT * FROM tashih_records WHERE ${tWhere} ORDER BY waktu_tashih DESC`,
      tParams
    ));

    let tashihRecords = allTashihRecords || [];
    if (blok && blok !== 'all') {
      tashihRecords = tashihRecords.filter((record: any) => {
        const bloks = parseBlokField(record.blok);
        return bloks.includes(blok);
      });
    }

    const tashihByUser = new Map();
    tashihRecords.forEach((record: any) => {
      if (!tashihByUser.has(record.user_id)) {
        tashihByUser.set(record.user_id, []);
      }
      tashihByUser.get(record.user_id).push(record);
    });

    const allBloks = new Set<string>();
    tashihRecords.forEach((record: any) => {
      const bloks = parseBlokField(record.blok);
      bloks.forEach(b => allBloks.add(b));
    });

    // Get all unique juz codes from daftar ulang
    const uniqueJuzCodes = Array.from(new Set(
      daftarUlangUsers.map((d: any) => d.confirmed_chosen_juz).filter(Boolean)
    ));

    // Fetch juz info for all unique juz codes
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

    // Build combined entries with weekly status
    const combinedEntries = userIds.map((userId: string) => {
      const daftarUlang = daftarUlangMap.get(userId);
      const userTashihRecords = tashihByUser.get(userId) || [];
      const latestTashih = userTashihRecords.length > 0 ? userTashihRecords[0] : null;
      const juzCode = daftarUlang?.confirmed_chosen_juz;
      const juzInfo = juzCode ? juzInfoMap.get(juzCode) : null;

      let weeklyStatus: any[] = [];
      let totalBlocks = 0;
      let completedBlocks = 0;

      if (juzInfo) {
        const allBlocks = generateAllBlocks(juzInfo);
        weeklyStatus = calculateWeeklyStatus(allBlocks, userTashihRecords);
        totalBlocks = allBlocks.length;
        completedBlocks = allBlocks.filter(b => {
          const hasTashih = userTashihRecords.some((record: any) => {
            const blocksInRecord = parseBlokField(record.blok);
            return blocksInRecord.includes(b.block_code);
          });
          return hasTashih;
        }).length;
      }

      return {
        user_id: userId,
        confirmed_chosen_juz: juzCode || null,
        daftar_ulang_status: daftarUlang?.status,
        submitted_at: daftarUlang?.submitted_at,
        reviewed_at: daftarUlang?.reviewed_at,
        user: userMap.get(userId) || null,
        juz_info: juzInfo || null,
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
        has_tashih: userTashihRecords.length > 0,
        tashih_count: userTashihRecords.length,
        latest_tashih: latestTashih ? {
          id: latestTashih.id,
          lokasi: latestTashih.lokasi,
          lokasi_detail: latestTashih.lokasi_detail,
          nama_pemeriksa: latestTashih.nama_pemeriksa,
          jumlah_kesalahan_tajwid: latestTashih.jumlah_kesalahan_tajwid,
          waktu_tashih: latestTashih.waktu_tashih,
          blok: latestTashih.blok,
        } : null,
        tashih_records: userTashihRecords,
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
    console.error('[Musyrifah Tashih API] Unexpected error (GET):', error);
    return ApiResponses.handleUnknown(error);
  }
}

// PUT - Update a tashih record
export async function PUT(request: Request) {
  try {
    const authError = await requireAnyRole(['admin', 'musyrifah']);
    if (authError) return authError;

    const supabase = createClient();
    const body = await request.json();
    const { id, blok } = body;

    if (!id) {
      return ApiResponses.error('VALIDATION_ERROR', 'Record ID is required', {}, 400);
    }

    if (blok === undefined || blok === null) {
      return ApiResponses.error('VALIDATION_ERROR', 'Blok field is required', {}, 400);
    }

    // Check if record exists
    const { data: existingRecord } = await supabase
      .from('tashih_records')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!existingRecord) {
      return ApiResponses.notFound('Tashih record not found');
    }

    // Update the blok field
    const { data: updatedRecord, error } = await supabase
      .from('tashih_records')
      .update({ blok: blok || null })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[Musyrifah Tashih API] Database error (PUT):', error);
      return ApiResponses.databaseError(error);
    }

    revalidatePath('/panel-musyrifah');
    revalidatePath('/tashih');
    revalidatePath('/dashboard');

    return ApiResponses.success(updatedRecord, 'Tashih record berhasil diupdate');
  } catch (error) {
    console.error('[Musyrifah Tashih API] Unexpected error (PUT):', error);
    return ApiResponses.handleUnknown(error);
  }
}

// DELETE - Delete a tashih record
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

    // Check if record exists
    const { data: existingRecord } = await supabase
      .from('tashih_records')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle();

    if (!existingRecord) {
      return ApiResponses.notFound('Tashih record not found');
    }

    // Delete tashih record
    const { error } = await supabase
      .from('tashih_records')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Musyrifah Tashih API] Database error (DELETE):', error);
      return ApiResponses.databaseError(error);
    }

    revalidatePath('/panel-musyrifah');
    revalidatePath('/tashih');
    revalidatePath('/dashboard');

    return ApiResponses.success({ id }, 'Tashih record berhasil dihapus');
  } catch (error) {
    console.error('[Musyrifah Tashih API] Unexpected error (DELETE):', error);
    return ApiResponses.handleUnknown(error);
  }
}

// POST - Create a new tashih record for a thalibah
export async function POST(request: Request) {
  try {
    const authError = await requireAnyRole(['admin', 'musyrifah']);
    if (authError) return authError;

    const supabase = createClient();
    const body = await request.json();
    const validatedData = tashihRecordSchema.parse(body);

    const { data: targetUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', validatedData.user_id)
      .maybeSingle();

    if (!targetUser) {
      return ApiResponses.notFound('Thalibah not found');
    }

    // Check for duplicate record
    if (validatedData.blok) {
      const supabaseAdmin = createSupabaseAdmin();
      const { data: existingRecords } = await supabaseAdmin
        .from('tashih_records')
        .select('id')
        .eq('user_id', validatedData.user_id)
        .eq('blok', validatedData.blok);
        
      if (existingRecords && existingRecords.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Data tashih untuk blok ini sudah ada. Silakan hapus atau gunakan fitur edit jika ingin mengubah.' },
          { status: 400 }
        );
      }
    }

    let finalUstadzahId = validatedData.ustadzah_id === 'manual' ? null : (validatedData.ustadzah_id || null);

    if (finalUstadzahId) {
      const { data: reg } = await supabase
        .from('muallimah_registrations')
        .select('id')
        .eq('user_id', finalUstadzahId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (reg && reg.id) {
        finalUstadzahId = reg.id;
      } else {
        finalUstadzahId = null;
      }
    }

    const { data: newRecord, error } = await supabase
      .from('tashih_records')
      .insert({
        ...validatedData,
        ustadzah_id: finalUstadzahId,
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('[Musyrifah Tashih API] Database error (POST):', error);
      return ApiResponses.databaseError(error);
    }

    revalidatePath('/panel-musyrifah');
    revalidatePath('/tashih');
    revalidatePath('/dashboard');

    return ApiResponses.success(newRecord, 'Tashih record berhasil dibuat', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponses.validationError(error.issues);
    }
    console.error('[Musyrifah Tashih API] Unexpected error (POST):', error);
    return ApiResponses.handleUnknown(error);
  }
}
