import { createSupabaseAdmin } from '@/lib/supabase';
import { getAuthorizationContext, requireAuth } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { generalApiRateLimit } from '@/lib/rate-limiter';
import { getClientIp, getUserAgent, logAudit } from '@/lib/audit-log';

const supabaseAdmin = createSupabaseAdmin();

export async function GET(request: Request) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const context = await getAuthorizationContext();
    if (!context) return ApiResponses.unauthorized();

    const { searchParams } = new URL(request.url);
    const target_user_id = searchParams.get('target_user_id');

    let auditUserId = context.userId;
    if (target_user_id && target_user_id !== context.userId) {
      if (!context.roles.includes('admin') && !context.roles.includes('musyrifah')) {
        return ApiResponses.unauthorized('Hanya Admin/Musyrifah yang dapat melihat data Sit-In thalibah lain.');
      }
      auditUserId = target_user_id;
    }

    // Get Monday of current week
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const { data: logs, error: logError } = await supabaseAdmin
      .from('activity_logs')
      .select('id, timestamp, details')
      .eq('resource', 'halaqah')
      .eq('user_id', auditUserId)
      .gte('timestamp', startOfWeek.toISOString())
      .order('timestamp', { ascending: false })
      .limit(10);

    if (logError) {
      console.warn('[Sit-In GET] Error fetching activity logs:', logError);
      return ApiResponses.success({ sit_in: null });
    }

    // Find the latest valid sit-in action
    let activeSitIn: any = null;
    for (const log of (logs || [])) {
      const actionType = log.details?.action_type;
      if (actionType === 'CANCEL_SIT_IN') {
        break; // Latest action was cancel, no active sit-in
      }
      if (actionType === 'SIT_IN') {
        activeSitIn = log;
        break;
      }
    }

    if (!activeSitIn || !activeSitIn.details?.halaqah_id) {
      return ApiResponses.success({ sit_in: null });
    }

    const halaqahId = activeSitIn.details.halaqah_id;
    const { data: targetHalaqah } = await supabaseAdmin
      .from('halaqah')
      .select(`
        id, name, zoom_link, zoom_link_id, location,
        zoom:batch_zoom_links!halaqah_zoom_link_id_fkey(name, url, meeting_id, passcode),
        program:programs!inner(batch_id)
      `)
      .eq('id', halaqahId)
      .maybeSingle();

    let zoomInfo = {
      url: '',
      meeting_id: '',
      passcode: '',
      name: ''
    };

    if (targetHalaqah) {
      const zoomData: any = Array.isArray(targetHalaqah.zoom) ? targetHalaqah.zoom[0] : targetHalaqah.zoom;
      zoomInfo = {
        url: zoomData?.url || targetHalaqah.zoom_link || '',
        meeting_id: zoomData?.meeting_id || '',
        passcode: zoomData?.passcode || '',
        name: zoomData?.name || ''
      };

      if (!zoomInfo.url && targetHalaqah.location && (targetHalaqah.location.includes('http') || targetHalaqah.location.includes('zoom'))) {
        zoomInfo.url = targetHalaqah.location;
      }

      // Fallback to batch zoom links if not found
      if (!zoomInfo.url && targetHalaqah.program?.batch_id) {
        const { data: batchZooms } = await supabaseAdmin
          .from('batch_zoom_links')
          .select('name, url, meeting_id, passcode')
          .eq('batch_id', targetHalaqah.program.batch_id);

        if (batchZooms && batchZooms.length > 0) {
          const matched = batchZooms.find((z: any) => z.name === targetHalaqah.name) || batchZooms[0];
          if (matched) {
            zoomInfo = {
              url: matched.url || '',
              meeting_id: matched.meeting_id || '',
              passcode: matched.passcode || '',
              name: matched.name || ''
            };
          }
        }
      }
    }

    return ApiResponses.success({
      sit_in: {
        halaqah_id: halaqahId,
        halaqah_name: activeSitIn.details?.halaqah_name || targetHalaqah?.name || 'Halaqah',
        timestamp: activeSitIn.timestamp,
        zoom: zoomInfo
      }
    });
  } catch (error) {
    console.error('[Sit-In API GET] Error:', error);
    return ApiResponses.handleUnknown(error);
  }
}

