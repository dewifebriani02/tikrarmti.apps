import { NextRequest, NextResponse } from 'next/server';
import { submitPilihPasanganImpl } from '@/lib/pilih-pasangan/pilih-pasangan-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { registrationId, data } = body || {};

    if (!registrationId || !data || typeof data !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Data pilihan pasangan tidak valid.' },
        { status: 400 }
      );
    }

    const result = await submitPilihPasanganImpl(registrationId, data);
    const status = result.success
      ? 200
      : result.error?.includes('Unauthorized')
        ? 401
        : 400;
    return NextResponse.json(result, { status });
  } catch (error: any) {
    console.error('[API /api/pilih-pasangan/submit POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal menyimpan pilihan pasangan.' },
      { status: 500 }
    );
  }
}
