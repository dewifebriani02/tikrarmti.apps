import { createSupabaseAdmin } from '@/lib/supabase';
import { ApiResponses } from '@/lib/api-responses';
import { requireAdmin, getAuthorizationContext } from '@/lib/rbac';
import { logAudit, getClientIp, getUserAgent } from '@/lib/audit-log';

/**
 * GET /api/admin/users
 *
 * List all users with pagination, search, and filtering.
 * Requires admin role.
 */
export async function GET(request: Request) {
  try {
    // 1. Authorization check
    const authError = await requireAdmin();
    if (authError) return authError;

    const context = await getAuthorizationContext();
    if (!context) return ApiResponses.unauthorized('Unable to get authorization context');

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const pageSize = Math.max(Math.min(parseInt(searchParams.get('pageSize') || '50'), 100), 1);
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const detectDuplicates = searchParams.get('detect_duplicates') === 'true';

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // WORKAROUND: Use specific settings for supabase client if needed, 
    // but usually createSupabaseAdmin is preferred for admin routes.
    // However, some routes prefer anon key if RLS allows it even for admins 
    // to track the specific admin user in audit logs via session.
    const supabase = createSupabaseAdmin();

    // 3. Build query
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,whatsapp.ilike.%${search}%`);
    }

    if (role && role !== 'all') {
      query = query.contains('roles', [role]);
    }

    if (status && status !== 'all') {
      if (status === 'blacklisted') {
        query = query.eq('is_blacklisted', true);
      } else if (status === 'active') {
        query = query.eq('is_active', true).eq('is_blacklisted', false);
      } else if (status === 'inactive') {
        query = query.eq('is_active', false);
      }
    }

    // Handle Duplicate Detection
    if (detectDuplicates) {
      // 1. Get WhatsApp numbers that appear more than once
      const { data: duplicatePhones } = await supabase
        .rpc('get_duplicate_whatsapp');

      // Note: If the RPC doesn't exist yet, we'll need a fallback or create it.
      // Fallback: Fetch all users and filter in-memory (only for small-medium datasets)
      // For now, let's use a subquery-like approach with filter if we don't have RPC
      if (duplicatePhones && duplicatePhones.length > 0) {
        query = query.in('whatsapp', duplicatePhones);
      } else {
        // Alternative: Standard Supabase way using a raw filter if possible, 
        // but Postgres subqueries are better. 
        // Let's use a simpler approach: fetch IDs of users with duplicate phones.
        const { data: dups } = await supabase
          .from('users_duplicate_phones') // Assuming a view or we'll use a direct query
          .select('whatsapp');
        
        if (dups && dups.length > 0) {
          const phones = dups.map(d => d.whatsapp);
          query = query.in('whatsapp', phones);
        } else {
          // If no view, we can rely on a manual query to the users table
          const { data: allUsers } = await supabase
            .from('users')
            .select('whatsapp');
          
          const counts = (allUsers || []).reduce((acc: any, curr) => {
            if (curr.whatsapp) acc[curr.whatsapp] = (acc[curr.whatsapp] || 0) + 1;
            return acc;
          }, {});

          const duplicateList = Object.keys(counts).filter(phone => counts[phone] > 1);
          
          if (duplicateList.length > 0) {
            query = query.in('whatsapp', duplicateList);
          } else {
            // No duplicates found, return empty
            query = query.eq('id', '00000000-0000-0000-0000-000000000000');
          }
        }
      }
    }

    if (sortBy) {
      query = query.order(sortBy as any, { ascending: sortOrder === 'asc' });
    }
    
    query = query.range(from, to);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('[Admin Users API] Query error:', error);
      return ApiResponses.databaseError(error);
    }

    let formattedUsers = users || [];
    const totalCount = count || 0;

    // 4. Enrich data if detectDuplicates is true
    if (detectDuplicates && formattedUsers.length > 0) {
      const userIds = formattedUsers.map(u => u.id);

      // Fetch Journal Stats
      const { data: jurnalStats } = await supabase
        .from('jurnal_records')
        .select('user_id, tanggal_jurnal')
        .in('user_id', userIds)
        .order('tanggal_jurnal', { ascending: false });

      // Fetch Registration/Batch Stats
      const { data: registrations } = await supabase
        .from('pendaftaran_tikrar_tahfidz')
        .select('user_id, batch:batches(name), status')
        .in('user_id', userIds);

      // Map enrichment data to users
      formattedUsers = formattedUsers.map(user => {
        const userJurnals = (jurnalStats || []).filter(j => j.user_id === user.id);
        const userRegs = (registrations || []).filter(r => r.user_id === user.id);
        const registeredBatches = Array.from(new Set<string>(userRegs.map((r: any) => (r.batch as any)?.name).filter(Boolean)));

        return {
          ...user,
          activity_meta: {
            total_jurnal: userJurnals.length,
            latest_jurnal_date: userJurnals.length > 0 ? userJurnals[0].tanggal_jurnal : null,
            registered_batches: registeredBatches,
            has_active_reg: userRegs.some(r => r.status === 'approved' || r.status === 'selected'),
            is_unauthorized_activity: userJurnals.length > 0 && registeredBatches.length === 0
          }
        };
      });
    }

    // 5. Audit log
    await logAudit({
      userId: context.userId,
      action: 'READ',
      resource: 'users',
      details: {
        page,
        pageSize,
        search: search || null,
        role: role || 'all',
        status: status || 'all',
        detectDuplicates,
        resultCount: formattedUsers.length,
        totalCount
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      level: 'INFO'
    });

    return ApiResponses.success({
      users: formattedUsers,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: totalCount ? Math.ceil(totalCount / pageSize) : 0
      }
    });

  } catch (error) {
    console.error('[Admin Users API] Unexpected error:', error);
    return ApiResponses.handleUnknown(error);
  }
}
