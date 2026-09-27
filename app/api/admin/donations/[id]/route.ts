import { createSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createSupabaseAdmin();

/**
 * GET /api/admin/donations/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Missing donation ID' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('donations')
      .select(`
        *,
        user:users!donations_user_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Admin Donations [id] GET] Database error:', error);
      return ApiResponses.databaseError(error);
    }

    return ApiResponses.success(data);
  } catch (error: any) {
    console.error('[Admin Donations [id] GET] Server error:', error);
    return ApiResponses.handleUnknown(error);
  }
}

/**
 * PATCH /api/admin/donations/[id]
 * Update donation status and notes
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Missing donation ID' }, { status: 400 });
    }

    const body = await request.json();
    const { status, notes } = body;

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid or missing status (must be pending, approved, or rejected)' },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, any> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (notes !== undefined) {
      updatePayload.notes = notes ? String(notes).trim() : null;
    }

    const { data, error } = await supabaseAdmin
      .from('donations')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Admin Donations [id] PATCH] Database error:', error);
      return ApiResponses.databaseError(error);
    }

    return ApiResponses.success(data, `Status infaq berhasil diperbarui (${status})`);
  } catch (error: any) {
    console.error('[Admin Donations [id] PATCH] Server error:', error);
    return ApiResponses.handleUnknown(error);
  }
}

/**
 * PUT /api/admin/donations/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return PATCH(request, { params });
}

/**
 * DELETE /api/admin/donations/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Missing donation ID' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('donations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Admin Donations [id] DELETE] Database error:', error);
      return ApiResponses.databaseError(error);
    }

    return ApiResponses.success(null, 'Catatan infaq berhasil dihapus');
  } catch (error: any) {
    console.error('[Admin Donations [id] DELETE] Server error:', error);
    return ApiResponses.handleUnknown(error);
  }
}
