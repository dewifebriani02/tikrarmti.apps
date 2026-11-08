import { createClient } from '@/lib/supabase/server';
import { ApiResponses } from '@/lib/api-responses';
import { requireAdmin } from '@/lib/rbac';

export async function GET(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get('schedule_id');
  const batchId = searchParams.get('batch_id');

  const supabase = createClient();
  
  let query = supabase
    .from('final_exam_registrations')
    .select(`
      *,
      user:users!final_exam_registrations_user_id_fkey (full_name, whatsapp),
      schedule:final_exam_schedules (
        *,
        batch:batches (id, name),
        examiner:users!final_exam_schedules_examiner_id_fkey (full_name)
      )
    `);

  if (scheduleId) {
    query = query.eq('schedule_id', scheduleId);
  }

  if (batchId) {
    query = query.eq('schedule.batch_id', batchId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) return ApiResponses.databaseError(error);
  return ApiResponses.success(data);
}
