import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/logger-secure'
import { getClientIP } from '@/lib/rate-limiter'
import { authSchemas } from '@/lib/schemas'
import { ApiResponses } from '@/lib/api-responses'
import {
  sanitizeEmail,
  sanitizeName,
  sanitizePhone,
  sanitizeAddress,
  sanitizeCity,
  sanitizeGeneric
} from '@/lib/utils/sanitize'

/**
 * Role-specific profile data interfaces
 */
interface MuallimahProfileData {
  education?: string
  occupation?: string
  memorization_level?: string
  memorized_juz?: string
  preferred_juz?: string
  teaching_experience?: string
  teaching_years?: string
  teaching_institutions?: string
  preferred_schedule?: string
  backup_schedule?: string
  motivation?: string
  special_skills?: string
  health_condition?: string
  tajweed_institution?: string
  quran_institution?: string
  teaching_communities?: string
  memorized_tajweed_matan?: string
  studied_matan_exegesis?: string
  examined_juz?: string
  certified_juz?: string
  paid_class_interest?: string
  class_type?: string
  preferred_max_thalibah?: number
}

interface MusyrifahProfileData {
  education?: string
  occupation?: string
  leadership_experience?: string
  leadership_years?: string
  leadership_roles?: string
  management_skills?: string[]
  team_management_experience?: string
  preferred_schedule?: string
  backup_schedule?: string
  motivation?: string
  leadership_philosophy?: string
  special_achievements?: string
}

/**
 * Update user profile endpoint
 * For authenticated users (Admin, Muallimah, Thobibah, Musyrifah) to update their own profile data
 * Supports:
 * - Basic user profile (users table)
 * - Muallimah-specific profile (muallimah_registrations table)
 * - Musyrifah-specific profile (musyrifah_registrations table)
 */
export async function PUT(request: NextRequest) {
  const ip = getClientIP(request)

  try {
    // Verify user is authenticated
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.warn('Unauthorized profile update attempt', {
        ip,
        endpoint: '/api/user/profile/update'
      })
      return NextResponse.json({
        error: 'Unauthorized - Please login first'
      }, { status: 401 })
    }

    // Parse and validate request body
    let body: any
    try {
      body = await request.json()
    } catch (parseError) {
      return ApiResponses.customValidationError([{
        field: 'body',
        message: 'Invalid request body',
        code: 'INVALID_JSON'
      }])
    }

    // Get user's role data to determine which profile to update
    const supabaseAdmin = createSupabaseAdmin()
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, roles')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      logger.warn('User not found in database', {
        userId: user.id.substring(0, 8) + '...',
        ip
      })
      return ApiResponses.notFound('User profile not found. Please complete your profile first.')
    }

    // Determine if user has specific registration data to update
    // We check the tables directly instead of relying on the (now legacy) roles array
    const userRoles = userData?.roles || []
    const isAdmin = userRoles.includes('admin')

    // Update basic user profile (common fields for all roles)
    const validationResult = authSchemas.register.omit({
      password: true,
      recaptchaToken: true,
      email: true
    }).safeParse({
      ...body,
      email: user.email
    })

    let sanitizedBasicData: any = {}
    if (validationResult.success) {
      const validatedData = validationResult.data
      sanitizedBasicData = {
        nama_kunyah: validatedData.nama_kunyah ? sanitizeName(validatedData.nama_kunyah) : null,
        full_name: sanitizeName(validatedData.full_name),
        negara: sanitizeCity(validatedData.negara),
        provinsi: validatedData.provinsi ? sanitizeCity(validatedData.provinsi) : null,
        kota: sanitizeCity(validatedData.kota),
        alamat: sanitizeAddress(validatedData.alamat),
        whatsapp: sanitizePhone(validatedData.whatsapp, validatedData.negara),
        telegram: validatedData.telegram ? sanitizePhone(validatedData.telegram, validatedData.negara) : null,
        zona_waktu: sanitizeGeneric(validatedData.zona_waktu, 20),
        tanggal_lahir: validatedData.tanggal_lahir,
        tempat_lahir: validatedData.tempat_lahir,
        jenis_kelamin: validatedData.jenis_kelamin,
        pekerjaan: validatedData.pekerjaan,
        alasan_daftar: validatedData.alasan_daftar
      }
    }

    // Update users table
    logger.info('Updating user profile', {
      userId: user.id.substring(0, 8) + '...',
      isAdmin,
      ip
    })

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        ...sanitizedBasicData,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select('id, email, full_name, roles')
      .single()

    if (updateError) {
      logger.error('Failed to update user profile', {
        userId: user.id.substring(0, 8) + '...',
        error: updateError.message,
        code: updateError.code
      })
      return ApiResponses.serverError(`Failed to update profile: ${updateError.message}`)
    }

    // Handle role-specific updates (Muallimah/Musyrifah tables)
    // We attempt these updates if the user has the relevant registration records
    let roleSpecificUpdateResult: any = null

    // Always check for registration updates if body contains relevant fields
    const hasMuallimahFields = Object.keys(body).some(key => [
      'teaching_experience', 'memorization_level', 'quran_institution'
    ].includes(key))

    const hasMusyrifahFields = Object.keys(body).some(key => [
      'leadership_experience', 'team_management_experience'
    ].includes(key))

    if (hasMuallimahFields) {
      roleSpecificUpdateResult = await updateMuallimahProfile(supabaseAdmin, user.id, body, ip)
    }

    if (hasMusyrifahFields) {
      const musyrifahResult = await updateMusyrifahProfile(supabaseAdmin, user.id, body, ip)
      if (musyrifahResult) {
        roleSpecificUpdateResult = { ...roleSpecificUpdateResult, ...musyrifahResult }
      }
    }

    // Also update user metadata in auth
    try {
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          full_name: sanitizedBasicData.full_name,
          negara: sanitizedBasicData.negara,
          kota: sanitizedBasicData.kota,
          whatsapp: sanitizedBasicData.whatsapp,
          telegram: sanitizedBasicData.telegram,
          zona_waktu: sanitizedBasicData.zona_waktu,
          tanggal_lahir: sanitizedBasicData.tanggal_lahir,
          tempat_lahir: sanitizedBasicData.tempat_lahir,
          jenis_kelamin: sanitizedBasicData.jenis_kelamin,
          pekerjaan: sanitizedBasicData.pekerjaan,
          alasan_daftar: sanitizedBasicData.alasan_daftar
        }
      })
    } catch (metadataError) {
      logger.warn('Failed to update user metadata', {
        userId: user.id.substring(0, 8) + '...',
        error: metadataError
      })
      // Don't fail the request if metadata update fails
    }

    logger.info('User profile updated successfully', {
      userId: user.id.substring(0, 8) + '...',
      isAdmin,
      ip
    })

    return ApiResponses.success({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        roles: updatedUser.roles
      },
      roleSpecific: roleSpecificUpdateResult
    }, 'Profil berhasil diperbarui')

  } catch (error) {
    logger.error('Unhandled error in update profile API', {
      error: error as Error,
      ip
    })
    return ApiResponses.serverError('Terjadi kesalahan server. Silakan coba lagi.')
  }
}

