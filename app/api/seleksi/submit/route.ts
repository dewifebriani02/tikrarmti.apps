import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { createServerClient } from '@/lib/supabase/server';
import { saveUploadedFile } from '@/lib/storage';

// PostgreSQL-backed admin client
const supabaseAdmin = createSupabaseAdmin();

export async function POST(request: NextRequest) {
  try {
    console.log('🎵 API: Received audio submission request');

    // Simple authentication using Supabase SSR client
    const supabase = createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('❌ API: Auth error:', userError);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session. Please login again.', needsLogin: true },
        { status: 401 }
      );
    }

    console.log('✅ API: User authenticated:', user.id);

    const contentType = request.headers.get('content-type');
    console.log('📄 Content-Type:', contentType);

    let submissionData: any = {};
    let targetRegistrationId: string | null = null;
    let targetBatchId: string | null = null;

    if (contentType?.includes('multipart/form-data')) {
      console.log('📎 API: Processing multipart form data');

      // Handle audio file upload
      const formData = await request.formData();
      console.log('📋 API: FormData keys received:', Array.from(formData.keys()));

      targetRegistrationId = (formData.get('registration_id') || formData.get('registrationId')) as string | null;
      targetBatchId = (formData.get('batch_id') || formData.get('batchId')) as string | null;

      const audioFile = formData.get('audio') as File;
      console.log('🎵 API: Audio file details:', {
        name: audioFile?.name,
        size: audioFile?.size,
        type: audioFile?.type,
        isFile: audioFile instanceof File
      });

      if (!audioFile) {
        console.error('❌ API: No audio file in form data');
        return NextResponse.json(
          { error: 'No audio file provided' },
          { status: 400 }
        );
      }

      // Validate file
      if (!(audioFile instanceof File)) {
        console.error('❌ API: audioFile is not a File object:', typeof audioFile);
        return NextResponse.json(
          { error: 'Invalid audio file format' },
          { status: 400 }
        );
      }

      if (audioFile.size === 0) {
        console.error('❌ API: Audio file is empty');
        return NextResponse.json(
          { error: 'Audio file is empty' },
          { status: 400 }
        );
      }

      console.log('🎵 API: Audio file validation passed');

      // Determine file extension based on MIME type or file name
      let fileExtension = 'webm'; // default
      const origName = (audioFile.name || '').toLowerCase();
      if (origName.endsWith('.mp3') || audioFile.type.includes('mpeg') || audioFile.type.includes('mp3')) {
        fileExtension = 'mp3';
      } else if (origName.endsWith('.m4a') || audioFile.type.includes('m4a') || audioFile.type.includes('mp4')) {
        fileExtension = 'm4a';
      } else if (origName.endsWith('.wav') || audioFile.type.includes('wav')) {
        fileExtension = 'wav';
      } else if (origName.endsWith('.ogg') || audioFile.type.includes('ogg')) {
        fileExtension = 'ogg';
      } else if (origName.endsWith('.aac') || audioFile.type.includes('aac')) {
        fileExtension = 'aac';
      }

      const fileName = `selection-${user.id}-${Date.now()}.${fileExtension}`;
      console.log('📤 API: Uploading audio file:', fileName, 'Size:', audioFile.size, 'Type:', audioFile.type);

      const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
      const { publicUrl } = await saveUploadedFile('selection-audios', fileName, audioBuffer);

      console.log('✅ API: Upload successful, Local URL:', publicUrl);

      submissionData = {
        user_id: user.id,
        type: 'oral',
        audio_url: publicUrl,
        file_name: fileName,
        submission_date: new Date().toISOString()
      };
    } else {
      // Handle written quiz submission
      const body = await request.json();
      targetRegistrationId = body.registration_id || body.registrationId || null;
      targetBatchId = body.batch_id || body.batchId || null;

      submissionData = {
        user_id: user.id,
        type: 'written',
        answers: body.answers,
        score: body.score,
        total_questions: body.totalQuestions,
        correct_answers: body.correctAnswers,
        submission_date: new Date().toISOString()
      };
    }

    // Find the matching registration record for this user
    let registrationQuery = supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select('*')
      .eq('user_id', user.id);

    if (targetRegistrationId) {
      registrationQuery = registrationQuery.eq('id', targetRegistrationId);
    } else if (targetBatchId) {
      registrationQuery = registrationQuery.eq('batch_id', targetBatchId).order('created_at', { ascending: false }).limit(1);
    } else {
      registrationQuery = registrationQuery.order('created_at', { ascending: false }).limit(1);
    }

    const { data: registrationRows, error: checkError } = await registrationQuery;

    if (checkError) {
      console.error('❌ Check registration error:', checkError);
    }

    const existingRegistration = registrationRows && registrationRows.length > 0 ? registrationRows[0] : null;

    if (!existingRegistration) {
      console.error('❌ Registration not found for user:', user.id, { targetRegistrationId, targetBatchId });
      return NextResponse.json(
        { error: 'Pendaftaran tidak ditemukan' },
        { status: 404 }
      );
    }

    console.log('✅ Found registration:', existingRegistration.id);

    // Allow re-recording / editing unless already graded ('pass' or 'fail')
    if (submissionData.type === 'oral' && existingRegistration.oral_submission_url) {
      const isGraded = existingRegistration.oral_assessment_status === 'pass' ||
                       existingRegistration.oral_assessment_status === 'fail' ||
                       (existingRegistration.selection_status && existingRegistration.selection_status !== 'pending');
      if (isGraded) {
        return NextResponse.json(
          { error: 'Rekaman suara sudah dinilai dan tidak dapat diubah' },
          { status: 400 }
        );
      }
    }

    if (submissionData.type === 'written' && existingRegistration.written_quiz_answers) {
      const isGraded = existingRegistration.selection_status && existingRegistration.selection_status !== 'pending';
      if (isGraded) {
        return NextResponse.json(
          { error: 'Ujian tulisan sudah dinilai dan tidak dapat diubah' },
          { status: 400 }
        );
      }
    }

    // Update pendaftaran_tikrar_tahfidz with selection data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (submissionData.type === 'oral') {
      updateData.oral_submission_url = submissionData.audio_url;
      updateData.oral_submission_file_name = submissionData.file_name;
      updateData.oral_submitted_at = new Date().toISOString();
      updateData.oral_assessment_status = 'pending';
      // selection_status tetap 'pending' sampai admin review
    } else {
      updateData.written_quiz_answers = submissionData.answers;
      updateData.written_quiz_score = submissionData.score;
      updateData.written_quiz_total_questions = submissionData.total_questions;
      updateData.written_quiz_correct_answers = submissionData.correct_answers;
      updateData.written_quiz_submitted_at = new Date().toISOString();
      // selection_status tetap 'pending' sampai admin review
    }

    const { data: submission, error: updateError } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .update(updateData)
      .eq('id', existingRegistration.id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to save submission', details: updateError.message, code: updateError.code },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      submission: submission,
      data: submission,
      message: 'Seleksi berhasil dikirim'
    });

  } catch (error) {
    console.error('Selection submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Simple authentication using Supabase SSR client
    const supabase = createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session. Please login again.', needsLogin: true },
        { status: 401 }
      );
    }

    const targetRegistrationId = request.nextUrl.searchParams.get('registration_id') || request.nextUrl.searchParams.get('registrationId');
    const targetBatchId = request.nextUrl.searchParams.get('batch_id') || request.nextUrl.searchParams.get('batchId');

    let registrationQuery = supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select('*')
      .eq('user_id', user.id);

    if (targetRegistrationId) {
      registrationQuery = registrationQuery.eq('id', targetRegistrationId);
    } else if (targetBatchId) {
      registrationQuery = registrationQuery.eq('batch_id', targetBatchId).order('created_at', { ascending: false }).limit(1);
    } else {
      registrationQuery = registrationQuery.order('created_at', { ascending: false }).limit(1);
    }

    const { data: registrationRows, error } = await registrationQuery;

    if (error) {
      console.error('Fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch registration data' },
        { status: 500 }
      );
    }

    const registration = registrationRows && registrationRows.length > 0 ? registrationRows[0] : null;

    if (!registration) {
      return NextResponse.json({
        success: true,
        hasOral: false,
        hasWritten: false,
        registration: null
      });
    }

    // Check what types have been submitted
    const hasOral = !!registration.oral_submission_url;
    const hasWritten = !!registration.written_quiz_answers;

    return NextResponse.json({
      success: true,
      hasOral,
      hasWritten,
      registration: registration
    });

  } catch (error) {
    console.error('Get selection status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
