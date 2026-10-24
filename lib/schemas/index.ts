import { z } from 'zod'

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // UUID validation
  uuid: z.string().uuid(),

  // Email validation
  email: z.string().email('Email tidak valid'),

  // Phone validation (Indonesian format)
  phone: z.string()
    .regex(/^(\+62|62|0)[0-9]{9,13}$/, 'Format nomor telepon tidak valid'),

  // International phone validation (supports multiple country codes)
  internationalPhone: z.string()
    .regex(/^\+\d{8,15}$/, 'Format nomor telepon tidak valid. Gunakan format: +kode_negara nomor'),

  // URL validation
  url: z.string().url('URL tidak valid'),

  // Date validation
  date: z.string().datetime({ offset: true }),

  // Pagination
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(10),
    offset: z.number().int().min(0).default(0),
  }),
}

/**
 * User-related schemas
 */
export const userSchemas = {
  // Base user schema
  base: z.object({
    email: commonSchemas.email,
    full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
    phone: commonSchemas.phone.optional(),
    role: z.enum(['thalibah', 'admin']),
  }),

  // Registration form
  registration: z.object({
    email: commonSchemas.email,
    password: z.string()
      .min(8, 'Password minimal 8 karakter')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password harus mengandung huruf besar, kecil, dan angka'),
    full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
    phone: commonSchemas.phone.optional(),
    role: z.enum(['thalibah']),
    confirm_password: z.string(),
  }).refine((data) => data.password === data.confirm_password, {
    message: 'Password dan konfirmasi password harus sama',
    path: ['confirm_password'],
  }),

  // Login form
  login: z.object({
    email: commonSchemas.email,
    password: z.string().min(1, 'Password tidak boleh kosong'),
  }),

  // Profile update
  profileUpdate: z.object({
    full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter').optional(),
    phone: commonSchemas.phone.optional(),
    avatar_url: commonSchemas.url.optional(),
  }),
}

/**
 * Authentication schemas
 */
export const authSchemas = {
  // Login form
  login: userSchemas.login,

  // Register form (extended for full registration)
  register: z.object({
    nama_kunyah: z.string().optional(),
    email: commonSchemas.email,
    password: z.string().min(8, 'Password minimal 8 karakter'),
    full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
    negara: z.string().min(1, 'Negara harus diisi'),
    provinsi: z.string().nullable().optional(), // Allow null for non-Indonesian countries
    kota: z.string().min(1, 'Kota harus diisi'),
    alamat: z.string().min(10, 'Alamat minimal 10 karakter'),
    whatsapp: commonSchemas.internationalPhone, // Use international phone format
    telegram: commonSchemas.internationalPhone.optional(), // Use international phone format
    zona_waktu: z.string().min(1, 'Zona waktu harus diisi'), // Accept any valid timezone string
    tanggal_lahir: z.string()
      .datetime({ offset: true })
      .refine(val => new Date(val) < new Date(), {
        message: 'Tanggal lahir harus di masa lalu'
      }),
    tempat_lahir: z.string().min(1, 'Tempat lahir harus diisi'),
    jenis_kelamin: z.enum(['Laki-laki', 'Perempuan']),
    pekerjaan: z.string().min(1, 'Pekerjaan harus diisi'),
    alasan_daftar: z.string().min(10, 'Alasan daftar minimal 10 karakter'),
    recaptchaToken: z.string().optional(),
  }),
}

/**
 * Batch-related schemas
 */
const batchCreateSchema = z.object({
  name: z.string().min(3, 'Nama batch minimal 3 karakter'),
  description: z.string().optional(),
  start_date: z.string().datetime({ offset: true }),
  end_date: z.string().datetime({ offset: true }),
  registration_start_date: z.string().datetime({ offset: true }).optional(),
  registration_end_date: z.string().datetime({ offset: true }).optional(),
  duration_weeks: z.number().int().min(1, 'Durasi minimal 1 minggu'),
  is_free: z.boolean().default(true),
  price: z.number().min(0, 'Harga tidak boleh negatif').default(0),
  total_quota: z.number().int().min(1, 'Kuota minimal 1').default(100),
  muallimah_akad_text: z.string().optional(),
})

export const batchSchemas = {
  // Create batch
  create: batchCreateSchema,

  // Update batch
  update: batchCreateSchema.partial(),

  // Batch status update
  statusUpdate: z.object({
    status: z.enum(['draft', 'open', 'closed', 'archived']),
  }),
}

/**
 * Program-related schemas
 */
const programCreateSchema = z.object({
  batch_id: commonSchemas.uuid,
  name: z.string().min(3, 'Nama program minimal 3 karakter'),
  description: z.string().optional(),
  target_level: z.string().optional(),
  duration_weeks: z.number().int().min(1, 'Durasi minimal 1 minggu').optional(),
  max_thalibah: z.number().int().min(1, 'Maksimal thalibah minimal 1').optional(),
  registration_start_date: z.string().optional().nullable(),
  registration_end_date: z.string().optional().nullable(),
})

