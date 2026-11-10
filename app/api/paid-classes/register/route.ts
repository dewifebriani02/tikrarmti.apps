import { NextRequest } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getAuthorizationContext } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';

const supabaseAdmin = createSupabaseAdmin();

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

    // 1. Fetch class details
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

    // 2. Check current student enrollment count
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

    // 3. Prevent duplicate registration
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
      return ApiResponses.badRequest('Ukhti sudah terdaftar di kelas berbayar ini. Silakan periksa link grup WhatsApp bimbingan.');
    }

    // 4. Create registration record
    const newReg = {
      paid_class_id,
      user_id: authContext?.userId || null,
      full_name: full_name.trim(),
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
