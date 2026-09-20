import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getClientIp, getUserAgent, logAudit } from '@/lib/audit-log';
import { query } from '@/lib/db';

const supabaseAdmin = createSupabaseAdmin();

export async function GET(request: NextRequest) {
  try {
    // Use Supabase SSR client to get session
    const supabase = createServerClient();

    // Get user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Auth error:', userError);
      return NextResponse.json({
        error: 'Unauthorized - Invalid session. Please login again.',
        needsLogin: true
      }, { status: 401 });
    }

    // Check if user is admin using admin client
    const { data: userData, error: dbError } = await supabaseAdmin
      .from('users')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (dbError || !userData || !userData.roles?.includes('admin')) {
      console.error('Admin check failed:', dbError, userData);
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get batch_id from query parameter
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batch_id');

    if (!batchId) {
      return NextResponse.json(
        { error: 'Missing required parameter: batch_id' },
        { status: 400 }
      );
    }

    console.log('[Matching Analysis API] Loading matching analysis for batch:', batchId);

    // Fetch batch data
    const batchRes = await query(`SELECT id, name FROM batches WHERE id = $1`, [batchId]);
    const batchData = batchRes.rows[0] || null;

    // Fetch all applicants for this batch
    const pendaftaranRes = await query(
      `SELECT 
        user_id, 
        full_name, 
        COALESCE(final_juz, chosen_juz, '') as chosen_juz, 
        COALESCE(main_time_slot, '') as main_time_slot, 
        COALESCE(backup_time_slot, '') as backup_time_slot,
        COALESCE(timezone, 'WIB') as timezone
       FROM pendaftaran_tikrar_tahfidz
       WHERE batch_id = $1`,
      [batchId]
    );

    const rows = pendaftaranRes.rows;

    const parseJuzNum = (juzStr: string) => {
      const match = juzStr.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };

    const matches = rows.map((u, i) => {
      let total_matches = 0;
      let zona_waktu_matches = 0;
      let same_juz_matches = 0;
      let cross_juz_matches = 0;

      rows.forEach((other, j) => {
        if (i === j) return;

        const timeMatch =
          (u.main_time_slot && (u.main_time_slot === other.main_time_slot || u.main_time_slot === other.backup_time_slot)) ||
          (u.backup_time_slot && (u.backup_time_slot === other.main_time_slot || u.backup_time_slot === other.backup_time_slot));

        if (timeMatch) {
          total_matches++;
          if (u.timezone && other.timezone && u.timezone === other.timezone) {
            zona_waktu_matches++;
          }
          if (u.chosen_juz && other.chosen_juz && u.chosen_juz === other.chosen_juz) {
            same_juz_matches++;
          } else {
            cross_juz_matches++;
          }
        }
      });

      return {
        user_id: u.user_id,
        user_name: u.full_name,
        user_juz: u.chosen_juz,
        user_juz_number: parseJuzNum(u.chosen_juz),
        user_zona_waktu: u.timezone,
        user_main_time: u.main_time_slot,
        user_backup_time: u.backup_time_slot,
        total_matches,
        zona_waktu_matches,
        same_juz_matches,
        cross_juz_matches,
      };
    });

    // Audit log for matching analysis access
    await logAudit({
      userId: user.id,
      action: 'READ',
      resource: 'matching_analysis',
      details: {
        batch_id: batchId,
        batch_name: batchData?.name,
        thalibah_analyzed: matches?.length || 0
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      level: 'INFO'
    });

    return NextResponse.json({
      success: true,
      data: {
        batch: batchData,
        matches: matches || []
      }
    });

  } catch (error: any) {
    console.error('[Matching Analysis API] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
