/**
 * BATCH SCHEDULE LOCK UTILITIES
 *
 * Mengatur validasi jadwal dan penguncian (cutoff) untuk Jurnal Harian dan Tashih.
 * Sesuai kurikulum MTI:
 * 1. Tashih berjalan selama masa KBM (Pekan 1 s.d. Pekan 10) sebelum pekan review / ujian akhir.
 * 2. Jurnal Harian berjalan selama masa KBM (Pekan 1 s.d. 10 Ziyadah & Pekan 11 Muraja'ah Wajib)
 *    sampai sebelum Periode Ujian Akhir dimulai (final_exam_start_date).
 * 3. Keduanya terkunci jika KBM belum dimulai atau jika batch sudah selesai/closed.
 */

export interface BatchScheduleLock {
  isLocked: boolean;
  status: 'upcoming' | 'active' | 'review' | 'final_exam' | 'closed';
  reason?: string;
  badgeLabel?: string;
}

function parseDate(d?: string | null): Date | null {
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Cek status penguncian Jurnal Harian.
 * Jurnal Harian terkunci jika:
 * 1. Status batch adalah 'closed', 'completed', atau 'archived'.
 * 2. Hari ini sebelum KBM dimulai (first_week_start_date atau start_date).
 * 3. Hari ini sudah memasuki periode Ujian Akhir (final_exam_start_date).
 * 4. Hari ini sudah melewati tanggal akhir batch (end_date).
 */
export function getJurnalLockStatus(batch?: any | null, customNow?: Date): BatchScheduleLock {
  if (!batch) {
    return { isLocked: false, status: 'active' };
  }

  const now = customNow || new Date();

  // 1. Batch sudah ditutup / selesai
  if (batch.status === 'closed' || batch.status === 'completed' || batch.status === 'archived') {
    return {
      isLocked: true,
      status: 'closed',
      badgeLabel: 'Batch Selesai',
      reason: 'Batch ini telah resmi ditutup/selesai. Pengisian Jurnal Harian dinonaktifkan.',
    };
  }

  // 2. KBM belum dimulai (Upcoming)
  const startDate = parseDate(batch.first_week_start_date || batch.start_date || batch.opening_class_date);
  if (startDate && now < startDate) {
    return {
      isLocked: true,
      status: 'upcoming',
      badgeLabel: 'Belum Dimulai',
      reason: `Masa pembelajaran (KBM) belum dimulai. Jurnal Harian baru dapat diisi mulai tanggal ${startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
    };
  }

  // 3. Sudah memasuki Periode Ujian Akhir (Final Exam)
  const examStart = parseDate(batch.final_exam_start_date);
  if (examStart && now >= examStart) {
    return {
      isLocked: true,
      status: 'final_exam',
      badgeLabel: 'Periode Ujian Akhir',
      reason: 'Pengisian Jurnal Harian telah ditutup karena angkatan telah memasuki Periode Ujian Akhir.',
    };
  }

  // 4. Sudah melewati tanggal akhir batch
  const endDate = parseDate(batch.end_date);
  if (endDate && now > endDate) {
    return {
      isLocked: true,
      status: 'closed',
      badgeLabel: 'Batch Berakhir',
      reason: 'Masa kegiatan pembelajaran untuk batch ini telah berakhir.',
    };
  }

  return {
    isLocked: false,
    status: 'active',
    badgeLabel: 'KBM Aktif',
  };
}

/**
 * Cek status penguncian Tashih.
 * Tashih mencakup setoran Pekan 1 s.d. Pekan 10.
 * Tashih terkunci jika:
 * 1. Status batch adalah 'closed', 'completed', atau 'archived'.
 * 2. Hari ini sebelum jadwal Tashih dimulai (first_week_start_date atau start_date).
 * 3. Hari ini sudah memasuki Pekan Review / Muraja'ah (review_week_start_date)
 *    atau Periode Ujian Akhir (final_exam_start_date).
 * 4. Hari ini sudah melewati tanggal akhir batch (end_date).
 */
export function getTashihLockStatus(batch?: any | null, customNow?: Date): BatchScheduleLock {
  if (!batch) {
    return { isLocked: false, status: 'active' };
  }

  const now = customNow || new Date();

  // 1. Batch sudah ditutup / selesai
  if (batch.status === 'closed' || batch.status === 'completed' || batch.status === 'archived') {
    return {
      isLocked: true,
      status: 'closed',
      badgeLabel: 'Batch Selesai',
      reason: 'Batch ini telah resmi ditutup/selesai. Pengisian Tashih dinonaktifkan.',
    };
  }

  // 2. Jadwal Tashih belum dimulai (Upcoming)
  const startDate = parseDate(batch.first_week_start_date || batch.start_date || batch.opening_class_date);
  if (startDate && now < startDate) {
    return {
      isLocked: true,
      status: 'upcoming',
      badgeLabel: 'Belum Dimulai',
      reason: `Jadwal Tashih angkatan belum dimulai (dimulai tanggal ${startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}).`,
    };
  }

  // 3. Sudah memasuki Pekan Review / Muraja'ah Wajib (Tashih Pekan 1-10 selesai)
  const reviewStart = parseDate(batch.review_week_start_date);
  if (reviewStart && now >= reviewStart) {
    return {
      isLocked: true,
      status: 'review',
      badgeLabel: 'Pekan Muraja\'ah',
      reason: 'Masa setoran Tashih (Pekan 1–10) telah berakhir karena angkatan telah memasuki Pekan Muraja\'ah / Persiapan Ujian.',
    };
  }

  // 4. Sudah memasuki Periode Ujian Akhir
  const examStart = parseDate(batch.final_exam_start_date);
  if (examStart && now >= examStart) {
    return {
      isLocked: true,
      status: 'final_exam',
      badgeLabel: 'Periode Ujian Akhir',
      reason: 'Pengisian catatan Tashih telah ditutup karena angkatan telah memasuki Periode Ujian Akhir.',
    };
  }

  // 5. Sudah melewati tanggal akhir batch
  const endDate = parseDate(batch.end_date);
  if (endDate && now > endDate) {
    return {
      isLocked: true,
      status: 'closed',
      badgeLabel: 'Batch Berakhir',
      reason: 'Masa kegiatan pembelajaran untuk batch ini telah berakhir.',
    };
  }

  return {
    isLocked: false,
    status: 'active',
    badgeLabel: 'Tashih Aktif',
  };
}
