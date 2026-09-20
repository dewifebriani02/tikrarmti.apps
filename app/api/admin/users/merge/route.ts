import { ApiResponses } from '@/lib/api-responses';
import { requireAdmin, getAuthorizationContext } from '@/lib/rbac';
import { createSupabaseAdmin } from '@/lib/supabase';
import { logAudit, getClientIp, getUserAgent } from '@/lib/audit-log';
import { transaction, query } from '@/lib/db';

/**
 * POST /api/admin/users/merge
 * 
 * Merges data from a source user to a target user and deletes the source user.
 * Restricted to admin role.
 */
export async function POST(request: Request) {
  try {
    // 1. Authorization check
    const authError = await requireAdmin();
    if (authError) return authError;

    const context = await getAuthorizationContext();
    if (!context) return ApiResponses.unauthorized('Unable to get authorization context');

    // 2. Parse and validate body
    const { sourceUserId, targetUserId } = await request.json();

    if (!sourceUserId || !targetUserId) {
      return ApiResponses.error('VALIDATION_ERROR', 'Source and Target IDs are required', {}, 400);
    }

    if (sourceUserId === targetUserId) {
      return ApiResponses.error('VALIDATION_ERROR', 'Source and Target must be different', {}, 400);
    }

    // 3. Check if both users exist
    const usersRes = await query(
      `SELECT id, email, full_name FROM users WHERE id IN ($1, $2)`,
      [sourceUserId, targetUserId]
    );

    if (usersRes.rows.length < 2) {
      return ApiResponses.error('NOT_FOUND', 'One or both users not found', {}, 404);
    }

    const sourceUser = usersRes.rows.find((u: any) => u.id === sourceUserId);
    const targetUser = usersRes.rows.find((u: any) => u.id === targetUserId);

    // 4. Execute Transactional Merge across all related tables
    await transaction(async (client) => {
      // Helper to update foreign keys safely
      const updateRef = async (table: string, column: string) => {
        try {
          await client.query(`UPDATE ${table} SET ${column} = $1 WHERE ${column} = $2`, [targetUserId, sourceUserId]);
        } catch (e: any) {
          // Table or column might not exist or constraint violation - log and proceed if non-critical
          console.warn(`[Merge User] Updating ${table}.${column} warning:`, e.message);
        }
      };

      await updateRef('pendaftaran_tikrar_tahfidz', 'user_id');
      await updateRef('pendaftaran_pra_tikrar', 'user_id');
      await updateRef('muallimah_registrations', 'user_id');
      await updateRef('musyrifah_registrations', 'user_id');
      await updateRef('daftar_ulang_submissions', 'user_id');
      await updateRef('daftar_ulang_submissions', 'partner_user_id');
      await updateRef('jurnal_records', 'user_id');
      await updateRef('tashih_records', 'thalibah_id');
      await updateRef('tashih_records', 'musyrifah_id');
      await updateRef('exam_attempts', 'user_id');
      await updateRef('final_exam_registrations', 'user_id');
      await updateRef('halaqah_students', 'student_id');
      await updateRef('halaqah', 'muallimah_id');
      await updateRef('audit_logs', 'user_id');

      // Clean up source user profile and user
      try {
        await client.query(`DELETE FROM user_profiles WHERE id = $1`, [sourceUserId]);
      } catch (e: any) {
        console.warn('[Merge User] Delete user_profile warning:', e.message);
      }

      await client.query(`DELETE FROM users WHERE id = $1`, [sourceUserId]);
    });

    // 5. Delete from Supabase Auth if available
    try {
      const supabase = createSupabaseAdmin();
      await supabase.auth.admin.deleteUser(sourceUserId);
    } catch (authErr) {
      console.warn('[Admin Merge API] Auth deletion warning:', authErr);
    }

    // 6. Log Audit Trail
    await logAudit({
      userId: context.userId,
      action: 'UPDATE',
      resource: 'users',
      details: {
        operation: 'merge_user',
        source: { id: sourceUserId, email: sourceUser?.email, name: sourceUser?.full_name },
        target: { id: targetUserId, email: targetUser?.email, name: targetUser?.full_name },
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      level: 'WARN'
    });

    return ApiResponses.success({ 
      success: true,
      message: `Berhasil menggabungkan data ${sourceUser?.full_name} ke ${targetUser?.full_name}` 
    }, 'Users merged successfully');

  } catch (error) {
    console.error('[Admin Merge API] Unexpected error:', error);
    return ApiResponses.handleUnknown(error);
  }
}
