'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface JurnalFormData {
  tanggal_setor: string
  juz_code?: string | null
  blok: string // Single blok for jurnal (stored as array in DB)
  rabth_completed: boolean
  rabth_methods: string[]
  murajaah_completed: boolean
  simak_murattal_completed: boolean
  tikrar_bi_an_nadzar_completed: boolean
  tasmi_record_completed: boolean
  simak_record_completed: boolean
  tikrar_bi_al_ghaib_type?: string | null
  tikrar_bi_al_ghaib_subtype?: string | null
  tikrar_bi_al_ghaib_20x_multi: string[]
  tarteel_screenshot_url?: string | null
  tafsir_options: string[]
  catatan_tambahan?: string | null
  // For tashih validation
  weekNumber: number
  juzPart: 'A' | 'B'
}

export async function saveJurnalRecord(data: JurnalFormData) {
  const supabase = createClient()

  // 1. Validasi Auth - menggunakan getUser() sesuai arsitektur.md
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

  if (!authUser || authError) {
    console.error('[saveJurnalRecord] Auth error:', authError)
    return { success: false, error: 'Unauthorized. Silakan login kembali.' }
  }

  // 2. Sequential Validation - Ensure user doesn't skip blocks
  try {
    // 2. Validasi Pendaftaran dan Daftar Ulang via direct SQL
    const { rows: registrations } = await import('@/lib/db').then(m => m.query(
      `SELECT 
         p.id, 
         p.status, 
         p.chosen_juz, 
         du.status as du_status, 
         du.confirmed_chosen_juz
       FROM pendaftaran_tikrar_tahfidz p
       JOIN batches b ON p.batch_id = b.id
       LEFT JOIN daftar_ulang_submissions du ON du.user_id = p.user_id AND du.batch_id = p.batch_id
       WHERE p.user_id = $1
         AND p.status IN ('approved', 'selected', 'registered')
       ORDER BY (b.status = 'open' OR b.status = 'ongoing') DESC, p.created_at DESC
       LIMIT 1`,
      [authUser.id]
    ));

    const reg = registrations?.[0];
    
    // Check if user is registered/approved
    if (!reg) {
      return { 
        success: false, 
        error: 'Afwan Ukhti, akun ini belum terdaftar untuk batch aktif. Jurnal hanya bisa diisi oleh thalibah yang terdaftar resmi.' 
      };
    }

    const isDaftarUlangApproved = reg.du_status === 'approved' || reg.status === 'approved';

    if (!isDaftarUlangApproved) {
      return { 
        success: false, 
        error: 'Afwan Ukhti, Daftar Ulang Ukhti belum disetujui. Jurnal harian baru dapat diakses setelah pendaftaran ulang disetujui oleh admin.' 
      };
    }

    const juzCode = reg.confirmed_chosen_juz || reg.chosen_juz;

    if (juzCode) {
      // Get all blocks for this juz
      const { data: juzInfo } = await supabase.from('juz_options').select('*').eq('code', juzCode).single()
      
      if (juzInfo) {
        const parts = ['A', 'B', 'C', 'D']
        const totalPages = juzInfo.end_page - juzInfo.start_page + 1
        const blockOffset = juzInfo.part === 'B' ? 10 : 0
        const allBlockCodes: string[] = []

        // 1. Ziyadah Weeks (Pekan 1-10)
        for (let week = 1; week <= 10; week++) {
          const blockNumber = week + blockOffset
          for (let i = 0; i < 4; i++) {
            allBlockCodes.push(`H${blockNumber}${parts[i]}`)
          }
        }

        // 2. Murajaah Week (M1-M7)
        for (let i = 1; i <= 7; i++) {
          allBlockCodes.push(`M${i}`)
        }

        // Get completed blocks
        const { data: existingRecords } = await supabase
          .from('jurnal_records')
          .select('blok')
          .eq('user_id', authUser.id)

        const completedSet = new Set<string>()
        existingRecords?.forEach(r => {
          if (r.blok) completedSet.add(r.blok)
        })

        // Find current block index
        const targetIndex = allBlockCodes.indexOf(data.blok)
        if (targetIndex > 0) {
          const prevBlock = allBlockCodes[targetIndex - 1]
          if (!completedSet.has(prevBlock)) {
            return { success: false, error: `Ukhti harus mengisi blok ${prevBlock} terlebih dahulu sebelum mengisi ${data.blok}.` }
          }
        }
      }
    }
  } catch (err) {
    console.error('[saveJurnalRecord] Sequence validation failed:', err)
    // Continue if validation fails due to internal error, but log it
  }
  try {
    const recordData = {
      user_id: authUser.id, // Menggunakan authUser.id dari server, dijamin sama dengan auth.uid()
      tanggal_jurnal: new Date().toISOString(),
      tanggal_setor: data.tanggal_setor,
      juz_code: data.juz_code || null,
      blok: data.blok || null, // Store as single string (VARCHAR in DB)
      tashih_completed: true,
      rabth_completed: data.rabth_completed,
      rabth_methods: data.rabth_completed ? data.rabth_methods : [],
      murajaah_count: data.murajaah_completed ? 1 : 0,
      simak_murattal_count: data.simak_murattal_completed ? 1 : 0,
      tikrar_bi_an_nadzar_completed: data.tikrar_bi_an_nadzar_completed,
      tasmi_record_count: data.tasmi_record_completed ? 1 : 0,
      simak_record_completed: data.simak_record_completed,
      tikrar_bi_al_ghaib_count: data.tikrar_bi_al_ghaib_type || data.tikrar_bi_al_ghaib_20x_multi.length > 0 ? 1 : 0,
      tikrar_bi_al_ghaib_type: data.tikrar_bi_al_ghaib_type || (data.tikrar_bi_al_ghaib_20x_multi.length > 0 ? data.tikrar_bi_al_ghaib_20x_multi[0] : null),
      tikrar_bi_al_ghaib_40x: (data.tikrar_bi_al_ghaib_type && !data.tikrar_bi_al_ghaib_type.endsWith('_20') && data.tikrar_bi_al_ghaib_20x_multi.length === 0)
        ? [data.tikrar_bi_al_ghaib_type]
        : null,
      tikrar_bi_al_ghaib_20x: data.tikrar_bi_al_ghaib_20x_multi.length > 0
        ? data.tikrar_bi_al_ghaib_20x_multi
        : (data.tikrar_bi_al_ghaib_type?.endsWith('_20') ? [data.tikrar_bi_al_ghaib_type] : null),
      tarteel_screenshot_url: data.tarteel_screenshot_url || null,
      tafsir_completed: data.tafsir_options.includes('baca_tafsir'),
      menulis_completed: data.tafsir_options.includes('tulis_ayat'),
      tafsir_options: data.tafsir_options,
      catatan_tambahan: data.catatan_tambahan || null
    }

    const { data: result, error: insertError } = await supabase
      .from('jurnal_records')
      .insert(recordData)
      .select()
      .single()

    if (insertError) {
      console.error('[saveJurnalRecord] Insert error:', insertError)
      return { success: false, error: insertError.message }
    }

    // Revalidate paths
    revalidatePath('/jurnal-harian')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: result,
      message: 'Jurnal berhasil disimpan!'
    }
  } catch (error: any) {
    console.error('[saveJurnalRecord] Error:', error)
    return {
      success: false,
      error: error?.message || 'Terjadi kesalahan tidak terduga'
    }
  }
}

export async function uploadJurnalScreenshot(formData: FormData) {
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

  // Validate file type (only images)
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
    return { success: false, error: 'Format file harus gambar (JPG, PNG, WEBP, HEIC).' }
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { success: false, error: 'Ukuran file maksimal 10MB.' }
  }

  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${authUser.id}/${Date.now()}_jurnal_tarteel.${fileExt}`
    const filePath = `jurnal/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return {
        success: false,
        error: `Gagal mengupload file: ${uploadError.message}`
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

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
    console.error('Upload jurnal screenshot error:', error)
    return {
      success: false,
      error: error?.message || 'Terjadi kesalahan saat upload file'
    }
  }
}
