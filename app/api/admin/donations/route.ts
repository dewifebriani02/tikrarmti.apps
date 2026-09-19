import { createSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createSupabaseAdmin();

/**
 * GET /api/admin/donations
 * Fetch all donations for admin review, with optional status filter
 */
export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('donations')
      .select(`
        *,
        user:users!donations_user_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: donations, error } = await query;

    if (error) {
      console.error('[Admin Donations API GET] Database error:', error);
      return ApiResponses.databaseError(error);
    }

    return ApiResponses.success(donations);
  } catch (error: any) {
    console.error('[Admin Donations API GET] Server error:', error);
    return ApiResponses.handleUnknown(error);
  }
}

/**
 * PUT /api/admin/donations
 * Update donation status and notes (approve/reject bank transfer proof)
 */
export async function PUT(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing donation ID' }, { status: 400 });
    }

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid or missing status (must be pending, approved, or rejected)' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('donations')
      .update({
        status,
        notes: notes ? notes.trim() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Admin Donations API PUT] Database error:', error);
      return ApiResponses.databaseError(error);
    }

    return ApiResponses.success(data, 'Status donasi berhasil diperbarui');
  } catch (error: any) {
    console.error('[Admin Donations API PUT] Server error:', error);
    return ApiResponses.handleUnknown(error);
  }
}

/**
 * DELETE /api/admin/donations
 * Delete a donation record
 */
export async function DELETE(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch (e) {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing donation ID' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('donations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Admin Donations API DELETE] Database error:', error);
      return ApiResponses.databaseError(error);
    }

    return ApiResponses.success(null, 'Catatan donasi berhasil dihapus');
  } catch (error: any) {
    console.error('[Admin Donations API DELETE] Server error:', error);
    return ApiResponses.handleUnknown(error);
  }
}
