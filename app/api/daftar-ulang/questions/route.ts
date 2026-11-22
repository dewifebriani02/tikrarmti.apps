import { NextResponse } from 'next/server';
import { getReregistrationQuestionsImpl } from '@/lib/daftar-ulang/daftar-ulang-service';

export async function GET() {
  try {
    const result = await getReregistrationQuestionsImpl();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    console.error('[API /api/daftar-ulang/questions GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memuat pertanyaan daftar ulang.' },
      { status: 500 }
    );
  }
}
