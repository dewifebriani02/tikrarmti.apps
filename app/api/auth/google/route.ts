import { NextRequest, NextResponse } from 'next/server';

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
  const next = searchParams.get('next') || '/dashboard';
  const origin = getAppOrigin(request);

  // State parameter to pass redirect path securely
  const state = Buffer.from(JSON.stringify({ next })).toString('base64url');

  const redirectUri = `${origin}/auth/callback`;
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'consent');
  googleAuthUrl.searchParams.set('state', state);

  console.log('[Google Auth Initiator] Redirecting to Google with redirect_uri:', redirectUri);

  return NextResponse.redirect(googleAuthUrl.toString());
}
