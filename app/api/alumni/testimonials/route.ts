import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
            'kota', u.kota
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
      data: rows
    });
  } catch (error: any) {
    console.error('[Alumni Testimonials GET API] Server error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
