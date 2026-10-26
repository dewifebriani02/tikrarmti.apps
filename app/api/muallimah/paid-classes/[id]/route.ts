import { NextRequest } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getAuthorizationContext, isUserAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { generateFlyerAIPrompt } from '@/lib/flyer-prompt';

const supabaseAdmin = createSupabaseAdmin();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthorizationContext();
    if (!authContext) {
      return ApiResponses.unauthorized('Silakan login terlebih dahulu');
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

    const isAdmin = isUserAdmin(authContext);
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

    const { id } = params;
    const body = await request.json();
    const isAdmin = isUserAdmin(authContext);

    // Fetch existing class
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

    // Admin updates (approval / rejection / admin_notes)
    if (isAdmin) {
      if (body.status !== undefined) updates.status = body.status;
      if (body.admin_notes !== undefined) updates.admin_notes = body.admin_notes;
      if (body.status === 'approved' || body.status === 'rejected') {
        updates.reviewed_by = authContext.userId;
        updates.reviewed_at = new Date().toISOString();
      }
    }

    // Owner updates (class details)
    if (isOwner) {
      if (existingClass.status === 'approved' && !isAdmin) {
        return ApiResponses.badRequest('Kelas yang sudah disetujui tidak dapat diubah langsung. Hubungi admin untuk revisi.');
      }

      if (body.class_name !== undefined) updates.class_name = body.class_name.trim();
      if (body.scheme !== undefined) updates.scheme = body.scheme;
      if (body.subject_material !== undefined) updates.subject_material = body.subject_material.trim();
      if (body.description !== undefined) updates.description = body.description?.trim() || null;
      if (body.schedule_day !== undefined) updates.schedule_day = body.schedule_day.trim();
      if (body.time_start !== undefined) updates.time_start = body.time_start.trim();
      if (body.time_end !== undefined) updates.time_end = body.time_end.trim();
      if (body.max_students !== undefined) updates.max_students = parseInt(body.max_students) || 10;
      if (body.fee_amount !== undefined) updates.fee_amount = parseFloat(body.fee_amount) || 0;
      if (body.facilities !== undefined) updates.facilities = body.facilities.trim();
      if (body.whatsapp_group_link !== undefined) updates.whatsapp_group_link = body.whatsapp_group_link?.trim() || null;
      if (body.zoom_link !== undefined) updates.zoom_link = body.zoom_link?.trim() || null;

      // Regenerate prompt if key fields changed
      const updatedData = { ...existingClass, ...updates };
      const { data: userProfile } = await supabaseAdmin
        .from('users')
        .select('full_name')
        .eq('id', existingClass.muallimah_id)
        .single();

      updates.flyer_prompt_ai = generateFlyerAIPrompt({
        class_name: updatedData.class_name,
        muallimah_name: userProfile?.full_name || 'Muallimah MTI',
        subject_material: updatedData.subject_material,
        schedule_day: updatedData.schedule_day,
        time_start: updatedData.time_start,
        time_end: updatedData.time_end,
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

    return ApiResponses.success({
      message: 'Data kelas berhasil diperbarui',
      class: updated
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

    const { id } = params;
    const isAdmin = isUserAdmin(authContext);

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
