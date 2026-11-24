import { createClient } from '@/lib/supabase/server';
import { ApiResponses } from '@/lib/api-responses';
import { isStaff } from '@/lib/roles';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  if (!authUser) return ApiResponses.unauthorized();
  
  // Check if staff (admin/muallimah/musyrifah)
  const { data: profile } = await supabase.from('users').select('roles').eq('id', authUser.id).single();
  if (!profile || !isStaff(profile.roles || [])) {
    return ApiResponses.forbidden('Hanya staf yang dapat memberikan nilai');
  }

  const body = await request.json();
  const { registration_id, score_lisan, score_tulisan, feedback } = body;

  if (!registration_id) return ApiResponses.badRequest('Missing registration ID');

  const parsedLisan = (score_lisan !== undefined && score_lisan !== null && score_lisan !== '') 
    ? Number(score_lisan) 
    : null;
  const parsedTulisan = (score_tulisan !== undefined && score_tulisan !== null && score_tulisan !== '') 
    ? Number(score_tulisan) 
    : null;

  const updatePayload: Record<string, any> = {
    feedback: feedback || '',
    status: 'graded',
    graded_at: new Date().toISOString(),
    graded_by: authUser.id
  };

  if (parsedLisan !== null) updatePayload.score_lisan = parsedLisan;
  if (parsedTulisan !== null) updatePayload.score_tulisan = parsedTulisan;

  const { data, error } = await supabase
    .from('final_exam_registrations')
    .update(updatePayload)
    .eq('id', registration_id)
    .select(`
      *,
      schedule:final_exam_schedules (batch_id)
    `)
    .single();

  if (error) return ApiResponses.databaseError(error);

  return ApiResponses.success(data);
}
