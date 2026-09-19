// Local interface replacing the SupabaseClient type from @supabase/supabase-js
interface SupabaseClient {
  from: (table: string) => any;
  auth: { getUser: () => Promise<any>; getSession: () => Promise<any>; signOut: () => Promise<any> };
}

type HalaqahSubmission = {
  user_id: string
  ujian_halaqah_id?: string | null
  tashih_halaqah_id?: string | null
}

function getHalaqahIds(submission: HalaqahSubmission) {
  return Array.from(new Set([
    submission.ujian_halaqah_id,
    submission.tashih_halaqah_id
  ].filter((id): id is string => Boolean(id))))
}

/**
 * Ensure an approved daftar-ulang submission is represented in halaqah_students.
 * 
 * Strategy:
 * 1. Collect the target halaqah IDs from the submission (ujian + tashih, deduplicated).
 * 2. Delete any existing halaqah_students entries for this thalibah that are NOT
 *    in the target set — this prevents stale/double entries when a student moves classes.
 * 3. Upsert into the target halaqahs.
 */
export async function syncApprovedSubmissionToHalaqahStudents(
  supabase: SupabaseClient,
  submission: HalaqahSubmission,
  assignedBy: string
) {
  const targetIds = getHalaqahIds(submission)

  if (targetIds.length === 0) {
    // No halaqah assigned — remove any stale entries
    await supabase
      .from('halaqah_students')
      .delete()
      .eq('thalibah_id', submission.user_id)
    return
  }

  // Step 1: Remove stale entries that are NOT in the target set
  const { data: existingRows } = await supabase
    .from('halaqah_students')
    .select('id, halaqah_id')
    .eq('thalibah_id', submission.user_id)

  const staleIds = (existingRows || [])
    .filter(row => !targetIds.includes(row.halaqah_id))
    .map(row => row.id)

  if (staleIds.length > 0) {
    await supabase
      .from('halaqah_students')
      .delete()
      .in('id', staleIds)
  }

  // Step 2: Upsert into target halaqahs
  for (const halaqahId of targetIds) {
    const existing = (existingRows || []).find(r => r.halaqah_id === halaqahId)

    if (existing) {
      // Update to active
      const { error: updateError } = await supabase
        .from('halaqah_students')
        .update({
          status: 'active',
          assigned_by: assignedBy,
          assigned_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (updateError) throw updateError
    } else {
      // Insert new entry
      const { error: insertError } = await supabase
        .from('halaqah_students')
        .insert({
          halaqah_id: halaqahId,
          thalibah_id: submission.user_id,
          assigned_by: assignedBy,
          status: 'active'
        })

      if (insertError) throw insertError
    }
  }
}

/** Remove the exact halaqah memberships created by this submission. */
export async function removeSubmissionFromHalaqahStudents(
  supabase: SupabaseClient,
  submission: HalaqahSubmission
) {
  for (const halaqahId of getHalaqahIds(submission)) {
    const { error } = await supabase
      .from('halaqah_students')
      .delete()
      .eq('halaqah_id', halaqahId)
      .eq('thalibah_id', submission.user_id)

    if (error) throw error
  }
}
