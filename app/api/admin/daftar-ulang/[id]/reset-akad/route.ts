import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { deleteUploadedFile } from '@/lib/storage';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/daftar-ulang/[id]/reset-akad
 * Deletes the akad files for a submission and sets akad_status to 'draft'
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

    // Get current submission
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('daftar_ulang_submissions')
      .select('*, user:users!daftar_ulang_submissions_user_id_fkey(id, full_name)')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Try to delete files from storage if they exist
    if (submission.akad_files && Array.isArray(submission.akad_files)) {
      for (const file of submission.akad_files) {
        try {
          const urlParts = (file.url || '').split('/documents/');
          if (urlParts.length > 1) {
            await deleteUploadedFile('documents', urlParts[1]);
          }
        } catch (e) {
          console.error('[Reset Akad] Error deleting file:', e);
        }
      }
    }

    // Update submission
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('daftar_ulang_submissions')
      .update({
        akad_files: null,
        akad_status: 'draft',
        status: 'draft',
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (updateError) {
      console.error('[Reset Akad] Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `File akad untuk "${submission.user?.full_name}" berhasil dihapus. User dapat mengupload ulang.`,
      data: updated
    });

  } catch (error: any) {
    console.error('[Reset Akad] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
