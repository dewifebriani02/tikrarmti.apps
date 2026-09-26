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

    const email = await verifyPasswordResetToken(reset_token);
    if (!email) {
      return NextResponse.json(
        { error: 'Sesi reset password tidak valid atau kadaluarsa. Silakan ulangi dari awal.' },
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
