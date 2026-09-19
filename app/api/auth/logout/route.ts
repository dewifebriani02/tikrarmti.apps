import { NextResponse } from 'next/server';
import { clearSessionCookie, SESSION_COOKIE_NAME, getCookieDomain } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    await clearSessionCookie();

    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    const domain = getCookieDomain();

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
      redirect: '/login'
    });

    // Delete mti_session on response across all domain scopes
    response.cookies.delete(SESSION_COOKIE_NAME);
    response.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/' });
    response.cookies.set(SESSION_COOKIE_NAME, '', { domain: '.markaztikrar.id', maxAge: 0, path: '/' });
    response.cookies.set(SESSION_COOKIE_NAME, '', { domain: 'markaztikrar.id', maxAge: 0, path: '/' });

    // Also clear any legacy cookies to keep browser state pristine
    for (const cookie of allCookies) {
      const name = cookie.name;
      response.cookies.delete(name);
      response.cookies.set(name, '', { maxAge: 0, path: '/' });
      response.cookies.set(name, '', { domain: '.markaztikrar.id', maxAge: 0, path: '/' });
      response.cookies.set(name, '', { domain: 'markaztikrar.id', maxAge: 0, path: '/' });
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
