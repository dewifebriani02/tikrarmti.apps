import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger-secure';
import { query } from '@/lib/db';

/**
 * Password Reset — previously used Supabase signInWithOtp.
 * Password reset via native flow (send email if SMTP configured).
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email diperlukan' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists (do not reveal if not found)
    const { rows } = await query(
      'SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [normalizedEmail]
    );

    if (rows.length > 0) {
      // TODO: Implement native password reset email when SMTP is configured
      // For now, log the intent
      logger.info('Password reset requested', {
        email: normalizedEmail.replace(/(.{2}).*(@.*)/, '$1***$2')
      });
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'Jika email terdaftar, kode reset password akan dikirim ke email Ukhti.'
    });

  } catch (error) {
    logger.error('Error in password reset', { error });
    return NextResponse.json({
      success: true,
      message: 'Jika email terdaftar, kode reset password akan dikirim'
    });
  }
}
