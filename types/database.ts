// Database Types untuk Tikrar MTI Apps
// Generated from database schema

export type UserRole = 'super_admin' | 'admin' | 'musyrifah' | 'muallimah' | 'roisah' | 'raisah' | 'thalibah' | 'calon_thalibah';
export type BatchStatus = 'draft' | 'open' | 'closed' | 'archived';
export type ProgramStatus = 'draft' | 'open' | 'ongoing' | 'completed' | 'cancelled';
export type HalaqahStatus = 'active' | 'inactive' | 'suspended';
export type PendaftaranStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'completed' | 'dropout';
export type MentorRole = 'ustadzah' | 'musyrifah';
export type HalaqahStudentStatus = 'active' | 'transferred' | 'graduated' | 'dropped';
export type PresensiStatus = 'hadir' | 'izin' | 'sakit' | 'alpha';
export type JuzPart = 'A' | 'B';
export type DaftarUlangStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'dropout';

export interface JuzOption {
  id: string;
  code: string;
  name: string;
  juz_number: number;
  part: JuzPart;
  start_page: number;
  end_page: number;
  total_pages: number;
  is_active: boolean;
  sort_order: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  roles: UserRole[];
  primaryRole?: UserRole;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  current_tikrar_batch_id?: string;
  current_tikrar_batch?: Batch;
  student_id_number?: string;
  current_juz?: string;
  // Extended profile fields
  nama_kunyah?: string;
  negara?: string;
  provinsi?: string;
  kota?: string;
  alamat?: string;
  whatsapp?: string;
  telegram?: string;
  zona_waktu?: string;
  tanggal_lahir?: string;
  tempat_lahir?: string;
  jenis_kelamin?: 'Laki-laki' | 'Perempuan';
  pekerjaan?: string;
  alasan_daftar?: string;
}

export interface Batch {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  registration_start_date?: string;
  registration_end_date?: string;
  status: BatchStatus;
  created_at: string;
  updated_at: string;
  is_free?: boolean;
  price?: number;
  total_quota?: number;
  registered_count?: number;
  duration_weeks?: number;
  muallimah_akad_text?: string;
  min_exam_score?: number;
  min_final_exam_score?: number;

  // Timeline phase dates for perjalanan-saya
  selection_start_date?: string;
  selection_end_date?: string;
  selection_result_date?: string;
  re_enrollment_date?: string;
  opening_class_date?: string;
  first_week_start_date?: string;
  first_week_end_date?: string;
  review_week_start_date?: string;
  review_week_end_date?: string;
  final_exam_start_date?: string;
  final_exam_end_date?: string;
  graduation_start_date?: string;
  graduation_end_date?: string;
  transfer_schedule_end_date?: string;
  whatsapp_group_link?: string;
  group_reminder_link?: string;
  group_diskusi_link?: string;
}

export interface Program {
  id: string;
  batch_id: string;
  name: string;
  description?: string;
  target_level?: string;
  duration_weeks?: number;
  max_thalibah?: number;
  status: ProgramStatus;
  created_at: string;
  updated_at: string;
  price?: number;
  is_free?: boolean;
  currency?: string;
  registration_start_date?: string | null;
  registration_end_date?: string | null;
}

export interface Halaqah {
  id: string;
  program_id: string;
  name: string;
  description?: string;
  day_of_week?: number; // 1-7 (Senin-Minggu)
  start_time?: string; // HH:MM format
  end_time?: string; // HH:MM format
  location?: string;
  max_students?: number;
  status: HalaqahStatus;
  created_at: string;
  updated_at: string;
}

export interface Pendaftaran {
  id: string;
  thalibah_id?: string;
  user_id?: string;
  program_id?: string;
  batch_id: string;
  batch_name?: string;
  registration_date?: string;
  status: PendaftaranStatus;
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at?: string;
  submitted_at?: string;
  // Multi-role support fields
  registration_type?: 'thalibah' | 'admin';
  role?: 'thalibah' | 'admin';
  // Re-enrollment tracking fields
  re_enrollment_completed?: boolean;
  re_enrollment_completed_at?: string;
  re_enrollment_confirmed_by?: string;
  selection_status?: 'pending' | 'selected' | 'not_selected' | 'waitlist';
  // Daftar ulang submission
  daftar_ulang?: DaftarUlangSubmission;
  // Nested relations
  program?: Program;
  batch?: Batch;
}

export interface DaftarUlangSubmission {
  id: string;
  user_id: string;
  batch_id: string;
  registration_id: string;
  status: DaftarUlangStatus;

