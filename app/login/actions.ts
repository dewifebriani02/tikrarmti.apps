'use server'

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import {
  authRateLimit,
  checkRateLimit,
  getClientIPFromHeaders,
  loginEmailRateLimit,
  LOGIN_EMAIL_LIMIT,
  resetRateLimit,
} from '@/lib/rate-limiter';
import {
  loginWithEmailPassword,
  createSessionToken,
  setSessionCookie
} from '@/lib/auth';

export async function loginAction(formData: {
  email: string;
  password: string;
  rememberMe?: boolean;
}) {
  try {
    const cleanEmail = formData.email?.toLowerCase().trim();
    const password = formData.password;

    if (!cleanEmail || !password) {
      return { success: false, error: 'Email dan password harus diisi' };
    }

    // Rate limit per IP and per account before touching the password hash
    const ip = getClientIPFromHeaders(await headers());
    const [ipRate, emailRate] = await Promise.all([
      checkRateLimit(`login-ip:${ip}`, authRateLimit, 'loginAction'),
      checkRateLimit(`login-email:${cleanEmail}`, loginEmailRateLimit, 'loginAction', LOGIN_EMAIL_LIMIT),
    ]);
    if (!ipRate.success || !emailRate.success) {
      return {
        success: false,
        error: 'Terlalu banyak percobaan login. Silakan tunggu beberapa menit lalu coba lagi.'
      };
    }

    const authResult = await loginWithEmailPassword(cleanEmail, password);

    if (!authResult.success || !authResult.user) {
      return {
        success: false,
        error: authResult.error || 'Email atau password salah. Silakan periksa kembali.'
      };
    }

    const user = authResult.user;

    // Successful login: clear this account's failed-attempt counter
    await resetRateLimit(`login-email:${cleanEmail}`, loginEmailRateLimit, LOGIN_EMAIL_LIMIT);

    // Generate signed JWT session token
    const token = await createSessionToken(
      {
        sub: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        roles: user.roles || (user.role ? [user.role] : ['thalibah']),
        must_change_password: !!user.must_change_password,
        sv: user.session_version,
      },
      formData.rememberMe !== false
    );

    // Set secure HTTP-only cookie
    await setSessionCookie(token, formData.rememberMe !== false);

    revalidatePath('/dashboard');
    return {
      success: true,
      mustChangePassword: !!user.must_change_password,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        roles: user.roles,
        must_change_password: !!user.must_change_password,
      }
    };
  } catch (error: any) {
    console.error('[loginAction] Error during login:', error);
    return {
      success: false,
      error: 'Terjadi kesalahan sistem saat memproses login. Silakan coba lagi.'
    };
  }
}

export async function logoutAction() {
  try {
    const { clearSessionCookie } = await import('@/lib/auth');
    await clearSessionCookie();
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('[logoutAction] Error during logout:', error);
    return { success: false };
  }
}