export const programSchemas = {
  // Create program
  create: programCreateSchema,

  // Update program
  update: programCreateSchema.partial(),
}

/**
 * Registration-related schemas
 */
export const registrationSchemas = {
  // Create registration
  create: z.object({
    batch_id: commonSchemas.uuid,
    program_id: commonSchemas.uuid,
    notes: z.string().optional(),
  }),

  // Tikrar Tahfidz registration
  tikrarTahfidz: z.object({
    user_id: commonSchemas.uuid,
    batch_id: commonSchemas.uuid,
    program_id: commonSchemas.uuid,

    // Personal data
    full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
    email: commonSchemas.email,
    wa_phone: commonSchemas.phone,
    telegram_phone: commonSchemas.phone.optional(),
    address: z.string().min(10, 'Alamat minimal 10 karakter'),
    birth_date: z.string().datetime({ offset: true }),
    age: z.number().int().optional(),
    domicile: z.string().min(3, 'Domisili minimal 3 karakter'),
    timezone: z.string().default('WIB'),

    // Commitment
    understands_commitment: z.boolean(),
    tried_simulation: z.boolean(),
    no_negotiation: z.boolean(),
    has_telegram: z.boolean(),
    saved_contact: z.boolean(),

    // Permission
    has_permission: z.enum(['yes', 'janda', '']),
    permission_name: z.string().optional(),
    permission_phone: commonSchemas.phone.optional(),

    // Program choice
    chosen_juz: z.string().min(1, 'Pilihan juz harus diisi'),
    no_travel_plans: z.boolean(),
    motivation: z.string().min(10, 'Motivasi minimal 10 karakter'),
    ready_for_team: z.enum(['ready', 'not_ready', 'considering', 'infaq']),
    infaq_amount: z.string().optional(),

    // Schedule
    main_time_slot: z.string().min(1, 'Slot waktu utama harus dipilih'),
    backup_time_slot: z.string().min(1, 'Slot waktu cadangan harus dipilih'),
    time_commitment: z.boolean(),

    // Understanding
    understands_program: z.boolean(),
    questions: z.string().optional(),
  }),

  // Status update
  statusUpdate: z.object({
    status: z.enum(['pending', 'approved', 'rejected', 'withdrawn', 'completed']),
    reason: z.string().optional(),
  }),
}

/**
 * Pendaftaran submission schemas
 *
 * IMPORTANT: This schema must match the database schema for pendaftaran_tikrar_tahfidz table
 * Reference: docs/DATABASE_SCHEMA.md
 *
 * Fields NOT in database (DO NOT ADD to schema):
 * - birth_place: Only exists in users table, NOT in pendaftaran_tikrar_tahfidz
 * - gender: Only exists in users table (jenis_kelamin), NOT in pendaftaran_tikrar_tahfidz
 * - education: NOT in pendaftaran_tikrar_tahfidz
 * - work: NOT in pendaftaran_tikrar_tahfidz
 * - emergency_contact: NOT in pendaftaran_tikrar_tahfidz
 */
