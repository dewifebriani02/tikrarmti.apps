'use server'

import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function submitMuallimahRegistration(formData: any, userData: any, user: any, batchId: string) {
  const supabase = createClient()
  const supabaseAdmin = createSupabaseAdmin()

  // 1. Auth Check
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  if (!authUser || authError) {
    return { success: false, error: 'Unauthorized. Silakan login kembali.' }
  }

  if (!batchId) {
    return { success: false, error: 'Batch ID tidak ditemukan' }
  }

  try {
    // 2. Prepare Data
    const preferredScheduleObj: Record<string, any> = {}
    const backupScheduleObj: Record<string, any> = {}

    if (formData.class_tikrar) {
      preferredScheduleObj.tikrar = {
        day: formData.schedule_tikrar_day,
        time_start: formData.schedule_tikrar_time_start,
        time_end: formData.schedule_tikrar_time_end,
      }
      if (formData.schedule_tikrar_day2 && formData.schedule_tikrar_time_start2 && formData.schedule_tikrar_time_end2) {
        backupScheduleObj.tikrar = {
          day: formData.schedule_tikrar_day2,
          time_start: formData.schedule_tikrar_time_start2,
          time_end: formData.schedule_tikrar_time_end2,
        }
      }
    }

    if (formData.class_pratikrar) {
      preferredScheduleObj.pra_tahfidz = {
        day: formData.schedule_pratikrar_day,
        time_start: formData.schedule_pratikrar_time_start,
        time_end: formData.schedule_pratikrar_time_end,
      }
      if (formData.schedule_pratikrar_day2 && formData.schedule_pratikrar_time_start2 && formData.schedule_pratikrar_time_end2) {
        backupScheduleObj.pra_tahfidz = {
          day: formData.schedule_pratikrar_day2,
          time_start: formData.schedule_pratikrar_time_start2,
          time_end: formData.schedule_pratikrar_time_end2,
        }
      }
    }

    if (formData.class_paid) {
      preferredScheduleObj.berbayar = {
        day: formData.schedule_paid_day,
        time_start: formData.schedule_paid_time_start,
        time_end: formData.schedule_paid_time_end,
      }
      if (formData.schedule_paid_day2 && formData.schedule_paid_time_start2 && formData.schedule_paid_time_end2) {
        backupScheduleObj.berbayar = {
          day: formData.schedule_paid_day2,
          time_start: formData.schedule_paid_time_start2,
          time_end: formData.schedule_paid_time_end2,
        }
      }
    }

    const classTypesSelected: string[] = []
    if (formData.class_tikrar) classTypesSelected.push('tikrar_tahfidz')
    if (formData.class_pratikrar) classTypesSelected.push('pra_tahfidz')
    if (formData.class_paid) classTypesSelected.push('tikrar_berbayar')
    
    // 3. Step 1: Upsert Profile (muallimah_registrations)
    // We treat this table as the permanent profile. 
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
    }

    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('muallimah_registrations')
      .select('id')
      .eq('user_id', authUser.id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing profile:', checkError)
      return { success: false, error: `Gagal memvalidasi profil: ${checkError.message}` }
    }

    let profileResult;
    if (existingProfile) {
      profileResult = await supabaseAdmin
        .from('muallimah_registrations')
        .update(profileData)
        .eq('id', existingProfile.id)
    } else {
      profileResult = await supabaseAdmin
        .from('muallimah_registrations')
        .insert(profileData)
    }

    if (profileResult.error) {
      console.error('Profile save error detail:', profileResult.error)
      return { success: false, error: `Gagal menyimpan profil: ${profileResult.error.message}` }
    }

    // 4. Step 2: Upsert Akad (muallimah_akads)
    const akadData = {
      user_id: authUser.id,
      batch_id: batchId,
      preferred_juz: Array.isArray(formData.preferred_juz) ? formData.preferred_juz.join(', ') : null,
      class_type: classTypesSelected.join(', ') || 'tikrar_tahfidz',
      paid_class_scheme: formData.class_paid ? (formData.paid_class_scheme || 'none') : 'none',
      preferred_max_thalibah: formData.preferred_max_thalibah || 10,
      preferred_schedule: JSON.stringify(preferredScheduleObj),
      backup_schedule: Object.keys(backupScheduleObj).length > 0 ? JSON.stringify(backupScheduleObj) : null,
      understands_commitment: formData.understands_commitment === true,
      status: 'pending',
      akad_signed_at: new Date().toISOString(),
    }

    const { error: akadError } = await supabaseAdmin
      .from('muallimah_akads')
      .upsert(akadData, { onConflict: 'user_id,batch_id' })

    if (akadError) {
      console.error('Akad upsert error detail:', akadError)
      return { success: false, error: `Gagal menyimpan akad: ${akadError.message}` }
    }

    // 5. Cleanup & Revalidate
    revalidatePath('/dashboard')
    revalidatePath('/pendaftaran/muallimah')
    revalidatePath('/admin')

    return {
      success: true,
      message: 'Alhamdulillah! Pendaftaran dan Akad berhasil disimpan!'
    }

  } catch (error: any) {
    console.error('Submit muallimah unexpected error:', error)
    return { success: false, error: error?.message || 'Terjadi kesalahan tidak terduga' }
  }
}

export async function getMuallimahRegistration(userId: string, batchId: string) {
  const supabase = createClient()

  // For backward compatibility, but we should use separate calls in the UI
  const { data, error } = await supabase
    .from('muallimah_akads')
    .select('*, profile:muallimah_registrations(*)')
    .eq('user_id', userId)
    .eq('batch_id', batchId)
    .maybeSingle()

  if (error) return { success: false, error: error.message, data: null }
  return { success: true, data, error: null }
}

export async function getMuallimahRegistrationQuestions() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('muallimah_registration_questions')
    .select('*')
    .eq('is_active', true)
    .order('section', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching muallimah registration questions:', error)
    return { success: false, error: error.message, data: null }
  }

  return { success: true, data, error: null }
}

