import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  saveTashihRecordImpl,
  getJuzOptionImpl,
  getWeekTashihRecordsImpl,
  getPraTikrarHalaqahListImpl,
} from '@/lib/tashih/tashih-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Silakan login kembali.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'juz') {
      const code = searchParams.get('code') || '';
      const data = await getJuzOptionImpl(code);
      return NextResponse.json({ success: true, data });
    }

    if (action === 'records') {
      const batchId = searchParams.get('batch_id');
      const data = await getWeekTashihRecordsImpl(user.id, batchId);
      return NextResponse.json({ success: true, data });
    }

    if (action === 'pra-tikrar-halaqah') {
      const batchId = searchParams.get('batch_id');
      const data = await getPraTikrarHalaqahListImpl(batchId);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json(
      { success: false, error: 'Action tidak valid.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[API /api/tashih GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memuat data tashih.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Data tashih tidak valid.' },
        { status: 400 }
      );
    }

    const result = await saveTashihRecordImpl(body);
    const status = result.success
      ? 200
      : result.error?.includes('Unauthorized')
        ? 401
        : 400;
    return NextResponse.json(result, { status });
  } catch (error: any) {
    console.error('[API /api/tashih POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal menyimpan catatan tashih.' },
      { status: 500 }
    );
  }
}
