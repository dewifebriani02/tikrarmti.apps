import { NextRequest, NextResponse } from 'next/server';
import {
  getMuallimahRegistrationQuestionsImpl,
  getRegistrationQuestionsImpl,
} from '@/lib/pendaftaran/registration-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'tikrar';

    const result =
      type === 'muallimah'
        ? await getMuallimahRegistrationQuestionsImpl()
        : await getRegistrationQuestionsImpl();

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    console.error('[API /api/pendaftaran/questions GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memuat pertanyaan pendaftaran', data: null },
      { status: 500 }
    );
  }
}
