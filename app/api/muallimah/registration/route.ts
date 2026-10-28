import { createClient } from '@/lib/supabase/server';
import { requireAnyRole, getAuthorizationContext } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';

export async function GET(request: Request) {
  try {
    // 1. Authorization check - Standardized via requireAnyRole
    const authError = await requireAnyRole(['admin', 'muallimah']);
    if (authError) return authError;

    const context = await getAuthorizationContext();
    if (!context) return ApiResponses.unauthorized('Unable to get authorization context');

    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    // Admin/Muallimah context — only admin may look up another user's registration
    const isAdmin = context.roles.includes('admin');
    if (userId && userId !== context.userId && !isAdmin) {
      return ApiResponses.forbidden('Hanya admin yang dapat melihat pendaftaran muallimah lain');
    }
    const targetUserId = userId || context.userId;

    // Get muallimah registration
    let query = supabase
      .from('muallimah_registrations')
      .select(`
        *,
        batch:batches(id, name, status),
        user:users(id, full_name, nama_kunyah, email, whatsapp)
      `)
      .order('created_at', { ascending: false });

    if (isAdmin && !userId) {
      // Admin viewing all registrations
      const { data: registrations, error } = await query;
      
      if (error) {
        console.error('[Muallimah Registration API] Database error (all):', error);
        return ApiResponses.databaseError(error);
      }
      
      return ApiResponses.success(registrations || []);
    } else {
      // Viewing specific registration (muallimah own, or admin viewing specific user)
      const { data: registration, error } = await query
        .eq('user_id', targetUserId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[Muallimah Registration API] Database error (single):', error);
        return ApiResponses.databaseError(error);
      }
      
      return ApiResponses.success(registration);
    }
  } catch (error) {
    console.error('[Muallimah Registration API] Unexpected error:', error);
    return ApiResponses.handleUnknown(error);
  }
}
