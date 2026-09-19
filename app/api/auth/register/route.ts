import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { authRateLimit, getClientIP } from '@/lib/rate-limiter';
import {
  sanitizeEmail,
  sanitizeName,
  sanitizePhone,
  sanitizeAddress,
  sanitizeCity,
  sanitizeGeneric
} from '@/lib/utils/sanitize';
import { logger } from '@/lib/logger-secure';
import { ApiResponses } from '@/lib/api-responses';
import { authSchemas } from '@/lib/schemas';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  let body: any;

  try {
    body = await request.json();

    // 1. Validate request body with Zod schema
    const validation = authSchemas.register.safeParse(body);
    if (!validation.success) {
      return ApiResponses.validationError(validation.error.issues);
    }

    body = validation.data;

    // 2. reCAPTCHA validation (if configured in production)
    if (process.env.NODE_ENV === 'production' && process.env.RECAPTCHA_SECRET_KEY) {
      const recaptchaToken = body.recaptchaToken;
      if (!recaptchaToken) {
        return ApiResponses.customValidationError([{ field: 'recaptcha', message: 'reCAPTCHA verification is required', code: 'custom' }]);
      }

      const recaptchaResponse = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `secret=${encodeURIComponent(process.env.RECAPTCHA_SECRET_KEY || '')}&response=${encodeURIComponent(recaptchaToken)}`,
        }
      );

      const recaptchaResult = await recaptchaResponse.json();

      if (!recaptchaResult.success || recaptchaResult.score < 0.5) {
        logger.warn('reCAPTCHA verification failed', {
          ip,
          endpoint: '/api/auth/register',
          score: recaptchaResult.score
        });

        return ApiResponses.customValidationError([{ field: 'recaptcha', message: 'reCAPTCHA verification failed. Please try again.', code: 'custom' }]);
      }
    }

    // 3. Apply rate limiting
    if (authRateLimit) {
      const { success } = await authRateLimit.limit(ip);
      if (!success) {
        logger.warn('Rate limit exceeded', { ip, endpoint: '/api/auth/register' });
        return ApiResponses.rateLimit('Terlalu banyak percobaan pendaftaran. Silakan tunggu beberapa saat.');
      }
    }

    // 4. Honeypot check for bots
    if (body.honeypot) {
      logger.warn('Honeypot filled - Bot detected', {
        ip,
        honeypotValue: body.honeypot,
        email: body.email
      });
      return ApiResponses.serverError('Pendaftaran gagal. Silakan coba lagi nanti.');
    }

    // 5. Sanitize all inputs
    const cleanEmail = sanitizeEmail(body.email);
    const cleanNamaKunyah = body.nama_kunyah ? sanitizeName(body.nama_kunyah) : null;
    const cleanFullName = sanitizeName(body.full_name);
    const cleanNegara = sanitizeCity(body.negara);
    const cleanProvinsi = body.provinsi ? sanitizeCity(body.provinsi) : null;
    const cleanKota = sanitizeCity(body.kota);
    const cleanAlamat = sanitizeAddress(body.alamat);
    const cleanWhatsApp = sanitizePhone(body.whatsapp, body.negara);
    const cleanTelegram = body.telegram ? sanitizePhone(body.telegram, body.negara) : null;
    const cleanZonaWaktu = sanitizeGeneric(body.zona_waktu, 10);

    // 6. Check if email already exists in PostgreSQL
    const existingEmail = await queryOne(
      'SELECT id, email, full_name, is_active FROM users WHERE LOWER(email) = LOWER($1)',
      [cleanEmail]
    );

    if (existingEmail) {
      return ApiResponses.conflict('Email sudah terdaftar. Silakan login atau gunakan email lain.');
    }

    // 7. Check if WhatsApp already exists
    const existingPhone = await queryOne(
      'SELECT id, full_name FROM users WHERE whatsapp = $1',
      [cleanWhatsApp]
    );

    if (existingPhone) {
      return ApiResponses.customValidationError([{
        field: 'whatsapp',
        message: 'Nomor WhatsApp ini sudah terdaftar. Silakan gunakan nomor lain atau hubungi admin.',
        code: 'CONFLICT'
      }]);
    }

    // 8. Check blacklist
    const blacklistCheck = await queryOne(
      'SELECT id, email, whatsapp, blacklist_reason FROM users WHERE (LOWER(email) = LOWER($1) OR whatsapp = $2) AND is_blacklisted = true',
      [cleanEmail, cleanWhatsApp]
    );

    if (blacklistCheck) {
      const matchedField = blacklistCheck.email?.toLowerCase() === cleanEmail.toLowerCase() ? 'email' : 'WhatsApp';
      return ApiResponses.customValidationError([{
        field: matchedField,
        message: `${matchedField === 'email' ? 'Email' : 'Nomor WhatsApp'} ini telah di-blacklist dari sistem. Hubungi admin jika ini kesalahan.`,
        code: 'BLACKLISTED'
      }]);
    }

    // 9. Hash password
    const passwordHash = await hashPassword(body.password);
    const newUserId = crypto.randomUUID();
    const role = 'thalibah';
    const roles = ['thalibah'];

    // 10. Insert user into PostgreSQL users table
    const insertedUser = await queryOne(
      `INSERT INTO users (
        id, email, password_hash, full_name, nama_kunyah,
        negara, provinsi, kota, alamat,
        whatsapp, telegram, zona_waktu,
        tanggal_lahir, tempat_lahir, jenis_kelamin,
        pekerjaan, alasan_daftar,
        role, roles, is_active, is_blacklisted,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15,
        $16, $17,
        $18, $19, true, false,
        NOW(), NOW()
      ) RETURNING id, email, full_name, role, roles`,
      [
        newUserId,
        cleanEmail,
        passwordHash,
        cleanFullName,
        cleanNamaKunyah,
        cleanNegara,
        cleanProvinsi,
        cleanKota,
        cleanAlamat,
        cleanWhatsApp,
        cleanTelegram,
        cleanZonaWaktu,
        body.tanggal_lahir,
        body.tempat_lahir,
        body.jenis_kelamin,
        body.pekerjaan,
        body.alasan_daftar,
        role,
        roles,
      ]
    );

    logger.auth('User registered successfully', insertedUser.id, {
      email: insertedUser.email,
      role: insertedUser.role,
      ip
    });

    return ApiResponses.success(
      {
        user: {
          id: insertedUser.id,
          email: insertedUser.email,
          full_name: insertedUser.full_name,
          role: insertedUser.role,
        }
      },
      '🎉 Pendaftaran berhasil! Silakan login dengan akun Ukhti.',
      201
    );

  } catch (error: any) {
    logger.error('Registration error', {
      endpoint: '/api/auth/register',
      ip,
      error: error?.message || error
    });

    return ApiResponses.serverError('Terjadi kesalahan server saat memproses pendaftaran. Silakan coba lagi.');
  }
}