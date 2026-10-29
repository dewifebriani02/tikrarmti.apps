import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/testimonials
 * Public endpoint for retrieving authentic, approved alumni testimonials.
 */
export async function GET() {
  try {
    const sql = `
      SELECT 
        t.id,
        t.content,
        t.rating,
        t.created_at,
        t.is_approved,
        CASE WHEN u.id IS NOT NULL THEN
          json_build_object(
            'full_name', u.full_name,
            'kota', u.kota,
            'tanggal_lahir', u.tanggal_lahir
          )
        ELSE NULL END as user
      FROM testimonials t
      LEFT JOIN users u ON u.id = t.user_id
      WHERE t.is_approved = true
      ORDER BY t.created_at DESC;
    `;

    const { rows } = await query(sql);

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    console.error('[Public Testimonials GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
