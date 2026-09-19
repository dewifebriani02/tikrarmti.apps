'use server'

import { revalidatePath } from 'next/cache';
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

    const authResult = await loginWithEmailPassword(cleanEmail, password);

    if (!authResult.success || !authResult.user) {
      return {
        success: false,
        error: authResult.error || 'Email atau password salah. Silakan periksa kembali.'
      };
    }

    const user = authResult.user;

    // Generate signed JWT session token
    const token = await createSessionToken(
      {
        sub: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        roles: user.roles || (user.role ? [user.role] : ['thalibah']),
        must_change_password: !!user.must_change_password,
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

