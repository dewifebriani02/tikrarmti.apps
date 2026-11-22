import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function submitTikrarRegistrationImpl(
  formData: any,
  userProfile: any,
  _user: any,
  batch: any,
  isEditMode: boolean,
  existingRegistrationId?: string
) {
  try {
    const supabase = createClient();

    // 1. Validasi Auth (Server-side check)
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (!authUser || authError) {
      return { success: false, statusCode: 401, error: 'Unauthorized. Silakan login kembali.' };
    }

    if (!batch?.id) {
      return { success: false, statusCode: 400, error: 'Batch pendaftaran aktif tidak ditemukan.' };
    }

    // 2. Fetch program associated with this batch
    let program: { id: string } | null = null;
    let programError: any = null;

    const { data: openProgram, error: openError } = await supabase
      .from('programs')
      .select('id')
      .eq('batch_id', batch.id)
      .eq('class_type', 'tikrar_tahfidz')
      .eq('status', 'open')
      .maybeSingle();

    if (openProgram) {
      program = openProgram;
    } else {
      const { data: anyProgram, error: anyError } = await supabase
        .from('programs')
        .select('id')
        .eq('batch_id', batch.id)
        .eq('class_type', 'tikrar_tahfidz')
        .maybeSingle();

      if (anyProgram) {
        program = anyProgram;
      } else {
        programError = anyError || openError;
      }
    }

    if (programError || !program) {
      const { data: fallbackProgram } = await supabase
        .from('programs')
        .select('id, batch_id, name, status')
        .eq('class_type', 'tikrar_tahfidz')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackProgram) {
        program = fallbackProgram;
      } else {
        return {
          success: false,
          statusCode: 400,
          error: 'Program untuk batch ini belum tersedia. Silakan hubungi admin.',
        };
      }
    }

    // Calculate age from birth_date
    const birthDateValue = userProfile?.tanggal_lahir || new Date().toISOString();
    const birthDate = new Date(birthDateValue);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    const isJanda = formData.has_permission === 'janda';

    const submitData: Record<string, any> = {
      user_id: authUser.id,
      batch_id: batch.id,
      program_id: program.id,
      batch_name: batch.name || '...',
      full_name: userProfile?.full_name || authUser.user_metadata?.full_name || authUser.email || '',
      email: authUser.email || '',
      wa_phone: userProfile?.whatsapp || '',
      telegram_phone: userProfile?.telegram || '',
      address: userProfile?.alamat || '',
      birth_date: birthDateValue,
      age: age,
      domicile: userProfile?.kota || '',
      timezone: userProfile?.zona_waktu || 'WIB',
      understands_commitment: formData.understands_commitment,
      tried_simulation: formData.tried_simulation,
      no_negotiation: formData.no_negotiation,
      has_telegram: formData.has_telegram,
      saved_contact: formData.saved_contact,
      has_permission: formData.has_permission,
      permission_name: isJanda ? '' : formData.permission_name,
      permission_phone: isJanda ? '' : formData.permission_phone,
      chosen_juz: formData.chosen_juz,
      no_travel_plans: formData.no_travel_plans,
      motivation: formData.motivation,
      ready_for_team: formData.ready_for_team,
      infaq_amount: formData.ready_for_team === 'infaq' ? formData.infaq_amount : null,
      main_time_slot: formData.main_time_slot,
      backup_time_slot: formData.backup_time_slot,
      time_commitment: formData.time_commitment,
      understands_program: formData.understands_program,
      questions: formData.questions || null,
      ...(isEditMode
        ? {}
        : {
            status: 'pending',
            selection_status: 'pending',
            submission_date: new Date().toISOString(),
          }),
    };

    if (isEditMode && existingRegistrationId) {
      const { data: existingReg } = await supabase
        .from('pendaftaran_tikrar_tahfidz')
        .select('chosen_juz')
        .eq('id', existingRegistrationId)
        .eq('user_id', authUser.id)
        .single();

      const getJuzNumber = (juz: string | null | undefined) => {
        const num = parseInt((juz || '').replace(/[^0-9]/g, ''), 10);
        return Number.isNaN(num) ? null : num;
      };

      const oldJuzNumber = getJuzNumber(existingReg?.chosen_juz);
      const newJuzNumber = getJuzNumber(formData.chosen_juz);
      const juzChanged = oldJuzNumber !== null && newJuzNumber !== null && oldJuzNumber !== newJuzNumber;

      if (juzChanged) {
        Object.assign(submitData, {
          exam_score: null,
          exam_status: 'not_started',
          exam_submitted_at: null,
          exam_juz_number: null,
          exam_attempt_id: null,
          written_quiz_score: null,
          written_quiz_answers: null,
          written_quiz_total_questions: null,
          written_quiz_correct_answers: null,
          written_submitted_at: null,
          written_quiz_submitted_at: null,
          final_juz: null,
        });
      }

      const result = await supabase
        .from('pendaftaran_tikrar_tahfidz')
        .update(submitData)
        .eq('id', existingRegistrationId)
        .eq('user_id', authUser.id);

      if (result.error) {
        return {
          success: false,
          statusCode: 400,
          error: `Gagal memperbarui data pendaftaran: ${result.error.message}`,
        };
      }

      try {
        revalidatePath('/dashboard');
        revalidatePath('/pendaftaran');
        revalidatePath('/pendaftaran/tikrar-tahfidz');
        revalidatePath('/seleksi/rekam-suara');
      } catch {}

      return {
        success: true,
        message: juzChanged
          ? 'Alhamdulillah! Data pendaftaran berhasil diperbarui! Karena pilihan juz berubah, Ukhti perlu mengulang Test Tertulis untuk penempatan juz yang baru.'
          : 'Alhamdulillah! Data pendaftaran berhasil diperbarui!',
        status: 'success_update',
      };
    } else {
      const result = await supabase
        .from('pendaftaran_tikrar_tahfidz')
        .insert(submitData);

      if (result.error) {
        return {
          success: false,
          statusCode: 400,
          error: `Gagal mengirim pendaftaran: ${result.error.message}`,
        };
      }

      try {
        revalidatePath('/dashboard');
        revalidatePath('/pendaftaran');
        revalidatePath('/pendaftaran/tikrar-tahfidz');
        revalidatePath('/seleksi/rekam-suara');
      } catch {}

      return {
        success: true,
        message: 'Alhamdulillah! Pendaftaran Tikrar Tahfidz berhasil dikirim!',
        status: 'success',
      };
    }
  } catch (error: any) {
    console.error('Submit tikrar registration error:', error);
    return {
      success: false,
      statusCode: 500,
      error: error?.message || 'Terjadi kesalahan tidak terduga',
    };
  }
}

