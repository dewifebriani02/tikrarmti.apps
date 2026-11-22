import { NextRequest, NextResponse } from 'next/server';
import { uploadAkadImpl } from '@/lib/daftar-ulang/daftar-ulang-service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const result = await uploadAkadImpl(formData);
    const status = result.success
      ? 200
      : result.error?.includes('Unauthorized')
        ? 401
        : 400;
    return NextResponse.json(result, { status });
  } catch (error: any) {
    console.error('[API /api/daftar-ulang/upload-akad POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal mengupload file akad.' },
      { status: 500 }
    );
  }
}
