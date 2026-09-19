import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/admin/testimonials
 * Fetch all testimonials with user details
 */
export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const approvedOnly = searchParams.get('approved_only') === 'true';

    let sql = `
      SELECT 
        t.id,
        t.user_id,
        t.content,
        t.rating,
        t.is_approved,
        t.created_at,
        t.updated_at,
        CASE WHEN u.id IS NOT NULL THEN
          json_build_object(
            'id', u.id,
            'full_name', u.full_name,
            'email', u.email,
            'kota', u.kota
          )
        ELSE NULL END as user
      FROM testimonials t
      LEFT JOIN users u ON u.id = t.user_id
    `;

    const params: any[] = [];
    if (approvedOnly) {
      sql += ` WHERE t.is_approved = true`;
    }

    sql += ` ORDER BY t.created_at DESC`;

    const { rows } = await query(sql, params);

    return ApiResponses.success(rows);
  } catch (error: any) {
    console.error('[Admin Testimonials API GET] Server error:', error);
    return ApiResponses.handleUnknown(error);
  }
}

/**
 * PUT /api/admin/testimonials
 * Update testimonial approval status
 */
export async function PUT(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const { id, is_approved } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing testimonial ID' }, { status: 400 });
    }

    const { rows } = await query(
      `UPDATE testimonials
       SET is_approved = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [!!is_approved, id]
    );

    return ApiResponses.success(rows[0], 'Status persetujuan testimoni berhasil diperbarui');
  } catch (error: any) {
    console.error('[Admin Testimonials API PUT] Server error:', error);
    return ApiResponses.handleUnknown(error);
  }
}

/**
 * DELETE /api/admin/testimonials
 * Delete a testimonial
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
      return NextResponse.json({ error: 'Missing testimonial ID' }, { status: 400 });
    }

    await query(`DELETE FROM testimonials WHERE id = $1`, [id]);

    return ApiResponses.success(null, 'Testimoni berhasil dihapus');
  } catch (error: any) {
    console.error('[Admin Testimonials API DELETE] Server error:', error);
    return ApiResponses.handleUnknown(error);
  }
}
