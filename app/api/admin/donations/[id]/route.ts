import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const data = await queryOne(
      `SELECT 
        d.*,
        json_build_object(
          'id', u.id,
          'full_name', u.full_name,
          'email', u.email
        ) as user
      FROM donations d
      LEFT JOIN users u ON d.user_id = u.id
      WHERE d.id = $1`,
      [id]
    );

    if (!data) {
      return NextResponse.json({ error: 'Donasi tidak ditemukan' }, { status: 404 });
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

    let data;
    if (notes !== undefined) {
      data = await queryOne(
        `UPDATE donations
         SET status = $1, notes = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [status, notes ? String(notes).trim() : null, id]
      );
    } else {
      data = await queryOne(
        `UPDATE donations
         SET status = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [status, id]
      );
    }

    return ApiResponses.success(data, `Status infaq berhasil diperbarui (${status})`);
  } catch (error: any) {
    console.error('[Admin Donations [id] PATCH] Server error:', error);
    return ApiResponses.handleUnknown(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return PATCH(request, context);
}

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

    await query(`DELETE FROM donations WHERE id = $1`, [id]);

    return ApiResponses.success(null, 'Catatan donasi berhasil dihapus');
  } catch (error: any) {
    console.error('[Admin Donations [id] DELETE] Server error:', error);
    return ApiResponses.handleUnknown(error);
  }
}
