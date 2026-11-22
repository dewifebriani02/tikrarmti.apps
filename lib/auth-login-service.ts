import { revalidatePath } from 'next/cache';
import {
  authRateLimit,
  checkRateLimit,
  loginEmailRateLimit,
  LOGIN_EMAIL_LIMIT,
  resetRateLimit,
} from '@/lib/rate-limiter';
import {
  loginWithEmailPassword,
  createSessionToken,
} from '@/lib/auth';

export interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export async function loginWithEmailPasswordService(
  formData: LoginInput,
  clientIp: string
) {
  try {
    const cleanEmail = formData.email?.toLowerCase().trim();
    const password = formData.password;

    if (!cleanEmail || !password) {
      return {
        success: false as const,
        statusCode: 400,
        error: 'Email dan password harus diisi',
      };
    }

    // Rate limit per IP and per account before touching the password hash
    const [ipRate, emailRate] = await Promise.all([
      checkRateLimit(`login-ip:${clientIp}`, authRateLimit, 'api-auth-login'),
      checkRateLimit(
        `login-email:${cleanEmail}`,
        loginEmailRateLimit,
        'api-auth-login',
        LOGIN_EMAIL_LIMIT
      ),
    ]);
    if (!ipRate.success || !emailRate.success) {
      return {
        success: false as const,
        statusCode: 429,
        error: 'Terlalu banyak percobaan login. Silakan tunggu beberapa menit lalu coba lagi.',
      };
    }

    const authResult = await loginWithEmailPassword(cleanEmail, password);

    if (!authResult.success || !authResult.user) {
      return {
        success: false as const,
        statusCode: 401,
        error: authResult.error || 'Email atau password salah. Silakan periksa kembali.',
      };
    }

    const user = authResult.user;

    // Successful login: clear this account's failed-attempt counter
    await resetRateLimit(`login-email:${cleanEmail}`, loginEmailRateLimit, LOGIN_EMAIL_LIMIT);

    const rememberMe = formData.rememberMe !== false;

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
      rememberMe
    );

    try {
      revalidatePath('/dashboard');
    } catch {}

    return {
      success: true as const,
      statusCode: 200,
      token,
      rememberMe,
      mustChangePassword: !!user.must_change_password,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        roles: user.roles,
        must_change_password: !!user.must_change_password,
      },
    };
  } catch (error: any) {
    console.error('[loginWithEmailPasswordService] Error during login:', error);
    return {
      success: false as const,
      statusCode: 500,
      error: 'Terjadi kesalahan sistem saat memproses login. Silakan coba lagi.',
    };
  }
}