export const pendaftaranSchemas = {
  // Submit registration form for Tikrar Tahfidz program
  submit: z.object({
    // Required identifiers
    user_id: commonSchemas.uuid,
    batch_id: commonSchemas.uuid,
    program_id: commonSchemas.uuid,

    // Personal data - from users table (optional because backend can fetch from users table)
    full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter').optional(),
    email: commonSchemas.email.optional(),
    wa_phone: commonSchemas.phone.optional(),  // Changed from 'phone' to 'wa_phone' to match DB
    telegram_phone: commonSchemas.phone.optional(),
    address: z.string().optional(),
    // REMOVED: birth_place - NOT in pendaftaran_tikrar_tahfidz table
    birth_date: z.string().datetime({ offset: true }).optional(),
    age: z.number().int().optional(),
    domicile: z.string().optional(),
    timezone: z.string().default('WIB'),

    // Section 1 fields
    understands_commitment: z.boolean().optional(),
    tried_simulation: z.boolean().optional(),
    no_negotiation: z.boolean().optional(),
    has_telegram: z.boolean().optional(),
    saved_contact: z.boolean().optional(),

    // Section 2 fields
    has_permission: z.enum(['yes', 'janda', '']).optional(),
    permission_name: z.string().optional(),
    permission_phone: z.string().optional(),
    chosen_juz: z.string().optional(),
    no_travel_plans: z.boolean().optional(),
    motivation: z.string().min(10, 'Motivasi minimal 10 karakter').optional(),
    ready_for_team: z.enum(['ready', 'not_ready', 'considering', 'infaq']).optional(),
    infaq_amount: z.string().optional(),

    // Section 3 fields
    main_time_slot: z.string().optional(),
    backup_time_slot: z.string().optional(),
    time_commitment: z.boolean().optional(),

    // Section 4 fields
    understands_program: z.boolean().optional(),
    questions: z.string().optional(),

    // Additional fields for backend use
    provider: z.string().optional(),
  }),

  // Legacy schema for backward compatibility - accepts 'phone' field from frontend
  submitWithPhoneSupport: z.object({
    // Required identifiers
    user_id: commonSchemas.uuid,
    batch_id: commonSchemas.uuid,
    program_id: commonSchemas.uuid,

    // Personal data - accepts both 'phone' and 'wa_phone' for backward compatibility
    full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter').optional(),
    email: commonSchemas.email.optional(),
    phone: commonSchemas.phone.optional(),  // Frontend sends 'phone'
    wa_phone: commonSchemas.phone.optional(),  // Backend expects 'wa_phone'
    telegram_phone: commonSchemas.phone.optional(),
    address: z.string().optional(),
    birth_date: z.string().datetime({ offset: true }).optional(),
    age: z.number().int().optional(),
    domicile: z.string().optional(),
    timezone: z.string().default('WIB'),

    // Fields sent by frontend but NOT in database - we accept and strip them out
    birth_place: z.string().optional(),  // NOT in pendaftaran_tikrar_tahfidz table
    gender: z.enum(['L', 'P', 'Laki-laki', 'Perempuan']).optional(),  // NOT in pendaftaran_tikrar_tahfidz table
    education: z.string().optional(),  // NOT in pendaftaran_tikrar_tahfidz table
    work: z.string().optional(),  // NOT in pendaftaran_tikrar_tahfidz table

    // Section 1 fields
    understands_commitment: z.boolean().optional(),
    tried_simulation: z.boolean().optional(),
    no_negotiation: z.boolean().optional(),
    has_telegram: z.boolean().optional(),
    saved_contact: z.boolean().optional(),

    // Section 2 fields
    has_permission: z.enum(['yes', 'janda', '']).optional(),
    permission_name: z.string().optional(),
    permission_phone: z.string().optional(),
    chosen_juz: z.string().optional(),
    no_travel_plans: z.boolean().optional(),
    motivation: z.string().min(10, 'Motivasi minimal 10 karakter').optional(),
    ready_for_team: z.string().optional(),
    infaq_amount: z.string().optional(),

    // Section 3 fields
    main_time_slot: z.string().optional(),
    backup_time_slot: z.string().optional(),
    time_commitment: z.boolean().optional(),

    // Section 4 fields
    understands_program: z.boolean().optional(),
    questions: z.string().optional(),

    // Additional fields
    provider: z.string().optional(),
  }),
}

/**
 * API Response schemas
 */
export const apiResponseSchemas = {
  // Success response
  success: <T>(data: z.ZodType<T>) => z.object({
    success: z.literal(true),
    data,
    message: z.string().optional(),
    timestamp: z.string().datetime({ offset: true }),
  }),

  // Error response
  error: z.object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.any().optional(),
    }),
    timestamp: z.string().datetime({ offset: true }),
  }),

  // Paginated response
  paginated: <T>(data: z.ZodType<T>) => z.object({
    success: z.literal(true),
    data: z.array(data),
    pagination: z.object({
      page: z.number().int(),
      limit: z.number().int(),
      total: z.number().int(),
      totalPages: z.number().int(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
    timestamp: z.string().datetime({ offset: true }),
  }),
}

/**
 * Query parameter schemas
 */
export const querySchemas = {
  // Pagination and search
  list: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc'),
  }),

  // Date range
  dateRange: z.object({
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
  }),
}

/**
 * File upload schemas
 */
export const fileSchemas = {
  // Image upload
  image: z.object({
    file: z.instanceof(File)
      .refine((file) => file.size <= 5 * 1024 * 1024, 'Ukuran file maksimal 5MB')
      .refine(
        (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
        'Format file harus JPEG, PNG, atau WebP'
      ),
  }),

  // Document upload
  document: z.object({
    file: z.instanceof(File)
      .refine((file) => file.size <= 10 * 1024 * 1024, 'Ukuran file maksimal 10MB')
      .refine(
        (file) => ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type),
        'Format file harus PDF, DOC, atau DOCX'
      ),
  }),
}

/**
 * Utility functions
 */
export const createValidationSchema = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => ({
  validate: (data: unknown) => {
    return schema.parse(data)
  },
  validatePartial: (data: unknown) => {
    return schema.partial().parse(data)
  },
  safeValidate: (data: unknown) => {
    return schema.safeParse(data)
  },
})

// Export all schemas
export const schemas = {
  common: commonSchemas,
  user: userSchemas,
  batch: batchSchemas,
  program: programSchemas,
  registration: registrationSchemas,
  apiResponse: apiResponseSchemas,
  query: querySchemas,
  file: fileSchemas,
}