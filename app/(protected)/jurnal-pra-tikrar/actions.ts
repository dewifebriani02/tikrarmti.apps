'use server';

import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { hasRequiredRank, ROLE_RANKS } from '@/lib/roles';

export type { 
  PraTikrarEntryInput, 
  PraTikrarStudentRecord, 
  PraTikrarContextResponse, 
  TashihPayload 
} from '@/lib/pra-tikrar';
import type { 
  PraTikrarEntryInput, 
  PraTikrarContextResponse, 
  TashihPayload 
} from '@/lib/pra-tikrar';

export async function getPraTikrarContext(): Promise<PraTikrarContextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized. Silakan login kembali.' };
  }

  try {
    // 1. Get user profile and roles
    const { rows: userRows } = await query(
      `SELECT id, full_name, email, role, roles FROM users WHERE id = $1`,
      [user.id]
    );
    const userProfile = userRows[0] || {};
    const roles: string[] = Array.isArray(userProfile.roles)
      ? userProfile.roles
      : [userProfile.role || 'thalibah'];

    const isAdmin = hasRequiredRank(roles, ROLE_RANKS.admin);
    const isMusyrifah = roles.includes('musyrifah') || isAdmin;
    const isMuallimah = roles.includes('muallimah') || isAdmin;
    const isThalibah = roles.includes('thalibah') || (!isMusyrifah && !isMuallimah && !isAdmin);

    // 2. Get active batch
    const { rows: batchRows } = await query(
      `SELECT id, name, status, start_date, opening_class_date, first_week_start_date 
       FROM batches 
       WHERE status IN ('open', 'ongoing') 
       ORDER BY created_at DESC LIMIT 1`
    );
    const activeBatch = batchRows[0] || null;

    // 3. Fetch ALL Active Pra-Tikrar Sessions (Open Schedule Model)
    // Pra-Tikrar tidak memiliki kelas tetap. Seluruh thalibah bebas masuk ke sesi mana pun sesuai waktu luang.
    let availableSessions: any[] = [];
    if (activeBatch) {
      const { rows: sessionRows } = await query(
        `SELECT h.id, h.name, h.day_of_week, h.start_time, h.end_time, h.zoom_link, h.location,
                z.url as zoom_url, z.meeting_id as zoom_meeting_id, z.passcode as zoom_passcode,
                (SELECT u2.full_name FROM halaqah_mentors hm JOIN users u2 ON hm.mentor_id = u2.id WHERE hm.halaqah_id = h.id AND hm.role = 'ustadzah' LIMIT 1) as muallimah_name,
                (SELECT u2.whatsapp FROM halaqah_mentors hm JOIN users u2 ON hm.mentor_id = u2.id WHERE hm.halaqah_id = h.id AND hm.role = 'ustadzah' LIMIT 1) as muallimah_wa,
                (SELECT u3.full_name FROM halaqah_mentors hm2 JOIN users u3 ON hm2.mentor_id = u3.id WHERE hm2.halaqah_id = h.id AND hm2.role = 'musyrifah' LIMIT 1) as musyrifah_name,
                (SELECT u3.whatsapp FROM halaqah_mentors hm2 JOIN users u3 ON hm2.mentor_id = u3.id WHERE hm2.halaqah_id = h.id AND hm2.role = 'musyrifah' LIMIT 1) as musyrifah_wa
         FROM halaqah h
         LEFT JOIN batch_zoom_links z ON h.zoom_link_id = z.id
         JOIN programs p ON h.program_id = p.id
         WHERE p.class_type = 'pra_tahfidz' AND p.batch_id = $1 AND h.status = 'active'
         ORDER BY h.day_of_week ASC, h.start_time ASC`,
        [activeBatch.id]
      );
      availableSessions = sessionRows;
    }

    // 4. Fetch managed halaqahs for Muallimah or Musyrifah
    let managedHalaqahs: any[] = [];
    if (activeBatch && (isMuallimah || isMusyrifah || isAdmin)) {
      if (isAdmin) {
        managedHalaqahs = availableSessions;
      } else {
        managedHalaqahs = availableSessions.filter((s: any) => {
          return true; // Muallimah / Musyrifah Pra-Tikrar can oversee open sessions
        });
      }
    }

    // 5. Fetch all Pra-Tikrar students (so Mu'allimah & Musyrifah can record ANY student who joins the open Zoom)
    let praStudentsList: any[] = [];
    if (activeBatch && (isMuallimah || isMusyrifah || isAdmin)) {
      const { rows: studentRows } = await query(
        `SELECT DISTINCT u.id, u.full_name, u.nama_kunyah, u.whatsapp, u.email
         FROM users u
         WHERE EXISTS (
           SELECT 1 FROM pendaftaran_tikrar_tahfidz reg 
           JOIN programs p ON reg.program_id = p.id 
           WHERE reg.user_id = u.id AND p.class_type = 'pra_tahfidz' AND p.batch_id = $1
         )
         OR EXISTS (
           SELECT 1 FROM halaqah_students hs
           JOIN halaqah h ON hs.halaqah_id = h.id
           JOIN programs p ON h.program_id = p.id
           WHERE hs.thalibah_id = u.id AND p.class_type = 'pra_tahfidz' AND p.batch_id = $1
         )
         OR EXISTS (
           SELECT 1 FROM daftar_ulang_submissions dus
           JOIN halaqah h ON dus.tashih_halaqah_id = h.id
           JOIN programs p ON h.program_id = p.id
           WHERE dus.user_id = u.id AND p.class_type = 'pra_tahfidz' AND p.batch_id = $1
         )
         ORDER BY u.full_name ASC`,
        [activeBatch.id]
      );
      praStudentsList = studentRows;
    }

    // 6. Fetch Today's Entry for current user
    const todayStr = new Date().toISOString().split('T')[0];
    const { rows: todayRows } = await query(
      `SELECT * FROM jurnal_pra_tikrar WHERE user_id = $1 AND tanggal = $2 LIMIT 1`,
      [user.id, todayStr]
    );
    const todayEntry = todayRows[0] || null;

    // 7. Fetch Jurnal History (last 30 entries)
    const { rows: historyRows } = await query(
      `SELECT j.*, 
              h.name as halaqah_nama,
              m.full_name as muallimah_nama_lengkap,
              ms.full_name as musyrifah_nama_lengkap
       FROM jurnal_pra_tikrar j
       LEFT JOIN halaqah h ON j.halaqah_id = h.id
       LEFT JOIN users m ON j.muallimah_id = m.id
       LEFT JOIN users ms ON j.musyrifah_id = ms.id
       WHERE j.user_id = $1
       ORDER BY j.tanggal DESC
       LIMIT 30`,
      [user.id]
    );

    return {
      success: true,
      userRole: userProfile.role,
      roles,
      isMuallimah,
      isMusyrifah,
      isAdmin,
      isThalibah,
      activeBatch,
      availableSessions,
      praStudentsList,
      managedHalaqahs: managedHalaqahs.length > 0 ? managedHalaqahs : availableSessions,
      todayEntry,
      history: historyRows,
    };
  } catch (error: any) {
    console.error('[getPraTikrarContext] Error:', error);
    return { success: false, error: error?.message || 'Gagal memuat data Pra-Tikrar' };
  }
}

