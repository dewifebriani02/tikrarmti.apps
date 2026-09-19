import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, changeUserPassword, verifyPassword, createSessionToken, setSessionCookie } from '@/lib/auth';

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

    // If voluntary change (not forced reset) and currentPassword provided, verify current password
    if (!user.must_change_password && currentPassword) {
      const isValid = await verifyPassword(currentPassword, user.password_hash);
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
      { success: false, error: error.message || 'Terjadi kesalahan sistem saat memperbarui password' },
      { status: 500 }
    );
  }
}
