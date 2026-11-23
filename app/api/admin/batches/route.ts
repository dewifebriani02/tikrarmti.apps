import { parseHolidayDates } from '@/lib/utils/holiday-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin, getAuthorizationContext } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { auditBatchOperation, getClientIp, getUserAgent, logAudit } from '@/lib/audit-log';
import { adminRateLimit } from '@/lib/rate-limiter';
import { revalidatePath } from 'next/cache';
import { calculateBatchStatus, syncBatchLifecycle } from '@/lib/batchLifecycle';

const supabaseAdmin = createSupabaseAdmin();

export async function GET(request: Request) {
  try {
    // 1. Authorization check
    const authError = await requireAdmin();
    if (authError) return authError;

    const context = await getAuthorizationContext();
    if (!context) return ApiResponses.unauthorized();

    // 2. Rate limit
    if (adminRateLimit) {
      const { success } = await adminRateLimit.limit(`admin:batches:${context.userId}`);
      if (!success) return ApiResponses.rateLimit('Terlalu banyak permintaan.');
    }

    // 3. Parse parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.max(Math.min(parseInt(searchParams.get('limit') || '50'), 100), 1);
    const offset = (page - 1) * limit;
    const rawStatus = searchParams.get('status');
    const VALID_BATCH_STATUSES = ['draft', 'open', 'ongoing', 'closed', 'archived'] as const;
    const status = rawStatus && VALID_BATCH_STATUSES.includes(rawStatus as any) ? rawStatus : null;

    // 4. Query
    let query = supabaseAdmin
      .from('batches')
      .select('*', { count: 'exact' })
      .order('start_date', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: batches, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('[Admin Batches API] Query error:', error);
      return ApiResponses.databaseError(error);
    }

    // Enrich with program and registration counts
    const batchIds = batches?.map(b => b.id) || [];
    const enrichedCounts = batchIds.length > 0 ? await Promise.all(
      batchIds.map(async (batchId) => {
        // Get program count
        const { count: programCount } = await supabaseAdmin
          .from('programs')
          .select('*', { count: 'estimated', head: true })
          .eq('batch_id', batchId);

        // Get registration counts
        const { count: tikrarCount } = await supabaseAdmin
          .from('pendaftaran_tikrar_tahfidz')
          .select('*', { count: 'estimated', head: true })
          .eq('batch_id', batchId);

        const { count: muallimahCount } = await supabaseAdmin
          .from('muallimah_registrations')
          .select('*', { count: 'estimated', head: true })
          .eq('batch_id', batchId);

        const { count: musyrifahCount } = await supabaseAdmin
          .from('musyrifah_registrations')
          .select('*', { count: 'estimated', head: true })
          .eq('batch_id', batchId);

        return { 
          batchId, 
          programCount: programCount || 0,
          registeredCount: (tikrarCount || 0) + (muallimahCount || 0) + (musyrifahCount || 0)
        };
      })
    ) : [];

    // Sync status lifecycle in database if drifted
    if (batches && batches.length > 0) {
      syncBatchLifecycle(supabaseAdmin, batches).catch(err => console.error('[admin batch lifecycle sync error]', err));
    }

    const enrichedData = batches?.map((batch: any) => {
      const counts = enrichedCounts.find(c => c.batchId === batch.id);
      return {
        ...batch,
        holiday_dates: parseHolidayDates(batch.holiday_dates),
        status: calculateBatchStatus(batch),
        program_count: counts?.programCount || 0,
        registered_count: counts?.registeredCount || batch.registered_count || 0,
      };
    }) || [];

    // 5. Audit log
    await logAudit({
      userId: context.userId,
      action: 'READ',
      resource: 'batches',
      details: { count: enrichedData.length, page, limit, status_filter: status || 'all' },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      level: 'INFO'
    });

    return ApiResponses.paginated(enrichedData, {
      page,
      limit,
      total: count || 0
    }, undefined, 200);

  } catch (error) {
    console.error('[Admin Batches API] Unexpected error (GET):', error);
    return ApiResponses.handleUnknown(error);
  }
}