export async function savePraTikrarDailyEntry(input: PraTikrarEntryInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized. Silakan login kembali.' };
  }

  try {
    const halaqahIdSingle = input.halaqah_id || (input.halaqah_ids && input.halaqah_ids[0]) || null;
    const halaqahIdsArray = input.halaqah_ids && input.halaqah_ids.length > 0 
      ? input.halaqah_ids 
      : (halaqahIdSingle ? [halaqahIdSingle] : []);
    const jenisKelasList = input.jenis_kelas_list && input.jenis_kelas_list.length > 0
      ? input.jenis_kelas_list
      : (input.jenis_kelas ? [input.jenis_kelas] : ['tahsin_juz30']);

    const { rows } = await query(
      `INSERT INTO jurnal_pra_tikrar (
         user_id,
         batch_id,
         halaqah_id,
         halaqah_ids,
         tanggal,
         pekan_ke,
         simak_1,
         simak_2,
         simak_3,
         metode_simak,
         surat_nama,
         ayat_range,
         durasi_menit,
         rekam_mandiri,
         catatan_santri,
         jenis_kelas,
         jenis_kelas_list,
         jenis_kelas_custom,
         asal_bimbingan,
         kategori_kelas,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, now())
       ON CONFLICT (user_id, tanggal) DO UPDATE SET
         halaqah_id = COALESCE(EXCLUDED.halaqah_id, jurnal_pra_tikrar.halaqah_id),
         halaqah_ids = EXCLUDED.halaqah_ids,
         pekan_ke = EXCLUDED.pekan_ke,
         simak_1 = EXCLUDED.simak_1,
         simak_2 = EXCLUDED.simak_2,
         simak_3 = EXCLUDED.simak_3,
         metode_simak = EXCLUDED.metode_simak,
         surat_nama = EXCLUDED.surat_nama,
         ayat_range = EXCLUDED.ayat_range,
         durasi_menit = EXCLUDED.durasi_menit,
         rekam_mandiri = EXCLUDED.rekam_mandiri,
         catatan_santri = EXCLUDED.catatan_santri,
         jenis_kelas = COALESCE(EXCLUDED.jenis_kelas, jurnal_pra_tikrar.jenis_kelas),
         jenis_kelas_list = EXCLUDED.jenis_kelas_list,
         jenis_kelas_custom = EXCLUDED.jenis_kelas_custom,
         asal_bimbingan = COALESCE(EXCLUDED.asal_bimbingan, jurnal_pra_tikrar.asal_bimbingan),
         kategori_kelas = COALESCE(EXCLUDED.kategori_kelas, jurnal_pra_tikrar.kategori_kelas),
         updated_at = now()
       RETURNING *`,
      [
        user.id,
        input.batch_id || null,
        halaqahIdSingle,
        JSON.stringify(halaqahIdsArray),
        input.tanggal,
        input.pekan_ke || 1,
        input.simak_1 || false,
        input.simak_2 || false,
        input.simak_3 || false,
        input.metode_simak || 'murni',
        input.surat_nama || null,
        input.ayat_range || null,
        input.durasi_menit || 0,
        input.rekam_mandiri || false,
        input.catatan_santri || null,
        jenisKelasList[0] || 'tahsin_juz30',
        JSON.stringify(jenisKelasList),
        input.jenis_kelas_custom || null,
        input.asal_bimbingan || 'internal_mti',
        input.kategori_kelas || 'umum',
      ]
    );

    revalidatePath('/jurnal-pra-tikrar');
    revalidatePath('/jurnal-harian');
    return {
      success: true,
      message: 'Alhamdulillah! Jurnal harian Pra-Tikrar berhasil disimpan.',
      data: rows[0],
    };
  } catch (error: any) {
    console.error('[savePraTikrarDailyEntry] Error:', error);
    return { success: false, error: error?.message || 'Gagal menyimpan jurnal' };
  }
}

