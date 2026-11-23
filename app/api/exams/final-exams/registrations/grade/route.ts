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

  // Sync to pendaftaran_tikrar_tahfidz if user_id is present
  if (data?.user_id) {
    const lisanVal = data.score_lisan;
    const tulisanVal = data.score_tulisan;

    // Calculate composite final exam score
    let finalScore = 0;
    if (lisanVal !== null && tulisanVal !== null) {
      finalScore = Math.round((Number(lisanVal) * 0.7) + (Number(tulisanVal) * 0.3));
    } else if (lisanVal !== null) {
      finalScore = Number(lisanVal);
    } else if (tulisanVal !== null) {
      finalScore = Number(tulisanVal);
    }

    const pendaftaranUpdate: Record<string, any> = {
      exam_score: finalScore
    };
    if (lisanVal !== null) pendaftaranUpdate.oral_total_score = Number(lisanVal);
    if (tulisanVal !== null) pendaftaranUpdate.written_quiz_score = Number(tulisanVal);

    let pendaftaranQuery = supabase
      .from('pendaftaran_tikrar_tahfidz')
      .update(pendaftaranUpdate)
      .eq('user_id', data.user_id);

    if (data.schedule?.batch_id) {
      pendaftaranQuery = pendaftaranQuery.eq('batch_id', data.schedule.batch_id);
    }

    await pendaftaranQuery;
  }

  return ApiResponses.success(data);
}
