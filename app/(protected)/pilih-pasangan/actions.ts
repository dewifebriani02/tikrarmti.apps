'use server'

import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export interface PilihPasanganFormData {
  // Halaqah selection
  ujian_halaqah_id: string
  tashih_halaqah_id: string

  // Partner selection
  partner_type: 'self_match' | 'system_match' | 'family' | 'tarteel' | ''
  partner_user_id?: string
  partner_name?: string
  partner_relationship?: string
  partner_wa_phone?: string
  partner_notes?: string
}

export async function submitPilihPasangan(
  registrationId: string,
  data: PilihPasanganFormData
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

  // 3. Validate required fields
  if (!data.ujian_halaqah_id) {
    return { success: false, error: 'Pilih paket kelas halaqah.' }
  }

  if (!data.partner_type) {
    return { success: false, error: 'Pilih jenis pasangan belajar.' }
  }

  if (data.partner_type === 'self_match' && !data.partner_user_id) {
    return { success: false, error: 'Pilih pasangan belajar.' }
  }

  if ((data.partner_type === 'family' || data.partner_type === 'tarteel') && !data.partner_name) {
    return { success: false, error: 'Isi nama pasangan belajar.' }
  }

  if (data.partner_type === 'family' && !data.partner_relationship) {
    return { success: false, error: 'Pilih hubungan dengan pasangan belajar.' }
  }

  try {
    const { queryOne, query } = await import('@/lib/db');

    // 4. Validate halaqah existence and check capacity
    const halaqah = await queryOne(
      `SELECT id, name, max_students, status FROM halaqah WHERE id = $1`,
      [data.ujian_halaqah_id]
    );

    if (!halaqah || halaqah.status !== 'active') {
      return { success: false, error: 'Halaqah yang dipilih tidak valid atau tidak aktif.' };
    }

    const studentCountRes = await queryOne(
      `SELECT COUNT(*) as count FROM daftar_ulang_submissions
       WHERE ujian_halaqah_id = $1 AND user_id != $2 AND status IN ('draft', 'submitted', 'approved')`,
      [data.ujian_halaqah_id, authUser.id]
    );

    const currentCount = parseInt(studentCountRes?.count || '0', 10);
    const maxCapacity = halaqah.max_students || 5;
    if (currentCount >= maxCapacity) {
      return {
        success: false,
        error: `Maaf, kelas "${halaqah.name}" sudah penuh (${currentCount}/${maxCapacity}). Silakan pilih kelas lain.`
      };
    }

    // 5. Update or create daftar_ulang_submissions record
    const existingSub = await queryOne(
      `SELECT id FROM daftar_ulang_submissions WHERE user_id = $1 AND registration_id = $2`,
      [authUser.id, registrationId]
    );

    if (existingSub) {
      await query(
        `UPDATE daftar_ulang_submissions
         SET ujian_halaqah_id = $1,
             tashih_halaqah_id = $2,
             partner_type = $3,
             partner_user_id = $4,
             partner_name = $5,
             partner_relationship = $6,
             partner_wa_phone = $7,
             partner_notes = $8,
             partner_status = 'submitted',
             updated_at = NOW()
         WHERE id = $9`,
        [
          data.ujian_halaqah_id,
          data.tashih_halaqah_id || data.ujian_halaqah_id,
          data.partner_type,
          data.partner_user_id || null,
          data.partner_name || null,
          data.partner_relationship || null,
          data.partner_wa_phone || null,
          data.partner_notes || null,
          existingSub.id
        ]
      );
    } else {
      const reg = await queryOne(
        `SELECT full_name, chosen_juz, main_time_slot, backup_time_slot, wa_phone, address, batch_id
         FROM pendaftaran_tikrar_tahfidz WHERE id = $1`,
        [registrationId]
      );

      await query(
        `INSERT INTO daftar_ulang_submissions (
           user_id, registration_id, batch_id, confirmed_full_name, confirmed_chosen_juz,
           confirmed_main_time_slot, confirmed_backup_time_slot, confirmed_wa_phone, confirmed_address,
           ujian_halaqah_id, tashih_halaqah_id, partner_type, partner_user_id, partner_name,
           partner_relationship, partner_wa_phone, partner_notes, partner_status, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'submitted', 'draft')`,
        [
          authUser.id,
          registrationId,
          reg?.batch_id || registration.batch_id,
          reg?.full_name || authUser.email,
          reg?.chosen_juz || '30',
          reg?.main_time_slot || '',
          reg?.backup_time_slot || '',
          reg?.wa_phone || null,
          reg?.address || null,
          data.ujian_halaqah_id,
          data.tashih_halaqah_id || data.ujian_halaqah_id,
          data.partner_type,
          data.partner_user_id || null,
          data.partner_name || null,
          data.partner_relationship || null,
          data.partner_wa_phone || null,
          data.partner_notes || null,
        ]
      );
    }

    let isMutualMatch = false;
    if (data.partner_type === 'self_match' && data.partner_user_id) {
      const reverseSelection = await queryOne(
        `SELECT id, status, partner_status
         FROM daftar_ulang_submissions
         WHERE user_id = $1 AND partner_user_id = $2 AND batch_id = $3 AND partner_type = 'self_match'`,
        [data.partner_user_id, authUser.id, registration.batch_id]
      );

      isMutualMatch = Boolean(
        reverseSelection &&
        (reverseSelection.partner_status === 'submitted' ||
          reverseSelection.partner_status === 'approved' ||
          reverseSelection.status === 'submitted' ||
          reverseSelection.status === 'approved')
      );
    }

    revalidatePath('/dashboard')
    revalidatePath('/perjalanan-saya')
    revalidatePath('/pilih-pasangan')

    return {
      success: true,
      isMutualMatch,
      message: data.partner_type === 'self_match'
        ? isMutualMatch
          ? `❤️ Kalian sudah saling memilih. Pasangan belajar dengan ${data.partner_name || 'thalibah pilihan Ukhti'} berhasil terbentuk!`
          : `Pilihan pasangan berhasil dikirim. Menunggu ${data.partner_name || 'thalibah pilihan Ukhti'} memilih Ukhti kembali.`
        : 'Halaqah dan pasangan berhasil disimpan.'
    }
  } catch (error: any) {
    console.error('Submit pilih pasangan error:', error)
    return {
      success: false,
      error: error?.message || 'Terjadi kesalahan tidak terduga'
    }
  }
}
