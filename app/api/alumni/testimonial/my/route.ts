import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

/**
 * GET /api/alumni/testimonial/my
 * Check alumni status and retrieve testimonial
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only students who completed previous closed/past batches with approved/graduated status are considered alumni.
    // Fresh registrants in the current open batch (status pending) are NOT alumni.
    const { rows: pastRegs } = await query(
      `SELECT p.id, p.status, p.selection_status, b.status as batch_status, b.end_date
       FROM pendaftaran_tikrar_tahfidz p
       JOIN batches b ON b.id = p.batch_id
       WHERE p.user_id = $1
         AND (p.status = 'approved' OR p.status = 'graduated' OR p.selection_status = 'approved')
         AND (b.status = 'closed' OR (b.end_date IS NOT NULL AND b.end_date < NOW()))`,
      [user.id]
    );

    const isAdmin = (user.roles || []).includes('admin') || user.role === 'admin';
    const isAlumnus = pastRegs.length > 0;

    const testimonial = await queryOne(
      `SELECT * FROM testimonials WHERE user_id = $1`,
      [user.id]
    );

    return NextResponse.json({
      isAlumni: isAlumnus,
      isAdmin,
      testimonial: testimonial || null
    });
  } catch (error: any) {
    console.error('[Alumni Testimonial My GET] Server error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

/**
 * POST /api/alumni/testimonial/my
 * Create or update testimonial (resets is_approved to false)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, rating } = body;

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json({ error: 'Konten testimoni tidak boleh kosong' }, { status: 400 });
    }

    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return NextResponse.json({ error: 'Rating harus berupa angka antara 1 sampai 5' }, { status: 400 });
    }

    const { rows } = await query(
      `INSERT INTO testimonials (user_id, content, rating, is_approved, created_at, updated_at)\n       VALUES ($1, $2, $3, false, NOW(), NOW())\n       ON CONFLICT (user_id) \n       DO UPDATE SET content = EXCLUDED.content, rating = EXCLUDED.rating, is_approved = false, updated_at = NOW()\n       RETURNING *`,
      [user.id, content.trim(), Math.floor(numericRating)]
    );

    return NextResponse.json({
      success: true,
      message: 'Testimoni berhasil disimpan dan menunggu persetujuan admin',
      data: rows[0]
    });
  } catch (error: any) {
    console.error('[Alumni Testimonial My POST] Server error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
