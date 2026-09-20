'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface TashihFormData {
  id?: string
  blok: string
  lokasi: string
  lokasi_detail?: string | null
  ustadzah_id?: string | null
  nama_pemeriksa?: string | null
  jumlah_kesalahan_tajwid: number
  masalah_tajwid: string[]
  catatan_tambahan?: string | null
  waktu_tashih: string
}

export async function saveTashihRecord(data: TashihFormData) {
  const supabase = createClient()

  // 1. Validasi Auth - menggunakan getUser() sesuai arsitektur.md
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

  if (!authUser || authError) {
    console.error('[saveTashihRecord] Auth error:', authError)
    return { success: false, error: 'Unauthorized. Silakan login kembali.' }
  }

  // Debug log
  console.log('[saveTashihRecord] User ID:', authUser.id)
  console.log('[saveTashihRecord] Data:', data)

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
  
  if (!reg) {
    return { 
      success: false, 
      error: 'Afwan Ukhti, akun ini belum terdaftar untuk batch aktif. Tashih hanya bisa diisi oleh thalibah yang terdaftar resmi.' 
    };
  }

  const isDaftarUlangApproved = reg.du_status === 'approved' || reg.status === 'approved';

  if (!isDaftarUlangApproved) {
    return { 
      success: false, 
      error: 'Afwan Ukhti, Daftar Ulang Ukhti belum disetujui. Catatan Tashih baru dapat diakses setelah pendaftaran ulang disetujui oleh admin.' 
    };
  }

  // 3. Validasi 4 Blok (1 Pekan)
  const blocksArr = data.blok.split(',').map(b => b.trim()).filter(Boolean)
  if (blocksArr.length !== 4) {
    return {
      success: false,
      error: 'Afwan, form Tashih harus diisi sekaligus untuk 4 blok (1 pekan) secara bersamaan, tidak bisa per blok.'
    }
  }

  try {
    let finalUstadzahId = data.ustadzah_id === 'manual' ? null : (data.ustadzah_id || null)
    let finalNamaPemeriksa = data.nama_pemeriksa || null

    // If finalUstadzahId is present, it's a users.id from the frontend.
    // We must resolve it to muallimah_registrations.id to satisfy the foreign key.
    if (finalUstadzahId) {
      const { data: reg } = await supabase
        .from('muallimah_registrations')
        .select('id')
        .eq('user_id', finalUstadzahId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (reg) {
        finalUstadzahId = reg.id
      } else {
        // Fallback if not found, to avoid FK violation
        finalUstadzahId = null
      }
    }

    const recordData = {
      user_id: authUser.id, // Menggunakan authUser.id dari server, dijamin sama dengan auth.uid()
      blok: data.blok,
      lokasi: data.lokasi,
      lokasi_detail: data.lokasi_detail || null,
      ustadzah_id: finalUstadzahId,
      nama_pemeriksa: finalNamaPemeriksa,
      jumlah_kesalahan_tajwid: data.jumlah_kesalahan_tajwid,
      masalah_tajwid: Array.isArray(data.masalah_tajwid) ? JSON.stringify(data.masalah_tajwid) : (data.masalah_tajwid || '[]'),
      catatan_tambahan: data.catatan_tambahan || null,
      waktu_tashih: data.waktu_tashih
    }

    let result;

    if (data.id) {
      // Update existing record
      const { data: updateRes, error: updateError } = await supabase
        .from('tashih_records')
        .update(recordData)
        .eq('id', data.id)
        .eq('user_id', authUser.id) // security measure
        .select()
        .single()

      if (updateError) {
        console.error('[saveTashihRecord] Update error:', updateError)
        return { success: false, error: updateError.message }
      }
      result = updateRes
    } else {
      // Insert new record
      const { data: insertRes, error: insertError } = await supabase
        .from('tashih_records')
        .insert(recordData)
        .select()
        .single()

      if (insertError) {
        console.error('[saveTashihRecord] Insert error:', insertError)
        return { success: false, error: insertError.message }
      }
      result = insertRes
    }

    // Revalidate paths
    revalidatePath('/tashih')
    revalidatePath('/dashboard')
    revalidatePath('/presensi-jurnal')

    return {
      success: true,
      data: result,
      message: data.id ? 'Tashih berhasil diperbarui!' : 'Tashih berhasil disimpan!'
    }
  } catch (error: any) {
    console.error('[saveTashihRecord] Error:', error)
    return {
      success: false,
      error: error?.message || 'Terjadi kesalahan tidak terduga'
    }
  }
}

export async function getJuzOption(code: string) {
  try {
    const { rows } = await import('@/lib/db').then(m => m.query(
      `SELECT * FROM juz_options WHERE code = $1 LIMIT 1`,
      [code]
    ));
    return rows[0] || null;
  } catch (err) {
    console.error('[getJuzOption] Error:', err);
    return null;
  }
}

export async function getWeekTashihRecords(userId: string, weekStartIso: string, weekEndIso: string) {
  try {
    const { rows } = await import('@/lib/db').then(m => m.query(
      `SELECT * FROM tashih_records 
       WHERE user_id = $1 AND waktu_tashih >= $2 AND waktu_tashih < $3
       ORDER BY waktu_tashih ASC`,
      [userId, weekStartIso, weekEndIso]
    ));
    return rows || [];
  } catch (err) {
    console.error('[getWeekTashihRecords] Error:', err);
    return [];
  }
}
