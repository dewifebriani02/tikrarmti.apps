import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/admin/testimonials
 * Fetch all testimonials with user details + per-batch breakdown (Batch 2 & Batch 3)
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
        t.batch_name,
        t.program_name,
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

    // Fetch per-batch statistics and list of active thalibah who haven't filled testimonials yet
    const batchStatsSql = `
      WITH eligible_pendaftaran AS (
        SELECT DISTINCT p.user_id, b.id AS batch_id, b.name AS batch_name
        FROM pendaftaran_tikrar_tahfidz p
        JOIN batches b ON b.id = p.batch_id
        WHERE (p.status IN ('approved', 'graduated') OR p.selection_status IN ('approved', 'selected'))
          AND b.name IN ('Tikrar Tahfidz MTI Batch 2', 'Tikrar Tahfidz MTI Batch 3')
      ),
      active_du AS (
        SELECT DISTINCT ON (du.batch_id, du.user_id)
          du.user_id,
          b.id AS batch_id,
          b.name AS batch_name,
          COALESCE(du.confirmed_chosen_juz, p.chosen_juz, '-') AS chosen_juz,
          COALESCE(u.full_name, du.confirmed_full_name, 'Tanpa Nama') AS full_name,
          u.email,
          COALESCE(u.whatsapp, du.confirmed_wa_phone) AS whatsapp
        FROM daftar_ulang_submissions du
        JOIN batches b ON b.id = du.batch_id
        LEFT JOIN users u ON u.id = du.user_id
        LEFT JOIN pendaftaran_tikrar_tahfidz p ON p.id = du.registration_id
        WHERE du.status = 'approved'
          AND b.name IN ('Tikrar Tahfidz MTI Batch 2', 'Tikrar Tahfidz MTI Batch 3')
        ORDER BY du.batch_id, du.user_id, du.updated_at DESC
      ),
      testi_per_batch AS (
        SELECT DISTINCT user_id, batch_name
        FROM testimonials
        WHERE batch_name IN ('Tikrar Tahfidz MTI Batch 2', 'Tikrar Tahfidz MTI Batch 3')
      )
      SELECT
        b.id AS batch_id,
        b.name AS batch_name,
        b.status AS batch_status,
        (SELECT COUNT(*)::int FROM testimonials t WHERE t.batch_name = b.name) AS total_testimoni,
        (SELECT COUNT(*)::int FROM testimonials t WHERE t.batch_name = b.name AND t.is_approved = true) AS approved_testimoni,
        (SELECT COUNT(*)::int FROM testimonials t WHERE t.batch_name = b.name AND t.is_approved = false) AS pending_testimoni,
        (SELECT COUNT(*)::int FROM active_du du WHERE du.batch_name = b.name) AS total_thalibah_aktif,
        (SELECT COUNT(*)::int FROM active_du du JOIN testi_per_batch t ON t.user_id = du.user_id AND t.batch_name = du.batch_name WHERE du.batch_name = b.name) AS thalibah_aktif_sudah_isi,
        (SELECT COUNT(*)::int FROM active_du du LEFT JOIN testi_per_batch t ON t.user_id = du.user_id AND t.batch_name = du.batch_name WHERE du.batch_name = b.name AND t.user_id IS NULL) AS thalibah_aktif_belum_isi,
        (SELECT COUNT(*)::int FROM eligible_pendaftaran ep WHERE ep.batch_name = b.name) AS total_lolos_seleksi,
        (SELECT COUNT(*)::int FROM eligible_pendaftaran ep JOIN testi_per_batch t ON t.user_id = ep.user_id AND t.batch_name = ep.batch_name WHERE ep.batch_name = b.name) AS lolos_seleksi_sudah_isi,
        (SELECT COUNT(*)::int FROM eligible_pendaftaran ep LEFT JOIN testi_per_batch t ON t.user_id = ep.user_id AND t.batch_name = ep.batch_name WHERE ep.batch_name = b.name AND t.user_id IS NULL) AS lolos_seleksi_belum_isi,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'user_id', du.user_id,
                'full_name', du.full_name,
                'email', du.email,
                'whatsapp', du.whatsapp,
                'chosen_juz', du.chosen_juz
              )
              ORDER BY du.full_name ASC
            )
            FROM active_du du
            LEFT JOIN testi_per_batch t ON t.user_id = du.user_id AND t.batch_name = du.batch_name
            WHERE du.batch_name = b.name AND t.user_id IS NULL
          ),
          '[]'::json
        ) AS missing_active_thalibah
      FROM batches b
      WHERE b.name IN ('Tikrar Tahfidz MTI Batch 2', 'Tikrar Tahfidz MTI Batch 3')
      ORDER BY b.name ASC
    `;

    const { rows: batchBreakdown } = await query(batchStatsSql);

    return NextResponse.json({
      success: true,
      data: rows,
      batchBreakdown,
      timestamp: new Date().toISOString(),
    });
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
