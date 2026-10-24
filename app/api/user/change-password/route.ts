import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, changeUserPassword, verifyPassword, createSessionToken, setSessionCookie } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { authRateLimit, checkRateLimit } from '@/lib/rate-limiter';

/**
 * POST /api/user/change-password
 * Handles user password change and clears must_change_password flag
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Sesi tidak valid atau telah berakhir. Silakan login kembali.' },
        { status: 401 }
      );
    }

    const rate = await checkRateLimit(`change-password:${user.id}`, authRateLimit, '/api/user/change-password');
    if (!rate.success) {
      return NextResponse.json(
        { success: false, error: 'Terlalu banyak percobaan. Silakan coba lagi beberapa menit lagi.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { currentPassword, newPassword } = body;

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Password baru wajib diisi' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password baru minimal 6 karakter' },
        { status: 400 }
      );
    }

    if (newPassword === 'MTI123!') {
      return NextResponse.json(
        { success: false, error: 'Password baru tidak boleh menggunakan password default (MTI123!). Silakan gunakan password pribadi yang aman.' },
        { status: 400 }
      );
    }

    // Voluntary change (not a forced reset): the current password is always required.
    // getCurrentUser() never selects password_hash, so read it here.
    // Accounts without a password yet (e.g. Google-only) may set their first one.
    if (!user.must_change_password) {
      const row = await queryOne<{ password_hash: string | null }>(
        'SELECT password_hash FROM users WHERE id = $1',
        [user.id]
      );
      const hasPassword = !!row?.password_hash;
      const isValid = !hasPassword || (
        typeof currentPassword === 'string' &&
        await verifyPassword(currentPassword, row?.password_hash)
      );
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Password lama tidak sesuai' },
          { status: 400 }
        );
      }
    }

    // Update password in database and clear must_change_password flag
    const updatedUser = await changeUserPassword(user.id, newPassword);

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'Gagal memperbarui password di database' },
        { status: 500 }
      );
    }

    // Generate fresh session token with must_change_password = false
    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      roles: user.roles || (user.role ? [user.role] : ['thalibah']),
      must_change_password: false,
      sv: updatedUser.session_version,
    });

    await setSessionCookie(token, true);

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diperbarui!',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        must_change_password: false
      }
    });

  } catch (error: any) {
    console.error('[API /api/user/change-password] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan sistem saat memperbarui password' },
      { status: 500 }
    );
  }
}
