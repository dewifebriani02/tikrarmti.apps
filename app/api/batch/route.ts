import { parseHolidayDates } from '@/lib/utils/holiday-helpers';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { ApiResponses } from '@/lib/api-responses';
import { ApiResponseBuilder } from '@/lib/api-wrapper';
import { batchSchemas } from '@/lib/schemas';
import { requireAdmin, requireAuth } from '@/lib/rbac';
import { calculateBatchStatus, syncBatchLifecycle } from '@/lib/batchLifecycle';

const supabaseAdmin = createSupabaseAdmin();

/**
 * @deprecated GET method is deprecated.
 *
 * MIGRATION GUIDE:
 * Instead of fetching batches via API from client:
 * ❌ const { data } = await fetch('/api/batch')
 *
 * Use Server Component:
 * ✅ async function MyServerComponent() {
 * ✅   const supabase = createClient()
 * ✅   const { data } = await supabase.from('batches').select('*')
 * ✅   return <ClientComponent batches={data} />
 * ✅ }
 *
 * This endpoint is kept for backward compatibility only.
 * The POST method (create batch) is NOT deprecated.
 */
export async function GET(request: NextRequest) {
  try {
    const response = new NextResponse();
    const authResult = await requireAuth(response);
    if (authResult) return authResult;

    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');

    const VALID_BATCH_STATUSES = ['draft', 'open', 'ongoing', 'closed', 'archived'];

    const supabase = supabaseAdmin;

    let query = supabase
      .from('batches')
      .select('*');

    // Apply filters — whitelist status values to prevent injection
    if (rawStatus) {
      const statusArray = rawStatus.split(',').filter(s => VALID_BATCH_STATUSES.includes(s));
      if (statusArray.length > 0) {
        query = query.in('status', statusArray);
      }
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching batches:', error);
      return ApiResponses.serverError('Failed to fetch batches');
    }

    // Sync status lifecycle in database if drifted
    if (data && data.length > 0) {
      syncBatchLifecycle(supabase, data).catch(err => console.error('[batch lifecycle sync error]', err));
    }

    // Transform data to include calculated fields and automated status
    const transformedBatches = data?.map(batch => ({
      holiday_dates: parseHolidayDates(batch.holiday_dates),
      ...batch,
      status: calculateBatchStatus(batch),
      duration_weeks: calculateDuration(batch.start_date, batch.end_date)
    }));

    return NextResponse.json(
      ApiResponseBuilder.success(transformedBatches || [], 'Batches fetched successfully'),
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        }
      }
    );
  } catch (error) {
    console.error('Error in batches GET:', error);
    return ApiResponses.serverError('Internal server error');
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = new NextResponse();
    const authResult = await requireAdmin(response);
    if (authResult) return authResult;

    const body = await request.json();

    // Validate request body
    const validation = batchSchemas.create.safeParse(body);
    if (!validation.success) {
      return ApiResponses.validationError(validation.error.issues);
    }

    const validatedData = validation.data;

    const supabase = supabaseAdmin;

    const { data, error } = await supabase
      .from('batches')
      .insert({
        ...validatedData,
        status: (body as any).status === 'archived' ? 'archived' : calculateBatchStatus({ ...(validatedData as any), status: (body as any).status }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating batch:', error);
      return ApiResponses.serverError('Failed to create batch');
    }

    return ApiResponses.success(data, 'Batch created successfully', 201);
  } catch (error) {
    console.error('Error in batches POST:', error);
    return ApiResponses.serverError('Internal server error');
  }
}

// Helper function to calculate duration in weeks
function calculateDuration(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  return diffWeeks;
}
