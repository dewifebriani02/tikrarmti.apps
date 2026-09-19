import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { queryOne, query } from '@/lib/db';
import { extractRoles, getPrimaryRole } from '@/lib/roles';

export const SESSION_COOKIE_NAME = 'mti_session';

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'mti-markaz-tikrar-indonesia-secure-secret-key-2026'
);

export interface UserSessionPayload {
  sub: string;
  email: string;
  full_name?: string;
  role?: string;
  roles?: string[];
  [key: string]: any;
}

/**
 * Compare plain password against bcrypt hash
 */
export async function verifyPassword(plain: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash || !plain) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch (error) {
    console.error('[Auth] Password compare error:', error);
    return false;
  }
}

/**
 * Hash a plain password with bcrypt
 */
export async function hashPassword(plain: string): Promise<string> {
  return await bcrypt.hash(plain, 10);
}

/**
 * Create a signed JWT session token
 */
export async function createSessionToken(
  payload: UserSessionPayload,
  rememberMe: boolean = true
): Promise<string> {
  const maxAge = rememberMe ? '365d' : '7d';
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(maxAge)
    .sign(JWT_SECRET);
}

/**
 * Verify a JWT session token
 */
export async function verifySessionToken(token: string): Promise<UserSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as UserSessionPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Determine cookie domain (e.g. .markaztikrar.id for production subdomains)
 */
export function getCookieDomain(): string | undefined {
  try {
    const headersList = headers();
    const host = headersList.get('host') || '';
    if (host.includes('markaztikrar.id') && !host.includes('localhost')) {
      return '.markaztikrar.id';
    }
  } catch (e) {
    // headers() might not be available in all contexts
  }
  return undefined;
}

/**
 * Set the authentication session cookie
 */
export async function setSessionCookie(token: string, rememberMe: boolean = true) {
  const cookieStore = cookies();
  const maxAge = rememberMe ? 60 * 60 * 24 * 365 : 60 * 60 * 24 * 7; // 1 year or 7 days
  const domain = getCookieDomain();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
    ...(domain ? { domain } : {}),
  });
}

/**
 * Clear the session cookie on logout
 */
export async function clearSessionCookie() {
  const cookieStore = cookies();
  const domain = getCookieDomain();

  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    ...(domain ? { domain } : {}),
  });
}

/**
 * Get current authenticated user from PostgreSQL database
 */
export async function getCurrentUser() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload || !payload.sub) return null;

  const user = await queryOne(
    `SELECT id, email, full_name, role, roles, avatar_url, is_active, is_blacklisted,
            whatsapp, telegram, negara, provinsi, kota, alamat, zona_waktu,
            tanggal_lahir, tempat_lahir, jenis_kelamin, pekerjaan, alasan_daftar, created_at
     FROM users WHERE id = $1`,
    [payload.sub]
  );

  if (!user || user.is_active === false || user.is_blacklisted === true) {
    return null;
  }

  return user;
}

/**
 * Authenticate user with email and password against PostgreSQL mti_db
 */
export async function loginWithEmailPassword(email: string, plainPassword: string) {
  const cleanEmail = email.toLowerCase().trim();

  const user = await queryOne(
    `SELECT id, email, password_hash, full_name, role, roles, is_active, is_blacklisted
     FROM users WHERE LOWER(email) = $1`,
    [cleanEmail]
  );

  if (!user) {
    return { success: false, error: 'Email atau password salah. Silakan periksa kembali.' };
  }

  if (user.is_blacklisted) {
    return { success: false, error: 'Akun ini telah di-blacklist. Silakan hubungi admin.' };
  }

  if (user.is_active === false) {
    return { success: false, error: 'Akun ini tidak aktif. Silakan hubungi admin.' };
  }

  if (!user.password_hash) {
    return { success: false, error: 'Akun belum memiliki password terdaftar. Silakan gunakan opsi Lupa Password atau masuk dengan Google.' };
  }

  const isMatch = await verifyPassword(plainPassword, user.password_hash);
  if (!isMatch) {
    return { success: false, error: 'Email atau password salah. Silakan periksa kembali.' };
  }

  return { success: true, user };
}

/**
 * Helper compatibility exports
 */
export async function registerWithEmail(email: string, password: string, name: string, role: string) {
  const hash = await hashPassword(password);
  const cleanEmail = email.toLowerCase().trim();
  const res = await queryOne(
    `INSERT INTO users (email, password_hash, full_name, role, roles, is_active)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING id, email, full_name, role, roles`,
    [cleanEmail, hash, name, role, [role]]
  );
  return { user: res };
}

export async function getUserById(userId: string) {
  return await queryOne('SELECT * FROM users WHERE id = $1', [userId]);
}

export async function updateUserData(userId: string, userData: Record<string, any>) {
  const fields = Object.keys(userData);
  if (fields.length === 0) return null;

  const setClauses = fields.map((field, idx) => `"${field}" = $${idx + 2}`).join(', ');
  const values = fields.map(field => userData[field]);

  const updated = await queryOne(
    `UPDATE users SET ${setClauses}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [userId, ...values]
  );
  return updated;
}

export async function logout() {
  await clearSessionCookie();
}
