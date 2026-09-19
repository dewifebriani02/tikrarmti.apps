import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const AUDIO_DIR = process.env.AUDIO_UPLOAD_DIR || '/home/markaztikrar/htdocs/markaztikrar.id/public/uploads/audio';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.markaztikrar.id';

export async function POST(request: NextRequest) {
  try {
    // Auth via native JWT session
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Base64 API: Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session. Please login again.', needsLogin: true },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { audioBase64, fileName, mimeType } = body;

    if (!audioBase64 || !fileName) {
      return NextResponse.json(
        { error: 'Missing audio data or filename' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    if (audioBuffer.length === 0) {
      return NextResponse.json({ error: 'Audio data is empty' }, { status: 400 });
    }

    // Save file locally
    const safeFileName = `selection-${user.id}-${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const uploadPath = join(AUDIO_DIR, safeFileName);
    await mkdir(AUDIO_DIR, { recursive: true });
    await writeFile(uploadPath, audioBuffer);

    const publicUrl = `${BASE_URL}/uploads/audio/${safeFileName}`;

    // Use pg-backed client for DB operations
    const db = createSupabaseAdmin();

    const { data: existingRegistration, error: checkError } = await db
      .from('pendaftaran_tikrar_tahfidz')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Base64 API: Check registration error:', checkError);
      return NextResponse.json(
        { error: 'Failed to check registration', details: checkError.message },
        { status: 500 }
      );
    }

    if (!existingRegistration) {
      return NextResponse.json({ error: 'Pendaftaran tidak ditemukan' }, { status: 404 });
    }

    if (existingRegistration.oral_submission_url) {
      return NextResponse.json(
        { error: 'Ukhti sudah menyerahkan rekaman suara' },
        { status: 400 }
      );
    }

    const { data: submission, error: updateError } = await db
      .from('pendaftaran_tikrar_tahfidz')
      .update({
        oral_submission_url: publicUrl,
        oral_submission_file_name: safeFileName,
        oral_submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        needs_revision: false
      })
      .eq('id', existingRegistration.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Base64 API: Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to save submission', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      submission,
      message: 'Seleksi berhasil dikirim'
    });

  } catch (error: any) {
    console.error('❌ Base64 API: Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
