import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';

const ALLOWED_UPDATE_FIELDS = [
  'confirmed_full_name',
  'confirmed_chosen_juz',
  'confirmed_main_time_slot',
  'confirmed_backup_time_slot',
  'confirmed_wa_phone',
  'partner_type',
  'partner_user_id',
  'partner_name',
  'partner_relationship',
  'partner_wa_phone',
  'partner_notes',
  'ujian_halaqah_id',
  'tashih_halaqah_id',
  'pengabdian_choice',
  'donasi_amount',
];

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const id = params.id;
    if (!id) {
      return ApiResponses.badRequest('ID is required');
    }

    const body = await request.json();

    // Strip to only allowed fields
    const dataToUpdate: Record<string, any> = {};
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        dataToUpdate[field] = body[field];
      }
    }

    // Handle empty strings for foreign keys → should be null
    if (dataToUpdate.ujian_halaqah_id === '') dataToUpdate.ujian_halaqah_id = null;
    if (dataToUpdate.tashih_halaqah_id === '') dataToUpdate.tashih_halaqah_id = null;
    if (dataToUpdate.partner_type === '') dataToUpdate.partner_type = null;
    if (dataToUpdate.pengabdian_choice === '') dataToUpdate.pengabdian_choice = null;

    const supabase = createServerClient();
    const supabaseAdmin = createSupabaseAdmin();

    // Get current submission to check halaqah changes and get user_id
    const { data: currentSubmission, error: fetchError } = await supabase
      .from('daftar_ulang_submissions')
      .select('id, user_id, batch_id, ujian_halaqah_id, tashih_halaqah_id')
      .eq('id', id)
      .single();

    if (fetchError || !currentSubmission) {
      console.error('[Admin Daftar Ulang Edit API] Fetch error:', fetchError);
      return ApiResponses.badRequest('Data tidak ditemukan');
    }

    const { error } = await supabase
      .from('daftar_ulang_submissions')
      .update(dataToUpdate)
      .eq('id', id);

    if (error) {
      console.error('[Admin Daftar Ulang Edit API] Update error:', error);
      return ApiResponses.databaseError(error);
    }

    // Sync halaqah_students if ujian_halaqah_id changed
    const newHalaqahId = dataToUpdate.ujian_halaqah_id;
    const oldHalaqahId = currentSubmission.ujian_halaqah_id;
    const userId = currentSubmission.user_id;

    if (Object.prototype.hasOwnProperty.call(dataToUpdate, 'ujian_halaqah_id') && newHalaqahId !== oldHalaqahId) {
      // Remove from old halaqah_students
      if (oldHalaqahId) {
        await supabaseAdmin
          .from('halaqah_students')
          .delete()
          .eq('thalibah_id', userId)
          .eq('halaqah_id', oldHalaqahId);
      }

      // Add to new halaqah_students
      if (newHalaqahId) {
        // Check if already exists (avoid duplicate)
        const { data: existing } = await supabaseAdmin
          .from('halaqah_students')
          .select('id')
          .eq('thalibah_id', userId)
          .eq('halaqah_id', newHalaqahId)
          .maybeSingle();

        if (!existing) {
          await supabaseAdmin.from('halaqah_students').insert({
            thalibah_id: userId,
            halaqah_id: newHalaqahId,
            status: 'active',
          });
        }
      }
    }

    return ApiResponses.success(null, 'Data berhasil diperbarui');
  } catch (error) {
    console.error('[Admin Daftar Ulang Edit API] Unexpected error:', error);
    return ApiResponses.handleUnknown(error);
  }
}

/**
 * DELETE /api/admin/daftar-ulang/[id] — admin permanently deletes a daftar ulang submission.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('daftar_ulang_submissions')
      .delete()
      .eq('id', params.id)
      .select('id')
      .single();

    if (error || !data) {
      if (error && error.code !== 'PGRST116') {
        console.error('[Admin Daftar Ulang Delete API] Error:', error);
        return ApiResponses.databaseError(error);
      }
      return ApiResponses.notFound('Data daftar ulang tidak ditemukan');
    }

    return ApiResponses.success(null, 'Data berhasil dihapus');
  } catch (error) {
    console.error('[Admin Daftar Ulang Delete API] Unexpected error:', error);
    return ApiResponses.handleUnknown(error);
  }
}
