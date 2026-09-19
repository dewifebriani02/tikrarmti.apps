import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { createSessionToken, setSessionCookie } from '@/lib/auth';

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
  const { searchParams } = new URL(request.url);
  const origin = getAppOrigin(request);

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorMsg = searchParams.get('error');

  if (errorMsg) {
    console.error('[auth/callback] Google OAuth Error:', errorMsg);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Login Google dibatalkan atau gagal')}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Kode otentikasi Google tidak ditemukan')}`);
  }

  try {
    let nextPath = '/dashboard';
    if (state) {
      try {
        const parsedState = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
        if (parsedState?.next) {
          nextPath = parsedState.next;
        }
      } catch (e) {
        // Fallback to default dashboard
      }
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${origin}/auth/callback`;

    if (!clientId || !clientSecret) {
      console.error('[auth/callback] Missing Google OAuth credentials');
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Konfigurasi Google Auth belum lengkap')}`);
    }

    // 1. Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('[auth/callback] Token exchange failed:', tokenData);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('Gagal menukar token dengan Google: ' + (tokenData.error_description || tokenData.error || 'Unknown'))}`
      );
    }

    // 2. Fetch user profile from Google API
    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const googleUser = await userinfoResponse.json();

    if (!userinfoResponse.ok || !googleUser.email) {
      console.error('[auth/callback] Failed to get user profile from Google:', googleUser);
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Gagal mengambil data profil dari Google')}`);
    }

    const email = googleUser.email.toLowerCase().trim();

    // 3. Match user in PostgreSQL database (mti_db)
    const dbUser = await queryOne(
      `SELECT id, email, full_name, role, roles, avatar_url, is_active, is_blacklisted
       FROM users WHERE LOWER(email) = $1`,
      [email]
    );

    if (!dbUser) {
      console.warn('[auth/callback] Email not found in users table:', email);
      return NextResponse.redirect(
        `${origin}/login?message=not_registered&email=${encodeURIComponent(email)}`
      );
    }

    if (dbUser.is_blacklisted) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('Akun Ukhti telah di-blacklist. Silakan hubungi admin.')}`
      );
    }

    if (dbUser.is_active === false) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('Akun Ukhti dinonaktifkan. Silakan hubungi admin.')}`
      );
    }

    // If avatar is missing, update avatar from Google
    if (!dbUser.avatar_url && googleUser.picture) {
      try {
        await queryOne('UPDATE users SET avatar_url = $1 WHERE id = $2', [googleUser.picture, dbUser.id]);
      } catch (err) {
        // Non-critical, ignore
      }
    }

    // 4. Create signed session token and set session cookie
    const token = await createSessionToken(
      {
        sub: dbUser.id,
        email: dbUser.email,
        full_name: dbUser.full_name || googleUser.name,
        role: dbUser.role,
        roles: dbUser.roles || (dbUser.role ? [dbUser.role] : ['thalibah']),
      },
      true // Remember me true for Google login
    );

    await setSessionCookie(token, true);

    const redirectTarget = nextPath.startsWith('/') ? `${origin}${nextPath}` : `${origin}/dashboard`;
    console.log(`[auth/callback] Success Google login for ${email} -> Redirecting to ${redirectTarget}`);

    return NextResponse.redirect(redirectTarget);
  } catch (error: any) {
    console.error('[auth/callback] Exception during Google OAuth callback:', error);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Terjadi kesalahan saat memproses login Google')}`
    );
  }
}
