import { NextRequest, NextResponse } from 'next/server';
import { submitPraTikrarRegistrationImpl } from '@/lib/pendaftaran/registration-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      formData,
      userProfile,
      user,
      batch,
      isEditMode = false,
      existingRegistrationId,
      editReason,
    } = body || {};

    if (!formData || typeof formData !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Data formulir tidak valid.' },
        { status: 400 }
      );
    }

    const result = await submitPraTikrarRegistrationImpl(
      formData,
      userProfile,
      user,
      batch,
      Boolean(isEditMode),
      existingRegistrationId,
      typeof editReason === 'string' ? editReason : undefined
    );

    const statusCode = result.success ? 200 : (result.statusCode || 400);
    return NextResponse.json(result, { status: statusCode });
  } catch (error: any) {
    console.error('[API /api/pendaftaran/pra-tikrar POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Terjadi kesalahan saat mengirim formulir.' },
      { status: 500 }
    );
  }
}
