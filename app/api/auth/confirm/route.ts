import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger-secure';

/**
 * Auth Confirm route — previously used Supabase OTP verification.
 * Now returns a legacy-compatible response since email confirmation
 * is handled natively (no Supabase auth dependency).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const type = searchParams.get('type');

    if (!token) {
      return NextResponse.json(
        { error: 'Token konfirmasi diperlukan' },
        { status: 400 }
      );
    }

    // Native auth does not use Supabase OTP tokens — redirect to login
    logger.info('Auth confirm called (legacy Supabase route)', { type });

    return NextResponse.json({
      success: true,
      message: 'Silakan login dengan akun Ukhti untuk melanjutkan.'
    });

  } catch (error) {
    logger.error('Error in confirmation', { error: error as Error });
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat konfirmasi' },
      { status: 500 }
    );
  }
}