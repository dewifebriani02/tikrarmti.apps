'use server'

import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { syncApprovedSubmissionToHalaqahStudents } from '@/lib/halaqah-students-sync'
import { saveUploadedFile, deleteUploadedFile } from '@/lib/storage'

const parseDonationAmount = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null
  const digits = String(value).replace(/\D/g, '')
  return digits ? Number(digits) : null
}
import { revalidatePath } from 'next/cache'

export interface DaftarUlangFormData {
  // Confirmed data from registration
  confirmed_full_name: string
  confirmed_chosen_juz: string
  confirmed_main_time_slot: string
  confirmed_backup_time_slot: string
  confirmed_wa_phone?: string
  confirmed_address?: string

  // Partner selection
  partner_type?: 'self_match' | 'system_match' | 'family' | 'tarteel' | '' | null
  partner_user_id?: string
  partner_name?: string
  partner_relationship?: string
  partner_wa_phone?: string
  partner_notes?: string

  // Halaqah selection
  ujian_halaqah_id?: string
  tashih_halaqah_id?: string

  // Pengabdian & Donasi
  pengabdian_choice?: string
  pengabdian_type?: string | string[]
  donasi_amount?: string | number

  // Akad - Array of files
  akad_files?: Array<{ url: string; name: string }>
}

