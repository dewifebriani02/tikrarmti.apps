import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { ApiResponses } from '@/lib/api-responses';
import { requireAdmin } from '@/lib/rbac';

const supabaseAdmin = createSupabaseAdmin();

export async function GET(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get('schedule_id');
  const batchId = searchParams.get('batch_id');

  const supabase = createClient();
  
  const scheduleJoin = batchId ? 'schedule:final_exam_schedules!inner' : 'schedule:final_exam_schedules';

  let query = supabase
    .from('final_exam_registrations')
    .select(`
      *,
      user:users!final_exam_registrations_user_id_fkey (full_name, whatsapp),
      ${scheduleJoin} (
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

  const registrations = data || [];
  const userIds = Array.from(new Set(registrations.map((r: any) => r.user_id).filter(Boolean)));

  if (userIds.length > 0) {
    const { data: cbtAttempts } = await supabaseAdmin
      .from('exam_attempts')
      .select('user_id, score, status, submitted_at, created_at')
      .in('user_id', userIds)
      .eq('exam_type', 'final-exam')
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false });

    if (cbtAttempts && cbtAttempts.length > 0) {
      const latestScoreByUser = new Map<string, number>();
      for (const att of cbtAttempts) {
        if (att.user_id && att.score !== null && att.score !== undefined && !latestScoreByUser.has(att.user_id)) {
          latestScoreByUser.set(att.user_id, att.score);
        }
      }

      for (const reg of registrations) {
        if ((reg.score_tulisan === null || reg.score_tulisan === undefined) && latestScoreByUser.has(reg.user_id)) {
          reg.score_tulisan = latestScoreByUser.get(reg.user_id);
        }
      }
    }
  }

  return ApiResponses.success(registrations);
}
