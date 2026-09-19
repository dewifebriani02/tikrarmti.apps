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

    // Delete mti_session on response
    response.cookies.delete(SESSION_COOKIE_NAME);
    if (domain) {
      response.cookies.set(SESSION_COOKIE_NAME, '', { domain, maxAge: 0, path: '/' });
    }

    // Also clear any legacy Supabase cookies to keep browser state pristine
    for (const cookie of allCookies) {
      const name = cookie.name;
      if (name.startsWith('sb-') || name.includes('supabase') || name === SESSION_COOKIE_NAME) {
        response.cookies.delete(name);
        if (domain) {
          response.cookies.set(name, '', { domain, maxAge: 0, path: '/' });
        }
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
