import { NextRequest, NextResponse } from 'next/server';
import { submitDaftarUlangImpl } from '@/lib/daftar-ulang/daftar-ulang-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { registrationId, data } = body || {};

    if (!registrationId || !data || typeof data !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Data daftar ulang tidak valid.' },
        { status: 400 }
      );
    }

    const result = await submitDaftarUlangImpl(registrationId, data);
    const status = result.success
      ? 200
      : result.error?.includes('Unauthorized')
        ? 401
        : 400;
    return NextResponse.json(result, { status });
  } catch (error: any) {
    console.error('[API /api/daftar-ulang/submit POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal mengirim daftar ulang.' },
      { status: 500 }
    );
  }
}