/**
 * Update Muallimah-specific profile data
 */
async function updateMuallimahProfile(
  supabaseAdmin: any,
  userId: string,
  body: any,
  ip: string
): Promise<any> {
  logger.info('Updating muallimah profile', {
    userId: userId.substring(0, 8) + '...',
    ip
  })

  // Get latest muallimah registration
  const { data: registration, error: fetchError } = await supabaseAdmin
    .from('muallimah_registrations')
    .select('*')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchError) {
    logger.error('Failed to fetch muallimah registration', {
      userId: userId.substring(0, 8) + '...',
      error: fetchError.message
    })
    return null
  }

  if (!registration) {
    logger.info('No muallimah registration found for user', {
      userId: userId.substring(0, 8) + '...'
    })
    return null
  }

  // Sanitize muallimah-specific fields
  const muallimahData: Partial<MuallimahProfileData> = {}

  if (body.education !== undefined) muallimahData.education = sanitizeGeneric(body.education, 200)
  if (body.occupation !== undefined) muallimahData.occupation = sanitizeGeneric(body.occupation, 100)
  if (body.memorization_level !== undefined) muallimahData.memorization_level = sanitizeGeneric(body.memorization_level, 50)
  if (body.memorized_juz !== undefined) muallimahData.memorized_juz = sanitizeGeneric(body.memorized_juz, 100)
  if (body.preferred_juz !== undefined) muallimahData.preferred_juz = sanitizeGeneric(body.preferred_juz, 50)
  if (body.teaching_experience !== undefined) muallimahData.teaching_experience = sanitizeGeneric(body.teaching_experience, 500)
  if (body.teaching_years !== undefined) muallimahData.teaching_years = sanitizeGeneric(body.teaching_years, 50)
  if (body.teaching_institutions !== undefined) muallimahData.teaching_institutions = sanitizeGeneric(body.teaching_institutions, 200)
  if (body.preferred_schedule !== undefined) muallimahData.preferred_schedule = sanitizeGeneric(body.preferred_schedule, 100)
  if (body.backup_schedule !== undefined) muallimahData.backup_schedule = sanitizeGeneric(body.backup_schedule, 100)
  if (body.motivation !== undefined) muallimahData.motivation = sanitizeGeneric(body.motivation, 500)
  if (body.special_skills !== undefined) muallimahData.special_skills = sanitizeGeneric(body.special_skills, 300)
  if (body.health_condition !== undefined) muallimahData.health_condition = sanitizeGeneric(body.health_condition, 300)
  if (body.tajweed_institution !== undefined) muallimahData.tajweed_institution = sanitizeGeneric(body.tajweed_institution, 100)
  if (body.quran_institution !== undefined) muallimahData.quran_institution = sanitizeGeneric(body.quran_institution, 100)
  if (body.teaching_communities !== undefined) muallimahData.teaching_communities = sanitizeGeneric(body.teaching_communities, 200)
  if (body.memorized_tajweed_matan !== undefined) muallimahData.memorized_tajweed_matan = sanitizeGeneric(body.memorized_tajweed_matan, 200)
  if (body.studied_matan_exegesis !== undefined) muallimahData.studied_matan_exegesis = sanitizeGeneric(body.studied_matan_exegesis, 200)
  if (body.examined_juz !== undefined) muallimahData.examined_juz = sanitizeGeneric(body.examined_juz, 50)
  if (body.certified_juz !== undefined) muallimahData.certified_juz = sanitizeGeneric(body.certified_juz, 50)
  if (body.paid_class_interest !== undefined) muallimahData.paid_class_interest = sanitizeGeneric(body.paid_class_interest, 10)
  if (body.class_type !== undefined) muallimahData.class_type = sanitizeGeneric(body.class_type, 50)
  if (body.preferred_max_thalibah !== undefined) muallimahData.preferred_max_thalibah = Number(body.preferred_max_thalibah)

  // Update muallimah registration
  const { error: updateError } = await supabaseAdmin
    .from('muallimah_registrations')
    .update(muallimahData)
    .eq('id', registration.id)
    .eq('user_id', userId)

  if (updateError) {
    logger.error('Failed to update muallimah profile', {
      userId: userId.substring(0, 8) + '...',
      error: updateError.message
    })
    return null
  }

  return { updated: true, registrationId: registration.id }
}