export async function submitPraTikrarRegistrationImpl(
  formData: any,
  userProfile: any,
  _user: any,
  batch: any,
  isEditMode: boolean,
  existingRegistrationId?: string
) {
  try {
    const supabase = createClient();

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (!authUser || authError) {
      return { success: false, statusCode: 401, error: 'Unauthorized. Silakan login kembali.' };
    }

    if (!batch?.id) {
      return { success: false, statusCode: 400, error: 'Batch pendaftaran aktif tidak ditemukan.' };
    }

    let program: { id: string } | null = null;
    const { data: openProgram } = await supabase
      .from('programs')
      .select('id')
      .eq('batch_id', batch.id)
      .eq('class_type', 'pra_tahfidz')
      .eq('status', 'open')
      .maybeSingle();

    if (openProgram) {
      program = openProgram;
    } else {
      const { data: anyProgram } = await supabase
        .from('programs')
        .select('id')
        .eq('batch_id', batch.id)
        .eq('class_type', 'pra_tahfidz')
        .maybeSingle();

      if (anyProgram) {
        program = anyProgram;
      }
    }

    const birthDateValue = userProfile?.tanggal_lahir || new Date().toISOString();
    const birthDate = new Date(birthDateValue);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    const isJanda = formData.has_permission === 'janda';

    const submitData: Record<string, any> = {
      user_id: authUser.id,
      batch_id: batch.id,
      program_id: program?.id || null,
      batch_name: batch.name || '...',
      full_name: userProfile?.full_name || authUser.user_metadata?.full_name || authUser.email || '',
      email: authUser.email || '',
      wa_phone: userProfile?.whatsapp || '',
      telegram_phone: userProfile?.telegram || '',
      address: userProfile?.alamat || '',
      birth_date: birthDateValue,
      age: age,
      domicile: userProfile?.kota || '',
      timezone: userProfile?.zona_waktu || 'WIB',
      understands_commitment: formData.understands_commitment,
      has_permission: formData.has_permission,
      permission_name: isJanda ? '' : formData.permission_name,
      permission_phone: isJanda ? '' : formData.permission_phone,
      chosen_juz: '30',
      motivation: formData.motivation,
      questions: formData.questions || null,
      ...(isEditMode
        ? {}
        : {
            status: 'pending',
            selection_status: 'pending',
            submission_date: new Date().toISOString(),
          }),
    };

    if (isEditMode && existingRegistrationId) {
      const result = await supabase
        .from('pendaftaran_tikrar_tahfidz')
        .update(submitData)
        .eq('id', existingRegistrationId)
        .eq('user_id', authUser.id);

      if (result.error) {
        return {
          success: false,
          statusCode: 400,
          error: `Gagal memperbarui data pendaftaran: ${result.error.message}`,
        };
      }

      try {
        revalidatePath('/dashboard');
        revalidatePath('/pendaftaran');
        revalidatePath('/pendaftaran/pra-tikrar');
      } catch {}

      return {
        success: true,
        message: 'Alhamdulillah! Data pendaftaran Pra-Tikrar berhasil diperbarui!',
        status: 'success_update',
      };
    } else {
      const result = await supabase
        .from('pendaftaran_tikrar_tahfidz')
        .insert(submitData);

      if (result.error) {
        return {
          success: false,
          statusCode: 400,
          error: `Gagal mengirim pendaftaran: ${result.error.message}`,
        };
      }

      try {
        revalidatePath('/dashboard');
        revalidatePath('/pendaftaran');
        revalidatePath('/pendaftaran/pra-tikrar');
      } catch {}

      return {
        success: true,
        message: 'Alhamdulillah! Pendaftaran Pra-Tikrar berhasil dikirim!',
        status: 'success',
      };
    }
  } catch (error: any) {
    console.error('Submit pra-tikrar registration error:', error);
    return {
      success: false,
      statusCode: 500,
      error: error?.message || 'Terjadi kesalahan tidak terduga',
    };
  }
}

