import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated'
        },
        authenticated: false
      }, { status: 401 });
    }

    const userResponse = {
      id: user.id,
      email: user.email,
      full_name: user.full_name || user.email?.split('@')[0],
      nama_kunyah: user.nama_kunyah,
      roles: user.roles || (user.role ? [user.role] : ['thalibah']),
      role: user.role,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
      whatsapp: user.whatsapp,
      telegram: user.telegram,
      negara: user.negara,
      provinsi: user.provinsi,
      kota: user.kota,
      alamat: user.alamat,
      zona_waktu: user.zona_waktu,
      tanggal_lahir: user.tanggal_lahir,
      tempat_lahir: user.tempat_lahir,
      jenis_kelamin: user.jenis_kelamin,
      pekerjaan: user.pekerjaan,
      alasan_daftar: user.alasan_daftar,
    };

    return NextResponse.json({
      success: true,
      data: userResponse,
      user: userResponse,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    console.error('API error in /api/auth/me:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
