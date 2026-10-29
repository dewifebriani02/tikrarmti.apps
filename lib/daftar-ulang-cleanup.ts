import type { PoolClient } from 'pg';

type SubmissionRow = {
  id: string;
  user_id: string;
  registration_id: string;
  ujian_halaqah_id: string | null;
  tashih_halaqah_id: string | null;
};

/**
 * Delete daftar ulang submissions and everything derived from them, inside the caller's
 * transaction. There is no FK from halaqah_students to daftar_ulang_submissions, so the
 * roster rows created on approval (see halaqah-students-sync.ts) must be removed by hand,
 * and the registration's re_enrollment_completed flag must be reset.
 *
 * Pass either submission ids or a registration id (all its submissions).
 * Returns the deleted submissions.
 */
export async function deleteDaftarUlangSubmissions(
  client: PoolClient,
  target: { submissionId: string } | { registrationId: string }
): Promise<SubmissionRow[]> {
  const byId = 'submissionId' in target;
  const { rows } = await client.query<SubmissionRow>(
    `SELECT id, user_id, registration_id, ujian_halaqah_id, tashih_halaqah_id
       FROM daftar_ulang_submissions
      WHERE ${byId ? 'id' : 'registration_id'} = $1
      FOR UPDATE`,
    [byId ? target.submissionId : target.registrationId]
  );

  for (const sub of rows) {
    const halaqahIds = [sub.ujian_halaqah_id, sub.tashih_halaqah_id].filter((id): id is string => Boolean(id));
    if (halaqahIds.length > 0) {
      await client.query(
        'DELETE FROM halaqah_students WHERE thalibah_id = $1 AND halaqah_id = ANY($2::uuid[])',
        [sub.user_id, halaqahIds]
      );
    }
    await client.query(
      `UPDATE pendaftaran_tikrar_tahfidz
          SET re_enrollment_completed = false, re_enrollment_completed_at = NULL
        WHERE id = $1`,
      [sub.registration_id]
    );
  }

  if (rows.length > 0) {
    await client.query('DELETE FROM daftar_ulang_submissions WHERE id = ANY($1::uuid[])', [rows.map(r => r.id)]);
  }
  return rows;
}
