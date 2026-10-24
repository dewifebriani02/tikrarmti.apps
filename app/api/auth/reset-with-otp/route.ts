import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { changeUserPassword, verifyPasswordResetToken } from '@/lib/auth';
import { logger } from '@/lib/logger-secure';

/**
 * Step 3 of password reset: set a new password. The target account comes
 * only from the signed reset token issued by /api/auth/verify-otp.
 */
export async function POST(request: NextRequest) {
  try {
    const { reset_token, new_password } = await request.json();

    if (!reset_token || !new_password) {
      return NextResponse.json({ error: 'Token reset dan password baru diperlukan' }, { status: 400 });
    }

    if (typeof new_password !== 'string' || new_password.length < 8) {
      return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 });
    }

    const verified = await verifyPasswordResetToken(reset_token);
    if (!verified) {
      return NextResponse.json(
        { error: 'Sesi reset password tidak valid atau kadaluarsa. Silakan ulangi dari awal.' },
        { status: 401 }
      );
    }
    const { email, otpId } = verified;

    // Consume the token atomically — a reset token can change the password only once
    const consumed = await queryOne<{ id: string }>(
      `UPDATE password_reset_otps SET reset_token_used_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND email = $2 AND reset_token_used_at IS NULL
        RETURNING id`,
      [otpId, email]
    );
    if (!consumed) {
      return NextResponse.json(
        { error: 'Sesi reset password sudah digunakan. Silakan ulangi dari awal.' },
        { status: 401 }
      );
    }

    const user = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [email]
    );
    if (!user) {
      return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
    }

    await changeUserPassword(user.id, new_password);

    logger.info('Password reset successfully via OTP', {
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2')
    });

    return NextResponse.json({ success: true, message: 'Password berhasil direset' });
  } catch (error: any) {
    logger.error('Error in reset-with-otp', { error: error?.message });
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
