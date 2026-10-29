import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/rbac';
import { transaction } from '@/lib/db';
import { deleteDaftarUlangSubmissions } from '@/lib/daftar-ulang-cleanup';

const supabaseAdmin = createSupabaseAdmin();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 15+ requirement)
    const { id } = await params;

    // Use Supabase SSR client to get session
    const supabase = createServerClient();

    // Get user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Auth error:', userError);
      return NextResponse.json({
        error: 'Unauthorized - Invalid session. Please login again.',
        needsLogin: true
      }, { status: 401 });
    }

    // Check if user is admin using admin client
    const { data: userData, error: dbError } = await supabaseAdmin
      .from('users')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (dbError || !userData || !userData.roles?.includes('admin')) {
      console.error('Admin check failed:', dbError, userData);
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Fetch single tikrar application with all details using admin client
    // Step 1: Get the basic application data first
    let { data: appData, error: appError } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select('*')
      .eq('id', id)
      .single();

    if (appError) {
      console.error('Error fetching application data:', appError);
      return NextResponse.json(
        {
          error: 'Failed to fetch application',
          details: appError.message
        },
        { status: 500 }
      );
    }

    // Step 2: Fetch related data separately if needed
    const data: any = { ...appData };

    // Get user data if user_id exists
    if (appData.user_id) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, full_name, email, tanggal_lahir, whatsapp, telegram, alamat, kota, provinsi, zona_waktu')
        .eq('id', appData.user_id)
        .single();

      if (!userError && userData) {
        data.user = userData;
      }
    }

    // Get batch data if batch_id exists
    if (appData.batch_id) {
      const { data: batchData, error: batchError } = await supabaseAdmin
        .from('batches')
        .select('id, name, start_date, end_date')
        .eq('id', appData.batch_id)
        .single();

      if (!batchError && batchData) {
        data.batch = batchData;
      }
    }

    // Get program data if program_id exists
    if (appData.program_id) {
      const { data: programData, error: programError } = await supabaseAdmin
        .from('programs')
        .select('id, name, description')
        .eq('id', appData.program_id)
        .single();

      if (!programError && programData) {
        data.program = programData;
      }
    }

    // Get approver data if approved_by exists
    if (appData.approved_by) {
      const { data: approverData, error: approverError } = await supabaseAdmin
        .from('users')
        .select('id, full_name, email')
        .eq('id', appData.approved_by)
        .single();

      if (!approverError && approverData) {
        data.approver = approverData;
      }
    }

    
    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Fields the admin edit form (TikrarTab) may change. Anything else in the body is ignored.
const EDITABLE_FIELDS = [
  'full_name', 'status', 'selection_status', 'chosen_juz', 'wa_phone', 'telegram_phone',
  'domicile', 'address', 'birth_date', 'age', 'infaq_amount', 'timezone', 'main_time_slot',
  'backup_time_slot', 'permission_name', 'permission_phone', 'ready_for_team', 'motivation',
  'questions', 'understands_program', 'understands_commitment', 'time_commitment',
  'tried_simulation', 'no_negotiation', 'no_travel_plans', 'saved_contact', 'has_permission',
  'has_telegram', 'oral_total_score', 'written_quiz_score',
] as const;
const NUMERIC_FIELDS = new Set(['age', 'oral_total_score', 'written_quiz_score']);

/**
 * PATCH /api/admin/tikrar/[id] — admin edit of a tikrar registration (allow-listed fields).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
      if (!(field in body)) continue;
      const value = body[field];
      updateData[field] = NUMERIC_FIELDS.has(field) && value === '' ? null : value;
    }
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Tidak ada data yang diubah' }, { status: 400 });
    }
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .update(updateData)
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) {
      console.error('[PATCH admin/tikrar] Error:', error);
      return NextResponse.json({ error: error?.message || 'Pendaftaran tidak ditemukan' }, { status: error ? 500 : 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/tikrar/[id] — admin deletes a tikrar registration.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { id } = await params;
    // Submissions cascade-delete with the registration, but their halaqah roster rows do not:
    // clean those up first, then delete the registration, all in one transaction.
    const deletedCount = await transaction(async (client) => {
      await deleteDaftarUlangSubmissions(client, { registrationId: id });
      const result = await client.query('DELETE FROM pendaftaran_tikrar_tahfidz WHERE id = $1', [id]);
      return result.rowCount ?? 0;
    });

    if (deletedCount === 0) {
      return NextResponse.json({ error: 'Pendaftaran tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