  // Confirmed data
  confirmed_full_name?: string;
  confirmed_chosen_juz?: string;
  confirmed_main_time_slot?: string;
  confirmed_backup_time_slot?: string;

  // Partner
  partner_type?: 'self_match' | 'system_match' | 'family' | 'tarteel';
  partner_user_id?: string;
  partner_name?: string;
  partner_relationship?: string;
  partner_wa_phone?: string;
  partner_notes?: string;

  // Halaqah
  ujian_halaqah_id?: string;
  tashih_halaqah_id?: string;
  is_tashih_umum?: boolean;

  // Akad
  akad_files?: Array<{ url: string; name: string }>;
  akad_submitted_at?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  reviewed_at?: string;

  // Relations
  user?: {
    id: string;
    full_name: string;
    email: string;
    whatsapp?: string;
  };
  partner_user?: {
    id: string;
    full_name: string;
    email: string;
    whatsapp?: string;
  };
  ujian_halaqah?: {
    id: string;
    name: string;
    day_of_week?: string | number;
    start_time?: string;
    end_time?: string;
    muallimah_name?: string;
    class_type?: string;
    location?: string;
  };
  tashih_halaqah?: {
    id: string;
    name: string;
    day_of_week?: string | number;
    start_time?: string;
    end_time?: string;
    muallimah_name?: string;
    class_type?: string;
    location?: string;
  };
}

export interface HalaqahMentor {
  id: string;
  halaqah_id: string;
  mentor_id: string;
  role: MentorRole;
  is_primary: boolean;
  assigned_at: string;
}

export interface HalaqahStudent {
  id: string;
  halaqah_id: string;
  thalibah_id: string;
  assigned_at: string;
  assigned_by?: string;
  status: HalaqahStudentStatus;
}

export interface TransferScheduleRequest {
  id: string;
  user_id: string;
  batch_id: string;
  program_id: string;
  from_halaqah_id?: string;
  to_halaqah_id: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  user?: User;
  batch?: Batch;
  program?: Program;
  from_halaqah?: Halaqah;
  to_halaqah?: Halaqah;
}

export interface Presensi {
  id: string;
  halaqah_id: string;
  thalibah_id: string;
  date: string;
  status: PresensiStatus;
  notes?: string;
  recorded_by?: string;
  recorded_at: string;
}

// Joined types untuk queries dengan relations
export interface BatchWithPrograms extends Batch {
  programs: Program[];
}

export interface ProgramWithBatch extends Program {
  batch: Batch;
  halaqah: Halaqah[];
}

export interface HalaqahWithProgram extends Halaqah {
  program: Program;
  mentors: (HalaqahMentor & { user: User })[];
  students: (HalaqahStudent & { user: User })[];
}

export interface ProgramWithHalaqah extends Program {
  batch: Batch;
  halaqah: Halaqah[];
  pendaftaran_count?: number;
}

export interface UserWithPendaftaran extends User {
  pendaftaran: (Pendaftaran & { program: Program & { batch: Batch } })[];
}

export interface PendaftaranWithDetails extends Pendaftaran {
  thalibah: User;
  program: Program & { batch: Batch };
  halaqah?: (HalaqahStudent & { halaqah: Halaqah })[];
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: UserRole;
}

export interface BatchForm {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  registration_start_date?: string;
  registration_end_date?: string;
  min_exam_score?: number;
  min_final_exam_score?: number;
}

export interface ProgramForm {
  batch_id: string;
  name: string;
  description?: string;
  target_level?: string;
  duration_weeks?: number;
  max_thalibah?: number;
  price?: number;
  is_free?: boolean;
  currency?: string;
}

export interface HalaqahForm {
  program_id: string;
  name: string;
  description?: string;
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  location?: string;
  max_students?: number;
}

export interface PendaftaranForm {
  program_id: string;
  notes?: string;
}

export interface PresensiForm {
  thalibah_id: string;
  status: PresensiStatus;
  notes?: string;
}

// Dashboard types
export interface DashboardStats {
  total_thalibah: number;
  total_programs: number;
  total_halaqah: number;
  active_batches: number;
}

export interface ThalibahDashboard {
  user: User;
  active_pendaftaran: (Pendaftaran & { program: Program & { batch: Batch } })[];
  halaqah: (HalaqahStudent & { halaqah: Halaqah & { program: Program } })[];
  presensi_summary: {
    total_hadir: number;
    total_izin: number;
    total_sakit: number;
    total_alpha: number;
  };
}

