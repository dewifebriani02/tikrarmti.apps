import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAnyRole } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { parseBlokField } from '@/lib/blok';

export async function GET(request: Request) {
  try {
    // 1. Authorization check
    const authError = await requireAnyRole(['admin', 'musyrifah']);
    if (authError) return authError;

    const supabase = createClient();

    const url = new URL(request.url);
    const batchId = url.searchParams.get('batch_id');

    // 2. Get active batch
    let activeBatch;
    let batchError;

    if (batchId) {
      const { data, error } = await supabase
        .from('batches')
        .select('id, start_date, end_date')
        .eq('id', batchId)
        .single();
      activeBatch = data;
      batchError = error;
    } else {
      const { data, error } = await supabase
        .from('batches')
        .select('id, start_date, end_date')
        .in('status', ['ongoing', 'open'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      activeBatch = data;
      batchError = error;
    }

    if (batchError || !activeBatch) {
      console.error('[Halaqah Summary API] No active batch found:', batchError);
      return ApiResponses.notFound('Tidak ada angkatan (batch) yang aktif.');
    }

    // 3. Get all programs in active batch
    const { data: programs } = await supabase
      .from('programs')
      .select('id')
      .eq('batch_id', activeBatch.id);

    const programIds = programs?.map(p => p.id) || [];
    if (programIds.length === 0) {
      return ApiResponses.success({ halaqahs: [] }, 'No programs found');
    }

    // 4. Get halaqahs, muallimah and students
    const { data: halaqahs, error: halaqahError } = await supabase
      .from('halaqah')
      .select(`
        id, 
        name, 
        day_of_week, 
        start_time, 
        end_time, 
        status,
        muallimah:users!halaqah_muallimah_id_fkey(full_name),
        students:halaqah_students(
          status, 
          thalibah_id, 
          thalibah:users!halaqah_students_thalibah_id_fkey(full_name, is_blacklisted)
        )
      `)
      .in('program_id', programIds)
      .eq('status', 'active');

    if (halaqahError) {
      console.error('[Halaqah Summary API] Error fetching halaqahs:', halaqahError);
      return ApiResponses.databaseError(halaqahError);
    }

    const halaqahIds = halaqahs?.map(h => h.id) || [];
    if (halaqahIds.length === 0) {
      return ApiResponses.success({ halaqahs: [] }, 'No halaqah found');
    }

    // Extract thalibahIds
    const thalibahIds = halaqahs?.flatMap(h => 
      h.students?.filter((s: any) => s.status === 'active')?.map((s: any) => s.thalibah_id) || []
    ) || [];

    // 7. Get Jurnal Records
    let jurnalRecords: any[] = [];
    if (thalibahIds.length > 0) {
      let jurnalQuery = supabase
        .from('jurnal_records')
        .select('user_id, blok')
        .in('user_id', thalibahIds);
        
      if (activeBatch.start_date) {
        const startDate = new Date(activeBatch.start_date);
        startDate.setDate(startDate.getDate() - 1);
        jurnalQuery = jurnalQuery.gte('created_at', startDate.toISOString());
      }
      const { data } = await jurnalQuery;
      jurnalRecords = data || [];
    }

    // 8. Get Tashih Records
    let tashihRecords: any[] = [];
    if (thalibahIds.length > 0) {
      let tashihQuery = supabase
        .from('tashih_records')
        .select('user_id, blok')
        .in('user_id', thalibahIds);

      if (activeBatch.start_date) {
        const startDate = new Date(activeBatch.start_date);
        startDate.setDate(startDate.getDate() - 1);
        tashihQuery = tashihQuery.gte('created_at', startDate.toISOString());
      }
      const { data } = await tashihQuery;
      tashihRecords = data || [];
    }

    // 9. Aggregate data
    const jurnalCountMap = new Map();
    jurnalRecords?.forEach(r => {
      const bloks = parseBlokField(r.blok);
      const count = bloks.length > 0 ? bloks.length : 1;
      jurnalCountMap.set(r.user_id, (jurnalCountMap.get(r.user_id) || 0) + count);
    });

    const tashihCountMap = new Map();
    tashihRecords?.forEach(r => {
      const bloks = parseBlokField(r.blok);
      const count = bloks.length > 0 ? bloks.length : 1;
      tashihCountMap.set(r.user_id, (tashihCountMap.get(r.user_id) || 0) + count);
    });

    const currentWeek = activeBatch.start_date
      ? Math.ceil((Date.now() - new Date(activeBatch.start_date).getTime()) / (7 * 24 * 60 * 60 * 1000))
      : 0;
    const targetBlocks = Math.max(1, currentWeek * 4);

    const result = halaqahs?.map(h => {
      const activeStudents = h.students?.filter((s: any) => s.status === 'active') || [];
      const halaqahStudents = activeStudents.map((s: any) => {
        const jCount = jurnalCountMap.get(s.thalibah_id) || 0;
        const tCount = tashihCountMap.get(s.thalibah_id) || 0;
        const jurnal_percentage = Math.min(100, Math.round((jCount / targetBlocks) * 100));
        const tashih_percentage = Math.min(100, Math.round((tCount / targetBlocks) * 100));
        const progress_percentage = Math.round((jurnal_percentage + tashih_percentage) / 2);
        
        return {
          user_id: s.thalibah_id,
          full_name: s.thalibah?.full_name || 'Unknown',
          is_blacklisted: s.thalibah?.is_blacklisted || false,
          jurnal_count: jCount,
          tashih_count: tCount,
          jurnal_percentage,
          tashih_percentage,
          progress_percentage
        };
      });
      
      // Sort students by name
      halaqahStudents.sort((a: any, b: any) => a.full_name.localeCompare(b.full_name));

      const avg_progress = halaqahStudents.length > 0 
        ? Math.round(halaqahStudents.reduce((acc: number, curr: any) => acc + curr.progress_percentage, 0) / halaqahStudents.length)
        : 0;

      const avg_jurnal_progress = halaqahStudents.length > 0
        ? Math.round(halaqahStudents.reduce((acc: number, curr: any) => acc + curr.jurnal_percentage, 0) / halaqahStudents.length)
        : 0;

      const avg_tashih_progress = halaqahStudents.length > 0
        ? Math.round(halaqahStudents.reduce((acc: number, curr: any) => acc + curr.tashih_percentage, 0) / halaqahStudents.length)
        : 0;

      return {
        id: h.id,
        name: h.name,
        muallimah_name: (Array.isArray(h.muallimah) ? h.muallimah[0]?.full_name : (h.muallimah as any)?.full_name) || 'Tanpa Muallimah',
        total_thalibah: halaqahStudents.length,
        avg_progress,
        avg_jurnal_progress,
        avg_tashih_progress,
        thalibah: halaqahStudents
      };
    }) || [];

    // Sort halaqahs by name
    result.sort((a, b) => a.name.localeCompare(b.name));

    return ApiResponses.success({ halaqahs: result }, 'Halaqah summary retrieved successfully');
  } catch (error) {
    console.error('[Halaqah Summary API] Unexpected error:', error);
    return ApiResponses.serverError('Terjadi kesalahan internal server.');
  }
}
