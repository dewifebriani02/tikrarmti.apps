import { createClient } from '@/lib/supabase/server';
import { getAuthorizationContext } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { formatProperName } from '@/lib/utils/proper-name';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return ApiResponses.error('VALIDATION_ERROR', 'Registration ID is required', {}, 400);

    const context = await getAuthorizationContext();
    if (!context) return ApiResponses.unauthorized();

    const supabase = createClient();

    // Fetch registration data
    const { data: registration, error: fetchError } = await supabase
      .from('pendaftaran_tikrar_tahfidz')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('[Pendaftaran ID API] Database error (GET):', fetchError);
      return ApiResponses.databaseError(fetchError);
    }

    if (!registration) return ApiResponses.notFound('Registration not found');

    // Check if the registration belongs to the current user
    if (registration.user_id !== context.userId) {
      return ApiResponses.forbidden('Access denied');
    }

    return ApiResponses.success(registration);
  } catch (error) {
    console.error('[Pendaftaran ID API] Unexpected error (GET):', error);
    return ApiResponses.handleUnknown(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return ApiResponses.error('VALIDATION_ERROR', 'Registration ID is required', {}, 400);

    const context = await getAuthorizationContext();
    if (!context) return ApiResponses.unauthorized();

    const body = await request.json();
    const supabase = createClient();

    // First, verify the registration exists and belongs to the user
    const { data: existingRegistration, error: fetchError } = await supabase
      .from('pendaftaran_tikrar_tahfidz')
      .select('id, user_id, status')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('[Pendaftaran ID API] Database error (PUT check):', fetchError);
      return ApiResponses.databaseError(fetchError);
    }

    if (!existingRegistration) return ApiResponses.notFound('Registration not found');

    // Check ownership
    if (existingRegistration.user_id !== context.userId) {
      return ApiResponses.forbidden('Access denied');
    }

    // Check if registration is already approved - prevent edits after approval
    if (existingRegistration.status === 'approved') {
      return ApiResponses.error('ALREADY_APPROVED', 'Pendaftaran sudah disetujui dan tidak dapat diubah.', {}, 400);
    }

    // Only user-editable registration fields may be changed here. Workflow,
    // selection, score, ownership, batch and exam fields are server-controlled.
    const editableFields = [
      'full_name', 'email', 'wa_phone', 'telegram_phone', 'address',
      'birth_date', 'age', 'domicile', 'timezone',
      'understands_commitment', 'tried_simulation', 'no_negotiation',
      'has_telegram', 'saved_contact', 'has_permission', 'permission_name',
      'permission_phone', 'chosen_juz', 'no_travel_plans', 'motivation',
      'ready_for_team', 'infaq_amount', 'main_time_slot', 'backup_time_slot',
      'time_commitment', 'understands_program', 'questions'
    ] as const;

    const safeUpdates: Record<string, unknown> = {};
    for (const field of editableFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        safeUpdates[field] =
          (field === 'full_name' || field === 'permission_name') && typeof body[field] === 'string'
            ? formatProperName(body[field])
            : body[field];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return ApiResponses.error('VALIDATION_ERROR', 'Tidak ada field yang dapat diperbarui.', {}, 400);
    }

    const dataToUpdate = {
      ...safeUpdates,
      updated_at: new Date().toISOString()
    };

    // Update the registration
    const { data: updatedRegistration, error: updateError } = await supabase
      .from('pendaftaran_tikrar_tahfidz')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('[Pendaftaran ID API] Database error (PUT update):', updateError);
      return ApiResponses.databaseError(updateError);
    }

    return ApiResponses.success(updatedRegistration, 'Registration updated successfully');
  } catch (error) {
    console.error('[Pendaftaran ID API] Unexpected error (PUT):', error);
    return ApiResponses.handleUnknown(error);
  }
}
