import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createPasswordResetToken } from '@/lib/auth';
import { logger } from '@/lib/logger-secure';
import { authRateLimit, checkRateLimit, getClientIP } from '@/lib/rate-limiter';

const MAX_FAILED_ATTEMPTS = 5;

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

    // Atomically consume the code so it can't be used twice
    const { rows } = await query(
      `UPDATE password_reset_otps SET used = true, updated_at = NOW()
        WHERE email = $1 AND code = $2 AND used = false AND expires_at > NOW()
        RETURNING id`,
      [normalizedEmail, code.replace(/\s/g, '')]
    );

    if (rows.length === 0) {
      // Brute-force guard: burn the active code after too many wrong guesses
      const { rows: [active] } = await query(
        `UPDATE password_reset_otps SET failed_attempts = failed_attempts + 1,
                used = (failed_attempts + 1 >= $2), updated_at = NOW()
          WHERE email = $1 AND used = false AND expires_at > NOW()
          RETURNING used`,
        [normalizedEmail, MAX_FAILED_ATTEMPTS]
      );
      const locked = active?.used === true;
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
