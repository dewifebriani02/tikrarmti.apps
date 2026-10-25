/**
 * Pra-Tikrar Types, Constants, and Helper Functions
 */

export const PRA_TIKRAR_TASHIH_CLASS_TYPES = [
  { id: 'tahsin_juz30', label: "Tahsin Tilawah Al-Qur'an (Juz 30)" },
  { id: 'makharijul_huruf', label: 'Makharijul Huruf & Sifat Huruf' },
  { id: 'talaqqi_zoom', label: 'Talaqqi & Musyafahah (Sesi Zoom MTI)' },
  { id: 'an_nuraniyah', label: 'Metode An-Nuraniyah (Al-Qaidah)' },
  { id: 'asy_syafii', label: 'Metode Asy-Syafi’i (Tajwid Praktis)' },
  { id: 'iqro_dewasa', label: 'Metode Iqro’ (Lanjutan / Dewasa)' },
  { id: 'dauroh_tajwid', label: 'Dauroh / Kajian Matan Tajwid Dasar' },
  { id: 'bimbingan_luar', label: 'Bimbingan Mandiri / Kajian Luar MTI' },
  { id: 'lainnya', label: 'Lainnya (Tulis Manual)' },
];

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
  catatan_santri?: string;
  halaqah_id?: string | null;
  batch_id?: string | null;
  jenis_kelas?: string;
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
  catatan_santri?: string;
  status_bacaan?: string;
  catatan_muallimah?: string;
  evaluasi_tajwid?: any;
  tashih_at?: string;
  kehadiran_zoom?: string;
  catatan_musyrifah?: string;
  absen_at?: string;
  jenis_kelas?: string;
  jenis_kelas_custom?: string;
  asal_bimbingan?: string;
  kategori_kelas?: string;
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
  studentId: string;
  entryId?: string | null;
  halaqahId?: string | null;
  batchId?: string | null;
  tanggal?: string;
  status_bacaan: string;
  catatan_muallimah?: string;
  evaluasi_tajwid?: any[];
  jenis_kelas?: string;
  jenis_kelas_custom?: string;
  asal_bimbingan?: string;
  kategori_kelas?: string;
}
