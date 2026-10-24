import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { OAUTH_STATE_COOKIE, OAUTH_STATE_MAX_AGE } from '@/lib/oauth-state';
import { safeRedirectPath } from '@/lib/utils/safe-redirect';

function getAppOrigin(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return `http://${host || 'localhost:3000'}`;
  }
  return 'https://markaztikrar.id';
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Google Client ID not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const next = safeRedirectPath(searchParams.get('next'));
  const origin = getAppOrigin(request);

  // The nonce cookie is host-only, so it must be set on the same host Google redirects
  // back to (e.g. apex vs. www). Bounce to that host first if we're on another one
  // (only once, in case the proxy doesn't forward the public Host header).
  const requestHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (requestHost && requestHost !== new URL(origin).host && !searchParams.has('h')) {
    return NextResponse.redirect(`${origin}/api/auth/google?h=1&next=${encodeURIComponent(next)}`);
  }

  // CSRF protection: random nonce in an httpOnly cookie, echoed back by Google in `state`
  const nonce = randomBytes(32).toString('base64url');
  const state = Buffer.from(JSON.stringify({ next, nonce })).toString('base64url');

  const redirectUri = `${origin}/auth/callback`;
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('prompt', 'consent');
  googleAuthUrl.searchParams.set('state', state);

  console.log('[Google Auth Initiator] Redirecting to Google with redirect_uri:', redirectUri);

  const response = NextResponse.redirect(googleAuthUrl.toString());
  response.cookies.set(OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: OAUTH_STATE_MAX_AGE,
  });
  return response;
}
