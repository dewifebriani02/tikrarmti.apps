/**
 * BATCH LIFECYCLE MANAGEMENT
 * 
 * Logic status siklus batch otomatis:
 * 1. 'archived': jika admin yang memilih secara manual (tidak di-overwrite otomatis)
 * 2. 'closed': jika sudah selesai sampai akhir siklus batch (hari ini > tanggal kelulusan / ujian akhir / end_date)
 * 3. 'ongoing': jika kelas sudah berjalan (hari ini >= tanggal mulai KBM / first_week_start_date s.d. akhir siklus)
 * 4. 'open': jika masa registrasi aktif atau kelas belum dimulai (hari ini >= registration_start_date atau sebelum kelas mulai)
 * 5. 'draft': jika masa registrasi masih di masa depan
 */

export interface BatchDateFields {
  id?: string;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  registration_start_date?: string | null;
  registration_end_date?: string | null;
  first_week_start_date?: string | null;
  final_exam_end_date?: string | null;
  graduation_end_date?: string | null;
}

export function calculateBatchStatus(batch: BatchDateFields): 'draft' | 'open' | 'ongoing' | 'closed' | 'archived' {
  // 1. Status archived dipilih manual oleh admin, jangan di-overwrite
  if (batch.status === 'archived') {
    return 'archived';
  }

  const now = new Date();

  const parseDate = (d?: string | null, isEndOfDay = false): Date | null => {
    if (!d) return null;
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    if (isEndOfDay && d.length <= 10) {
      date.setHours(23, 59, 59, 999);
    }
    return date;
  };

  // Akhir siklus batch: gunakan tanggal kelulusan, tanggal ujian akhir, atau end_date
  const cycleEndDate = parseDate(
    batch.graduation_end_date || batch.final_exam_end_date || batch.end_date,
    true
  );

  // Mulai kelas / KBM
  const classStartDate = parseDate(
    batch.first_week_start_date || batch.start_date
  );

  // Mulai registrasi
  const regStartDate = parseDate(batch.registration_start_date);

  // Skenario 1: CLOSED — Sudah selesai sampai akhir siklus batch
  if (cycleEndDate && now > cycleEndDate) {
    return 'closed';
  }

  // Skenario 2: ONGOING — Kelas sudah berjalan sampai akhir siklus
  if (classStartDate && now >= classStartDate) {
    return 'ongoing';
  }

  // Skenario 3: OPEN — Masa registrasi aktif / persiapan sebelum KBM mulai
  if (regStartDate) {
    if (now >= regStartDate) {
      return 'open';
    }
    // Jika tanggal registrasi di masa depan, statusnya draft
    return 'draft';
  }

  // Jika tidak ada tanggal registrasi spesifik, tapi kelas masih di masa depan
  if (classStartDate && now < classStartDate) {
    return 'open';
  }

  return (batch.status as any) || 'open';
}

/**
 * Sync status ke database jika ada perbedaan antara status di database dengan status otomatis
 */
export async function syncBatchLifecycle(supabaseAdmin: any, batches: BatchDateFields[]): Promise<void> {
  if (!batches || batches.length === 0) return;

  const updates: Promise<any>[] = [];

  for (const b of batches) {
    if (!b.id || b.status === 'archived') continue;

    const computedStatus = calculateBatchStatus(b);
    if (computedStatus !== b.status) {
      b.status = computedStatus; // Update in-memory
      updates.push(
        supabaseAdmin
          .from('batches')
          .update({
            status: computedStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', b.id)
          .then(({ error }: any) => {
            if (error) {
              console.error(`[syncBatchLifecycle] Failed to update batch ${b.id} to ${computedStatus}:`, error);
            }
          })
      );
    }
  }

  if (updates.length > 0) {
    await Promise.allSettled(updates);
  }
}