export async function submitTashihByMuallimah(
  paramOrEntryId: string | TashihPayload,
  legacyData?: {
    catatan_muallimah?: string;
    status_bacaan?: string;
    evaluasi_tajwid?: any[];
    jenis_kelas?: string;
    jenis_kelas_custom?: string;
    asal_bimbingan?: string;
    kategori_kelas?: string;
  }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized.' };
  }

  try {
    const { rows: userRows } = await query(`SELECT roles FROM users WHERE id = $1`, [user.id]);
    const roles: string[] = userRows[0]?.roles || [];
    const canTashih = roles.includes('muallimah') || hasRequiredRank(roles, ROLE_RANKS.admin);

    if (!canTashih) {
      return { success: false, error: 'Hanya Muallimah atau Admin yang berhak memberikan penilaian tashih.' };
    }

    if (typeof paramOrEntryId === 'string') {
      const entryId = paramOrEntryId;
      const { rows } = await query(
        `UPDATE jurnal_pra_tikrar 
         SET muallimah_id = $1,
             catatan_muallimah = $2,
             status_bacaan = $3,
             evaluasi_tajwid = $4,
             jenis_kelas = COALESCE($6, jenis_kelas),
             jenis_kelas_custom = $7,
             asal_bimbingan = COALESCE($8, asal_bimbingan),
             kategori_kelas = COALESCE($9, kategori_kelas),
             tashih_at = now(),
             updated_at = now()
         WHERE id = $5
         RETURNING *`,
        [
          user.id,
          legacyData?.catatan_muallimah || null,
          legacyData?.status_bacaan || 'cukup',
          JSON.stringify(legacyData?.evaluasi_tajwid || []),
          entryId,
          legacyData?.jenis_kelas || null,
          legacyData?.jenis_kelas_custom || null,
          legacyData?.asal_bimbingan || null,
          legacyData?.kategori_kelas || null,
        ]
      );

      revalidatePath('/jurnal-pra-tikrar');
      revalidatePath('/jurnal-harian');
      return {
        success: true,
        message: 'Catatan bimbingan dan tashih bacaan berhasil diperbarui.',
        data: rows[0],
      };
    } else {
      const p = paramOrEntryId;
      const { rows } = await query(
        `INSERT INTO jurnal_pra_tikrar (\n           user_id,\n           halaqah_id,\n           batch_id,\n           tanggal,\n           muallimah_id,\n           status_bacaan,\n           catatan_muallimah,\n           evaluasi_tajwid,\n           jenis_kelas,\n           jenis_kelas_custom,\n           asal_bimbingan,\n           kategori_kelas,\n           tashih_at,\n           updated_at\n         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), now())\n         ON CONFLICT (user_id, tanggal) DO UPDATE SET\n           halaqah_id = COALESCE(EXCLUDED.halaqah_id, jurnal_pra_tikrar.halaqah_id),\n           muallimah_id = EXCLUDED.muallimah_id,\n           status_bacaan = EXCLUDED.status_bacaan,\n           catatan_muallimah = EXCLUDED.catatan_muallimah,\n           evaluasi_tajwid = EXCLUDED.evaluasi_tajwid,\n           jenis_kelas = COALESCE(EXCLUDED.jenis_kelas, jurnal_pra_tikrar.jenis_kelas),\n           jenis_kelas_custom = EXCLUDED.jenis_kelas_custom,\n           asal_bimbingan = COALESCE(EXCLUDED.asal_bimbingan, jurnal_pra_tikrar.asal_bimbingan),\n           kategori_kelas = COALESCE(EXCLUDED.kategori_kelas, jurnal_pra_tikrar.kategori_kelas),\n           tashih_at = now(),\n           updated_at = now()\n         RETURNING *`,
        [
          p.studentId,
          p.halaqahId || null,
          p.batchId || null,
          p.tanggal,
          user.id,
          p.status_bacaan || 'cukup',
          p.catatan_muallimah || null,
          JSON.stringify(p.evaluasi_tajwid || []),
          p.jenis_kelas || 'tahsin_juz30',
          p.jenis_kelas_custom || null,
          p.asal_bimbingan || 'internal_mti',
          p.kategori_kelas || 'umum',
        ]
      );

      revalidatePath('/jurnal-pra-tikrar');
      revalidatePath('/jurnal-harian');
      return {
        success: true,
        message: 'Catatan bimbingan dan tashih bacaan santriwati berhasil disimpan.',
        data: rows[0],
      };
    }
  } catch (error: any) {
    console.error('[submitTashihByMuallimah] Error:', error);
    return { success: false, error: error?.message || 'Gagal menyimpan catatan tashih' };
  }
}

