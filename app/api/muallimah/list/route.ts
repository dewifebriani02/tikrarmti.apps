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

    // Hanya muallimah/musyrifah yang aktif di batch tertentu:
    //   1) Punya muallimah_akad approved untuk batch tersebut, ATAU
    //   2) Menjadi muallimah_id pada halaqah yang program-nya di batch tersebut, ATAU
    //   3) Terdaftar sebagai halaqah_mentor pada halaqah yang program-nya di batch tersebut.
    // Fallback lama (role='muallimah'/'musyrifah' saja) sengaja dihapus — itu yang
    // menyebabkan ustadzah dari batch lain ikut muncul.
    const { rows } = await import('@/lib/db').then(m => m.query(
      `SELECT DISTINCT
         COALESCE(ma.id, mr.id, u.id) as id, 
         u.id as user_id, 
         COALESCE(ma.preferred_juz, h.preferred_juz, mr.preferred_juz, '') as preferred_juz, 
         'approved' as status, 
         COALESCE(u.full_name, 'Tanpa Nama') as full_name
       FROM users u
       LEFT JOIN muallimah_akads ma ON ma.user_id = u.id AND ma.batch_id = $1 AND ma.status = 'approved'
       LEFT JOIN muallimah_registrations mr ON mr.user_id = u.id AND mr.batch_id = $1 AND mr.status = 'approved'
       LEFT JOIN halaqah h ON h.muallimah_id = u.id AND h.program_id IN (SELECT id FROM programs WHERE batch_id = $1)
       LEFT JOIN halaqah_mentors hm ON hm.mentor_id = u.id AND hm.halaqah_id IN (SELECT id FROM halaqah WHERE program_id IN (SELECT id FROM programs WHERE batch_id = $1))
       WHERE (ma.id IS NOT NULL OR mr.id IS NOT NULL OR h.id IS NOT NULL OR hm.id IS NOT NULL)
         AND u.is_active = true
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
