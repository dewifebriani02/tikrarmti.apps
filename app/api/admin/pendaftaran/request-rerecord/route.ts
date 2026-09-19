import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getAuthorizationContext } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { deleteUploadedFile } from '@/lib/storage';

export async function POST(request: Request) {
  try {
    const response = new NextResponse();
    const context = await getAuthorizationContext({ response });
    if (!context || !context.roles.includes('admin')) {
      return ApiResponses.unauthorized();
    }

    const { registrationId } = await request.json();
    
    if (!registrationId) {
      return NextResponse.json({ success: false, error: 'Registration ID required' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdmin();
    
    // 1. Get the registration to find the old URL
    const { data: registration, error: fetchError } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select('oral_submission_url')
      .eq('id', registrationId)
      .single();
      
    if (fetchError) {
      return NextResponse.json({ success: false, error: 'Failed to fetch registration' }, { status: 500 });
    }

    // 2. Delete the old file from local storage if it exists
    if (registration.oral_submission_url) {
      try {
        const urlObj = new URL(registration.oral_submission_url);
        const pathname = urlObj.pathname;
        let filePath = '';
        if (pathname.includes('/selection-audios/')) {
          filePath = pathname.split('/selection-audios/')[1];
        } else if (pathname.includes('/recordings/')) {
          filePath = pathname.split('/recordings/')[1];
        } else {
          filePath = pathname.split('/').pop() || '';
        }
        
        if (filePath) {
          await deleteUploadedFile('selection-audios', filePath);
        }
      } catch (e) {
        console.error('[Admin] Error parsing URL for deletion:', e);
      }
    }

    // 3. Reset the fields and set needs_revision = true
    const { error: updateError } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .update({
        oral_submission_url: null,
        oral_submission_file_name: null,
        oral_submitted_at: null,
        oral_assessment_status: 'pending',
        oral_score: null, // Legacy field
        oral_total_score: null,
        needs_revision: true
      })
      .eq('id', registrationId);

    if (updateError) {
      return NextResponse.json({ success: false, error: 'Failed to reset registration data' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Berhasil direset. Thalibah kini dapat merekam ulang.' });

  } catch (error) {
    console.error('[Admin Request Rerecord API] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