export interface MentorDashboard {
  user: User;
  halaqah_mentors: (HalaqahMentor & {
    halaqah: Halaqah & {
      program: Program & { batch: Batch };
      students: (HalaqahStudent & { user: User })[];
    };
  })[];
  presensi_pending: Presensi[];
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Filter types
export interface BatchFilter {
  status?: BatchStatus[];
  search?: string;
}

export interface ProgramFilter {
  batch_id?: string;
  status?: ProgramStatus[];
  search?: string;
}

export interface HalaqahFilter {
  program_id?: string;
  status?: HalaqahStatus[];
  search?: string;
}

export interface PendaftaranFilter {
  batch_id?: string;
  program_id?: string;
  status?: PendaftaranStatus[];
  search?: string;
}

export interface PresensiFilter {
  halaqah_id?: string;
  date_from?: string;
  date_to?: string;
  status?: PresensiStatus[];
}

// =====================================================
// SP (Surat Peringatan) Types
// =====================================================

export type SPLevel = 1 | 2 | 3;
export type SPStatus = 'active' | 'cancelled' | 'expired';
export type SPType = 'permanent_do' | 'temporary_do';
export type SPReason = 'tidak_lapor_jurnal' | 'laporan_tidak_lengkap' | 'lainnya';
export type UdzurType = 'sakit' | 'merawat_orang_tua' | 'lainnya';

export interface SuratPeringatan {
  id: string;
  thalibah_id: string;
  batch_id: string;
  week_number: number;
  sp_level: SPLevel;
  sp_type?: SPType;
  reason: SPReason;
  udzur_type?: UdzurType;
  udzur_notes?: string;
  is_blacklisted: boolean;
  status: SPStatus;
  issued_at: string;
  issued_by?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;

  // Relations
  thalibah?: User;
  batch?: Batch;
  issued_by_user?: User;
  reviewed_by_user?: User;
}

export interface SPHistory {
  id: string;
  thalibah_id: string;
  batch_id: string;
  final_action: 'permanent_do' | 'temporary_do' | 'blacklisted';
  total_sp_count: number;
  udzur_type?: UdzurType;
  udzur_notes?: string;
  temporary_until?: string;
  action_taken_at: string;
  action_taken_by?: string;
  notes?: string;
  created_at: string;

  // Relations
  thalibah?: User;
  batch?: Batch;
  action_taken_by_user?: User;
}

export interface PendingSP {
  thalibah_id: string;
  thalibah: User;
  week_number: number;
  has_jurnal: boolean;
  latest_jurnal_date?: string;
  current_active_sp?: SuratPeringatan;
  weeks_with_jurnal: number;
  confirmed_chosen_juz?: string | null;
}

export interface SPSummary {
  thalibah_id: string;
  total_active_sp: number;
  latest_sp_level: SPLevel | null;
  latest_sp_date?: string;
  is_blacklisted: boolean;
  has_sp3: boolean;
}

export interface CreateSPInput {
  thalibah_id: string;
  batch_id: string;
  week_number: number;
  reason: SPReason;
  notes?: string;
}

export interface UpdateSPInput {
  status?: SPStatus;
  notes?: string;
  sp_type?: SPType;
  udzur_type?: UdzurType;
  udzur_notes?: string;
}

export interface SPFilter {
  batch_id?: string;
  thalibah_id?: string;
  sp_level?: SPLevel;
  status?: SPStatus[];
}
export interface FAQQuestion {
  q: string;
  a: string;
}

export interface FAQCategory {
  id: string;
  category: string;
  icon: string;
  color: string;
  questions: FAQQuestion[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Murojaah 40X & Badges Types
// =====================================================

export type MurojaahMethod = 'pasangan' | 'tarteel' | 'sholat' | 'aktifitas_lain';
export type MurojaahSegment = 'primary' | 'part_a_optional';

export interface Murojaah40xProgress {
  id: string;
  user_id: string;
  batch_id: string;
  juz_code: string;
  is_part_b: boolean;
  include_part_a: boolean;
  started_at: string;
  completed_at?: string | null;
  total_completed: number;
  is_warrior_eligible: boolean;
  created_at: string;
  updated_at: string;
  user?: User;
  batch?: Batch;
}

export interface Murojaah40xLog {
  id: string;
  progress_id: string;
  user_id: string;
  round_number: number;
  juz_segment: MurojaahSegment;
  completed_at: string;
  methods: MurojaahMethod[];
  notes?: string | null;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_code: string;
  badge_name: string;
  description?: string;
  icon_url?: string;
  awarded_at: string;
  metadata?: {
    days_taken?: number;
    juz?: string;
    batch?: string;
    [key: string]: any;
  };
}
