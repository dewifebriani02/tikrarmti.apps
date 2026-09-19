import { NextResponse } from 'next/server';
import { clearSessionCookie, SESSION_COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    await clearSessionCookie();

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
      redirect: '/login'
    });

    const isProd = process.env.NODE_ENV === 'production';
    const secureFlag = isProd ? '; Secure' : '';

    // Explicitly set deletion Set-Cookie headers for all scopes
    // 1. Host-only (how setSessionCookie sets it)
    response.headers.append(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag}`
    );
    // 2. Domain .markaztikrar.id
    response.headers.append(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=; Path=/; Domain=.markaztikrar.id; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag}`
    );
    // 3. Domain markaztikrar.id
    response.headers.append(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=; Path=/; Domain=markaztikrar.id; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag}`
    );

    // Also clear other possible cookies (sb-*, etc.)
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    for (const c of allCookies) {
      if (c.name !== SESSION_COOKIE_NAME) {
        response.headers.append(
          'Set-Cookie',
          `${c.name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag}`
        );
      }
    }

    return response;
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await clearSessionCookie();
    const response = NextResponse.redirect('https://markaztikrar.id/login');

    const isProd = process.env.NODE_ENV === 'production';
    const secureFlag = isProd ? '; Secure' : '';

    response.headers.append(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag}`
    );
    response.headers.append(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=; Path=/; Domain=.markaztikrar.id; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag}`
    );
    response.headers.append(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=; Path=/; Domain=markaztikrar.id; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag}`
    );

    return response;
  } catch (error) {
    console.error('Logout GET error:', error);
    return NextResponse.redirect('https://markaztikrar.id/login');
  }
}


