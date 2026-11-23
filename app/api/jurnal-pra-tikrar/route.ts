import { NextRequest, NextResponse } from 'next/server';
import {
  getPraTikrarContextImpl,
  savePraTikrarDailyEntryImpl,
} from '@/lib/pra-tikrar-service';

export async function GET() {
  try {
    const result = await getPraTikrarContextImpl();
    const status = result.success
      ? 200
      : result.error?.includes('Unauthorized')
        ? 401
        : 500;
    return NextResponse.json(result, { status });
  } catch (error: any) {
    console.error('[API /api/jurnal-pra-tikrar GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memuat data Pra-Tikrar.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Data jurnal Pra-Tikrar tidak valid.' },
        { status: 400 }
      );
    }

    const result = await savePraTikrarDailyEntryImpl(body);
    const status = result.success
      ? 200
      : result.error?.includes('Unauthorized')
        ? 401
        : 400;
    return NextResponse.json(result, { status });
  } catch (error: any) {
    console.error('[API /api/jurnal-pra-tikrar POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal menyimpan jurnal Pra-Tikrar.' },
      { status: 500 }
    );
  }
}
