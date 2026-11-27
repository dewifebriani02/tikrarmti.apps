import { createClient } from '@/lib/supabase/server';
import { ApiResponses } from '@/lib/api-responses';
import { requireAdmin, getAuthorizationContext } from '@/lib/rbac';
import { query } from '@/lib/db';

async function syncBatchWrittenExamWindow(
  batchId?: string | null,
  examType?: string | null,
  examDate?: string | null,
  endDate?: string | null,
  startTime?: string | null,
  endTime?: string | null
) {
  if (!batchId || examType !== 'written' || !examDate) return;
  try {
    const openTime = (startTime || '00:00:00').slice(0, 5) + ':00';
    const closeDate = endDate || examDate;
    const closeTime = (endTime || '23:59:59').slice(0, 5) + ':59';
    const startIso = `${examDate}T${openTime}+07:00`;
    const endIso = `${closeDate}T${closeTime}+07:00`;

    await query(
      `UPDATE batches
       SET final_exam_start_date = $1::timestamptz,
           final_exam_end_date = $2::timestamptz,
           updated_at = NOW()
       WHERE id = $3`,
      [startIso, endIso, batchId]
    );
  } catch (err) {
    console.warn('[FinalExamSchedules API] Failed to sync written exam window to batches:', err);
  }
}

export async function GET(request: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  let batchId = searchParams.get('batch_id');

  // Jika tidak ada batch_id eksplisit, coba ambil dari konteks user (untuk Thalibah)
  if (!batchId) {
    const context = await getAuthorizationContext();
    if (context && !context.roles.includes('admin') && !context.roles.includes('muallimah')) {
      const { data: userReg } = await supabase
        .from('pendaftaran_tikrar_tahfidz')
        .select('batch_id')
        .eq('user_id', context.userId)
        .eq('status', 'approved')
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();
      
      if (userReg?.batch_id) {
        batchId = userReg.batch_id;
      }
    }
  }

  let queryBuilder = supabase
    .from('final_exam_schedules')
    .select(`
      *,
      examiner:users!final_exam_schedules_examiner_id_fkey (full_name)
    `)
    .order('exam_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (type) {
    queryBuilder = queryBuilder.eq('exam_type', type);
  }
  
  if (batchId) {
    queryBuilder = queryBuilder.eq('batch_id', batchId);
  }

  const { data, error } = await queryBuilder;

  if (error) return ApiResponses.databaseError(error);
  return ApiResponses.success(data);
}

export async function POST(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = createClient();
  const body = await request.json();

  const resolvedEndDate = body.end_date || body.exam_date || null;

  const { data, error } = await supabase
    .from('final_exam_schedules')
    .insert({
      batch_id: body.batch_id,
      exam_type: body.exam_type,
      exam_date: body.exam_date,
      end_date: resolvedEndDate,
      start_time: body.start_time || '00:00',
      end_time: body.end_time || '23:59',
      examiner_id: body.examiner_id || null,
      max_quota: body.max_quota ?? (body.exam_type === 'written' ? 200 : 10),
      location_link: body.location_link || null
    })
    .select()
    .single();

  if (error) return ApiResponses.databaseError(error);

  await syncBatchWrittenExamWindow(
    body.batch_id,
    body.exam_type,
    body.exam_date,
    resolvedEndDate,
    body.start_time,
    body.end_time
  );

  return ApiResponses.success(data);
}

export async function DELETE(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return ApiResponses.badRequest('Missing schedule ID');

  const { error } = await supabase
    .from('final_exam_schedules')
    .delete()
    .eq('id', id);

  if (error) return ApiResponses.databaseError(error);
  return ApiResponses.success({ message: 'Schedule deleted' });
}

export async function PUT(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = createClient();
  const body = await request.json();
  const { id, ...updateData } = body;

  if (!id) return ApiResponses.badRequest('Missing schedule ID');

  const resolvedEndDate = updateData.end_date || updateData.exam_date || null;
  const payload = {
    ...updateData,
    end_date: resolvedEndDate,
    examiner_id: updateData.examiner_id || null,
  };

  const { data, error } = await supabase
    .from('final_exam_schedules')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) return ApiResponses.databaseError(error);

  await syncBatchWrittenExamWindow(
    updateData.batch_id,
    updateData.exam_type,
    updateData.exam_date,
    resolvedEndDate,
    updateData.start_time,
    updateData.end_time
  );

  return ApiResponses.success(data);
}
