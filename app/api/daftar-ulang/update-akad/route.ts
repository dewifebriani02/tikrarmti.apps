import { NextRequest, NextResponse } from 'next/server';
import { updateAkadFilesImpl } from '@/lib/daftar-ulang/daftar-ulang-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { registrationId, akadFiles } = body || {};

    if (!registrationId || !Array.isArray(akadFiles)) {
      return NextResponse.json(
        { success: false, error: 'Data file akad tidak valid.' },
        { status: 400 }
      );
    }

    const result = await updateAkadFilesImpl(registrationId, akadFiles);
    const status = result.success
      ? 200
      : result.error?.includes('Unauthorized')
        ? 401
        : 400;
    return NextResponse.json(result, { status });
  } catch (error: any) {
    console.error('[API /api/daftar-ulang/update-akad POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memperbarui file akad.' },
      { status: 500 }
    );
  }
}