export async function POST(request: Request) {
  try {
    // 1. Authorization check
    const authError = await requireAdmin();
    if (authError) return authError;

    const context = await getAuthorizationContext();
    if (!context) return ApiResponses.unauthorized();

    // 2. Rate limit
    if (adminRateLimit) {
      const { success } = await adminRateLimit.limit(`admin:batches:${context.userId}`);
      if (!success) return ApiResponses.rateLimit('Terlalu banyak permintaan.');
    }

    const body = await request.json();

    // 3. Validation
    if (!body.name || !body.start_date || !body.end_date) {
      return ApiResponses.customValidationError([{ field: 'general', message: 'Missing required fields: name, start_date, end_date', code: 'REQUIRED' }]);
    }

    const appendTz = (val: string) => { if (val.includes('+') || val.endsWith('Z')) return val; return `${val}:00+07:00`; };
    const toStartDate = (value: any) => (value === '' || value === null || value === undefined) ? null : (value.includes('T') ? appendTz(value) : `${value}T00:01:00+07:00`);
    const toEndDate = (value: any) => (value === '' || value === null || value === undefined) ? null : (value.includes('T') ? appendTz(value) : `${value}T23:59:59+07:00`);

    // 4. Prepare data
    const batchData: any = {
      name: body.name,
      description: body.description || null,
      start_date: toStartDate(body.start_date),
      end_date: toEndDate(body.end_date),
      registration_start_date: toStartDate(body.registration_start_date),
      registration_end_date: toEndDate(body.registration_end_date),
      status: body.status || 'draft',
      duration_weeks: body.duration_weeks || 13,
      program_type: body.program_type || null,
      total_quota: body.total_quota || 100,
      is_free: body.is_free ?? true,
      price: body.price || 0,
      min_exam_score: body.min_exam_score ?? (() => {
        const match = body.name?.match(/Batch\s*(\d+)/i);
        return match && parseInt(match[1], 10) >= 3 ? 80 : 70;
      })(),
      min_final_exam_score: body.min_final_exam_score ?? (() => {
        const match = body.name?.match(/Batch\s*(\d+)/i);
        return match && parseInt(match[1], 10) >= 3 ? 80 : 70;
      })(),
      selection_start_date: toStartDate(body.selection_start_date),
      selection_end_date: toEndDate(body.selection_end_date),
      selection_result_date: toStartDate(body.selection_result_date),
      re_enrollment_date: toStartDate(body.re_enrollment_date),
      opening_class_date: toStartDate(body.opening_class_date),
      first_week_start_date: toStartDate(body.first_week_start_date),
      first_week_end_date: toEndDate(body.first_week_end_date),
      review_week_start_date: toStartDate(body.review_week_start_date),
      review_week_end_date: toEndDate(body.review_week_end_date),
      final_exam_start_date: toStartDate(body.final_exam_start_date),
      final_exam_end_date: toEndDate(body.final_exam_end_date),
      graduation_start_date: toStartDate(body.graduation_start_date),
      graduation_end_date: toEndDate(body.graduation_end_date),
      transfer_schedule_end_date: toEndDate(body.transfer_schedule_end_date),
      holiday_dates: JSON.stringify(parseHolidayDates(body.holiday_dates)),
      whatsapp_group_link: body.whatsapp_group_link || null,
      group_reminder_link: body.group_reminder_link || null,
      group_diskusi_link: body.group_diskusi_link || null,
    };

    if (body.id) {
      batchData.id = body.id;
    } else {
      batchData.registered_count = 0;
    }

    // 5. Upsert
    const { data: result, error: insertError } = await supabaseAdmin
      .from('batches')
      .upsert(batchData)
      .select()
      .maybeSingle();

    if (insertError) {
      console.error('[Admin Batches API] Upsert error:', insertError);
      await logAudit({
        userId: context.userId,
        action: body.id ? 'UPDATE' : 'CREATE',
        resource: 'batches',
        details: { batch_id: body.id, name: body.name, error: insertError.message },
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
        level: 'ERROR'
      });
      return ApiResponses.databaseError(insertError);
    }

    // 6. Audit operation
    await auditBatchOperation(
      context.userId,
      body.id ? 'UPDATE' : 'CREATE',
      result.id,
      result.name,
      { status: result.status, start_date: result.start_date },
      request
    );

    revalidatePath('/panel-admin/batches');

    return ApiResponses.success(result, body.id ? 'Batch berhasil diperbarui' : 'Batch berhasil dibuat', body.id ? 200 : 201);

  } catch (error) {
    console.error('[Admin Batches API] Unexpected error (POST):', error);
    return ApiResponses.handleUnknown(error);
  }
}