export interface PresensiPayload {
  entryId?: string | null;
  studentId: string;
  halaqahId?: string | null;
  batchId?: string | null;
  tanggal: string;
  kehadiran_zoom: string;
  catatan_musyrifah?: string;
}

export async function submitPresensiByMusyrifah(
  paramOrEntryId: string | PresensiPayload,
  legacyData?: {
    kehadiran_zoom?: string;
    catatan_musyrifah?: string;
  }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized.' };
  }

  try {
    const { rows: userRows } = await query(`SELECT roles FROM users WHERE id = $1`, [user.id]);
    const roles: string[] = userRows[0]?.roles || [];
    const canManagePresensi = roles.includes('musyrifah') || hasRequiredRank(roles, ROLE_RANKS.admin);

    if (!canManagePresensi) {
      return { success: false, error: 'Hanya Musyrifah atau Admin yang berhak mencatat presensi kehadiran.' };
    }

    if (typeof paramOrEntryId === 'string') {
      const entryId = paramOrEntryId;
      const { rows } = await query(
        `UPDATE jurnal_pra_tikrar 
         SET musyrifah_id = $1,
             kehadiran_zoom = $2,
             catatan_musyrifah = $3,
             absen_at = now(),
             updated_at = now()
         WHERE id = $4
         RETURNING *`,
        [
          user.id,
          legacyData?.kehadiran_zoom || 'hadir',
          legacyData?.catatan_musyrifah || null,
          entryId,
        ]
      );

      revalidatePath('/jurnal-pra-tikrar');
      revalidatePath('/jurnal-harian');
      return {
        success: true,
        message: 'Presensi kelas Zoom berhasil dicatat oleh Musyrifah.',
        data: rows[0],
      };
    } else {
      const p = paramOrEntryId;
      const { rows } = await query(
        `INSERT INTO jurnal_pra_tikrar (
           user_id,
           halaqah_id,
           batch_id,
           tanggal,
           musyrifah_id,
           kehadiran_zoom,
           catatan_musyrifah,
           absen_at,
           updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
         ON CONFLICT (user_id, tanggal) DO UPDATE SET
           halaqah_id = COALESCE(EXCLUDED.halaqah_id, jurnal_pra_tikrar.halaqah_id),
           musyrifah_id = EXCLUDED.musyrifah_id,
           kehadiran_zoom = EXCLUDED.kehadiran_zoom,
           catatan_musyrifah = EXCLUDED.catatan_musyrifah,
           absen_at = now(),
           updated_at = now()
         RETURNING *`,
        [
          p.studentId,
          p.halaqahId || null,
          p.batchId || null,
          p.tanggal,
          user.id,
          p.kehadiran_zoom || 'hadir',
          p.catatan_musyrifah || null,
        ]
      );

      revalidatePath('/jurnal-pra-tikrar');
      revalidatePath('/jurnal-harian');
      return {
        success: true,
        message: 'Presensi kelas Zoom santriwati berhasil dicatat.',
        data: rows[0],
      };
    }
  } catch (error: any) {
    console.error('[submitPresensiByMusyrifah] Error:', error);
    return { success: false, error: error?.message || 'Gagal menyimpan presensi' };
  }
}

