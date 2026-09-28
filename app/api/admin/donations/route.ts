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
 * POST /api/admin/donations
 * Manually create / record a donation transaction by Admin
 */
export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const { 
      user_id, 
      donor_name, 
      amount, 
      month, 
      year, 
      transaction_date, 
      proof_url, 
      status = 'approved', 
      notes, 
      payment_method = 'Transfer BSI', 
      whatsapp 
    } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Nominal transfer harus lebih besar dari 0' }, { status: 400 });
    }

    let finalDonorName = donor_name;
    let finalPhone = whatsapp;

    if (user_id) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('id, full_name, whatsapp, phone')
        .eq('id', user_id)
        .single();

      if (userData) {
        if (!finalDonorName) finalDonorName = userData.full_name;
        if (!finalPhone) finalPhone = userData.whatsapp || (userData as any).phone;
      }
    }

    if (!finalDonorName) {
      finalDonorName = 'Thalibah MTI';
    }

    // Determine created_at timestamp
    let createdAtIso = new Date().toISOString();
    if (transaction_date) {
      const d = new Date(transaction_date);
      if (!isNaN(d.getTime())) {
        createdAtIso = d.toISOString();
      }
    } else if (month && year) {
      // If specific month and year provided (1-12)
      const mStr = String(month).padStart(2, '0');
      createdAtIso = `${year}-${mStr}-10T10:00:00+07:00`;
    }

    const insertPayload: Record<string, any> = {
      user_id: user_id || null,
      amount: Number(amount),
      donor_name: finalDonorName,
      whatsapp: finalPhone || null,
      proof_url: proof_url || null,
      status: ['approved', 'pending', 'rejected'].includes(status) ? status : 'approved',
      notes: notes ? notes.trim() : `Input Manual Admin (Infaq ${month || ''} ${year || ''})`.trim(),
      payment_method: payment_method || 'Transfer Bank BSI',
      created_at: createdAtIso,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('donations')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('[Admin Donations API POST] Database error:', error);
      return ApiResponses.databaseError(error);
    }

    return ApiResponses.success(data, 'Transaksi infaq manual berhasil dicatat');
  } catch (error: any) {
    console.error('[Admin Donations API POST] Server error:', error);
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

export async function PATCH(request: NextRequest) {
  return PUT(request);
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
