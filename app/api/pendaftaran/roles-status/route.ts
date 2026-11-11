import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationContext } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const response = new NextResponse();
    const context = await getAuthorizationContext({ response });
    if (!context) return ApiResponses.unauthorized();

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batch_id');
    const targetUserId = searchParams.get('user_id');
    const isAdmin = context.roles.includes('admin');
    const userId = (isAdmin && targetUserId) ? targetUserId : context.userId;

    let isRegisteredMuallimah = false;
    let isRegisteredMusyrifah = false;

    if (userId) {
      if (batchId) {
        // 1. Check Muallimah registration in muallimah_akads for this batch
        const { rows: akadRows } = await query(
          'SELECT id FROM muallimah_akads WHERE user_id = $1 AND batch_id = $2 LIMIT 1',
          [userId, batchId]
        );
        // Also check muallimah_registrations
        const { rows: regRows } = await query(
          'SELECT id FROM muallimah_registrations WHERE user_id = $1 AND (batch_id = $2 OR batch_id IS NULL) LIMIT 1',
          [userId, batchId]
        );
        // Fallback by email if available
        let emailMatch = false;
        if (akadRows.length === 0 && regRows.length === 0 && context.email) {
          const { rows: emailRows } = await query(
            'SELECT id FROM muallimah_registrations WHERE LOWER(email) = LOWER($1) AND (batch_id = $2 OR batch_id IS NULL) LIMIT 1',
            [context.email, batchId]
          );
          emailMatch = emailRows.length > 0;
        }

        isRegisteredMuallimah = akadRows.length > 0 || regRows.length > 0 || emailMatch;

        // 2. Check Musyrifah registration for this batch
        const { rows: musyRows } = await query(
          'SELECT id FROM musyrifah_registrations WHERE user_id = $1 AND batch_id = $2 LIMIT 1',
          [userId, batchId]
        );
        let emailMusyMatch = false;
        if (musyRows.length === 0 && context.email) {
          const { rows: emailMusyRows } = await query(
            'SELECT id FROM musyrifah_registrations WHERE LOWER(email) = LOWER($1) AND batch_id = $2 LIMIT 1',
            [context.email, batchId]
          );
          emailMusyMatch = emailMusyRows.length > 0;
        }

        isRegisteredMusyrifah = musyRows.length > 0 || emailMusyMatch;
      } else {
        const { rows: akadRows } = await query(
          'SELECT id FROM muallimah_akads WHERE user_id = $1 LIMIT 1',
          [userId]
        );
        const { rows: regRows } = await query(
          'SELECT id FROM muallimah_registrations WHERE user_id = $1 LIMIT 1',
          [userId]
        );
        isRegisteredMuallimah = akadRows.length > 0 || regRows.length > 0;

        const { rows: musyRows } = await query(
          'SELECT id FROM musyrifah_registrations WHERE user_id = $1 LIMIT 1',
          [userId]
        );
        isRegisteredMusyrifah = musyRows.length > 0;
      }
    }

    return ApiResponses.success({
      isRegisteredMuallimah,
      isRegisteredMusyrifah,
    });
  } catch (error) {
    console.error('[Roles Status API] Error:', error);
    return ApiResponses.handleUnknown(error);
  }
}
