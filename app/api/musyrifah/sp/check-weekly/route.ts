import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { evaluateWeeklyJurnalSP } from '@/lib/services/sp-evaluation';
import { requireAnyRole, getAuthorizationContext } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';

// =====================================================
// GET - Preview SP evaluation for a given week & batch
// =====================================================
export async function GET(request: Request) {
  try {
    const authError = await requireAnyRole(['admin', 'musyrifah']);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batch_id') || undefined;
    const weekNumber = searchParams.get('week_number') ? parseInt(searchParams.get('week_number')!, 10) : undefined;

    const result = await evaluateWeeklyJurnalSP({
      batchId,
      weekNumber,
      execute: false,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in SP check-weekly GET:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// =====================================================
// POST - Trigger execution & issue SPs for weekly evaluation
// =====================================================
export async function POST(request: Request) {
  try {
    const authError = await requireAnyRole(['admin', 'musyrifah']);
    if (authError) return authError;

    const context = await getAuthorizationContext();
    if (!context) return ApiResponses.unauthorized('Unable to get authorization context');

    const body = await request.json().catch(() => ({}));
    const batchId = body.batch_id || undefined;
    const weekNumber = body.week_number ? parseInt(String(body.week_number), 10) : undefined;
    const execute = body.execute !== false; // default true for POST
    const issuedAtDate = body.issued_at || undefined;

    const result = await evaluateWeeklyJurnalSP({
      batchId,
      weekNumber,
      execute,
      issuedByUserId: context.userId,
      issuedAtDate,
    });

    return NextResponse.json({
      success: true,
      message: execute
        ? `Berhasil mengevaluasi dan menerbitkan ${result.issued_sp_count || 0} SP untuk Pekan ${result.target_week}.`
        : `Evaluasi selesai (Preview mode).`,
      ...result,
    });
  } catch (error: any) {
    console.error('Error in SP check-weekly POST:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
