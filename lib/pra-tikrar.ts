/**
 * Pra-Tikrar Types, Constants, and Helper Functions
 */

export const PRA_TIKRAR_PROGRAM_DETAILS = [
  { id: 'nuroniyah', label: 'Nuroniyah', badge: '(Nuroniyah)', fullLabel: 'Metode An-Nuraniyah (Nuroniyah)' },
  { id: 'iqra_firdaus', label: 'Iqra Firdaus', badge: '(Iqra Firdaus)', fullLabel: "Metode Iqra Firdaus / Iqro' Dewasa" },
  { id: 'asy_syafii', label: "Metode Asy Syafi'i", badge: "(Metode Asy Syafi'i)", fullLabel: "Metode Asy-Syafi'i (Tajwid Praktis)" },
  { id: 'tahsin_juz30', label: 'Tahsin Juz 30', badge: '(Tahsin Juz 30)', fullLabel: "Tahsin Tilawah Al-Qur'an (Juz 30)" },
];

export const PRA_TIKRAR_TASHIH_CLASS_TYPES = [
  { id: 'an_nuraniyah', label: 'Nuroniyah (Metode An-Nuraniyah)', icon: '📗', desc: 'Pengejaan harakat, makharijul huruf & kaidah bunyi Al-Qur’an' },
  { id: 'iqro_dewasa', label: "Iqra Firdaus (Metode Iqro' Dewasa)", icon: '📖', desc: 'Penguatan makhraj, harakat dasar & kelancaran bacaan' },
  { id: 'asy_syafii', label: "Metode Asy Syafi'i (Tajwid Praktis)", icon: '📘', desc: 'Pembahasan hukum-hukum tajwid praktis & terapan' },
  { id: 'tahsin_juz30', label: "Tahsin Tilawah Al-Qur'an (Juz 30)", icon: '🌸', desc: 'Perbaikan bacaan surat-surat Juz 30' },
  { id: 'makharijul_huruf', label: 'Makharijul Huruf & Sifat Huruf', icon: '🎙️', desc: 'Latihan tempat keluar & karakteristik huruf' },
  { id: 'talaqqi_zoom', label: 'Talaqqi & Musyafahah (Sesi Zoom MTI)', icon: '🎥', desc: 'Simakan langsung tatap muka dengan Ustadzah MTI' },
  { id: 'dauroh_tajwid', label: 'Dauroh / Kajian Matan Tajwid Dasar', icon: '📜', desc: 'Kajian Tuhfatul Athfal / Jazariyah' },
  { id: 'bimbingan_luar', label: 'Bimbingan Mandiri / Kajian Luar MTI', icon: '🕌', desc: 'Kelas tahsin/tashih di masjid atau lembaga luar' },
  { id: 'lainnya', label: 'Lainnya (Tulis Manual)', icon: '✍️', desc: 'Bimbingan atau halaqah tambahan lainnya' },
];

export function extractPraTikrarProgramDetail(halaqah?: {
  name?: string | null;
  description?: string | null;
  preferred_juz?: string | null;
  class_type?: string | null;
} | null): string | null {
  if (!halaqah) return null;
  const combined = [halaqah.name, halaqah.description, halaqah.preferred_juz]
    .filter(Boolean)
    .join(' ');
  const lower = combined.toLowerCase();

  const matches: string[] = [];
  if (lower.includes('nuroniyah') || lower.includes('nuraniyah') || lower.includes('nuraniyyah')) {
    matches.push('Nuroniyah');
  }
  if (lower.includes('iqra firdaus') || lower.includes('iqro firdaus') || lower.includes('iqra') || lower.includes('iqro')) {
    matches.push('Iqra Firdaus');
  }
  if (lower.includes('syafii') || lower.includes("syafi'i") || lower.includes('syafi’i') || lower.includes('asy syafi')) {
    matches.push("Metode Asy Syafi'i");
  }
  if (matches.length > 0) {
    return matches.join(' • ');
  }

  // Also check explicit parenthetical program detail e.g. "(Tahsin Juz 30)"
  const parenMatch = (halaqah.name || '').match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) {
    const val = parenMatch[1].trim();
    if (!val.toLowerCase().includes('sit-in')) {
      return val;
    }
  }

  return null;
}

export const PRA_TIKRAR_ASAL_BIMBINGAN = [
  { id: 'internal_mti', label: 'Internal Sesi Terbuka MTI (23 Sesi Zoom)' },
  { id: 'eksternal_luar', label: 'Eksternal (Luar MTI / Privat)' },
];

