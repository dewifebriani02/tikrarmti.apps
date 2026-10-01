import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    let sql = `
      SELECT 
        d.id,
        d.user_id,
        d.amount,
        d.donor_name,
        d.whatsapp,
        d.proof_url,
        d.status,
        d.notes,
        d.payment_method,
        d.created_at,
        d.updated_at,
        json_build_object(
          'id', u.id,
          'full_name', u.full_name,
          'email', u.email
        ) as user
      FROM donations d
      LEFT JOIN users u ON d.user_id = u.id
    `;

    const params: any[] = [];
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      sql += ` WHERE d.status = $1`;
      params.push(status);
    }

    sql += ` ORDER BY d.created_at DESC`;

    const { rows: donations } = await query(sql, params);

    return ApiResponses.success(donations || []);
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
      const userData = await queryOne(
        `SELECT id, full_name, whatsapp FROM users WHERE id = $1`,
        [user_id]
      );

      if (userData) {
        if (!finalDonorName) finalDonorName = userData.full_name;
        if (!finalPhone) finalPhone = userData.whatsapp;
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
      const mStr = String(month).padStart(2, '0');
      createdAtIso = `${year}-${mStr}-10T10:00:00+07:00`;
    }

    const finalStatus = ['approved', 'pending', 'rejected'].includes(status) ? status : 'approved';
    const finalNotes = notes ? notes.trim() : `Input Manual Admin (Infaq ${month || ''} ${year || ''})`.trim();

    const newDonation = await queryOne(
      `INSERT INTO donations (
        user_id, amount, donor_name, whatsapp, proof_url, status, notes, payment_method, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *`,
      [
        user_id || null,
        Number(amount),
        finalDonorName,
        finalPhone || null,
        proof_url || null,
        finalStatus,
        finalNotes,
        payment_method || 'Transfer Bank BSI',
        createdAtIso
      ]
    );

    return ApiResponses.success(newDonation, 'Transaksi infaq manual berhasil dicatat', 201);
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

    let updatedDonation;
    if (notes !== undefined) {
      updatedDonation = await queryOne(
        `UPDATE donations 
         SET status = $1, notes = $2, updated_at = NOW() 
         WHERE id = $3 
         RETURNING *`,
        [status, notes ? notes.trim() : null, id]
      );
    } else {
      updatedDonation = await queryOne(
        `UPDATE donations 
         SET status = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [status, id]
      );
    }

    return ApiResponses.success(updatedDonation, 'Status donasi berhasil diperbarui');
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

    await query(`DELETE FROM donations WHERE id = $1`, [id]);

    return ApiResponses.success(null, 'Catatan donasi berhasil dihapus');
  } catch (error: any) {
    console.error('[Admin Donations API DELETE] Server error:', error);
    return ApiResponses.handleUnknown(error);
  }
}