export async function submitBatchPresensiByMusyrifah(
  items: Array<{ studentId: string; kehadiran_zoom: string; catatan_musyrifah?: string }>,
  halaqahId: string,
  batchId: string | null,
  tanggal: string
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized.' };
  }

  try {
    const { rows: userRows } = await query(`SELECT roles FROM users WHERE id = $1`, [user.id]);
    const roles: string[] = userRows[0]?.roles || [];
    const canManagePresensi = roles.includes('musyrifah') || hasRequiredRank(roles, ROLE_RANKS.admin);

    if (!canManagePresensi) {
      return { success: false, error: 'Hanya Musyrifah atau Admin yang berhak mencatat presensi.' };
    }

    for (const item of items) {
      await query(
        `INSERT INTO jurnal_pra_tikrar (
           user_id,
           halaqah_id,
           batch_id,
           tanggal,
           musyrifah_id,
           kehadiran_zoom,
           catatan_musyrifah,
           absen_at,
           updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
         ON CONFLICT (user_id, tanggal) DO UPDATE SET
           halaqah_id = COALESCE(EXCLUDED.halaqah_id, jurnal_pra_tikrar.halaqah_id),
           musyrifah_id = EXCLUDED.musyrifah_id,
           kehadiran_zoom = EXCLUDED.kehadiran_zoom,
           catatan_musyrifah = EXCLUDED.catatan_musyrifah,
           absen_at = now(),
           updated_at = now()`,
        [
          item.studentId,
          halaqahId,
          batchId,
          tanggal,
          user.id,
          item.kehadiran_zoom || 'hadir',
          item.catatan_musyrifah || null,
        ]
      );
    }

    revalidatePath('/jurnal-pra-tikrar');
    revalidatePath('/jurnal-harian');
    return { success: true, message: `Alhamdulillah! Presensi ${items.length} thalibah berhasil disimpan.` };
  } catch (error: any) {
    console.error('[submitBatchPresensiByMusyrifah] Error:', error);
    return { success: false, error: error?.message || 'Gagal menyimpan presensi serentak' };
  }
}
