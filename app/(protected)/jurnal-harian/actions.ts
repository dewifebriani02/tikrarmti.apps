'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { saveUploadedFile } from '@/lib/storage'
import { query } from '@/lib/db'

export interface JurnalFormData {
  batch_id?: string | null
  tanggal_setor: string
  juz_code?: string | null
  blok: string // Single blok for jurnal (stored as string in DB)
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
  juzPart?: 'A' | 'B'
}

export async function saveJurnalRecord(data: JurnalFormData) {
  const supabase = createClient()

  // 1. Validasi Auth
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

  if (!authUser || authError) {
    console.error('[saveJurnalRecord] Auth error:', authError)
    return { success: false, error: 'Unauthorized. Silakan login kembali.' }
  }

  // 2. Validasi Pendaftaran dan Daftar Ulang via direct SQL
  try {
    const queryParams: any[] = [authUser.id];
    let batchFilter = '';
    if (data.batch_id) {
      queryParams.push(data.batch_id);
      batchFilter = `AND p.batch_id = $2`;
    }

    const { rows: registrations } = await query(
      `SELECT 
         p.id, 
         p.status, 
         p.chosen_juz, 
         p.batch_id,
         b.opening_class_date as b_opening_class_date,
         b.start_date as b_start_date,
         du.status as du_status, 
         du.confirmed_chosen_juz
       FROM pendaftaran_tikrar_tahfidz p
       JOIN batches b ON p.batch_id = b.id
       LEFT JOIN daftar_ulang_submissions du ON du.user_id = p.user_id AND du.batch_id = p.batch_id
       WHERE p.user_id = $1
         ${batchFilter}
         AND p.status IN ('approved', 'selected', 'registered')
       ORDER BY (b.status = 'open' OR b.status = 'ongoing') DESC, p.created_at DESC
       LIMIT 1`,
      queryParams
    );

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

    const resolvedJuzCode = data.juz_code || reg.confirmed_chosen_juz || reg.chosen_juz;

    const recordData = {
      user_id: authUser.id,
      tanggal_jurnal: new Date().toISOString(),
      tanggal_setor: data.tanggal_setor,
      juz_code: resolvedJuzCode || null,
      blok: data.blok || null,
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

    // Batas awal batch ini (sama dengan filter di /api/dashboard/jurnal-status) agar
    // jurnal blok yang sama dari batch sebelumnya tidak ikut tertimpa.
    let batchDateFilter = '1970-01-01';
    const batchStart = reg.b_opening_class_date || reg.b_start_date;
    if (batchStart) {
      const d = new Date(batchStart);
      d.setDate(d.getDate() - 1);
      batchDateFilter = d.toISOString().split('T')[0];
    }

    const { rows: existingRows } = await query(
      `SELECT id FROM jurnal_records
       WHERE user_id = $1 AND blok = $2
         AND (tanggal_setor >= $3 OR created_at >= $3)
       ORDER BY created_at DESC
       LIMIT 1`,
      [authUser.id, data.blok, batchDateFilter]
    );

    let result;
    if (existingRows && existingRows.length > 0) {
      const existingId = existingRows[0].id;
      const { data: updated, error: updateError } = await supabase
        .from('jurnal_records')
        .update(recordData)
        .eq('id', existingId)
        .select()
        .single();

      if (updateError) {
        console.error('[saveJurnalRecord] Update error:', updateError);
        return { success: false, error: updateError.message };
      }
      result = updated;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('jurnal_records')
        .insert(recordData)
        .select()
        .single();

      if (insertError) {
        console.error('[saveJurnalRecord] Insert error:', insertError);
        return { success: false, error: insertError.message };
      }
      result = inserted;
    }

    // Revalidate paths
    revalidatePath('/jurnal-harian')
    revalidatePath('/dashboard')
    revalidatePath('/presensi-jurnal')

    return {
      success: true,
      data: result,
      message: `Alhamdulillah, Jurnal Blok ${data.blok} berhasil disimpan!`
    }
  } catch (error: any) {
    console.error('[saveJurnalRecord] Error:', error)
    return {
      success: false,
      error: error?.message || 'Terjadi kesalahan tidak terduga saat menyimpan jurnal'
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
    console.error('Upload jurnal screenshot error:', error)
    return {
      success: false,
      error: error?.message || 'Terjadi kesalahan saat upload file'
    }
  }
}
