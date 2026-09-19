import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

const SESSION_COOKIE_NAME = 'mti_session';
const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'mti-markaz-tikrar-indonesia-secure-secret-key-2026'
);

/** Allowed origins for state-changing API requests (CSRF protection) in Production. */
const ALLOWED_ORIGINS_PROD = ['https://markaztikrar.id', 'https://www.markaztikrar.id'];

/**
 * Validates the Origin header for mutating API requests to prevent CSRF.
 */
function isCsrfViolation(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return false;
  if (!request.nextUrl.pathname.startsWith('/api/')) return false;

  const origin = request.headers.get('origin');
  if (!origin) return false;

  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
  const expectedOrigin = `${protocol}://${host}`;

  if (origin === expectedOrigin || origin === `http://${host}` || origin === `https://${host}`) {
    return false;
  }

  if (process.env.NODE_ENV === 'production') {
    return !ALLOWED_ORIGINS_PROD.includes(origin);
  } else {
    return !origin.startsWith('http://localhost:') && !origin.startsWith('http://127.0.0.1:');
  }
}

/**
 * Updates the user's session and handles cookie persistence.
 */
export async function updateSession(request: NextRequest) {
  // CSRF check
  if (isCsrfViolation(request)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  }

  // Security headers helper
  const applySecurityHeaders = (res: NextResponse) => {
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    if (process.env.NODE_ENV === 'production') {
      res.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(self)');
      res.headers.set('X-DNS-Prefetch-Control', 'off');
      res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

      res.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.google.com https://*.gstatic.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "img-src 'self' blob: data: https: https://*.googleusercontent.com; " +
        "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com; " +
        "connect-src 'self' http://localhost:* https://markaztikrar.id https://www.markaztikrar.id https://*.sentry.io https://*.google-analytics.com https://api.aladhan.com https://api.bigdatacloud.net https://ipapi.co https://accounts.google.com https://oauth2.googleapis.com; " +
        "media-src 'self' blob:; " +
        "frame-src 'self' https://*.google.com;"
      );
    }

    return res;
  };

  try {
    // SKIP session check for auth endpoints and static routes
    if (request.nextUrl.pathname.startsWith('/auth/')) {
      const res = NextResponse.next({ request: { headers: request.headers } });
      return applySecurityHeaders(res);
    }

    const allCookies = request.cookies.getAll(SESSION_COOKIE_NAME);
    const response = NextResponse.next({ request: { headers: request.headers } });

    if (allCookies && allCookies.length > 0) {
      let latestPayload: any = null;
      let latestToken = '';
      let latestTimestamp = -1;

      for (const c of allCookies) {
        if (!c.value) continue;
        try {
          const { payload } = await jwtVerify(c.value, JWT_SECRET);
          const ts = Number(payload.iat_ms) || (Number(payload.iat) * 1000) || 0;
          if (ts > latestTimestamp) {
            latestTimestamp = ts;
            latestPayload = payload;
            latestToken = c.value;
          }
        } catch (jwtErr) {
          // Ignore invalid/expired token
        }
      }

      if (latestPayload) {
        // If the browser sent multiple duplicate cookies, purge the legacy domain versions
        if (allCookies.length > 1) {
          response.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/', domain: '.markaztikrar.id' });
          response.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/', domain: 'markaztikrar.id' });
          response.cookies.set(SESSION_COOKIE_NAME, latestToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 365,
          });
        }
      }
    }

    return applySecurityHeaders(response);
  } catch (err: any) {
    console.error('Middleware crash caught:', err?.message || err);
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
}
