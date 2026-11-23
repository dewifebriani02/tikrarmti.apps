import { NextRequest } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getAuthorizationContext, isUserAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { formatProperName } from '@/lib/utils/proper-name';
import {
  computeFieldDiffs,
  recordRegistrationEdit,
  resolvePaidClassEditPhase,
} from '@/lib/pendaftaran/edit-history';

const supabaseAdmin = createSupabaseAdmin();

const PAID_CLASS_REG_FIELD_LABELS: Record<string, string> = {
  full_name: 'Nama Lengkap',
  email: 'Email',
  whatsapp: 'No. WhatsApp',
  telegram: 'No. Telegram',
  city_domicile: 'Kota Domisili',
  motivation: 'Motivasi',
  payment_proof_url: 'Bukti Pembayaran',
};

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthorizationContext();
    const body = await request.json();

    const {
      paid_class_id,
      full_name,
      email,
      whatsapp,
      telegram,
      city_domicile,
      motivation,
      payment_proof_url,
      infaq_amount,
    } = body;

    if (!paid_class_id || !full_name || !email || !whatsapp) {
      return ApiResponses.badRequest('Data pendaftaran wajib lengkap (Kelas, Nama Lengkap, Email, dan No. WhatsApp)');
    }

    const { data: paidClass, error: classErr } = await supabaseAdmin
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
      .eq('id', paid_class_id)
      .single();

    if (classErr || !paidClass) {
      return ApiResponses.notFound('Kelas berbayar tidak ditemukan');
    }

    if (!['approved', 'active'].includes(paidClass.status)) {
      return ApiResponses.badRequest('Pendaftaran untuk kelas ini sedang tidak dibuka');
    }

    const { count: enrolledCount, error: countErr } = await supabaseAdmin
      .from('paid_class_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('paid_class_id', paid_class_id)
      .neq('status', 'cancelled');

    if (countErr) {
      console.error('[Paid Class Registration] Count error:', countErr);
      return ApiResponses.databaseError(countErr);
    }

    const maxStudents = paidClass.max_students || 10;
    if ((enrolledCount || 0) >= maxStudents) {
      return ApiResponses.badRequest('Mohon maaf, kuota peserta untuk kelas ini sudah penuh');
    }

    let duplicateQuery = supabaseAdmin
      .from('paid_class_registrations')
      .select('id')
      .eq('paid_class_id', paid_class_id)
      .neq('status', 'cancelled');

    if (authContext?.userId) {
      duplicateQuery = duplicateQuery.or(`user_id.eq.${authContext.userId},email.eq.${email.trim().toLowerCase()}`);
    } else {
      duplicateQuery = duplicateQuery.eq('email', email.trim().toLowerCase());
    }

    const { data: duplicate } = await duplicateQuery.maybeSingle();
    if (duplicate) {
      return ApiResponses.badRequest('Ukhti sudah terdaftar di kelas berbayar ini. Silakan gunakan tombol Edit Pendaftaran jika ingin mengubah data.');
    }

    const newReg = {
      paid_class_id,
      user_id: authContext?.userId || null,
      full_name: formatProperName(full_name),
      email: email.trim().toLowerCase(),
      whatsapp: whatsapp.trim(),
      telegram: telegram?.trim() || null,
      city_domicile: city_domicile?.trim() || null,
      motivation: motivation?.trim() || null,
      payment_proof_url: payment_proof_url?.trim() || null,
      infaq_amount: Number(infaq_amount) || Number(paidClass.fee_amount) || 0,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('paid_class_registrations')
      .insert(newReg)
      .select()
      .single();

    if (insertError) {
      console.error('[Paid Class Registration] Insert error:', insertError);
      return ApiResponses.databaseError(insertError);
    }

    return ApiResponses.success({
      message: 'Alhamdulillah, pendaftaran Kelas Berbayar berhasil!',
      registration: inserted,
      class: {
        class_name: paidClass.class_name,
        muallimah_name: paidClass.muallimah?.full_name || 'Muallimah MTI',
        schedule_day: paidClass.schedule_day,
        time_start: paidClass.time_start,
        time_end: paidClass.time_end,
        timezone: paidClass.timezone || 'WIB',
        whatsapp_group_link: paidClass.whatsapp_group_link,
      }
    });
  } catch (error) {
    console.error('[Paid Class Registration API] Unexpected error:', error);
    return ApiResponses.handleUnknown(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authContext = await getAuthorizationContext();
    if (!authContext) {
      return ApiResponses.unauthorized('Silakan login terlebih dahulu untuk mengubah data pendaftaran');
    }

    const body = await request.json();
    const {
      registration_id,
      paid_class_id,
      full_name,
      email,
      whatsapp,
      telegram,
      city_domicile,
      motivation,
      payment_proof_url,
      editReason,
    } = body;

    if (!registration_id && !paid_class_id) {
      return ApiResponses.badRequest('ID pendaftaran atau ID kelas wajib disertakan');
    }

    if (!full_name || !email || !whatsapp) {
      return ApiResponses.badRequest('Nama Lengkap, Email, dan No. WhatsApp wajib diisi');
    }

    let existingQuery = supabaseAdmin
      .from('paid_class_registrations')
      .select('*')
      .neq('status', 'cancelled');

    if (registration_id) {
      existingQuery = existingQuery.eq('id', registration_id);
    } else {
      existingQuery = existingQuery
        .eq('paid_class_id', paid_class_id)
        .eq('user_id', authContext.userId);
    }

    const { data: existingReg, error: fetchErr } = await existingQuery.maybeSingle();
    if (fetchErr || !existingReg) {
      return ApiResponses.notFound('Data pendaftaran kelas berbayar tidak ditemukan');
    }

    const isAdmin = isUserAdmin(authContext);
    if (!isAdmin && existingReg.user_id !== authContext.userId) {
      return ApiResponses.forbidden('Ukhti tidak memiliki akses mengubah pendaftaran ini');
    }

    const updates = {
      full_name: formatProperName(full_name),
      email: email.trim().toLowerCase(),
      whatsapp: whatsapp.trim(),
      telegram: telegram !== undefined ? (telegram?.trim() || null) : existingReg.telegram,
      city_domicile: city_domicile !== undefined ? (city_domicile?.trim() || null) : existingReg.city_domicile,
      motivation: motivation !== undefined ? (motivation?.trim() || null) : existingReg.motivation,
      payment_proof_url: payment_proof_url !== undefined ? (payment_proof_url?.trim() || null) : existingReg.payment_proof_url,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('paid_class_registrations')
      .update(updates)
      .eq('id', existingReg.id)
      .select()
      .single();

    if (updateErr) {
      console.error('[Paid Class Registration PATCH] Update error:', updateErr);
      return ApiResponses.databaseError(updateErr);
    }

    const phaseInfo = await resolvePaidClassEditPhase(
      existingReg.paid_class_id,
      existingReg.status
    );
    const diffs = computeFieldDiffs(existingReg, updated, PAID_CLASS_REG_FIELD_LABELS);
    const historyRow = await recordRegistrationEdit({
      entityType: 'paid_class_registration',
      entityId: existingReg.id,
      userId: authContext.userId,
      editPhase: phaseInfo.phase,
      changedFields: diffs,
      editReason: typeof editReason === 'string' ? editReason : undefined,
    });

    return ApiResponses.success({
      message: historyRow
        ? 'Alhamdulillah! Data pendaftaran kelas berbayar diperbarui & tercatat di Riwayat Edit.'
        : 'Alhamdulillah! Data pendaftaran kelas berbayar berhasil diperbarui!',
      registration: updated,
      editPhase: phaseInfo.phase,
      historyRecorded: Boolean(historyRow),
    });
  } catch (error) {
    console.error('[Paid Class Registration PATCH] Unexpected error:', error);
    return ApiResponses.handleUnknown(error);
  }
}
