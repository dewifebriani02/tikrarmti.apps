import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getClientIp, getUserAgent, logAudit } from '@/lib/audit-log';

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
    let batchId = searchParams.get('batch_id');

    if (!batchId || batchId === 'null' || batchId === 'undefined') {
      const { data: activeBatch } = await supabaseAdmin
        .from('batches')
        .select('id')
        .in('status', ['open', 'ongoing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      batchId = activeBatch?.id || null;
    }

    if (!batchId) {
      return NextResponse.json(
        { error: 'Missing required parameter: batch_id' },
        { status: 400 }
      );
    }

    console.log('[Analysis API] Loading analysis for batch:', batchId);

    // Get batch info
    const { data: batchData, error: batchError } = await supabaseAdmin
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (batchError || !batchData) {
      console.error('[Analysis API] Batch not found:', batchError);
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    // Get muallimah stats for this batch
    console.log('[Analysis API] Querying muallimah for batch_id:', batchId);
    const { data: muallimahs, error: muallimaError } = await supabaseAdmin
      .from('muallimah_akads')
      .select('id, status, preferred_max_thalibah, user_id, exclude_from_capacity, preferred_schedule, backup_schedule, paid_class_scheme')
      .eq('batch_id', batchId);

    if (muallimaError) {
      console.error('[Analysis API] Error loading muallimah:', muallimaError);
      return NextResponse.json(
        { error: 'Failed to load muallimah data', details: muallimaError.message },
        { status: 500 }
      );
    }

    console.log('[Analysis API] Muallimah query result:', {
      count: muallimahs?.length,
      sample: muallimahs?.slice(0, 3)
    });

    // Get thalibah stats for this batch (from pendaftaran_tikrar_tahfidz)
    console.log('[Analysis API] Querying thalibah for batch_id:', batchId);
    const { data: thalibahs, error: thalibahError } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select('id, status, selection_status, program_id, programs!inner(class_type)')
      .eq('batch_id', batchId);

    if (thalibahError) {
      console.error('[Analysis API] Error loading thalibah:', thalibahError);
      return NextResponse.json(
        { error: 'Failed to load thalibah data', details: thalibahError.message },
        { status: 500 }
      );
    }

    console.log('[Analysis API] Thalibah query result:', {
      count: thalibahs?.length,
      sample: thalibahs?.slice(0, 3)
    });

    // Get daftar ulang submissions for this batch (for accurate capacity calculation)
    console.log('[Analysis API] Querying daftar_ulang_submissions for batch_id:', batchId);
    const { data: daftarUlangSubmissions, error: daftarUlangError } = await supabaseAdmin
      .from('daftar_ulang_submissions')
      .select('id, status, ujian_halaqah_id, tashih_halaqah_id, is_tashih_umum, user_id')
      .eq('batch_id', batchId)
      .in('status', ['submitted', 'approved']); // Only count submitted and approved for capacity

    if (daftarUlangError) {
      console.error('[Analysis API] Error loading daftar ulang submissions:', daftarUlangError);
      // Don't fail, just log and continue
      console.log('[Analysis API] Continuing without daftar ulang data');
    } else {
      console.log('[Analysis API] Daftar ulang submissions result:', {
        count: daftarUlangSubmissions?.length
      });
    }

    // Get all active halaqahs for this batch (filtering by programs.batch_id)
    console.log('[Analysis API] Querying halaqah for batch');
    const { data: halaqahs, error: halaqahError } = await supabaseAdmin
      .from('halaqah')
      .select('id, program_id, max_students, muallimah_id, programs!inner(batch_id, class_type)')
      .eq('status', 'active')
      .eq('programs.batch_id', batchId);

    if (halaqahError) {
      console.error('[Analysis API] Error loading halaqah:', halaqahError);
      return NextResponse.json(
        { error: 'Failed to load halaqah data', details: halaqahError.message },
        { status: 500 }
      );
    }

    console.log('[Analysis API] Halaqah query result:', {
      count: halaqahs?.length
    });

    // Get halaqah students for capacity calculation (if there are halaqahs)
    let students: any[] = [];
    const approvedMuallimaIds = (muallimahs || [])
      .filter((m: any) => m.status === 'approved' && !m.exclude_from_capacity)
      .map((m: any) => m.user_id);

    const batchHalaqahs = (halaqahs || []).filter((h: any) =>
      h.muallimah_id && approvedMuallimaIds.includes(h.muallimah_id)
    );

    console.log('[Analysis API] Halaqah filtering:', {
      totalHalaqahs: halaqahs?.length,
      approvedMuallimaCount: approvedMuallimaIds.length,
      batchHalaqahsCount: batchHalaqahs.length
    });

    if (batchHalaqahs.length > 0) {
      const halaqahIds = batchHalaqahs.map((h: any) => h.id);
      console.log('[Analysis API] Querying halaqah_students for halaqah_ids:', halaqahIds.length);

      const { data: studentsData, error: studentsError } = await supabaseAdmin
        .from('halaqah_students')
        .select('id')
        .in('halaqah_id', halaqahIds)
        .eq('status', 'active');

      if (studentsError) {
        console.error('[Analysis API] Error loading students:', studentsError);
        // Don't fail, just return empty array
        students = [];
      } else {
        students = studentsData || [];
      }

      console.log('[Analysis API] Students query result:', {
        count: students?.length
      });
    }

    // Audit log for analysis access
    await logAudit({
      userId: user.id,
      action: 'READ',
      resource: 'batch_analysis',
      details: {
        batch_id: batchId,
        batch_name: batchData.name,
        muallimah_count: muallimahs?.length || 0,
        thalibah_count: thalibahs?.length || 0,
        halaqah_count: batchHalaqahs.length,
        daftar_ulang_count: daftarUlangSubmissions?.length || 0
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      level: 'INFO'
    });

    return NextResponse.json({
      success: true,
      data: {
        batch: batchData,
        muallimahs: muallimahs || [],
        thalibahs: thalibahs || [],
        halaqahs: halaqahs || [],
        students: students || [],
        daftarUlangSubmissions: daftarUlangSubmissions || []
      }
    });

  } catch (error) {
    console.error('[Analysis API] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
