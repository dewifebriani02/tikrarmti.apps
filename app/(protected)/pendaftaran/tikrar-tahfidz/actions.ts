'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitTikrarRegistration(formData: any, userProfile: any, user: any, batch: any, isEditMode: boolean, existingRegistrationId?: string) {
  const supabase = createClient()

  // 1. Validasi Auth (Server-side check)
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  if (!authUser || authError) {
    return { success: false, error: 'Unauthorized. Silakan login kembali.' }
  }

  // 1.5 Syarat Naik Juz (Murojaah 40X)
  // Akses dibuka untuk alumni walau belum menyelesaikan Murojaah Warrior 40X,
  // dengan komitmen menuntaskan sisa putaran di Ruang Alumni.

  // 2. Fetch program associated with this batch
  let program = null
  let programError = null

  // First attempt: Try to find 'open' program with class_type 'tikrar_tahfidz'
  const { data: openProgram, error: openError } = await supabase
    .from('programs')
    .select('id')
    .eq('batch_id', batch.id)
    .eq('class_type', 'tikrar_tahfidz')
    .eq('status', 'open')
    .maybeSingle()

  if (openProgram) {
    program = openProgram
  } else {
    // Second attempt: Find any program for this batch with class_type 'tikrar_tahfidz'
    const { data: anyProgram, error: anyError } = await supabase
      .from('programs')
      .select('id')
      .eq('batch_id', batch.id)
      .eq('class_type', 'tikrar_tahfidz')
      .maybeSingle()

    if (anyProgram) {
      program = anyProgram
    } else {
      programError = anyError || openError
    }
  }

  // Fallback: If still not found, try to find by class_type 'tikrar_tahfidz'
  if (programError || !program) {
    const { data: fallbackProgram } = await supabase
      .from('programs')
      .select('id, batch_id, name, status')
      .eq('class_type', 'tikrar_tahfidz')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fallbackProgram) {
      program = fallbackProgram
    } else {
      return { success: false, error: 'Program untuk batch ini belum tersedia. Silakan hubungi admin.' }
    }
  }

  // Calculate age from birth_date
  const birthDateValue = userProfile?.tanggal_lahir || new Date().toISOString()
  const birthDate = new Date(birthDateValue)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  // Prepare submission data - matching pendaftaran_tikrar_tahfidz table schema
  const isJanda = formData.has_permission === 'janda'

  const submitData = {
    user_id: authUser.id,
    batch_id: batch.id,
    program_id: program.id,
    batch_name: batch.name || '...',
    // User data from users table
    full_name: userProfile?.full_name || authUser.user_metadata?.full_name || authUser.email || '',
    email: authUser.email || '',
    wa_phone: userProfile?.whatsapp || '',
    telegram_phone: userProfile?.telegram || '',
    address: userProfile?.alamat || '',
    birth_date: birthDateValue,
    age: age,
    domicile: userProfile?.kota || '',
    timezone: userProfile?.zona_waktu || 'WIB',
    // Form data - Section 1
    understands_commitment: formData.understands_commitment,
    tried_simulation: formData.tried_simulation,
    no_negotiation: formData.no_negotiation,
    has_telegram: formData.has_telegram,
    saved_contact: formData.saved_contact,
    // Section 2
    has_permission: formData.has_permission,
    permission_name: isJanda ? '' : formData.permission_name,
    permission_phone: isJanda ? '' : formData.permission_phone,
    chosen_juz: formData.chosen_juz,
    no_travel_plans: formData.no_travel_plans,
    motivation: formData.motivation,
    ready_for_team: formData.ready_for_team,
    infaq_amount: formData.ready_for_team === 'infaq' ? formData.infaq_amount : null,
    // Section 3
    main_time_slot: formData.main_time_slot,
    backup_time_slot: formData.backup_time_slot,
    time_commitment: formData.time_commitment,
    // Section 4
    understands_program: formData.understands_program,
    questions: formData.questions || null,
    // Status fields - only set for new registrations
    ...(isEditMode ? {} : {
      status: 'pending',
      selection_status: 'pending',
      submission_date: new Date().toISOString(),
    })
  }

  try {
    let result

    if (isEditMode && existingRegistrationId) {
      // Check whether the chosen juz actually changed to a different juz NUMBER.
      // Codes are formatted as "{juz_number}{A|B}" (e.g. "5A", "5B", "30A") â switching
      // between the A/B part of the SAME juz doesn't affect written-exam placement
      // (questions are pulled by juz number), but switching to a different juz number
      // does, so any previous "Test Tertulis" result is stale and must be invalidated.
      const { data: existingReg } = await supabase
        .from('pendaftaran_tikrar_tahfidz')
        .select('chosen_juz')
        .eq('id', existingRegistrationId)
        .eq('user_id', authUser.id)
        .single()

      const getJuzNumber = (juz: string | null | undefined) => {
        const num = parseInt((juz || '').replace(/[^0-9]/g, ''), 10)
        return Number.isNaN(num) ? null : num
      }

      const oldJuzNumber = getJuzNumber(existingReg?.chosen_juz)
      const newJuzNumber = getJuzNumber(formData.chosen_juz)
      const juzChanged = oldJuzNumber !== null && newJuzNumber !== null && oldJuzNumber !== newJuzNumber

      if (juzChanged) {
        Object.assign(submitData, {
          // Reset "Test Tertulis" (juz placement exam) so it re-unlocks for the new juz
          exam_score: null,
          exam_status: 'not_started',
          exam_submitted_at: null,
          exam_juz_number: null,
          exam_attempt_id: null,
          // Legacy written-quiz fields kept in sync for the same reason
          written_quiz_score: null,
          written_quiz_answers: null,
          written_quiz_total_questions: null,
          written_quiz_correct_answers: null,
          written_submitted_at: null,
          written_quiz_submitted_at: null,
          // Prior placement result (from demotion logic) no longer applies
          final_juz: null,
        })
      }

      // Update existing registration
      result = await supabase
        .from('pendaftaran_tikrar_tahfidz')
        .update(submitData)
        .eq('id', existingRegistrationId)
        .eq('user_id', authUser.id)

      if (result.error) {
        return { success: false, error: `Gagal memperbarui data pendaftaran: ${result.error.message}` }
      }

      // Revalidate paths
      revalidatePath('/dashboard')
      revalidatePath('/pendaftaran')
      revalidatePath('/pendaftaran/tikrar-tahfidz')
      revalidatePath('/seleksi/rekam-suara')

      return {
        success: true,
        message: juzChanged
          ? 'Alhamdulillah! Data pendaftaran berhasil diperbarui! Karena pilihan juz berubah, Ukhti perlu mengulang Test Tertulis untuk penempatan juz yang baru.'
          : 'Alhamdulillah! Data pendaftaran berhasil diperbarui!',
        status: 'success_update'
      }
    } else {
      // Create new registration
      result = await supabase
        .from('pendaftaran_tikrar_tahfidz')
        .insert(submitData)

      if (result.error) {
        return { success: false, error: `Gagal mengirim pendaftaran: ${result.error.message}` }
      }

      // Revalidate paths
      revalidatePath('/dashboard')
      revalidatePath('/pendaftaran')
      revalidatePath('/pendaftaran/tikrar-tahfidz')
      revalidatePath('/seleksi/rekam-suara')

      return {
        success: true,
        message: 'Alhamdulillah! Pendaftaran Tikrar Tahfidz berhasil dikirim!',
        status: 'success'
      }
    }
  } catch (error: any) {
    console.error('Submit tikrar registration error:', error)
    return {
      success: false,
      error: error?.message || 'Terjadi kesalahan tidak terduga'
    }
  }
}

/**
 * Get active registration questions (Public/Thalibah)
 */
export async function getRegistrationQuestions() {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('registration_questions')
      .select('*')
      .eq('is_active', true)
      .order('section', { ascending: true })
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching active registration questions:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('Error in getRegistrationQuestions:', error)
    return { success: false, error: error?.message || 'Failed to fetch registration questions' }
  }
}
