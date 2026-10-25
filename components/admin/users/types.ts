export interface AdminUser {
  id: string;
  email: string;
  student_id_number?: string | null;
  current_juz?: string | null;
  full_name: string | null;
  nama_kunyah: string | null;
  role: string | null;
  roles: string[] | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  provinsi: string | null;
  kota: string | null;
  alamat: string | null;
  whatsapp: string | null;
  telegram: string | null;
  zona_waktu: string | null;
  tanggal_lahir: string | null;
  tempat_lahir: string | null;
  pekerjaan: string;
  alasan_daftar: string;
  jenis_kelamin: string | null;
  negara: string;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
  blacklisted_at: string | null;
  blacklist_notes: string | null;
  blacklist_by: string | null;
  current_tikrar_batch?: {
    id: string;
    name: string;
    status: string;
  } | null;
  activity_meta?: {
    total_jurnal: number;
    latest_jurnal_date: string | null;
    registered_batches: string[];
    has_active_reg: boolean;
    is_unauthorized_activity: boolean;
  };
}

export interface MuallimahRegistration {
  id: string;
  user_id: string;
  batch_id: string;
  full_name: string;
  birth_date: string;
  birth_place: string;
  address: string;
  whatsapp: string;
  email: string;
  education: string;
  occupation: string;
  memorization_level: string;
  memorized_juz: string;
  preferred_juz: string;
  teaching_experience: string;
  teaching_years: string;
  teaching_institutions: string;
  preferred_schedule: string;
  backup_schedule: string;
  timezone: string;
  motivation?: string;
  special_skills?: string;
  health_condition?: string;
  status: 'pending' | 'review' | 'approved' | 'rejected' | 'waitlist';
  submitted_at: string;
  reviewed_at?: string;
  review_notes?: string;
  batch?: {
    name: string;
  };
}
