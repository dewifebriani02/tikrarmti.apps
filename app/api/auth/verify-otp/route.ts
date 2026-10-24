import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createPasswordResetToken } from '@/lib/auth';
import { logger } from '@/lib/logger-secure';
import { authRateLimit, checkRateLimit, getClientIP } from '@/lib/rate-limiter';

const MAX_FAILED_ATTEMPTS = 5;
// Wrong guesses allowed per email per hour across all codes
const MAX_FAILED_PER_HOUR = 10;

/**
 * Step 2 of password reset: check the OTP and, on success, hand back a
 * short-lived signed reset token required by /api/auth/reset-with-otp.
 */
export async function POST(request: NextRequest) {
  try {
    const rate = await checkRateLimit(`otp-verify:${getClientIP(request)}`, authRateLimit, '/api/auth/verify-otp');
    if (!rate.success) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi nanti.' }, { status: 429 });
    }

    const { email, code } = await request.json();
    if (!email || !code || typeof email !== 'string' || typeof code !== 'string') {
      return NextResponse.json({ error: 'Email dan kode diperlukan' }, { status: 400 });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const submittedCode = code.replace(/\s/g, '');

    // Per-email cap on wrong guesses across all codes (independent of client IP)
    const { rows: [failures] } = await query(
      `SELECT COALESCE(SUM(failed_attempts), 0) AS total
         FROM password_reset_otps
        WHERE email = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [normalizedEmail]
    );
    if (Number(failures?.total) >= MAX_FAILED_PER_HOUR) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi nanti.' }, { status: 429 });
    }

    // Check-and-count in ONE statement on the active code. The row lock taken by
    // UPDATE serializes parallel guesses, so no more than MAX_FAILED_ATTEMPTS
    // wrong guesses can ever be evaluated against a single code.
    const { rows: attempts } = await query(
      `UPDATE password_reset_otps
          SET failed_attempts = failed_attempts + CASE WHEN code = $2 THEN 0 ELSE 1 END,
              used = CASE WHEN code = $2 THEN true ELSE (failed_attempts + 1 >= $3) END,
              updated_at = NOW()
        WHERE email = $1 AND used = false AND expires_at > NOW()
        RETURNING (code = $2) AS matched, used`,
      [normalizedEmail, submittedCode, MAX_FAILED_ATTEMPTS]
    );

    if (!attempts.some((a: { matched: boolean }) => a.matched)) {
      const locked = attempts.length > 0 && attempts.every((a: { used: boolean }) => a.used);
      return NextResponse.json(
        { error: locked ? 'Terlalu banyak kode salah. Silakan minta kode baru.' : 'Kode tidak valid atau sudah kadaluarsa' },
        { status: 400 }
      );
    }

    logger.info('OTP verified successfully', {
      email: normalizedEmail.replace(/(.{2}).*(@.*)/, '$1***$2')
    });

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      reset_token: await createPasswordResetToken(normalizedEmail),
    });
  } catch (error: any) {
    logger.error('Error in verify-otp', { error: error?.message });
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
