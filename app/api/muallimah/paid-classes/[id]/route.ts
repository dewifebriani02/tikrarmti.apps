import { NextRequest } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getAuthorizationContext } from '@/lib/rbac';
import { canManagePaidClasses, hasAnyRole } from '@/lib/roles';
import { ApiResponses } from '@/lib/api-responses';
import { generateFlyerAIPrompt } from '@/lib/flyer-prompt';
import {
  computeFieldDiffs,
  notifyPaidClassThalibahOnScheduleChange,
  recordRegistrationEdit,
  resolvePaidClassEditPhase,
} from '@/lib/pendaftaran/edit-history';

const supabaseAdmin = createSupabaseAdmin();

const PAID_CLASS_FIELD_LABELS: Record<string, string> = {
  class_name: 'Nama Kelas',
  scheme: 'Skema Bagi Hasil',
  subject_material: 'Materi Utama',
  description: 'Deskripsi Kelas',
  schedule_day: 'Hari Bimbingan',
  time_start: 'Jam Mulai',
  time_end: 'Jam Selesai',
  timezone: 'Zona Waktu',
  duration_info: 'Durasi Program',
  start_date: 'Tanggal Mulai',
  estimated_end_date: 'Estimasi Selesai',
  student_prerequisites: 'Syarat Peserta',
  max_students: 'Kuota Maksimal',
  fee_amount: 'Biaya Kelas',
  facilities: 'Fasilitas',
  whatsapp_group_link: 'Tautan Grup WhatsApp',
  zoom_link: 'Tautan Zoom Meeting',
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthorizationContext();
    if (!authContext) {
      return ApiResponses.unauthorized('Silakan login terlebih dahulu');
    }

    if (!canManagePaidClasses(authContext.roles)) {
      return ApiResponses.forbidden("Akses khusus Mu'allimah terverifikasi atau Admin MTI.");
    }

    const { id } = params;
    const { data: paidClass, error } = await supabaseAdmin
      .from('muallimah_paid_classes')
      .select(`
        *,
        muallimah:users!muallimah_paid_classes_muallimah_id_fkey(
          id,
          full_name,
          email,
          whatsapp
        ),
        batch:batches(id, name)
      `)
      .eq('id', id)
      .single();

    if (error || !paidClass) {
      return ApiResponses.notFound('Kelas berbayar tidak ditemukan');
    }

    const isAdmin = hasAnyRole(authContext.roles, ['admin', 'super_admin']);
    if (!isAdmin && paidClass.muallimah_id !== authContext.userId) {
      return ApiResponses.forbidden('Anda tidak memiliki izin melihat kelas ini');
    }

    return ApiResponses.success({ class: paidClass });
  } catch (error) {
    console.error('[Paid Class Item API] GET error:', error);
    return ApiResponses.handleUnknown(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthorizationContext();
    if (!authContext) {
      return ApiResponses.unauthorized('Silakan login terlebih dahulu');
    }

    if (!canManagePaidClasses(authContext.roles)) {
      return ApiResponses.forbidden(
        "Hanya Mu'allimah terverifikasi atau Admin yang dapat mengubah Kelas Berbayar."
      );
    }

    const { id } = params;
    const body = await request.json();
    const isAdmin = hasAnyRole(authContext.roles, ['admin', 'super_admin']);

    const { data: existingClass, error: fetchErr } = await supabaseAdmin
      .from('muallimah_paid_classes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existingClass) {
      return ApiResponses.notFound('Kelas tidak ditemukan');
    }

    const isOwner = existingClass.muallimah_id === authContext.userId;

    if (!isAdmin && !isOwner) {
      return ApiResponses.forbidden('Anda tidak memiliki akses mengubah kelas ini');
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (isAdmin) {
      if (body.status !== undefined) updates.status = body.status;
      if (body.admin_notes !== undefined) updates.admin_notes = body.admin_notes;
      if (body.status === 'approved' || body.status === 'rejected') {
        updates.reviewed_by = authContext.userId;
        updates.reviewed_at = new Date().toISOString();
      }
    }

    const hasDetailFields = [
      'class_name',
      'scheme',
      'subject_material',
      'description',
      'schedule_day',
      'time_start',
      'time_end',
      'timezone',
      'duration_info',
      'start_date',
      'estimated_end_date',
      'student_prerequisites',
      'max_students',
      'fee_amount',
      'facilities',
      'whatsapp_group_link',
      'zoom_link',
    ].some((k) => body[k] !== undefined);

    let muallimahName = 'Muallimah MTI';

    if ((isOwner || isAdmin) && hasDetailFields) {
      if (existingClass.status === 'rejected' && !isAdmin) {
        return ApiResponses.badRequest('Kelas yang ditolak tidak dapat diedit. Silakan ajukan kelas baru.');
      }

      if (body.class_name !== undefined) updates.class_name = body.class_name.trim();
      if (body.scheme !== undefined) updates.scheme = body.scheme;
      if (body.subject_material !== undefined) updates.subject_material = body.subject_material.trim();
      if (body.description !== undefined) updates.description = body.description?.trim() || null;
      if (body.schedule_day !== undefined) updates.schedule_day = body.schedule_day.trim();
      if (body.time_start !== undefined) updates.time_start = body.time_start.trim();
      if (body.time_end !== undefined) updates.time_end = body.time_end.trim();
      if (body.timezone !== undefined) updates.timezone = body.timezone;
      if (body.duration_info !== undefined) updates.duration_info = body.duration_info?.trim() || null;

      if (body.start_date !== undefined) {
        const cleanStart = body.start_date ? String(body.start_date).slice(0, 10) : '';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanStart)) {
          return ApiResponses.badRequest('Format tanggal mulai tidak valid');
        }
        updates.start_date = cleanStart;
        const oldStart = existingClass.start_date ? String(existingClass.start_date).slice(0, 10) : '';
        if (cleanStart !== oldStart) {
          updates.reminder_h1_ustadzah_sent_at = null;
        }
      }

      if (body.estimated_end_date !== undefined) {
        const cleanEnd = body.estimated_end_date ? String(body.estimated_end_date).slice(0, 10) : null;
        if (cleanEnd && !/^\d{4}-\d{2}-\d{2}$/.test(cleanEnd)) {
          return ApiResponses.badRequest('Format estimasi tanggal selesai tidak valid');
        }
        const effectiveStart = updates.start_date || (existingClass.start_date ? String(existingClass.start_date).slice(0, 10) : '');
        if (cleanEnd && effectiveStart && cleanEnd < effectiveStart) {
          return ApiResponses.badRequest('Estimasi tanggal selesai tidak boleh sebelum tanggal mulai');
        }
        updates.estimated_end_date = cleanEnd;
      }

      if (body.student_prerequisites !== undefined) updates.student_prerequisites = body.student_prerequisites?.trim() || null;
      if (body.max_students !== undefined) updates.max_students = parseInt(body.max_students) || 10;
      if (body.fee_amount !== undefined) updates.fee_amount = parseFloat(body.fee_amount) || 0;
      if (body.facilities !== undefined) updates.facilities = body.facilities.trim();
      if (body.whatsapp_group_link !== undefined) updates.whatsapp_group_link = body.whatsapp_group_link?.trim() || null;
      if (body.zoom_link !== undefined) updates.zoom_link = body.zoom_link?.trim() || null;

      const updatedData = { ...existingClass, ...updates };
      const { data: userProfile } = await supabaseAdmin
        .from('users')
        .select('full_name')
        .eq('id', existingClass.muallimah_id)
        .single();

      muallimahName = userProfile?.full_name || 'Muallimah MTI';

      updates.flyer_prompt_ai = generateFlyerAIPrompt({
        class_name: updatedData.class_name,
        muallimah_name: muallimahName,
        subject_material: updatedData.subject_material,
        schedule_day: updatedData.schedule_day,
        time_start: updatedData.time_start,
        time_end: updatedData.time_end,
        duration_info: updatedData.duration_info,
        start_date: updatedData.start_date,
        estimated_end_date: updatedData.estimated_end_date,
        student_prerequisites: updatedData.student_prerequisites,
        fee_amount: Number(updatedData.fee_amount) || 0,
        max_students: Number(updatedData.max_students) || 10,
        facilities: updatedData.facilities,
      });
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('muallimah_paid_classes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      console.error('[Paid Class Item API] Update error:', updateErr);
      return ApiResponses.databaseError(updateErr);
    }

    let notificationsSent: any = null;
    let historyRecorded = false;
    let editPhase: 'before_daftar_ulang' | 'after_daftar_ulang' = 'before_daftar_ulang';

    if (hasDetailFields && updated) {
      const normalizedOld = {
        ...existingClass,
        start_date: existingClass.start_date ? String(existingClass.start_date).slice(0, 10) : null,
        estimated_end_date: existingClass.estimated_end_date ? String(existingClass.estimated_end_date).slice(0, 10) : null,
        time_start: existingClass.time_start ? String(existingClass.time_start).slice(0, 5) : null,
        time_end: existingClass.time_end ? String(existingClass.time_end).slice(0, 5) : null,
      };
      const normalizedNew = {
        ...updated,
        start_date: updated.start_date ? String(updated.start_date).slice(0, 10) : null,
        estimated_end_date: updated.estimated_end_date ? String(updated.estimated_end_date).slice(0, 10) : null,
        time_start: updated.time_start ? String(updated.time_start).slice(0, 5) : null,
        time_end: updated.time_end ? String(updated.time_end).slice(0, 5) : null,
      };

      const diffs = computeFieldDiffs(normalizedOld, normalizedNew, PAID_CLASS_FIELD_LABELS);
      const phaseInfo = await resolvePaidClassEditPhase(id);
      editPhase = phaseInfo.phase;

      if (Object.keys(diffs).length > 0) {
        const editReason = typeof body.editReason === 'string' ? body.editReason : undefined;

        notificationsSent = await notifyPaidClassThalibahOnScheduleChange({
          paidClassId: id,
          className: updated.class_name,
          ustadzahName: muallimahName,
          changedFields: diffs,
          editReason,
        });

        const historyRow = await recordRegistrationEdit({
          entityType: 'paid_class',
          entityId: id,
          userId: authContext.userId,
          batchId: existingClass.batch_id || null,
          editPhase: phaseInfo.phase,
          changedFields: diffs,
          editReason,
          notificationsSent,
        });
        historyRecorded = Boolean(historyRow);
      }
    }

    let message = 'Data kelas berhasil diperbarui';
    if (notificationsSent && notificationsSent.sentCount > 0) {
      message = `Data kelas diperbarui & notifikasi WhatsApp otomatis terkirim ke ${notificationsSent.sentCount} thalibah.`;
    } else if (historyRecorded) {
      message = 'Data kelas berhasil diperbarui & tercatat di Riwayat Edit.';
    }

    return ApiResponses.success({
      message,
      class: updated,
      editPhase,
      historyRecorded,
      notificationsSent,
    });
  } catch (error) {
    console.error('[Paid Class Item API] PATCH error:', error);
    return ApiResponses.handleUnknown(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthorizationContext();
    if (!authContext) {
      return ApiResponses.unauthorized('Silakan login terlebih dahulu');
    }

    if (!canManagePaidClasses(authContext.roles)) {
      return ApiResponses.forbidden(
        "Hanya Mu'allimah terverifikasi atau Admin yang dapat menghapus Kelas Berbayar."
      );
    }

    const { id } = params;
    const isAdmin = hasAnyRole(authContext.roles, ['admin', 'super_admin']);

    const { data: existingClass } = await supabaseAdmin
      .from('muallimah_paid_classes')
      .select('muallimah_id, status')
      .eq('id', id)
      .single();

    if (!existingClass) {
      return ApiResponses.notFound('Kelas tidak ditemukan');
    }

    if (!isAdmin && existingClass.muallimah_id !== authContext.userId) {
      return ApiResponses.forbidden('Anda tidak memiliki izin menghapus kelas ini');
    }

    const { error: delErr } = await supabaseAdmin
      .from('muallimah_paid_classes')
      .delete()
      .eq('id', id);

    if (delErr) {
      return ApiResponses.databaseError(delErr);
    }

    return ApiResponses.success({ message: 'Kelas berhasil dihapus' });
  } catch (error) {
    console.error('[Paid Class Item API] DELETE error:', error);
    return ApiResponses.handleUnknown(error);
  }
}
