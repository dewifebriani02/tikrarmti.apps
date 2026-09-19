import { createSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin, getAuthorizationContext } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';

const supabaseAdmin = createSupabaseAdmin();

const getPassingScore = (batch?: { name?: string; min_exam_score?: number | null } | null): number => {
  if (!batch) return 70;
  if (batch.min_exam_score !== undefined && batch.min_exam_score !== null) return batch.min_exam_score;
  if (batch.name) {
    const match = batch.name.match(/Batch\s*(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 3) return 80;
    }
  }
  return 70;
};

/**
 * GET /api/admin/tikrar
 * 
 * Lists Tikrar registrations with enrichment and automated selection processing.
 */
export async function GET(request: Request) {
  try {
    // 1. Authorization check
    const authError = await requireAdmin();
    if (authError) return authError;

    const context = await getAuthorizationContext();
    if (!context) return ApiResponses.unauthorized();

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const skipCount = searchParams.get('skipCount') === 'true';
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.max(Math.min(parseInt(searchParams.get('limit') || '1000'), 1000), 1);
    const offset = (page - 1) * limit;
    const batchId = searchParams.get('batch_id');
    const status = searchParams.get('status');
    const selectionStatus = searchParams.get('selection_status');

    // 3. Fetch base registrations
    let query = supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select(`
        *,
        user:users!pendaftaran_tikrar_tahfidz_user_id_fkey(*),
        batch:batches(*),
        program:programs(*),
        daftar_ulang_submissions(status)
      `, { count: skipCount ? undefined : 'exact' })
      .order('submission_date', { ascending: false });

    if (batchId && batchId !== 'all' && batchId !== 'null' && batchId !== 'undefined') {
      query = query.eq('batch_id', batchId);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (selectionStatus && selectionStatus !== 'all') {
      query = query.eq('selection_status', selectionStatus);
    }

    if (!skipCount) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: rawData, error: fetchError, count } = await query;

    if (fetchError) {
      console.error('[Admin Tikrar API] Database error (GET):', fetchError);
      return ApiResponses.databaseError(fetchError);
    }

    if (!rawData || rawData.length === 0) {
      return ApiResponses.success([], 'No records found');
    }

    // 4. Enrichment: Fetch exam attempts for written scores
    const registrationIds = rawData.map((r: any) => r.id);
    const { data: examAttempts } = await supabaseAdmin
      .from('exam_attempts')
      .select('id, registration_id, score, status, submitted_at, created_at')
      .in('registration_id', registrationIds)
      .order('created_at', { ascending: false });

    const latestAttemptsMap = new Map();
    if (examAttempts) {
      for (const attempt of examAttempts) {
        if (!latestAttemptsMap.has(attempt.registration_id)) {
          latestAttemptsMap.set(attempt.registration_id, attempt);
        }
      }
    }

    let enrichedData = rawData.map((tikrar: any) => {
      const examAttempt = latestAttemptsMap.get(tikrar.id);
      return {
        ...tikrar,
        written_quiz_score: examAttempt?.score ?? tikrar.written_quiz_score,
        written_exam_submitted_at: examAttempt?.submitted_at ?? tikrar.written_exam_submitted_at,
        written_exam_status: examAttempt?.status ?? tikrar.written_exam_status,
      };
    });

    // 5. Automated Selection Processing (Lazy Updates based strictly on VN score)
    const updatesSelected: string[] = [];
    const updatesNotSelected: string[] = [];
    for (const tikrar of enrichedData) {
      const oralScore = tikrar.oral_total_score;
      if (oralScore !== null && oralScore !== undefined) {
        if (oralScore >= 80 && tikrar.selection_status === 'pending') {
          updatesSelected.push(tikrar.id);
        } else if (oralScore < 80 && tikrar.selection_status === 'pending') {
          updatesNotSelected.push(tikrar.id);
        }
      }
    }

    if (updatesSelected.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('pendaftaran_tikrar_tahfidz')
        .update({ selection_status: 'selected', status: 'approved' })
        .in('id', updatesSelected);

      if (!updateError) {
        enrichedData = enrichedData.map((item: any) => {
          if (updatesSelected.includes(item.id)) {
            return { ...item, selection_status: 'selected', status: 'approved' };
          }
          return item;
        });
      }
    }

    if (updatesNotSelected.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('pendaftaran_tikrar_tahfidz')
        .update({ selection_status: 'not_selected' })
        .in('id', updatesNotSelected);

      if (!updateError) {
        enrichedData = enrichedData.map((item: any) => {
          if (updatesNotSelected.includes(item.id)) {
            return { ...item, selection_status: 'not_selected' };
          }
          return item;
        });
      }
    }

    // 6. Detect duplicate registrations
    const batchIdsInPage = Array.from(new Set(enrichedData.map((d: any) => d.batch_id).filter(Boolean)));
    if (batchIdsInPage.length > 0) {
      const { data: allRegs } = await supabaseAdmin
        .from('pendaftaran_tikrar_tahfidz')
        .select('user_id, batch_id')
        .in('batch_id', batchIdsInPage);

      if (allRegs) {
        const counts: Record<string, number> = {};
        allRegs.forEach(reg => {
          if (reg.user_id && reg.batch_id) {
            const key = `${reg.user_id}_${reg.batch_id}`;
            counts[key] = (counts[key] || 0) + 1;
          }
        });

        enrichedData = enrichedData.map((item: any) => {
          if (item.user_id && item.batch_id) {
            const key = `${item.user_id}_${item.batch_id}`;
            return { ...item, is_duplicate: counts[key] > 1 };
          }
          return { ...item, is_duplicate: false };
        });
      }
    }

    // 7. Detect alumni status
    const userIds = Array.from(new Set(enrichedData.map((d: any) => d.user_id).filter(Boolean)));
    if (userIds.length > 0) {
      let prevQuery = supabaseAdmin
        .from('pendaftaran_tikrar_tahfidz')
        .select('user_id')
        .in('user_id', userIds)
        .eq('status', 'approved')
        .eq('selection_status', 'selected');

      if (batchId && batchId !== 'all') {
        prevQuery = prevQuery.neq('batch_id', batchId);
      }

      const { data: prevRegs } = await prevQuery;
      const alumniUserIds = new Set(prevRegs?.map((r: any) => r.user_id) || []);
      enrichedData = enrichedData.map((item: any) => ({
        ...item,
        isAlumni: alumniUserIds.has(item.user_id)
      }));
    }

    return ApiResponses.success({
      data: enrichedData,
      pagination: {
        page,
        limit,
        total: count || rawData.length,
        totalPages: Math.ceil((count || rawData.length) / limit)
      }
    });

  } catch (error) {
    console.error('[Admin Tikrar API] Unexpected error:', error);
    return ApiResponses.handleUnknown(error);
  }
}