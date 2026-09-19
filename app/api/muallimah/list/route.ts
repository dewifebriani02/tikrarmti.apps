import { createSupabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';

/**
 * GET /api/muallimah/list
 * 
 * Public list of muallimah for students to select during tashih entry.
 * Restricted to authenticated users.
 */
export async function GET(request: Request) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batch_id');

    if (!batchId) {
      return ApiResponses.validationError([{ message: 'batch_id is required' } as any]);
    }

    const { rows } = await import('@/lib/db').then(m => m.query(
      `SELECT 
         ma.id, 
         ma.user_id, 
         ma.preferred_juz, 
         ma.status, 
         COALESCE(u.full_name, 'Tanpa Nama') as full_name
       FROM muallimah_akads ma
       LEFT JOIN users u ON ma.user_id = u.id
       WHERE ma.batch_id = $1 AND ma.status = 'approved'
       ORDER BY LOWER(COALESCE(u.full_name, '')) ASC`,
      [batchId]
    ));

    const finalList = rows.map(akad => ({
      id: akad.id,
      user_id: akad.user_id,
      full_name: akad.full_name || 'Tanpa Nama',
      preferred_juz: akad.preferred_juz || ''
    }));

    return ApiResponses.success(finalList);
  } catch (error) {
    console.error('[Muallimah List API] Unexpected error:', error);
    return ApiResponses.handleUnknown(error);
  }
}
