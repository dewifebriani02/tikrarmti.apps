import { NextRequest, NextResponse } from 'next/server';
import { saveJurnalRecordImpl } from '@/lib/jurnal/jurnal-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Data jurnal tidak valid.' },
        { status: 400 }
      );
    }

    const result = await saveJurnalRecordImpl(body);
    const status = result.success
      ? 200
      : result.error?.includes('Unauthorized')
        ? 401
        : 400;
    return NextResponse.json(result, { status });
  } catch (error: any) {
    console.error('[API /api/jurnal POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal menyimpan jurnal.' },
      { status: 500 }
    );
  }
}