export async function submitMuallimahRegistrationImpl(
  formData: any,
  userData: any,
  _user: any,
  batchId: string
) {
  try {
    const supabase = createClient();
    const supabaseAdmin = createSupabaseAdmin();

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (!authUser || authError) {
      return { success: false, statusCode: 401, error: 'Unauthorized. Silakan login kembali.' };
    }

    if (!batchId) {
      return { success: false, statusCode: 400, error: 'Batch ID tidak ditemukan' };
    }

    const preferredScheduleObj: Record<string, any> = {};
    const backupScheduleObj: Record<string, any> = {};

    if (formData.class_tikrar) {
      preferredScheduleObj.tikrar = {
        day: formData.schedule_tikrar_day,
        time_start: formData.schedule_tikrar_time_start,
        time_end: formData.schedule_tikrar_time_end,
      };
      if (formData.schedule_tikrar_day2 && formData.schedule_tikrar_time_start2 && formData.schedule_tikrar_time_end2) {
        backupScheduleObj.tikrar = {
          day: formData.schedule_tikrar_day2,
          time_start: formData.schedule_tikrar_time_start2,
          time_end: formData.schedule_tikrar_time_end2,
        };
      }
    }

    if (formData.class_pratikrar) {
      preferredScheduleObj.pra_tahfidz = {
        day: formData.schedule_pratikrar_day,
        time_start: formData.schedule_pratikrar_time_start,
        time_end: formData.schedule_pratikrar_time_end,
      };
      if (formData.schedule_pratikrar_day2 && formData.schedule_pratikrar_time_start2 && formData.schedule_pratikrar_time_end2) {
        backupScheduleObj.pra_tahfidz = {
          day: formData.schedule_pratikrar_day2,
          time_start: formData.schedule_pratikrar_time_start2,
          time_end: formData.schedule_pratikrar_time_end2,
        };
      }
    }

    const classTypesSelected: string[] = [];
    if (formData.class_tikrar) classTypesSelected.push('tikrar_tahfidz');
    if (formData.class_pratikrar) classTypesSelected.push('pra_tahfidz');

    const profileData: any = {
      user_id: authUser.id,
      full_name: userData?.full_name || authUser.user_metadata?.full_name || (authUser.user_metadata as any)?.name || '',
      email: authUser.email || '',
      whatsapp: userData?.whatsapp || '',
      occupation: userData?.pekerjaan || '',
      tajweed_institution: formData.tajweed_institution || null,
      quran_institution: formData.quran_institution || null,
      teaching_communities: formData.teaching_communities || null,
      memorized_tajweed_matan: formData.memorized_tajweed_matan || null,
      studied_matan_exegesis: formData.studied_matan_exegesis || null,
      memorization_level: formData.memorization_level || null,
      memorized_juz: Array.isArray(formData.memorized_juz) ? formData.memorized_juz.join(', ') : null,
      examined_juz: Array.isArray(formData.examined_juz) ? formData.examined_juz.join(', ') : null,
      certified_juz: Array.isArray(formData.certified_juz) ? formData.certified_juz.join(', ') : null,
      age: formData.age || null,
      batch_id: batchId,
    };

    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('muallimah_registrations')
      .select('id')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (checkError) {
      return { success: false, statusCode: 400, error: `Gagal memvalidasi profil: ${checkError.message}` };
    }

    let profileResult;
    if (existingProfile) {
      profileResult = await supabaseAdmin
        .from('muallimah_registrations')
        .update(profileData)
        .eq('id', existingProfile.id);
    } else {
      profileResult = await supabaseAdmin
        .from('muallimah_registrations')
        .insert(profileData);
    }

    if (profileResult.error) {
      return { success: false, statusCode: 400, error: `Gagal menyimpan profil: ${profileResult.error.message}` };
    }

    const akadData = {
      user_id: authUser.id,
      batch_id: batchId,
      preferred_juz: Array.isArray(formData.preferred_juz) ? formData.preferred_juz.join(', ') : null,
      class_type: classTypesSelected.join(', ') || 'tikrar_tahfidz',
      paid_class_scheme: 'none',
      preferred_max_thalibah: formData.preferred_max_thalibah || 10,
      preferred_schedule: JSON.stringify(preferredScheduleObj),
      backup_schedule: Object.keys(backupScheduleObj).length > 0 ? JSON.stringify(backupScheduleObj) : null,
      understands_commitment: formData.understands_commitment === true,
      status: 'pending',
      akad_signed_at: new Date().toISOString(),
    };

    const { error: akadError } = await supabaseAdmin
      .from('muallimah_akads')
      .upsert(akadData, { onConflict: 'user_id,batch_id' });

    if (akadError) {
      return { success: false, statusCode: 400, error: `Gagal menyimpan akad: ${akadError.message}` };
    }

    try {
      revalidatePath('/dashboard');
      revalidatePath('/pendaftaran/muallimah');
      revalidatePath('/admin');
    } catch {}

    return {
      success: true,
      message: 'Alhamdulillah! Pendaftaran dan Akad berhasil disimpan!',
    };
  } catch (error: any) {
    console.error('Submit muallimah unexpected error:', error);
    return {
      success: false,
      statusCode: 500,
      error: error?.message || 'Terjadi kesalahan tidak terduga',
    };
  }
}

export async function getRegistrationQuestionsImpl() {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('registration_questions')
      .select('*')
      .eq('is_active', true)
      .order('section', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) {
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to fetch registration questions', data: null };
  }
}

export async function getMuallimahRegistrationQuestionsImpl() {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('muallimah_registration_questions')
      .select('*')
      .eq('is_active', true)
      .order('section', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) {
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data, error: null };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to fetch muallimah registration questions', data: null };
  }
}
