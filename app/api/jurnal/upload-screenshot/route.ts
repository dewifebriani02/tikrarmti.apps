import { NextRequest, NextResponse } from 'next/server';
import { uploadJurnalScreenshotImpl } from '@/lib/jurnal/jurnal-service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const result = await uploadJurnalScreenshotImpl(formData);
    const status = result.success
      ? 200
      : result.error?.includes('Unauthorized')
        ? 401
        : 400;
    return NextResponse.json(result, { status });
  } catch (error: any) {
    console.error('[API /api/jurnal/upload-screenshot POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal mengupload screenshot.' },
      { status: 500 }
    );
  }
}
