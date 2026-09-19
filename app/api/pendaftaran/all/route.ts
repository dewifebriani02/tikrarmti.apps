import { NextResponse } from 'next/server';
import { getAuthorizationContext } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { query } from '@/lib/db';

/**
 * GET /api/pendaftaran/all
 *
 * API for perjalanan-saya and jurnal pages - shows thalibah registrations with batch and daftar ulang data
 */
export async function GET(request: Request) {
  try {
    const response = new NextResponse();
    const context = await getAuthorizationContext({ response });
    if (!context) return ApiResponses.unauthorized();

    // 1. Get tikrar registrations with batch & program joined
    const { rows: tikrarRegistrations } = await query(
      `SELECT 
         p.*,
         row_to_json(b.*) as batch,
         row_to_json(pr.*) as program
       FROM pendaftaran_tikrar_tahfidz p
       LEFT JOIN batches b ON p.batch_id = b.id
       LEFT JOIN programs pr ON p.program_id = pr.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [context.userId]
    );

    // 2. Fetch daftar ulang submissions with halaqah info
    const { rows: daftarUlangSubmissions } = await query(
      `SELECT 
         du.*,
         row_to_json(b.*) as batch,
         row_to_json(th.*) as tashih_halaqah,
         row_to_json(uh.*) as ujian_halaqah
       FROM daftar_ulang_submissions du
       LEFT JOIN batches b ON du.batch_id = b.id
       LEFT JOIN halaqah th ON du.tashih_halaqah_id = th.id
       LEFT JOIN halaqah uh ON du.ujian_halaqah_id = uh.id
       WHERE du.user_id = $1
       ORDER BY du.created_at DESC`,
      [context.userId]
    );

    // 3. Process registrations and embed daftar ulang data
    const allRegistrations = (tikrarRegistrations || []).map((reg: any) => {
      const daftarUlang = (daftarUlangSubmissions || []).find(
        (du: any) => du.registration_id === reg.id || du.batch_id === reg.batch_id
      ) || null;

      return {
        ...reg,
        registration_type: 'thalibah',
        role: 'thalibah',
        status: reg.status || 'pending',
        batch_name: reg.batch?.name || null,
        daftar_ulang: daftarUlang,
        // For backwards compatibility
        re_enrollment_completed: daftarUlang?.status === 'approved' ? true : reg.re_enrollment_completed
      };
    });

    // Sort by created_at descending
    allRegistrations.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB.getTime() - dateA.getTime();
    });

    return ApiResponses.success(allRegistrations);
  } catch (error) {
    console.error('[Pendaftaran All API] Unexpected error:', error);
    return ApiResponses.handleUnknown(error);
  }
}