export const PRA_TIKRAR_KATEGORI_KELAS = [
  { id: 'umum', label: 'Kelas Umum (Halaqah Bersama)' },
  { id: 'privat', label: 'Kelas Khusus / Privat (1-on-1)' },
];

export function getJenisKelasLabel(id?: string | null, custom?: string | null): string {
  if (!id) return 'Tahsin Tilawah (Juz 30)';
  if (id === 'lainnya') return custom || 'Lainnya (Manual)';
  if (id === 'nuroniyah') return 'Nuroniyah (Metode An-Nuraniyah)';
  if (id === 'iqra_firdaus') return "Iqra Firdaus (Metode Iqro' Dewasa)";
  const found = PRA_TIKRAR_TASHIH_CLASS_TYPES.find(t => t.id === id);
  return found ? found.label : id;
}

export function getAsalBimbinganLabel(id?: string | null): string {
  if (!id) return 'Internal MTI';
  const found = PRA_TIKRAR_ASAL_BIMBINGAN.find(a => a.id === id);
  return found ? found.label : id;
}

export function getKategoriKelasLabel(id?: string | null): string {
  if (!id) return 'Kelas Umum';
  const found = PRA_TIKRAR_KATEGORI_KELAS.find(k => k.id === id);
  return found ? found.label : id;
}

export interface PraTikrarEntryInput {
  tanggal: string; // YYYY-MM-DD
  pekan_ke?: number;
  simak_1?: boolean;
  simak_2?: boolean;
  simak_3?: boolean;
  metode_simak?: string;
  surat_nama?: string | null;
  ayat_range?: string | null;
  durasi_menit?: number;
  rekam_mandiri?: boolean;
  catatan_santri?: string;
  halaqah_id?: string | null;
  halaqah_ids?: string[];
  batch_id?: string | null;
  jenis_kelas?: string;
  jenis_kelas_list?: string[];
  jenis_kelas_custom?: string;
  asal_bimbingan?: string;
  kategori_kelas?: string;
}

export interface PraTikrarStudentRecord {
  student_id: string;
  full_name?: string;
  student_name?: string;
  nama_kunyah?: string;
  student_kunyah?: string;
  email?: string;
  student_email?: string;
  whatsapp?: string;
  student_wa?: string;
  entry_id?: string | null;
  tanggal?: string;
  pekan_ke?: number;
  simak_1?: boolean;
  simak_2?: boolean;
  simak_3?: boolean;
  metode_simak?: string;
  surat_nama?: string;
  ayat_range?: string;
  durasi_menit?: number;
  rekam_mandiri?: boolean;
  catatan_santri?: string;
  status_bacaan?: string;
  catatan_muallimah?: string;
  evaluasi_tajwid?: any;
  tashih_at?: string;
  kehadiran_zoom?: string;
  catatan_musyrifah?: string;
  absen_at?: string;
  jenis_kelas?: string;
  jenis_kelas_list?: string[];
  jenis_kelas_custom?: string;
  asal_bimbingan?: string;
  kategori_kelas?: string;
  halaqah_ids?: string[];
}

export interface PraTikrarContextResponse {
  success?: boolean;
  error?: string;
  userRole?: string;
  roles?: string[];
  isMuallimah?: boolean;
  isMusyrifah?: boolean;
  isAdmin?: boolean;
  isThalibah?: boolean;
  activeBatch?: any;
  availableSessions?: any[];
  praStudentsList?: Array<{ id: string; full_name: string; nama_kunyah?: string; whatsapp?: string; email?: string }>;
  managedHalaqahs?: any[];
  todayEntry?: any | null;
  history?: any[];
  student?: any | null;
}

export interface TashihPayload {
  studentId?: string;
  entryId?: string | null;
  jurnal_id?: string;
  halaqahId?: string | null;
  batchId?: string | null;
  tanggal?: string;
  status_bacaan: string;
  catatan_muallimah?: string;
  evaluasi_tajwid?: any[];
  kesalahan_makhraj?: string[];
  kesalahan_sifat?: string[];
  kesalahan_mad?: string[];
  kesalahan_ghunnah?: string[];
  jenis_kelas?: string;
  jenis_kelas_list?: string[];
  jenis_kelas_custom?: string;
  asal_bimbingan?: string;
  kategori_kelas?: string;
}
