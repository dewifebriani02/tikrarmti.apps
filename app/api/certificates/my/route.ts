import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationContext } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthorizationContext();
    if (!authContext || !authContext.userId) {
      return ApiResponses.unauthorized('Authentication required');
    }

    const userId = authContext.userId;

    const sql = `
      SELECT 
        c.id,
        c.certificate_number,
        c.user_id,
        c.batch_id,
        c.juz_number,
        c.predicate,
        c.issue_date,
        c.hijri_date,
        c.pdf_url,
        c.qr_code_url,
        c.status,
        c.metadata,
        c.created_at,
        b.name as batch_name,
        u.full_name as student_name,
        u.student_id_number as student_nit
      FROM certificates c
      LEFT JOIN batches b ON c.batch_id = b.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.user_id = $1 AND c.status = 'issued'
      ORDER BY c.issue_date DESC, c.created_at DESC;
    `;

    const { rows: certificates } = await query(sql, [userId]);

    return NextResponse.json({
      success: true,
      certificates
    });
  } catch (error: any) {
    console.error('[MY CERTIFICATES GET ERROR]', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
