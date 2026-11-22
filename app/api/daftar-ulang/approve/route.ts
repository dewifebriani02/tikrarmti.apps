import { NextRequest, NextResponse } from 'next/server';
import { approveDaftarUlangSubmissionImpl } from '@/lib/daftar-ulang/daftar-ulang-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { submissionId } = body || {};

    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: 'Submission ID wajib diisi.' },
        { status: 400 }
      );
    }

    const result = await approveDaftarUlangSubmissionImpl(submissionId);
    const status = result.success
      ? 200
      : result.error?.includes('Unauthorized')
        ? 401
        : result.error?.includes('akses')
          ? 403
          : 400;
    return NextResponse.json(result, { status });
  } catch (error: any) {
    console.error('[API /api/daftar-ulang/approve POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal menyetujui pendaftaran.' },
      { status: 500 }
    );
  }
}
