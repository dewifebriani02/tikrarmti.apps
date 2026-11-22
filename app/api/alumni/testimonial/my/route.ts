import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

const ELIGIBLE_REGS_SQL = `
  SELECT
    p.id,
    p.status,
    p.selection_status,
    b.id as batch_id,
    b.name as batch_name,
    b.status as batch_status,
    b.start_date,
    b.end_date,
    b.created_at as batch_created_at
  FROM pendaftaran_tikrar_tahfidz p
  JOIN batches b ON b.id = p.batch_id
  WHERE p.user_id = $1
    AND (
      p.status IN ('approved', 'graduated')
      OR p.selection_status IN ('approved', 'selected')
    )
    AND (
      b.status IN ('closed', 'ongoing')
      OR (b.end_date IS NOT NULL AND b.end_date < NOW())
    )
  ORDER BY
    COALESCE((regexp_match(b.name, 'Batch\\s*(\\d+)', 'i'))[1]::int, 0) DESC,
    b.start_date DESC NULLS LAST,
    b.created_at DESC NULLS LAST,
    p.created_at DESC
`;

/**
 * GET /api/alumni/testimonial/my
 * Check alumni status and retrieve testimonial(s) per batch.
 * Allows Batch 3 alumni (including ongoing/exam-season Batch 3 students) to submit
 * a fresh Batch 3 testimonial even if they already submitted one in Batch 2.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rows: eligibleRegs } = await query(ELIGIBLE_REGS_SQL, [user.id]);

    const isAdmin = (user.roles || []).includes('admin') || user.role === 'admin';
    const isAlumnus = eligibleRegs.length > 0;

    const { rows: allMyTestimonials } = await query(
      `SELECT * FROM testimonials WHERE user_id = $1 ORDER BY created_at DESC`,
      [user.id]
    );

    // Deduplicate eligible batches in chronological newest-first order
    const seenBatchKeys = new Set<string>();
    const eligibleBatches: Array<{
      batchId: string;
      batchName: string;
      batchStatus: string;
      testimonial: any | null;
    }> = [];

    for (const reg of eligibleRegs) {
      const normalizedKey = (reg.batch_name || '').trim().toLowerCase();
      if (!normalizedKey || seenBatchKeys.has(normalizedKey)) continue;
      seenBatchKeys.add(normalizedKey);

      const matchedTestimonial =
        allMyTestimonials.find(
          (t: any) => (t.batch_name || '').trim().toLowerCase() === normalizedKey
        ) || null;

      eligibleBatches.push({
        batchId: reg.batch_id,
        batchName: reg.batch_name,
        batchStatus: reg.batch_status,
        testimonial: matchedTestimonial,
      });
    }

    // Optional explicit batch_name query param, otherwise pick newest unreviewed eligible batch
    // so multi-batch alumni (e.g. Batch 2 + Batch 3) immediately see the fresh form for Batch 3.
    const { searchParams } = new URL(request.url);
    const requestedBatchName = searchParams.get('batch_name')?.trim();

    let targetBatchName: string | null = null;
    if (requestedBatchName) {
      const requestedKey = requestedBatchName.toLowerCase();
      const matchedEligible = eligibleBatches.find(
        (b) => b.batchName.trim().toLowerCase() === requestedKey
      );
      targetBatchName = matchedEligible ? matchedEligible.batchName : requestedBatchName;
    } else {
      const firstUnreviewed = eligibleBatches.find((b) => !b.testimonial);
      targetBatchName = firstUnreviewed?.batchName || eligibleBatches[0]?.batchName || null;
    }

    const currentBatchTestimonial = targetBatchName
      ? allMyTestimonials.find(
          (t: any) => (t.batch_name || '').trim().toLowerCase() === targetBatchName!.trim().toLowerCase()
        ) || null
      : allMyTestimonials[0] || null;

    // Only enforce pre-registration testimonial gate for closed/completed past batches
    // when the user has not submitted any testimonial yet.
    const hasClosedPastBatch = eligibleRegs.some(
      (r: any) => r.batch_status === 'closed' || (r.end_date && new Date(r.end_date) < new Date())
    );
    const requiresTestimonialBeforeRegister =
      hasClosedPastBatch && !isAdmin && allMyTestimonials.length === 0;

    return NextResponse.json({
      isAlumni: isAlumnus,
      isAdmin,
      targetBatchName,
      eligibleBatches,
      testimonial: currentBatchTestimonial,
      pastTestimonials: allMyTestimonials,
      hasAnyTestimonial: allMyTestimonials.length > 0,
      requiresTestimonialBeforeRegister,
    });
  } catch (error: any) {
    console.error('[Alumni Testimonial My GET] Server error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

/**
 * POST /api/alumni/testimonial/my
 * Create or update testimonial for the target batch (resets is_approved to false)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, rating, batch_name: requestedBatchName } = body;

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json({ error: 'Konten testimoni tidak boleh kosong' }, { status: 400 });
    }

    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return NextResponse.json({ error: 'Rating harus berupa angka antara 1 sampai 5' }, { status: 400 });
    }

    // Determine target batch name: use explicit batch_name if verified or fallback to newest unreviewed/eligible batch
    const { rows: eligibleRegs } = await query(ELIGIBLE_REGS_SQL, [user.id]);

    let batchName: string | null = null;
    if (typeof requestedBatchName === 'string' && requestedBatchName.trim()) {
      const matched = eligibleRegs.find(
        (r: any) => (r.batch_name || '').trim().toLowerCase() === requestedBatchName.trim().toLowerCase()
      );
      batchName = matched?.batch_name || requestedBatchName.trim();
    } else {
      const { rows: allMyTestimonials } = await query(
        `SELECT batch_name FROM testimonials WHERE user_id = $1`,
        [user.id]
      );
      const submittedKeys = new Set(
        allMyTestimonials.map((t: any) => (t.batch_name || '').trim().toLowerCase()).filter(Boolean)
      );
      const unreviewed = eligibleRegs.find(
        (r: any) => !submittedKeys.has((r.batch_name || '').trim().toLowerCase())
      );
      batchName = unreviewed?.batch_name || eligibleRegs[0]?.batch_name || 'Tikrar Tahfidz MTI Batch 3';
    }

    const existing = await queryOne(
      `SELECT id FROM testimonials
       WHERE user_id = $1 AND LOWER(TRIM(COALESCE(batch_name, ''))) = LOWER(TRIM(COALESCE($2, '')))
       LIMIT 1`,
      [user.id, batchName]
    );

    let savedRow;
    if (existing) {
      const { rows } = await query(
        `UPDATE testimonials
         SET content = $1,
             rating = $2,
             batch_name = $3,
             is_approved = false,
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [content.trim(), Math.floor(numericRating), batchName, existing.id]
      );
      savedRow = rows[0];
    } else {
      const { rows } = await query(
        `INSERT INTO testimonials (user_id, content, rating, batch_name, program_name, is_approved, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'Tikrar Tahfidz', false, NOW(), NOW())
         RETURNING *`,
        [user.id, content.trim(), Math.floor(numericRating), batchName]
      );
      savedRow = rows[0];
    }

    return NextResponse.json({
      success: true,
      message: 'Testimoni berhasil disimpan dan menunggu persetujuan admin',
      data: savedRow
    });
  } catch (error: any) {
    console.error('[Alumni Testimonial My POST] Server error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
