'use server'

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getClientIPFromHeaders } from '@/lib/rate-limiter';
import { setSessionCookie, clearSessionCookie } from '@/lib/auth';
import { loginWithEmailPasswordService } from '@/lib/auth-login-service';

export async function loginAction(formData: {
  email: string;
  password: string;
  rememberMe?: boolean;
}) {
  const ip = getClientIPFromHeaders(await headers());
  const result = await loginWithEmailPasswordService(formData, ip);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  await setSessionCookie(result.token, result.rememberMe);

  return {
    success: true,
    mustChangePassword: result.mustChangePassword,
    user: result.user,
  };
}

export async function logoutAction() {
  try {
    await clearSessionCookie();
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('[logoutAction] Error during logout:', error);
    return { success: false };
  }
}