export async function POST(request: Request) {
  try {
    // 1. Authorization check
    const authError = await requireAuth();
    if (authError) return authError;

    const context = await getAuthorizationContext();
    if (!context) return ApiResponses.unauthorized();

    // 2. Rate limit
    if (generalApiRateLimit) {
      const { success } = await generalApiRateLimit.limit(`alumni:sit-in:${context.userId}`);
      if (!success) return ApiResponses.rateLimit('Terlalu banyak permintaan. Coba lagi nanti.');
    }

    const body = await request.json();
    const { halaqah_id, target_user_id, batch_id } = body;

    let auditUserId = context.userId;

    // Admin can register on behalf of thalibah
    if (target_user_id && target_user_id !== context.userId) {
      if (!context.roles.includes('admin') && !context.roles.includes('musyrifah')) {
         return ApiResponses.unauthorized('Hanya Admin/Musyrifah yang dapat memindahkan kelas Sit-In Thalibah lain.');
      }
      auditUserId = target_user_id;
    }

    if (!halaqah_id) {
      return ApiResponses.badRequest('ID Halaqah diperlukan.');
    }

    // 3. Verify target halaqah quota and get Zoom details
    const { data: targetHalaqah } = await supabaseAdmin
      .from('halaqah')
      .select(`
        id, name, max_students, zoom_link, zoom_link_id, location,
        students:halaqah_students(id, status),
        zoom:batch_zoom_links!halaqah_zoom_link_id_fkey(name, url, meeting_id, passcode),
        program:programs!inner(batch_id)
      `)
      .eq('id', halaqah_id)
      .single();

    if (!targetHalaqah) {
      return ApiResponses.notFound('Halaqah tidak ditemukan.');
    }

    const activeCount = targetHalaqah.students?.filter((s: any) => s.status === 'active').length || 0;
    if (activeCount >= (targetHalaqah.max_students || 999)) {
      return ApiResponses.badRequest('Halaqah tujuan sudah penuh.');
    }

    // 4. Extract Zoom Info with multi-layer fallback
    const zoomData: any = Array.isArray(targetHalaqah.zoom) ? targetHalaqah.zoom[0] : targetHalaqah.zoom;
    
    let zoomInfo = {
      url: zoomData?.url || targetHalaqah.zoom_link || '',
      meeting_id: zoomData?.meeting_id || '',
      passcode: zoomData?.passcode || '',
      name: zoomData?.name || ''
    };

    if (!zoomInfo.url && targetHalaqah.location && (targetHalaqah.location.includes('http') || targetHalaqah.location.includes('zoom'))) {
      zoomInfo.url = targetHalaqah.location;
    }

    // If still no url, check batch zoom links
    const effectiveBatchId = batch_id || targetHalaqah.program?.batch_id;
    if (!zoomInfo.url && effectiveBatchId) {
      const { data: batchZooms } = await supabaseAdmin
        .from('batch_zoom_links')
        .select('name, url, meeting_id, passcode')
        .eq('batch_id', effectiveBatchId);

      if (batchZooms && batchZooms.length > 0) {
        const matched = batchZooms.find((z: any) => z.name === targetHalaqah.name) || batchZooms[0];
        if (matched) {
          zoomInfo = {
            url: matched.url || '',
            meeting_id: matched.meeting_id || '',
            passcode: matched.passcode || '',
            name: matched.name || ''
          };
        }
      }
    }

    // 5. Audit Log (as a simple way to track sit-ins without creating a new table)
    await logAudit({
      userId: auditUserId,
      action: 'UPDATE',
      resource: 'halaqah',
      details: { action_type: 'SIT_IN', halaqah_id, halaqah_name: targetHalaqah.name },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      level: 'INFO'
    });

    return ApiResponses.success({ 
      message: 'Berhasil mendaftar sit-in',
      zoom: zoomInfo
    });
  } catch (error) {
    console.error('[Sit-In API] Error:', error);
    return ApiResponses.handleUnknown(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const context = await getAuthorizationContext();
    if (!context) return ApiResponses.unauthorized();

    const { searchParams } = new URL(request.url);
    const target_user_id = searchParams.get('target_user_id');

    let auditUserId = context.userId;

    if (target_user_id && target_user_id !== context.userId) {
      if (!context.roles.includes('admin') && !context.roles.includes('musyrifah')) {
         return ApiResponses.unauthorized('Hanya Admin/Musyrifah yang dapat membatalkan kelas Sit-In Thalibah lain.');
      }
      auditUserId = target_user_id;
    }

    await logAudit({
      userId: auditUserId,
      action: 'UPDATE',
      resource: 'halaqah',
      details: { action_type: 'CANCEL_SIT_IN' },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      level: 'INFO'
    });

    return ApiResponses.success({ message: 'Sit-In dibatalkan' });
  } catch (error) {
    console.error('[Sit-In API DELETE] Error:', error);
    return ApiResponses.handleUnknown(error);
  }
}
