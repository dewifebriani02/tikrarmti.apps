import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger-secure';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getAuthorizationContext, isUserAdmin } from '@/lib/rbac';
import { deleteUploadedFile } from '@/lib/storage';
import {
  computeFieldDiffs,
  recordRegistrationEdit,
  resolveBatchEditPhase,
} from '@/lib/pendaftaran/edit-history';

// PostgreSQL-backed admin client
const supabaseAdmin = createSupabaseAdmin();

const TIKRAR_PUT_FIELD_LABELS: Record<string, string> = {
  full_name: 'Nama Lengkap',
  wa_phone: 'No. WhatsApp',
  telegram_phone: 'No. Telegram',
  domicile: 'Domisili',
  address: 'Alamat',
  timezone: 'Zona Waktu',
  permission_name: 'Nama Pemberi Izin',
  permission_phone: 'No. HP Pemberi Izin',
  chosen_juz: 'Pilihan Juz',
  main_time_slot: 'Jadwal Utama',
  backup_time_slot: 'Jadwal Cadangan',
  motivation: 'Motivasi',
  ready_for_team: 'Komitmen Tim / Infaq',
  infaq_amount: 'Nominal Infaq',
  questions: 'Pertanyaan / Catatan',
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                   request.headers.get('x-real-ip') ||
                   '127.0.0.1';

  try {
    const { id } = await params;

    const context = await getAuthorizationContext();
    const supabase = createServerClient();
    const { data: { user: sbUser }, error: userError } = await supabase.auth.getUser();

    const user = context ? { id: context.userId, email: context.email, roles: context.roles } : sbUser;

    if (!user) {
      logger.warn('Unauthorized update attempt', {
        ip: clientIP,
        endpoint: `/api/pendaftaran/tikrar/${id}`,
        userError: userError?.message
      });

      return NextResponse.json({
        error: 'Unauthorized - Invalid session. Please login again.',
        needsLogin: true
      }, { status: 401 });
    }

    const body = await request.json();
    const isAdmin = context ? isUserAdmin(context) : (user as any)?.roles?.includes('admin');

    const isDeletingOralSubmission = body.oral_submission_url === null &&
                                      body.oral_submission_file_name === null &&
                                      body.oral_submitted_at === null;

    const isOralSubmissionUpdate = isDeletingOralSubmission ||
                                    body.oral_submission_url !== undefined ||
                                    body.oral_submission_file_name !== undefined ||
                                    body.oral_submitted_at !== undefined;

    const isOralAssessmentUpdate = !isDeletingOralSubmission && (
      body.oral_makhraj_errors !== undefined || body.oral_sifat_errors !== undefined ||
      body.oral_mad_errors !== undefined || body.oral_ghunnah_errors !== undefined ||
      body.oral_harakat_errors !== undefined || body.oral_itmamul_harakat_errors !== undefined ||
      body.oral_total_score !== undefined || (body.oral_assessment_status !== undefined && !isDeletingOralSubmission) ||
      body.oral_assessment_notes !== undefined || body.oral_assessment_audio_url !== undefined ||
      body.selection_status !== undefined || body.needs_revision !== undefined
    );

    if (!isAdmin && !isOralSubmissionUpdate && !isOralAssessmentUpdate) {
      if (body.user_id !== undefined && body.user_id !== user.id) {
        return NextResponse.json({
          error: 'Invalid user session. Please login again.'
        }, { status: 401 });
      }
    }

    let query = supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select('*')
      .eq('id', id);

    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { data: existingRegistration, error: fetchError } = await query.single();

    if (fetchError || !existingRegistration) {
      return NextResponse.json({
        error: 'Registration not found or access denied'
      }, { status: 404 });
    }

    if (!isAdmin && isDeletingOralSubmission) {
      const assessmentStatus = existingRegistration.oral_assessment_status;
      const needsRevision =
        existingRegistration.needs_revision === true ||
        assessmentStatus === 'needs_revision' ||
        existingRegistration.oral_assessment_notes === 'NEEDS_REVISION';

      const isSelectionDecided = existingRegistration.selection_status && existingRegistration.selection_status !== 'pending';
      if ((assessmentStatus === 'pass' || assessmentStatus === 'fail' || isSelectionDecided) && !needsRevision) {
        return NextResponse.json({
          error: 'Rekaman sudah dinilai dan tidak dapat dihapus.'
        }, { status: 403 });
      }
    }

    const isScheduleUpdate = body.chosen_juz !== undefined ||
                             body.main_time_slot !== undefined ||
                             body.backup_time_slot !== undefined;

    const updateData: any = {};
    let isHandled = false;

    if (isDeletingOralSubmission) {
      try {
        const candidates = new Set<string>();
        if (existingRegistration.oral_submission_file_name) {
          candidates.add(existingRegistration.oral_submission_file_name);
        }
        if (existingRegistration.oral_submission_url) {
          const parts = existingRegistration.oral_submission_url.split('/');
          const fname = parts[parts.length - 1]?.split('?')[0];
          if (fname) candidates.add(fname);
        }
        for (const fname of Array.from(candidates)) {
          await deleteUploadedFile('selection-audios', fname);
        }
      } catch (fileErr) {
        logger.warn('Failed to delete existing audio file from storage', { error: fileErr });
      }

      updateData.oral_submission_url = null;
      updateData.oral_submission_file_name = null;
      updateData.oral_submitted_at = null;
      updateData.oral_assessment_status = 'not_submitted';
      updateData.needs_revision = false;
      if (existingRegistration.oral_assessment_notes === 'NEEDS_REVISION') {
        updateData.oral_assessment_notes = null;
      }
      isHandled = true;
    } else if (isOralSubmissionUpdate) {
      if (body.oral_submission_url !== undefined) updateData.oral_submission_url = body.oral_submission_url;
      if (body.oral_submission_file_name !== undefined) updateData.oral_submission_file_name = body.oral_submission_file_name;
      if (body.oral_submitted_at !== undefined) updateData.oral_submitted_at = body.oral_submitted_at;
      if (body.oral_assessment_status !== undefined) updateData.oral_assessment_status = body.oral_assessment_status;

      if (!isAdmin && body.oral_submission_url !== null && body.oral_submission_url !== undefined) {
        updateData.oral_assessment_notes = null;
        updateData.needs_revision = false;
      }
      isHandled = true;
    }

    if (isOralAssessmentUpdate) {
      if (!isAdmin) {
        return NextResponse.json({
          error: 'Forbidden - Admin access required to update assessment'
        }, { status: 403 });
      }
      if (body.oral_makhraj_errors !== undefined) updateData.oral_makhraj_errors = body.oral_makhraj_errors;
      if (body.oral_sifat_errors !== undefined) updateData.oral_sifat_errors = body.oral_sifat_errors;
      if (body.oral_mad_errors !== undefined) updateData.oral_mad_errors = body.oral_mad_errors;
      if (body.oral_ghunnah_errors !== undefined) updateData.oral_ghunnah_errors = body.oral_ghunnah_errors;
      if (body.oral_harakat_errors !== undefined) updateData.oral_harakat_errors = body.oral_harakat_errors;
      if (body.oral_itmamul_harakat_errors !== undefined) updateData.oral_itmamul_harakat_errors = body.oral_itmamul_harakat_errors;
      if (body.oral_total_score !== undefined) updateData.oral_total_score = body.oral_total_score;
      if (body.oral_assessment_status !== undefined) updateData.oral_assessment_status = body.oral_assessment_status;
      if (body.oral_assessed_by !== undefined) updateData.oral_assessed_by = body.oral_assessed_by;
      if (body.oral_assessed_at !== undefined) updateData.oral_assessed_at = body.oral_assessed_at;
      if (body.oral_assessment_notes !== undefined) updateData.oral_assessment_notes = body.oral_assessment_notes;
      if (body.oral_assessment_audio_url !== undefined) updateData.oral_assessment_audio_url = body.oral_assessment_audio_url;
      if (body.selection_status !== undefined) updateData.selection_status = body.selection_status;
      if (body.needs_revision !== undefined) updateData.needs_revision = body.needs_revision;
      isHandled = true;
    }

    if (isScheduleUpdate) {
      if (body.chosen_juz !== undefined) updateData.chosen_juz = body.chosen_juz;
      if (body.main_time_slot !== undefined) updateData.main_time_slot = body.main_time_slot;
      if (body.backup_time_slot !== undefined) updateData.backup_time_slot = body.backup_time_slot;
      isHandled = true;
    }

    if (!isHandled) {
      if (body.understands_commitment !== undefined) updateData.understands_commitment = body.understands_commitment;
      if (body.tried_simulation !== undefined) updateData.tried_simulation = body.tried_simulation;
      if (body.no_negotiation !== undefined) updateData.no_negotiation = body.no_negotiation;
      if (body.has_telegram !== undefined) updateData.has_telegram = body.has_telegram;
      if (body.saved_contact !== undefined) updateData.saved_contact = body.saved_contact;
      if (body.has_permission !== undefined) updateData.has_permission = body.has_permission;

      if (body.full_name !== undefined) updateData.full_name = body.full_name;
      if (body.wa_phone !== undefined) updateData.wa_phone = body.wa_phone;
      if (body.telegram_phone !== undefined) updateData.telegram_phone = body.telegram_phone;
      if (body.domicile !== undefined) updateData.domicile = body.domicile;
      if (body.address !== undefined) updateData.address = body.address;
      if (body.birth_date !== undefined) updateData.birth_date = body.birth_date;
      if (body.age !== undefined) updateData.age = body.age;
      if (body.infaq_amount !== undefined) updateData.infaq_amount = body.infaq_amount;
      if (body.timezone !== undefined) updateData.timezone = body.timezone;

      if (body.permission_name !== undefined) updateData.permission_name = body.permission_name;
      if (body.permission_phone !== undefined) updateData.permission_phone = body.permission_phone;
      if (body.chosen_juz !== undefined) updateData.chosen_juz = body.chosen_juz;
      if (body.no_travel_plans !== undefined) updateData.no_travel_plans = body.no_travel_plans;
      if (body.motivation !== undefined) updateData.motivation = body.motivation;
      if (body.ready_for_team !== undefined) updateData.ready_for_team = body.ready_for_team;
      if (body.main_time_slot !== undefined) updateData.main_time_slot = body.main_time_slot;
      if (body.backup_time_slot !== undefined) updateData.backup_time_slot = body.backup_time_slot;
      if (body.time_commitment !== undefined) updateData.time_commitment = body.time_commitment;
      if (body.understands_program !== undefined) updateData.understands_program = body.understands_program;
      if (body.questions !== undefined) updateData.questions = body.questions;
    }

    updateData.updated_at = new Date().toISOString();

    let updateQuery = supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .update(updateData)
      .eq('id', id);

    if (!isAdmin) {
      updateQuery = updateQuery.eq('user_id', user.id);
    }

    const { data: result, error } = await updateQuery.select().single();

    if (error) {
      logger.error('Error updating registration', {
        code: error.code,
        message: error.message,
        ip: clientIP,
        registrationId: id
      });

      return NextResponse.json({
        error: 'Failed to update registration'
      }, { status: 500 });
    }

    // Record edit history for non-oral/non-assessment profile/schedule edits
    if (!isOralSubmissionUpdate && !isOralAssessmentUpdate) {
      try {
        const phaseInfo = await resolveBatchEditPhase({
          userId: existingRegistration.user_id,
          batchId: existingRegistration.batch_id,
        });
        const diffs = computeFieldDiffs(existingRegistration, result, TIKRAR_PUT_FIELD_LABELS);
        await recordRegistrationEdit({
          entityType: 'tikrar',
          entityId: id,
          userId: user.id,
          batchId: existingRegistration.batch_id,
          editPhase: phaseInfo.phase,
          changedFields: diffs,
          editReason: typeof body.editReason === 'string' ? body.editReason : undefined,
        });
      } catch (histErr) {
        logger.warn('Failed recording edit history in PUT /api/pendaftaran/tikrar/[id]', { error: histErr });
      }
    }

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 200 });

  } catch (error) {
    logger.error('Unhandled error in update tikrar registration API', {
      error: error as Error,
      ip: clientIP
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    const { id } = await params;

    const supabase = createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        error: 'Unauthorized - Invalid session. Please login again.',
        needsLogin: true
      }, { status: 401 });
    }

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (!userData || !userData.roles?.includes('admin')) {
      return NextResponse.json({
        error: 'Forbidden - Admin access required'
      }, { status: 403 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({
        error: 'Failed to delete registration'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Registration deleted successfully'
    }, { status: 200 });

  } catch (error) {
    logger.error('Unhandled error in delete tikrar registration API', {
      error: error as Error,
      ip: clientIP
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
