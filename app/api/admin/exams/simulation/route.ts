import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getAuthorizationContext, hasAnyRole } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';

const supabaseAdmin = createSupabaseAdmin();

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthorizationContext();
    if (!authContext) {
      return ApiResponses.unauthorized('Authentication required');
    }

    // Role check: admin, superadmin, or musyrifah
    const allowedRoles = ['admin', 'superadmin', 'musyrifah'] as any[];
    if (!hasAnyRole(authContext, allowedRoles)) {
      return ApiResponses.forbidden('Hanya Admin dan Musyrifah yang dapat mengakses simulasi ujian.');
    }

    const { searchParams } = new URL(request.url);
    const juzParam = searchParams.get('juz');
    const packageParam = searchParams.get('package'); // 'all', 'A', 'B'
    const sectionParam = searchParams.get('section'); // 1..7 or 'all'

    // Fetch all active questions for the requested juz
    let query = supabaseAdmin
      .from('exam_questions')
      .select('id, juz_number, juz_code, question_text, question_type, options, correct_answer, points, section_number, section_title, question_package, question_number, is_active')
      .eq('is_active', true)
      .order('section_number', { ascending: true })
      .order('question_number', { ascending: true });

    if (juzParam && juzParam !== 'all') {
      query = query.eq('juz_number', parseInt(juzParam, 10));
    }

    if (packageParam && packageParam !== 'all') {
      query = query.eq('question_package', packageParam);
    }

    if (sectionParam && sectionParam !== 'all') {
      query = query.eq('section_number', parseInt(sectionParam, 10));
    }

    const { data: questions, error } = await query;

    if (error) {
      console.error('[EXAM SIMULATION API] Error fetching questions:', error);
      return NextResponse.json({ error: 'Gagal mengambil bank soal', details: error.message }, { status: 500 });
    }

    // Also get summary count per juz
    const { data: allSummary } = await supabaseAdmin
      .from('exam_questions')
      .select('juz_number, question_package, is_active');

    const summaryByJuz: Record<number, { total: number; active: number; packageA: number; packageB: number }> = {};
    for (let j = 1; j <= 30; j++) {
      summaryByJuz[j] = { total: 0, active: 0, packageA: 0, packageB: 0 };
    }

    allSummary?.forEach((row) => {
      const j = row.juz_number;
      if (!summaryByJuz[j]) {
        summaryByJuz[j] = { total: 0, active: 0, packageA: 0, packageB: 0 };
      }
      summaryByJuz[j].total += 1;
      if (row.is_active) summaryByJuz[j].active += 1;
      if (row.question_package === 'A') summaryByJuz[j].packageA += 1;
      if (row.question_package === 'B') summaryByJuz[j].packageB += 1;
    });

    return NextResponse.json({
      success: true,
      data: questions || [],
      total: questions?.length || 0,
      summaryByJuz,
    });
  } catch (err: any) {
    console.error('[EXAM SIMULATION API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
  }
}
