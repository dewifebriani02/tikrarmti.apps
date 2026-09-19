import { PendaftaranData } from '@/lib/pendaftaran';
import { logger } from '@/lib/logger-secure';
import { ApiResponses } from '@/lib/api-responses';
import { pendaftaranSchemas } from '@/lib/schemas';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getAuthorizationContext } from '@/lib/rbac';

// PostgreSQL-backed admin client (replaces Supabase service role)
const supabaseAdmin = createSupabaseAdmin();

export async function POST(request: Request) {
  // Get client IP for logging
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                   request.headers.get('x-real-ip') ||
                   '127.0.0.1';

  try {
    // 1. Authorization check
    const context = await getAuthorizationContext();
    if (!context) return ApiResponses.unauthorized();

    logger.info('Starting form submission', {
      ip: clientIP,
      endpoint: '/api/pendaftaran/submit',
      userId: context.userId
    });

    const body = await request.json();

    // 2. Validate request body with Zod schema
    const validation = pendaftaranSchemas.submitWithPhoneSupport.safeParse(body);
    if (!validation.success) {
      logger.warn('Validation failed', {
        errors: validation.error.issues,
        ip: clientIP,
        userId: context.userId
      });
      return ApiResponses.validationError(validation.error.issues);
    }

    const validatedBody = validation.data;

    // 3. Verify that the user_id in the request matches the authenticated user
    if (validatedBody.user_id !== context.userId) {
      logger.warn('User ID mismatch in form submission', {
        requestUserId: validatedBody.user_id,
        sessionUserId: context.userId,
        ip: clientIP
      });
      return ApiResponses.unauthorized('Invalid user session. Identity mismatch.');
    }

    // 4. Fetch batch name for batch_name field
    let batchName = 'Unknown Batch';
    try {
      const { data: batch } = await supabaseAdmin
        .from('batches')
        .select('name')
        .eq('id', validatedBody.batch_id)
        .maybeSingle();
      if (batch) batchName = batch.name;
    } catch (e) {
      logger.warn('Failed to fetch batch name', { error: e as Error });
    }

    // 5. Fetch user's domicile and timezone
    let userDomicile = '';
    let userTimezone = 'WIB';
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, nama_kunyah, negara, provinsi, kota, alamat, whatsapp, zona_waktu, tanggal_lahir, tempat_lahir, pekerjaan, alasan_daftar, jenis_kelamin')
      .eq('id', context.userId)
      .maybeSingle();

    if (profileError) {
      console.error('[Pendaftaran Submit] Profile check error:', profileError);
      return ApiResponses.serverError('Failed to verify user profile.');
    }

    if (!userProfile) {
      return ApiResponses.error('NOT_FOUND', 'Profil *Ukhti* belum terdaftar.', { redirect: '/lengkapi-profile' }, 404);
    }

    userDomicile = userProfile.kota || '';
    userTimezone = userProfile.zona_waktu || 'WIB';

    // 6. Validate profile completeness (architecture requirement)
    const requiredFields: Record<string, any> = {
      nama_kunyah: userProfile.nama_kunyah,
      full_name: userProfile.full_name,
      whatsapp: userProfile.whatsapp,
      negara: userProfile.negara,
      kota: userProfile.kota,
      alamat: userProfile.alamat,
      zona_waktu: userProfile.zona_waktu,
      tanggal_lahir: userProfile.tanggal_lahir,
      tempat_lahir: userProfile.tempat_lahir,
      pekerjaan: userProfile.pekerjaan,
      alasan_daftar: userProfile.alasan_daftar,
      jenis_kelamin: userProfile.jenis_kelamin
    };

    if (userProfile.negara === 'Indonesia') {
      requiredFields.provinsi = userProfile.provinsi;
    }

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([field, _]) => field);

    if (missingFields.length > 0) {
      return ApiResponses.error('INCOMPLETE_PROFILE', `Profil *Ukhti* belum lengkap. Field yang kosong: ${missingFields.join(', ')}.`, { redirect: '/lengkapi-profile' }, 400);
    }

    // 7. Prepare submission data
    const submissionData: PendaftaranData = {
      user_id: context.userId,
      batch_id: validatedBody.batch_id,
      program_id: validatedBody.program_id,
      batch_name: batchName,
      understands_commitment: validatedBody.understands_commitment || false,
      tried_simulation: validatedBody.tried_simulation || false,
      no_negotiation: validatedBody.no_negotiation || false,
      has_telegram: validatedBody.has_telegram || false,
      saved_contact: validatedBody.saved_contact || false,
      has_permission: (validatedBody.has_permission as 'yes' | 'janda' | '') || '',
      permission_name: validatedBody.permission_name || '',
      permission_phone: validatedBody.permission_phone || '',
      chosen_juz: validatedBody.chosen_juz || '',
      no_travel_plans: validatedBody.no_travel_plans || false,
      motivation: validatedBody.motivation || '',
      ready_for_team: (validatedBody.ready_for_team || 'not_ready') as 'ready' | 'not_ready' | 'considering' | 'infaq',
      main_time_slot: validatedBody.main_time_slot || '',
      backup_time_slot: validatedBody.backup_time_slot || '',
      time_commitment: validatedBody.time_commitment || false,
      understands_program: validatedBody.understands_program || false,
      email: validatedBody.email,
      full_name: validatedBody.full_name,
      address: validatedBody.address,
      wa_phone: validatedBody.phone || validatedBody.wa_phone || '',
      telegram_phone: validatedBody.telegram_phone,
      birth_date: validatedBody.birth_date,
      age: validatedBody.age,
      domicile: userDomicile,
      timezone: userTimezone,
      questions: validatedBody.questions,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'pending',
      selection_status: 'pending',
      submission_date: new Date().toISOString()
    };

    // 8. Check for existing registration in the same batch
    const { data: existingReg } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select('id')
      .eq('user_id', context.userId)
      .eq('batch_id', validatedBody.batch_id)
      .maybeSingle();

    let result;
    if (existingReg) {
      // Update existing registration
      const { data: updateResult, error: updateError } = await supabaseAdmin
        .from('pendaftaran_tikrar_tahfidz')
        .update({
          ...submissionData,
          created_at: undefined, // Don't override original created_at
          status: undefined, // Don't reset status if admin has reviewed
          selection_status: undefined // Don't reset selection status if admin has set it
        })
        .eq('id', existingReg.id)
        .select('id')
        .maybeSingle();

      if (updateError) {
        logger.error('Registration update error', { error: updateError, userId: context.userId });
        return ApiResponses.databaseError(updateError);
      }
      result = updateResult;
    } else {
      // Insert new registration
      const { data: insertResult, error: insertError } = await supabaseAdmin
        .from('pendaftaran_tikrar_tahfidz')
        .insert(submissionData)
        .select('id')
        .maybeSingle();

      if (insertError) {
        logger.error('Registration insertion error', { error: insertError, userId: context.userId });
        return ApiResponses.databaseError(insertError);
      }
      result = insertResult;
    }

    if (!result) {
      logger.error('Registration operation returned no result', { userId: context.userId });
      return ApiResponses.serverError('Failed to retrieve registration ID after submission.');
    }

    logger.info('Registration submitted successfully', { registrationId: result.id, userId: context.userId });

    return ApiResponses.success({ id: result.id }, existingReg ? 'Pendaftaran berhasil diperbarui' : 'Pendaftaran berhasil dikirim', existingReg ? 200 : 201);

  } catch (error) {
    logger.error('[Pendaftaran Submit API] Unexpected error', { error: error as Error, ip: clientIP });
    return ApiResponses.handleUnknown(error);
  }
}