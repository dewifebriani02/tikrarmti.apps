import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationContext } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { createSupabaseAdmin } from '@/lib/supabase';
import { submitMuallimahRegistrationImpl } from '@/lib/pendaftaran/registration-service';
import {
  getRegistrationEditHistory,
  resolveBatchEditPhase,
} from '@/lib/pendaftaran/edit-history';

export async function GET(request: NextRequest) {
  try {
    const response = new NextResponse();
    const auth = await getAuthorizationContext({ response });
    if (!auth) return ApiResponses.unauthorized();

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batch_id');
    const supabaseAdmin = createSupabaseAdmin();

    const { data: profile } = await supabaseAdmin
      .from('muallimah_registrations')
      .select('*')
      .eq('user_id', auth.userId)
      .maybeSingle();

    let akadQuery = supabaseAdmin
      .from('muallimah_akads')
      .select('*')
      .eq('user_id', auth.userId);
    if (batchId) {
      akadQuery = akadQuery.eq('batch_id', batchId);
    } else {
      akadQuery = akadQuery.order('created_at', { ascending: false }).limit(1);
    }
    const { data: akad } = await akadQuery.maybeSingle();

    const targetBatchId = batchId || akad?.batch_id || profile?.batch_id || null;
    const entityId = akad?.id || profile?.id || null;

    const [editPhase, history] = await Promise.all([
      resolveBatchEditPhase({
        userId: auth.userId,
        batchId: targetBatchId,
        isMuallimah: true,
      }),
      entityId ? getRegistrationEditHistory('muallimah', entityId) : Promise.resolve([]),
    ]);

    return ApiResponses.success({
      profile: profile || null,
      akad: akad || null,
      editPhase,
      history,
    });
  } catch (error: any) {
    console.error('[API /api/pendaftaran/muallimah GET] Error:', error);
    return ApiResponses.serverError(error?.message || 'Gagal memuat data pendaftaran Muallimah');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formData, userData, user, batchId, editReason } = body || {};

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
      batchId,
      typeof editReason === 'string' ? editReason : undefined
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
