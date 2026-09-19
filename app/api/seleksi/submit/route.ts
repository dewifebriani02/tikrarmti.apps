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

    if (contentType?.includes('multipart/form-data')) {
      console.log('📎 API: Processing multipart form data');

      // Handle audio file upload
      const formData = await request.formData();
      console.log('📋 API: FormData keys received:', Array.from(formData.keys()));

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

      // Determine file extension based on MIME type
      let fileExtension = 'webm'; // default
      if (audioFile.type.includes('mp4') || audioFile.type.includes('m4a')) {
        fileExtension = 'mp4';
      } else if (audioFile.type.includes('ogg')) {
        fileExtension = 'ogg';
      } else if (audioFile.type.includes('wav')) {
        fileExtension = 'wav';
      }

      const fileName = `selection-${user.id}-${Date.now()}.${fileExtension}`;
      console.log('📤 API: Uploading audio file:', fileName, 'Size:', audioFile.size, 'Type:', audioFile.type);

      // Additional validation for mobile/tablet uploads
      const validAudioTypes = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/mp4',
        'audio/mpeg',
        'audio/ogg',
        'audio/ogg;codecs=opus',
        'audio/wav',
        'audio/m4a',
        'audio/mp3',
        'audio/x-m4a',
        'audio/3gpp', // Some Android devices
        'audio/x-wav' // Some iOS devices
      ];

      // Check if type is valid OR if it starts with audio/ OR if it's empty/mobile-specific
      const isValidAudioType = validAudioTypes.some(type =>
        audioFile.type === type ||
        audioFile.type.includes(type.split(';')[0]) ||
        audioFile.type.startsWith('audio/') ||
        !audioFile.type || // Empty type is ok for mobile
        audioFile.type === 'application/octet-stream' // Some mobile browsers use this
      );

      if (!isValidAudioType) {
        console.warn('⚠️ API: Unusual audio MIME type:', audioFile.type);
        // Still try to upload - be more permissive for mobile devices
      }

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

    // Check if user already exists in pendaftaran_tikrar_tahfidz
    // console.log('🔍 Checking registration for user:', user.id);

    const { data: existingRegistration, error: checkError } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (checkError) {
      // console.error('❌ Check registration error:', checkError);
    }

    if (!existingRegistration) {
      // console.error('❌ Registration not found for user:', user.id);
      return NextResponse.json(
        { error: 'Pendaftaran tidak ditemukan' },
        { status: 404 }
      );
    }

    // console.log('✅ Found registration:', existingRegistration.id);

    // Check if already submitted this type of selection
    if (submissionData.type === 'oral' && existingRegistration.oral_submission_url) {
      return NextResponse.json(
        { error: 'Ukhti sudah menyerahkan rekaman suara' },
        { status: 400 }
      );
    }

    if (submissionData.type === 'written' && existingRegistration.written_quiz_answers) {
      return NextResponse.json(
        { error: 'Ukhti sudah menyelesaikan ujian tulisan' },
        { status: 400 }
      );
    }

    // Update pendaftaran_tikrar_tahfidz with selection data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (submissionData.type === 'oral') {
      updateData.oral_submission_url = submissionData.audio_url;
      updateData.oral_submission_file_name = submissionData.file_name;
      updateData.oral_submitted_at = new Date().toISOString();

      // selection_status tetap 'pending' sampai admin review
      // Valid values: 'pending', 'selected', 'not_selected', 'waitlist'
    } else {
      updateData.written_quiz_answers = submissionData.answers;
      updateData.written_quiz_score = submissionData.score;
      updateData.written_quiz_total_questions = submissionData.total_questions;
      updateData.written_quiz_correct_answers = submissionData.correct_answers;
      updateData.written_quiz_submitted_at = new Date().toISOString();

      // selection_status tetap 'pending' sampai admin review
    }

    // console.log('💾 Updating registration with data:', updateData);

    const { data: submission, error: updateError } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .update(updateData)
      .eq('id', existingRegistration.id)
      .select()
      .single();

    if (updateError) {
      // console.error('❌ Update error:', updateError);
      // console.error('❌ Update error details:', JSON.stringify(updateError, null, 2));
      return NextResponse.json(
        { error: 'Failed to save submission', details: updateError.message, code: updateError.code },
        { status: 500 }
      );
    }

    // console.log('✅ Update successful:', submission);

    return NextResponse.json({
      success: true,
      submission: submission,
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

    // Get user's registration data using admin client
    const { data: registration, error } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch registration data' },
        { status: 500 }
      );
    }

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