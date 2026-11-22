import { NextRequest, NextResponse } from 'next/server';
import { getClientIP } from '@/lib/rate-limiter';
import { SESSION_COOKIE_NAME } from '@/lib/auth';
import { loginWithEmailPasswordService } from '@/lib/auth-login-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Permintaan login tidak valid.' },
        { status: 400 }
      );
    }

    const clientIp = getClientIP(request);
    const result = await loginWithEmailPasswordService(
      {
        email: body.email,
        password: body.password,
        rememberMe: body.rememberMe,
      },
      clientIp
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.statusCode || 401 }
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        mustChangePassword: result.mustChangePassword,
        user: result.user,
      },
      { status: 200 }
    );

    const maxAge = result.rememberMe ? 60 * 60 * 24 * 365 : 60 * 60 * 24 * 7;
    response.cookies.set(SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return response;
  } catch (error: any) {
    console.error('[API /api/auth/login POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan sistem saat memproses login. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
