import { createClient } from '@/lib/supabase/server';
import { ApiResponses } from '@/lib/api-responses';
import { transaction } from '@/lib/db';

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return ApiResponses.unauthorized();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const batchId = searchParams.get('batch_id');

  let queryBuilder = supabase
    .from('final_exam_registrations')
    .select(`
      *,
      schedule:final_exam_schedules!inner (
        *,
        examiner:users!final_exam_schedules_examiner_id_fkey (full_name)
      )
    `)
    .eq('user_id', authUser.id);

  if (type) {
    queryBuilder = queryBuilder.eq('final_exam_schedules.exam_type', type);
  }
  if (batchId) {
    queryBuilder = queryBuilder.eq('final_exam_schedules.batch_id', batchId);
  }

  const { data, error } = await queryBuilder;

  if (error) return ApiResponses.databaseError(error);
  
  // If type is provided, return a single matching registration. Otherwise, return the array of registrations.
  if (type) {
    const registration = data?.find(r => (r.schedule as any)?.exam_type === type);
    return ApiResponses.success(registration || null);
  }

  return ApiResponses.success(data || []);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return ApiResponses.unauthorized();

  const body = await request.json();
  const { schedule_id } = body;

  if (!schedule_id) return ApiResponses.badRequest('schedule_id wajib diisi');

  try {
    const result = await transaction(async (client) => {
      // 1. Lock and check the schedule
      const schedRes = await client.query(
        `SELECT id, batch_id, exam_type, max_quota, current_count, status
         FROM final_exam_schedules
         WHERE id = $1
         FOR UPDATE`,
        [schedule_id]
      );

      if (schedRes.rowCount === 0) {
        throw new Error('Jadwal ujian tidak ditemukan');
      }

      const schedule = schedRes.rows[0];
      if (schedule.status !== 'active') {
        throw new Error('Jadwal ujian tidak aktif');
      }

      // Check real count
      const countRes = await client.query(
        `SELECT COUNT(*)::int as reg_count FROM final_exam_registrations WHERE schedule_id = $1`,
        [schedule_id]
      );
      const currentRealCount = countRes.rows[0]?.reg_count || 0;

      if (currentRealCount >= (schedule.max_quota || 5)) {
        throw new Error('QUOTA_FULL');
      }

      // 2. Check if user is already registered for this schedule
      const existingReg = await client.query(
        `SELECT id FROM final_exam_registrations WHERE user_id = $1 AND schedule_id = $2`,
        [authUser.id, schedule_id]
      );

      if (existingReg.rowCount && existingReg.rowCount > 0) {
        return { success: true, message: 'Anda sudah terdaftar di jadwal ini' };
      }

      // 3. Check if user is already registered for another schedule of the same exam_type and batch
      const otherReg = await client.query(
        `SELECT r.id, r.schedule_id 
         FROM final_exam_registrations r
         JOIN final_exam_schedules s ON r.schedule_id = s.id
         WHERE r.user_id = $1 AND s.exam_type = $2 AND s.batch_id = $3`,
        [authUser.id, schedule.exam_type, schedule.batch_id]
      );

      if (otherReg.rowCount && otherReg.rowCount > 0) {
        // Remove old registration to switch schedule
        const oldScheduleId = otherReg.rows[0].schedule_id;
        await client.query(`DELETE FROM final_exam_registrations WHERE id = $1`, [otherReg.rows[0].id]);
        await client.query(
          `UPDATE final_exam_schedules 
           SET current_count = (SELECT COUNT(*) FROM final_exam_registrations WHERE schedule_id = $1),
               updated_at = NOW()
           WHERE id = $1`,
          [oldScheduleId]
        );
      }

      // 4. Insert new registration
      await client.query(
        `INSERT INTO final_exam_registrations (user_id, schedule_id, status, created_at, updated_at)
         VALUES ($1, $2, 'registered', NOW(), NOW())`,
        [authUser.id, schedule_id]
      );

      // 5. Update schedule current_count
      await client.query(
        `UPDATE final_exam_schedules 
         SET current_count = (SELECT COUNT(*) FROM final_exam_registrations WHERE schedule_id = $1),
             updated_at = NOW()
         WHERE id = $1`,
        [schedule_id]
      );

      return { success: true, message: 'Berhasil mendaftar ujian' };
    });

    return ApiResponses.success(result);
  } catch (error: any) {
    if (error.message === 'QUOTA_FULL') {
      return ApiResponses.badRequest('Maaf Ukhti, kuota jadwal ini baru saja penuh. Silakan pilih jadwal lain.');
    }
    return ApiResponses.badRequest(error.message || 'Gagal mendaftar');
  }
}