export async function saveDaftarUlangDraft(
  registrationId: string,
  data: Partial<DaftarUlangFormData>
) {
  const supabase = createClient()

  // 1. Validasi Auth
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  if (!authUser || authError) {
    return { success: false, error: 'Unauthorized. Silakan login kembali.' }
  }

  // 2. Verify registration belongs to user and is selected
  const { data: registration, error: regError } = await supabase
    .from('pendaftaran_tikrar_tahfidz')
    .select('id, user_id, batch_id, selection_status')
    .eq('id', registrationId)
    .single()

  if (regError || !registration || registration.user_id !== authUser.id) {
    return { success: false, error: 'Pendaftaran tidak valid.' }
  }

  if (registration.selection_status !== 'selected') {
    return { success: false, error: 'Ukhti belum lolos seleksi.' }
  }

  try {
    // Check for existing draft
    const { data: existing } = await supabase
      .from('daftar_ulang_submissions')
      .select('id')
      .eq('user_id', authUser.id)
      .eq('registration_id', registrationId)
      .maybeSingle()

    // Convert empty strings to null for UUID and optional fields
    // IMPORTANT: For draft status, do NOT save halaqah data - only save partner and akad data
    // This ensures draft submissions don't accidentally reserve halaqah slots
    const cleanedData = {
      confirmed_full_name: data.confirmed_full_name,
      confirmed_chosen_juz: data.confirmed_chosen_juz,
      confirmed_main_time_slot: data.confirmed_main_time_slot,
      confirmed_backup_time_slot: data.confirmed_backup_time_slot,
      confirmed_wa_phone: data.confirmed_wa_phone || null,
      confirmed_address: data.confirmed_address || null,
      partner_type: data.partner_type || null,
      partner_user_id: data.partner_user_id || null,
      partner_name: data.partner_name || null,
      partner_relationship: data.partner_relationship || null,
      partner_wa_phone: data.partner_wa_phone || null,
      partner_notes: data.partner_notes || null,
      
      // Pengabdian & Donasi
      pengabdian_choice: data.pengabdian_choice || null,
      donasi_amount: parseDonationAmount(data.donasi_amount),

      // DO NOT overwrite halaqah data for draft because Halaqah selection is now handled independently in Pilih Pasangan
      akad_files: data.akad_files || null,
    }

    // Use the admin client for the actual write + read-back. Doing the
    // .select().single() immediately after an insert/update through the
    // user-session (RLS-bound) client is what was causing
    // "Cannot coerce the result to a single JSON object": if the RLS SELECT
    // policy doesn't line up perfectly with the row just written (e.g. right
    // after a status change), PostgREST returns 0 rows for the read-back and
    // .single() throws. Ownership/ eligibility were already verified above
    // using the user-session client, so it's safe to do the write itself
    // with the admin client.
    const supabaseAdmin = createSupabaseAdmin()

    let result

    if (existing) {
      // Update existing draft
      result = await supabaseAdmin
        .from('daftar_ulang_submissions')
        .update({
          ...cleanedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      // Create new draft
      result = await supabaseAdmin
        .from('daftar_ulang_submissions')
        .insert({
          user_id: authUser.id,
          registration_id: registrationId,
          batch_id: registration.batch_id,
          status: 'draft',
          ...cleanedData
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error('[saveDaftarUlangDraft] Error:', {
        error: result.error.message,
        code: result.error.code,
        existing: existing ? `id=${existing.id}` : 'none'
      })

      // Handle UNIQUE constraint violation specifically
      if (result.error.code === '23505') {
        return {
          success: false,
          error: 'Terjadi kesalahan pada data yang sudah ada. Silakan refresh halaman dan coba lagi.'
        }
      }

      // Handle RLS violations
      if (result.error.code === '42501') {
        return {
          success: false,
          error: 'Terjadi kesalahan keamanan. Silakan logout dan login kembali.'
        }
      }

      return { success: false, error: result.error.message }
    }

    return {
      success: true,
      data: result.data,
      message: 'Draft berhasil disimpan'
    }
  } catch (error: any) {
    console.error('Save draft error:', error)
    return {
      success: false,
      error: error?.message || 'Terjadi kesalahan tidak terduga'
    }
  }
}

export async function submitDaftarUlang(
  registrationId: string,
  data: DaftarUlangFormData
) {
  const supabase = createClient()

  // 1. Validasi Auth
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  if (!authUser || authError) {
    return { success: false, error: 'Unauthorized. Silakan login kembali.' }
  }

  // 2. Verify registration belongs to user and is selected
  const { data: registration, error: regError } = await supabase
    .from('pendaftaran_tikrar_tahfidz')
    .select(`
      id,
      user_id,
      batch_id,
      selection_status,
      full_name,
      chosen_juz,
      exam_score,
      main_time_slot,
      backup_time_slot,
      wa_phone,
      address,
      batch:batches(name, min_exam_score)
    `)
    .eq('id', registrationId)
    .single()

  if (regError || !registration || registration.user_id !== authUser.id) {
    return { success: false, error: 'Pendaftaran tidak valid.' }
  }

  if (registration.selection_status !== 'selected') {
    return { success: false, error: 'Ukhti belum lolos seleksi.' }
  }

  // 3. Validate required fields
  if (!data.pengabdian_choice) {
    return { success: false, error: 'Pilih kesediaan pengabdian.' }
  }

  // 4. Validate akad is uploaded
  if (!data.akad_files || data.akad_files.length === 0) {
    return { success: false, error: 'Upload akad daftar ulang terlebih dahulu.' }
  }

  // 5. Use final juz placement directly from registration (without recalculation)
  const finalJuz = (registration.chosen_juz || '').toUpperCase()

  // Use the admin client for the actual write + read-back below. Doing
  // .select().single() right after insert/update through the user-session
  // (RLS-bound) client can return "Cannot coerce the result to a single JSON
  // object" if the RLS SELECT policy doesn't line up with the row just
  // written (e.g. right after status changes to 'approved'). Ownership and
  // eligibility were already verified above using the user-session client,
  // so it's safe to perform the write itself with the admin client.
  const supabaseAdmin = createSupabaseAdmin()

  try {
    // Debug log to see what data is being received
    console.log('[submitDaftarUlang] Received data:', {
      ujian_halaqah_id: data.ujian_halaqah_id,
      tashih_halaqah_id: data.tashih_halaqah_id,
      partner_type: data.partner_type,
      has_akad_files: !!data.akad_files && data.akad_files.length > 0
    })

    if (!data.pengabdian_choice) {
      return { success: false, error: 'Pilihan pengabdian atau donasi wajib diisi.' }
    }

    if (data.pengabdian_choice === 'donasi' && !data.donasi_amount) {
      return { success: false, error: 'Nominal infaq bulanan wajib diisi jika memilih donasi.' }
    }

    if (!data.akad_files || data.akad_files.length === 0) {
      return { success: false, error: 'Minimal harus ada 1 file akad pendaftaran' }
    }

    // Check for existing submission
    const { data: existing, error: existingError } = await supabase
      .from('daftar_ulang_submissions')
      .select('id, status, ujian_halaqah_id, tashih_halaqah_id')
      .eq('user_id', authUser.id)
      .eq('registration_id', registrationId)
      .maybeSingle()

    // Debug logging
    console.log('[submitDaftarUlang] Existing check:', {
      userId: authUser.id,
      registrationId,
      existing,
      existingError: existingError?.message,
      existingErrorCode: existingError?.code
    })

    const submissionData = {
      user_id: authUser.id,
      registration_id: registrationId,
      batch_id: registration.batch_id,

      // Confirmed data - Use final_juz (adjusted based on exam score) for placement
      confirmed_full_name: data.confirmed_full_name || registration.full_name,
      confirmed_chosen_juz: finalJuz, // Use final juz placement instead of original chosen juz
      confirmed_main_time_slot: data.confirmed_main_time_slot || registration.main_time_slot,
      confirmed_backup_time_slot: data.confirmed_backup_time_slot || registration.backup_time_slot,
      confirmed_wa_phone: data.confirmed_wa_phone || registration.wa_phone,
      confirmed_address: data.confirmed_address || registration.address,

      // Partner selection
      // If halaqah is not selected yet, partner fields MUST be null to prevent
      // orphaned partner selections from old drafts.
      partner_type: data.ujian_halaqah_id ? (data.partner_type || null) : null,
      partner_user_id: data.ujian_halaqah_id ? (data.partner_user_id || null) : null,
      partner_name: data.ujian_halaqah_id ? (data.partner_name || null) : null,
      partner_relationship: data.ujian_halaqah_id ? (data.partner_relationship || null) : null,
      partner_wa_phone: data.ujian_halaqah_id ? (data.partner_wa_phone || null) : null,
      partner_notes: data.ujian_halaqah_id ? (data.partner_notes || null) : null,

      // Pengabdian & Donasi
      pengabdian_choice: (() => {
        const types = Array.isArray(data.pengabdian_type) ? data.pengabdian_type : (data.pengabdian_type ? [data.pengabdian_type] : []);
        return types.length > 0
          ? `${data.pengabdian_choice} - ${types.join(', ')}`
          : (data.pengabdian_choice || null);
      })(),
      donasi_amount: parseDonationAmount(data.donasi_amount),

      // Halaqah selection - Convert empty strings to null for UUID fields
      ujian_halaqah_id: data.ujian_halaqah_id || null,
      tashih_halaqah_id: data.tashih_halaqah_id || null,

      // Akad
      akad_files: data.akad_files || null,
      akad_submitted_at: new Date().toISOString(),

      // Status - submit for admin review
      status: 'submitted' as const,
      akad_status: 'submitted' as const,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    let result

    if (existing && (existing.status === 'draft' || existing.status === 'submitted' || existing.status === 'approved')) {
      // Update existing draft, submitted, or approved to save new halaqah/partner selections
      result = await supabaseAdmin
        .from('daftar_ulang_submissions')
        .update(submissionData)
        .eq('id', existing.id)
        .select()
        .single()
    } else if (!existing) {
      // Create new submission
      result = await supabaseAdmin
        .from('daftar_ulang_submissions')
        .insert(submissionData)
        .select()
        .single()
    } else {
      return { success: false, error: 'Ukhti sudah submit daftar ulang dan tidak bisa diubah.' }
    }

    if (result.error) {
      console.error('[submitDaftarUlang] Submission error:', {
        error: result.error.message,
        code: result.error.code,
        details: result.error.details,
        hint: result.error.hint,
        existing: existing ? `id=${existing.id}, status=${existing.status}` : 'none'
      })

      // Handle UNIQUE constraint violation specifically
      if (result.error.code === '23505') {
        return {
          success: false,
          error: 'Ukhti sudah memiliki pendaftaran daftar ulang. Silakan cek kembali atau hubungi admin.'
        }
      }

      // Handle RLS violations
      if (result.error.code === '42501') {
        return {
          success: false,
          error: 'Terjadi kesalahan keamanan. Silakan logout dan login kembali.'
        }
      }

      return { success: false, error: result.error.message }
    }

    // Update pendaftaran_tikrar_tahfidz to mark re_enrollment_completed as true
    const { error: updateError } = await supabase
      .from('pendaftaran_tikrar_tahfidz')
      .update({
        re_enrollment_completed: true,
        re_enrollment_completed_at: new Date().toISOString(),
        main_time_slot: data.confirmed_main_time_slot || registration.main_time_slot,
        backup_time_slot: data.confirmed_backup_time_slot || registration.backup_time_slot
      })
      .eq('id', registrationId)

    if (updateError) {
      console.error('Failed to update re_enrollment_completed:', updateError)
      // Continue anyway as the submission was successful
    }

    // Assign thalibah role automatically using Admin Client
    const { data: userData, error: userDataError } = await supabaseAdmin
      .from('users')
      .select('roles')
      .eq('id', authUser.id)
      .single()

    if (!userDataError && userData) {
      const currentRoles = Array.isArray(userData.roles) ? userData.roles : []
      let newRoles = [...currentRoles]
      
      if (!newRoles.includes('thalibah')) {
        newRoles.push('thalibah')
      }
      
      // Add muallimah role if pengabdian choice is muallimah
      if (data.pengabdian_choice === 'muallimah' && !newRoles.includes('muallimah')) {
        newRoles.push('muallimah')
      }
      
      // Remove legacy roles
      newRoles = newRoles.filter(role => role !== 'waiting_reregistration' && role !== 'user')

      await supabaseAdmin
        .from('users')
        .update({ roles: newRoles, role: 'thalibah' })
        .eq('id', authUser.id)
    }

    // Revalidate paths
    revalidatePath('/dashboard')
    revalidatePath('/perjalanan-saya')
    revalidatePath('/daftar-ulang')

    return {
      success: true,
      data: result.data,
      message: 'Alhamdulillah! Daftar ulang berhasil dikirim!'
    }
  } catch (error: any) {
    console.error('Submit daftar ulang error:', error)
    return {
      success: false,
      error: error?.message || 'Terjadi kesalahan tidak terduga'
    }
  }
}

export async function uploadAkad(formData: FormData) {
  const supabase = createClient()

  // 1. Validasi Auth
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  if (!authUser || authError) {
    return { success: false, error: 'Unauthorized. Silakan login kembali.' }
  }

  const file = formData.get('file') as File
  if (!file) {
    return { success: false, error: 'Tidak ada file yang diupload.' }
  }

  // Validate file type (only PDF and images)
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: 'Format file harus PDF atau gambar (JPG, PNG).' }
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return { success: false, error: 'Ukuran file maksimal 5MB.' }
  }

  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${authUser.id}/${Date.now()}_akad.${fileExt}`
    const filePath = `akad/${fileName}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { publicUrl } = await saveUploadedFile('documents', filePath, buffer)

    return {
      success: true,
      data: {
        url: publicUrl,
        path: filePath,
        name: file.name
      },
      message: 'File berhasil diupload'
    }
  } catch (error: any) {
    console.error('Upload akad error:', error)
    return {
      success: false,
      error: `Gagal mengupload file: ${error.message || error}`
    }
  }
}

/**
 * Update ONLY the akad_files on an existing daftar_ulang_submissions row.
 *
 * This exists so a thalibah who forgot to attach a page/photo of her signed akad
 * can add it later, without touching halaqah_id, partner_type, or status (unlike
 * submitDaftarUlang, which rewrites the whole submission). Only allowed until the
 * batch's opening_class_date (start of "Fase 4: Masa Belajar") — after that,
 * changes must go through admin.
 */
export async function updateAkadFiles(
  registrationId: string,
  akadFiles: Array<{ url: string; name: string }>
) {
  const supabase = createClient()

  // 1. Validasi Auth
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  if (!authUser || authError) {
    return { success: false, error: 'Unauthorized. Silakan login kembali.' }
  }

  if (!akadFiles || akadFiles.length === 0) {
    return { success: false, error: 'Minimal harus ada 1 file akad.' }
  }

  // 2. Verify registration belongs to user, and get batch opening_class_date for the Fase 4 cutoff
  const { data: registration, error: regError } = await supabase
    .from('pendaftaran_tikrar_tahfidz')
    .select('id, user_id, batch:batches(opening_class_date)')
    .eq('id', registrationId)
    .single()

  if (regError || !registration || registration.user_id !== authUser.id) {
    return { success: false, error: 'Pendaftaran tidak valid.' }
  }

  const batch = Array.isArray((registration as any).batch) ? (registration as any).batch[0] : (registration as any).batch
  if (batch?.opening_class_date) {
    const openingDate = new Date(batch.opening_class_date)
    openingDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (today >= openingDate) {
      return {
        success: false,
        error: 'Sudah memasuki Masa Belajar, upload akad tidak bisa diubah lagi dari sini. Silakan hubungi admin jika ada file yang tertinggal.'
      }
    }
  }

  try {
    const supabaseAdmin = createSupabaseAdmin()

    // Find the existing submission (created via submitDaftarUlang)
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('daftar_ulang_submissions')
      .select('id')
      .eq('user_id', authUser.id)
      .eq('registration_id', registrationId)
      .maybeSingle()

    if (existingError || !existing) {
      return { success: false, error: 'Data daftar ulang belum ditemukan. Selesaikan daftar ulang terlebih dahulu.' }
    }

    const { error: updateError } = await supabaseAdmin
      .from('daftar_ulang_submissions')
      .update({
        akad_files: akadFiles,
        akad_status: 'submitted',
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    revalidatePath('/daftar-ulang')
    revalidatePath('/perjalanan-saya')

    return { success: true, message: 'File akad berhasil diperbarui' }
  } catch (error: any) {
    console.error('updateAkadFiles error:', error)
    return { success: false, error: error?.message || 'Terjadi kesalahan tidak terduga' }
  }
}

export async function approveDaftarUlangSubmission(submissionId: string) {
  const supabase = createClient()
  const {
    data: { user: authUser },
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return { success: false, error: 'Unauthorized. Silakan login kembali.' }
  }

  try {
    // 1. Check if current user is admin
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('roles')
      .eq('id', authUser.id)
      .single()

    if (userError || !currentUser?.roles?.includes('admin')) {
      return { success: false, error: 'Ukhti tidak memiliki akses untuk menyetujui pendaftaran.' }
    }

    // 2. Get the submission with registration data
    const { data: submission, error: submissionError } = await supabase
      .from('daftar_ulang_submissions')
      .select(`
        *,
        registration:pendaftaran_tikrar_tahfidz(
          id,
          user_id
        )
      `)
      .eq('id', submissionId)
      .single()

    if (submissionError || !submission) {
      return { success: false, error: 'Data pendaftaran tidak ditemukan.' }
    }

    if (submission.status !== 'submitted') {
      return { success: false, error: 'Status pendaftaran tidak valid untuk disetujui.' }
    }

    // 3. Update submission status to 'approved'
    const { error: updateError } = await supabase
      .from('daftar_ulang_submissions')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: authUser.id
      })
      .eq('id', submissionId)

    if (updateError) {
      console.error('Error updating submission:', updateError)
      return { success: false, error: 'Gagal mengupdate status pendaftaran.' }
    }

    // 4. Ensure user has 'thalibah' role and legacy roles are removed
    const userId = submission.user_id
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('roles')
      .eq('id', userId)
      .single()

    if (userDataError) {
      console.error('Error fetching user roles:', userDataError)
      return { success: false, error: 'Gagal mengambil data user.' }
    }

    const currentRoles = userData.roles || []
    const cleanedRoles = Array.from(new Set(
      currentRoles
        .filter((r: string) => !['calon_thalibah', 'muallimah', 'musyrifah'].includes(r))
        .concat('thalibah')
    ))

    const { error: roleUpdateError } = await supabase
      .from('users')
      .update({ 
        roles: cleanedRoles,
        role: 'thalibah' // Canonical single role
      })
      .eq('id', userId)

    if (roleUpdateError) {
      console.error('Error updating user role:', roleUpdateError)
      return { success: false, error: 'Gagal mengupdate role user.' }
    }

    // 5. Add/reactivate the approved thalibah without creating duplicates
    await syncApprovedSubmissionToHalaqahStudents(
      createSupabaseAdmin(),
      submission,
      authUser.id
    )

    return {
      success: true,
      message: 'Pendaftaran berhasil disetujui. Role user telah diupdate dan thalibah telah ditambahkan ke halaqah.'
    }
  } catch (error: any) {
    console.error('Approve daftar ulang error:', error)
    return {
      success: false,
      error: error?.message || 'Terjadi kesalahan saat menyetujui pendaftaran'
    }
  }
}

/**
 * Get active reregistration questions (Public/Thalibah)
 */
export async function getReregistrationQuestions() {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('reregistration_questions')
      .select('*')
      .eq('is_active', true)
      .order('section', { ascending: true })
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching active reregistration questions:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('Error in getReregistrationQuestions:', error)
    return { success: false, error: error?.message || 'Failed to fetch reregistration questions' }
  }
}


export async function resetAkadThalibah(submissionId: string) {
  const supabase = createClient();
  const supabaseAdmin = createSupabaseAdmin();

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (!authUser || authError) {
    return { success: false, error: 'Unauthorized. Silakan login kembali.' };
  }

  // Get current submission
  const { data: submission, error: fetchError } = await supabaseAdmin
    .from('daftar_ulang_submissions')
    .select('user_id, status, akad_files')
    .eq('id', submissionId)
    .single();

  if (fetchError || !submission) {
    return { success: false, error: 'Data pendaftaran tidak ditemukan.' };
  }

  // Only the owner can reset their own akad
  if (submission.user_id !== authUser.id) {
    return { success: false, error: 'Forbidden. Bukan pemilik pendaftaran.' };
  }

  // Can only reset if not yet approved
  if (submission.status !== 'submitted') {
    return { success: false, error: 'File akad hanya dapat direset jika statusnya sedang menunggu persetujuan (submitted).' };
  }

  // Delete files from storage
  if (submission.akad_files && Array.isArray(submission.akad_files)) {
    try {
      for (const file of submission.akad_files) {
        if (!file?.url) continue;
        let filePath = '';
        if (file.url.includes('/documents/')) {
          filePath = file.url.split('/documents/')[1];
        } else {
          filePath = file.url.split('/').pop() || '';
        }
        if (filePath) {
          await deleteUploadedFile('documents', filePath);
        }
      }
    } catch (e) {
      console.error('[Reset Akad Thalibah] Error deleting files:', e);
    }
  }

  // Update submission
  const { error: updateError } = await supabaseAdmin
    .from('daftar_ulang_submissions')
    .update({
      akad_files: null,
      akad_status: 'draft',
      status: 'draft',
      updated_at: new Date().toISOString()
    })
    .eq('id', submissionId);

  if (updateError) {
    console.error('[Reset Akad Thalibah] Update error:', updateError);
    return { success: false, error: updateError.message };
  }

  return { success: true, message: 'File akad berhasil dihapus.' };
}
