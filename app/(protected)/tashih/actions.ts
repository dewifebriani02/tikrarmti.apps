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
  halaqah_id?: string | null
  halaqah_ids?: string[]
  halaqah_names?: string | null
  jenis_kelas?: string[]
  asal_bimbingan?: string | null
  kategori_kelas?: string | null
  surat_ayat?: string | null
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
       pr.class_type,
       du.status as du_status, 
       du.confirmed_chosen_juz
     FROM pendaftaran_tikrar_tahfidz p
     JOIN batches b ON p.batch_id = b.id
     LEFT JOIN programs pr ON p.program_id = pr.id
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

  const isPraTikrar = reg.class_type === 'pra_tahfidz' || reg.chosen_juz?.toUpperCase().startsWith('30');
  const isDaftarUlangApproved = isPraTikrar
    ? (reg.status === 'approved' || reg.status === 'selected')
    : (reg.du_status === 'approved' || reg.status === 'approved');

  if (!isDaftarUlangApproved) {
    return { 
      success: false, 
      error: isPraTikrar
        ? 'Afwan Ukhti, status pendaftaran Pra-Tikrar Ukhti belum disetujui.'
        : 'Afwan Ukhti, Daftar Ulang Ukhti belum disetujui. Catatan Tashih baru dapat diakses setelah pendaftaran ulang disetujui oleh admin.' 
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
      }
      // If reg is null, keep finalUstadzahId as user_id (ustadzah_id in tashih_records is text and has no FK constraint)
    }

    const halaqahIdSingle = data.halaqah_id || (data.halaqah_ids && data.halaqah_ids[0]) || null;
    const halaqahIdsArray = data.halaqah_ids && data.halaqah_ids.length > 0 
      ? data.halaqah_ids 
      : (halaqahIdSingle ? [halaqahIdSingle] : []);

    const recordData = {
      user_id: authUser.id,
      blok: data.blok,
      lokasi: data.lokasi,
      lokasi_detail: data.lokasi_detail || null,
      ustadzah_id: finalUstadzahId,
      nama_pemeriksa: finalNamaPemeriksa,
      halaqah_id: halaqahIdSingle,
      halaqah_ids: JSON.stringify(halaqahIdsArray),
      halaqah_names: data.halaqah_names || null,
      jenis_kelas: JSON.stringify(data.jenis_kelas || []),
      asal_bimbingan: data.asal_bimbingan || (data.lokasi === 'luar' ? 'eksternal' : 'internal'),
      kategori_kelas: data.kategori_kelas || 'umum',
      surat_ayat: data.surat_ayat || null,
      jumlah_kesalahan_tajwid: data.jumlah_kesalahan_tajwid,
      masalah_tajwid: Array.isArray(data.masalah_tajwid) ? JSON.stringify(data.masalah_tajwid) : (data.masalah_tajwid || '[]'),
      catatan_tambahan: data.catatan_tambahan || null,
      waktu_tashih: data.waktu_tashih,
      updated_at: new Date().toISOString()
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

export async function getWeekTashihRecords(userId: string, batchId?: string | null) {
  try {
    const { query } = await import('@/lib/db')

    let dateFilter = '1970-01-01'
    if (batchId) {
      const { rows: batchRows } = await query(
        `SELECT opening_class_date, start_date FROM batches WHERE id = $1`,
        [batchId]
      )
      const batchStart = batchRows[0]?.opening_class_date || batchRows[0]?.start_date
      if (batchStart) {
        const d = new Date(batchStart)
        d.setDate(d.getDate() - 1)
        dateFilter = d.toISOString().split('T')[0]
      }
    }

    const { rows } = await query(
      `SELECT * FROM tashih_records
       WHERE user_id = $1
         AND (waktu_tashih >= $2 OR created_at >= $2)
       ORDER BY waktu_tashih DESC, updated_at DESC`,
      [userId, dateFilter]
    );
    return rows || [];
  } catch (err) {
    console.error('[getWeekTashihRecords] Error:', err);
    return [];
  }
}

export async function getPraTikrarHalaqahList(batchId?: string | null) {
  try {
    const { query } = await import('@/lib/db')
    const DAYS = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];
    
    let batchFilterSql = '';
    const params: any[] = [];
    if (batchId) {
      params.push(batchId);
      batchFilterSql = `AND (p.batch_id = $1 OR p.batch_id IS NULL)`;
    }

    const { rows } = await query(
      `SELECT h.id, h.name, h.day_of_week, h.start_time, h.end_time,
              (SELECT u.id FROM halaqah_mentors hm JOIN users u ON hm.mentor_id = u.id WHERE hm.halaqah_id = h.id AND hm.role = 'ustadzah' LIMIT 1) as ustadzah_id,
              (SELECT u.full_name FROM halaqah_mentors hm JOIN users u ON hm.mentor_id = u.id WHERE hm.halaqah_id = h.id AND hm.role = 'ustadzah' LIMIT 1) as ustadzah_name
       FROM halaqah h
       JOIN programs p ON h.program_id = p.id
       WHERE p.class_type = 'pra_tahfidz' AND h.status = 'active'
       ${batchFilterSql}
       ORDER BY h.day_of_week ASC, h.start_time ASC`,
      params
    );

    return rows.map((r: any) => {
      const dayName = DAYS[r.day_of_week] || 'Hari';
      const timeStart = r.start_time ? String(r.start_time).slice(0, 5) : '';
      const timeEnd = r.end_time ? String(r.end_time).slice(0, 5) : '';
      const teacher = r.ustadzah_name || 'Ustadzah MTI';
      return {
        id: r.id,
        name: r.name,
        label: `[${dayName} ${timeStart} - ${timeEnd} WIB] Pra-Tikrar • ${teacher}`,
        short_label: `${dayName} ${timeStart} - ${timeEnd} WIB (${teacher})`,
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
        ustadzah_id: r.ustadzah_id,
        ustadzah_name: r.ustadzah_name
      };
    });
  } catch (err) {
    console.error('[getPraTikrarHalaqahList] Error:', err);
    return [];
  }
}