/**
 * Update Musyrifah-specific profile data
 */
async function updateMusyrifahProfile(
  supabaseAdmin: any,
  userId: string,
  body: any,
  ip: string
): Promise<any> {
  logger.info('Updating musyrifah profile', {
    userId: userId.substring(0, 8) + '...',
    ip
  })

  // Get latest musyrifah registration
  const { data: registration, error: fetchError } = await supabaseAdmin
    .from('musyrifah_registrations')
    .select('*')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchError) {
    logger.error('Failed to fetch musyrifah registration', {
      userId: userId.substring(0, 8) + '...',
      error: fetchError.message
    })
    return null
  }

  if (!registration) {
    logger.info('No musyrifah registration found for user', {
      userId: userId.substring(0, 8) + '...'
    })
    return null
  }

  // Sanitize musyrifah-specific fields
  const musyrifahData: Partial<MusyrifahProfileData> = {}

  if (body.education !== undefined) musyrifahData.education = sanitizeGeneric(body.education, 200)
  if (body.occupation !== undefined) musyrifahData.occupation = sanitizeGeneric(body.occupation, 100)
  if (body.leadership_experience !== undefined) musyrifahData.leadership_experience = sanitizeGeneric(body.leadership_experience, 500)
  if (body.leadership_years !== undefined) musyrifahData.leadership_years = sanitizeGeneric(body.leadership_years, 50)
  if (body.leadership_roles !== undefined) musyrifahData.leadership_roles = sanitizeGeneric(body.leadership_roles, 200)
  if (body.management_skills !== undefined && Array.isArray(body.management_skills)) {
    musyrifahData.management_skills = body.management_skills.map((s: string) => sanitizeGeneric(s, 50))
  }
  if (body.team_management_experience !== undefined) musyrifahData.team_management_experience = sanitizeGeneric(body.team_management_experience, 500)
  if (body.preferred_schedule !== undefined) musyrifahData.preferred_schedule = sanitizeGeneric(body.preferred_schedule, 100)
  if (body.backup_schedule !== undefined) musyrifahData.backup_schedule = sanitizeGeneric(body.backup_schedule, 100)
  if (body.motivation !== undefined) musyrifahData.motivation = sanitizeGeneric(body.motivation, 500)
  if (body.leadership_philosophy !== undefined) musyrifahData.leadership_philosophy = sanitizeGeneric(body.leadership_philosophy, 500)
  if (body.special_achievements !== undefined) musyrifahData.special_achievements = sanitizeGeneric(body.special_achievements, 300)

  // Update musyrifah registration
  const { error: updateError } = await supabaseAdmin
    .from('musyrifah_registrations')
    .update(musyrifahData)
    .eq('id', registration.id)
    .eq('user_id', userId)

  if (updateError) {
    logger.error('Failed to update musyrifah profile', {
      userId: userId.substring(0, 8) + '...',
      error: updateError.message
    })
    return null
  }

  return { updated: true, registrationId: registration.id }
}
