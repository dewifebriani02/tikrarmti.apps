import { z } from 'zod';

/** Musyrifah registration form — validated in the browser and again by the API route. */
export const musyrifahSchema = z.object({
  // Personal Information
  full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
  birth_date: z.string().min(1, 'Tanggal lahir harus diisi'),
  birth_place: z.string().min(3, 'Tempat lahir minimal 3 karakter'),
  address: z.string().min(10, 'Alamat minimal 10 karakter'),
  whatsapp: z.string().min(10, 'Nomor WhatsApp minimal 10 karakter'),
  email: z.string().email('Email tidak valid'),
  education: z.string().min(1, 'Pendidikan terakhir harus dipilih'),
  occupation: z.string().min(3, 'Pekerjaan minimal 3 karakter'),

  // Leadership Experience
  leadership_experience: z.string().min(1, 'Pengalaman leadership harus dipilih'),
  leadership_years: z.string().optional(),
  leadership_roles: z.string().optional(),

  // Management Skills
  management_skills: z.array(z.string()).min(1, 'Pilih minimal 1 skill manajemen'),
  team_management_experience: z.string().min(1, 'Pengalaman manajemen tim harus dipilih'),

  // Schedule Preference
  preferred_schedule: z.string().min(1, 'Jadwal yang diinginkan harus dipilih'),
  backup_schedule: z.string().min(1, 'Jadwal cadangan harus dipilih'),
  timezone: z.string().min(1, 'Zona waktu harus dipilih'),

  // Commitment
  time_commitment: z.boolean().refine(val => val === true, 'Komitmen waktu harus disetujui'),
  understands_program: z.boolean().refine(val => val === true, 'Pemahaman program harus disetujui'),
  agreement: z.boolean().refine(val => val === true, 'Pernyataan persetujuan harus dicentang'),

  // Additional Information
  motivation: z.string().optional(),
  leadership_philosophy: z.string().optional(),
  special_achievements: z.string().optional(),
});

export type MusyrifahFormData = z.infer<typeof musyrifahSchema>;
