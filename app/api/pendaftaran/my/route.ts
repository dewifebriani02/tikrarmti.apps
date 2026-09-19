import { NextResponse } from 'next/server';
import { getAuthorizationContext } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { query } from '@/lib/db';

/**
 * GET /api/pendaftaran/my
 * 
 * Direct PostgreSQL query for the user's registration records with fallback matching.
 */
export async function GET(request: Request) {
  try {
    const response = new NextResponse();
    const context = await getAuthorizationContext({ response });
    if (!context) return ApiResponses.unauthorized();

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('user_id');
    const isAdmin = context.roles.includes('admin');
    const impersonatedUserId = (isAdmin && targetUserId) ? targetUserId : context.userId;

    // 1. Fetch registrations for this user
    let { rows: tikrarRegistrations } = await query(
      `SELECT 
         p.*,
         row_to_json(b.*) as batch,
         row_to_json(pr.*) as program
       FROM pendaftaran_tikrar_tahfidz p
       LEFT JOIN batches b ON p.batch_id = b.id
       LEFT JOIN programs pr ON p.program_id = pr.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [impersonatedUserId]
    );

    // 2. Fallback matching by email if no registrations found by user_id
    if (tikrarRegistrations.length === 0 && !targetUserId && context.email) {
      const { rows: fallbackRows } = await query(
        `SELECT 
           p.*,
           row_to_json(b.*) as batch,
           row_to_json(pr.*) as program
         FROM pendaftaran_tikrar_tahfidz p
         LEFT JOIN batches b ON p.batch_id = b.id
         LEFT JOIN programs pr ON p.program_id = pr.id
         WHERE LOWER(p.email) = LOWER($1)
         ORDER BY p.created_at DESC`,
        [context.email]
      );

      if (fallbackRows.length > 0) {
        tikrarRegistrations = fallbackRows;
        // Auto-heal: update user_id link
        for (const reg of fallbackRows) {
          if (!reg.user_id || reg.user_id !== context.userId) {
            await query(
              `UPDATE pendaftaran_tikrar_tahfidz SET user_id = $1 WHERE id = $2`,
              [context.userId, reg.id]
            );
          }
        }
      }
    }

    // 3. Fetch daftar ulang submissions for this user
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
      [impersonatedUserId]
    );

    // 4. Structure final response
    const allRegistrations = tikrarRegistrations
      .map((reg: any) => {
        const batch = reg.batch;
        const daftarUlang = daftarUlangSubmissions.find((dus: any) => dus.registration_id === reg.id || dus.batch_id === reg.batch_id);

        return {
          ...reg,
          batch: batch || null,
          registration_type: 'thalibah',
          role: 'thalibah',
          status: reg.status || 'pending',
          batch_name: batch?.name || null,
          daftar_ulang: daftarUlang || null
        };
      })
      .filter((reg: any) => {
        return !reg.batch || reg.batch.status === 'open' || reg.batch.status === 'closed';
      });

    allRegistrations.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || a.submission_date || 0);
      const dateB = new Date(b.created_at || b.submission_date || 0);
      return dateB.getTime() - dateA.getTime();
    });

    return ApiResponses.success(allRegistrations);
  } catch (error) {
    console.error('[Pendaftaran My API] Unexpected error:', error);
    return ApiResponses.handleUnknown(error);
  }
}
