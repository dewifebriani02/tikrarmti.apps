import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import {
  removeSubmissionFromHalaqahStudents,
  syncApprovedSubmissionToHalaqahStudents
} from '@/lib/halaqah-students-sync';

/**
 * POST /api/admin/daftar-ulang/[id]/update-status
 * Update akad_status or partner_status independently
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const supabaseAdmin = createSupabaseAdmin();

    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (!userData?.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const submissionId = params.id;
    const body = await request.json();
    const { type, status } = body;

    if (!['akad', 'partner'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    if (!['draft', 'submitted', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get current submission
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('daftar_ulang_submissions')
      .select('*, user:users!daftar_ulang_submissions_user_id_fkey(id, full_name, roles)')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (type === 'akad') {
      updateData.akad_status = status;
    } else {
      updateData.partner_status = status;
    }

    // Determine derived global status
    const newAkadStatus = type === 'akad' ? status : submission.akad_status;
    const newPartnerStatus = type === 'partner' ? status : submission.partner_status;
    
    let globalStatus = 'draft';
    if (newAkadStatus === 'approved' && newPartnerStatus === 'approved') {
      globalStatus = 'approved';
      if (submission.status !== 'approved') {
        updateData.approved_at = new Date().toISOString();
      }
    } else if (
      newAkadStatus === 'submitted' ||
      newPartnerStatus === 'submitted' ||
      newAkadStatus === 'approved' ||
      newPartnerStatus === 'approved'
    ) {
      globalStatus = 'submitted';
    } else {
      globalStatus = 'draft';
    }
    
    updateData.status = globalStatus;

    // Update submission status
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('daftar_ulang_submissions')
      .update(updateData)
      .eq('id', submissionId)
      .select()
      .single();

    if (updateError) {
      console.error('[Update Status Daftar Ulang] Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (globalStatus === 'approved') {
      await syncApprovedSubmissionToHalaqahStudents(supabaseAdmin, updated, user.id);
    } else if (submission.status === 'approved') {
      await removeSubmissionFromHalaqahStudents(supabaseAdmin, submission);
    }

    // If fully approved, ensure user has 'thalibah' role
    if (globalStatus === 'approved' && submission.status !== 'approved') {
      const userRoles = submission.user?.roles || [];
      const uniqueRoles = Array.from(new Set(
        userRoles
          .filter((r: string) => !['calon_thalibah', 'muallimah', 'musyrifah'].includes(r))
          .concat('thalibah')
      ));

      await supabaseAdmin
        .from('users')
        .update({
          roles: uniqueRoles,
          updated_at: new Date().toISOString(),
          role: 'thalibah' // Canonical single role
        })
        .eq('id', submission.user_id);
    }

    return NextResponse.json({
      success: true,
      message: `Status ${type} berhasil diupdate menjadi ${status}`,
      data: updated
    });

  } catch (error: any) {
    console.error('[Update Status Daftar Ulang] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
