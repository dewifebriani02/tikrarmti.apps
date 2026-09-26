import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger-secure';
import { sendEmail } from '@/lib/email';
import { authRateLimit, checkRateLimit, getClientIP } from '@/lib/rate-limiter';

const OTP_TTL_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;

const GENERIC_RESPONSE = {
  success: true,
  message: 'Jika email terdaftar, kode reset password telah dikirim ke email Ukhti.',
};

/**
 * Step 1 of password reset: generate an OTP server-side and email it.
 * The response never reveals whether the email is registered.
 */
export async function POST(request: NextRequest) {
  try {
    const rate = await checkRateLimit(`otp-request:${getClientIP(request)}`, authRateLimit, '/api/auth/request-otp');
    if (!rate.success) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi nanti.' }, { status: 429 });
    }

    const { email } = await request.json();
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const maskedEmail = normalizedEmail.replace(/(.{2}).*(@.*)/, '$1***$2');

    const { rows: users } = await query(
      'SELECT id, full_name FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [normalizedEmail]
    );
    if (users.length === 0) {
      logger.info('OTP requested for unknown email', { email: maskedEmail });
      return NextResponse.json(GENERIC_RESPONSE);
    }

    // Per-email cooldown so the endpoint can't be used to spam an inbox
    const { rows: recent } = await query(
      `SELECT 1 FROM password_reset_otps
        WHERE email = $1 AND used = false AND created_at > NOW() - make_interval(secs => $2)
        LIMIT 1`,
      [normalizedEmail, RESEND_COOLDOWN_SECONDS]
    );
    if (recent.length > 0) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');

    // Only one active code per email
    await query('UPDATE password_reset_otps SET used = true WHERE email = $1 AND used = false', [normalizedEmail]);
    await query(
      `INSERT INTO password_reset_otps (email, code, expires_at)
       VALUES ($1, $2, NOW() + make_interval(mins => $3))`,
      [normalizedEmail, code, OTP_TTL_MINUTES]
    );

    const formattedCode = `${code.slice(0, 3)} ${code.slice(3)}`;
    const name = users[0].full_name || 'Ukhti';
    const sent = await sendEmail({
      to: normalizedEmail,
      subject: 'Kode Reset Password - Markaz Tikrar Indonesia',
      text: `Assalamu'alaikum ${name},\n\nKode reset password Ukhti: ${formattedCode}\nBerlaku ${OTP_TTL_MINUTES} menit. Abaikan email ini jika Ukhti tidak meminta reset password.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <p>Assalamu'alaikum ${escapeHtml(name)},</p>
          <p>Kode reset password Ukhti:</p>
          <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #15803d;">${formattedCode}</p>
          <p>Kode berlaku ${OTP_TTL_MINUTES} menit.</p>
          <p style="color: #6b7280; font-size: 13px;">Abaikan email ini jika Ukhti tidak meminta reset password.</p>
        </div>`,
    });

    logger.info('Password reset OTP issued', { email: maskedEmail, emailSent: sent });

    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ ...GENERIC_RESPONSE, developmentCode: code });
    }
    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error: any) {
    logger.error('Error in request-otp', { error: error?.message });
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
