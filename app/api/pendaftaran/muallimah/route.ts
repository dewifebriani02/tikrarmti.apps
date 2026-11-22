import { NextRequest, NextResponse } from 'next/server';
import { submitMuallimahRegistrationImpl } from '@/lib/pendaftaran/registration-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formData, userData, user, batchId } = body || {};

    if (!formData || typeof formData !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Data formulir tidak valid.' },
        { status: 400 }
      );
    }

    const result = await submitMuallimahRegistrationImpl(
      formData,
      userData,
      user,
      batchId
    );

    const statusCode = result.success ? 200 : (result.statusCode || 400);
    return NextResponse.json(result, { status: statusCode });
  } catch (error: any) {
    console.error('[API /api/pendaftaran/muallimah POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Terjadi kesalahan saat mengirim formulir.' },
      { status: 500 }
    );
  }
}
