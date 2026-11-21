import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';

const supabaseAdmin = createSupabaseAdmin();

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;
    
    // Check if user is admin using admin client
    const { data: userData, error: dbError } = await supabaseAdmin
      .from('users')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (dbError || !userData || !userData.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get('registrationId');

    if (!registrationId) {
      return NextResponse.json({ error: 'registrationId is required' }, { status: 400 });
    }

    // First delete selection exam attempts for this registration
    const { error: attemptsError } = await supabaseAdmin
      .from('exam_attempts')
      .delete()
      .eq('registration_id', registrationId)
      .eq('exam_type', 'selection');

    if (attemptsError) {
      console.error('Error deleting exam attempts', attemptsError, registrationId);
      return NextResponse.json({ error: 'Failed to delete exam attempts' }, { status: 500 });
    }

    // Then reset the exam score in pendaftaran_tikrar_tahfidz
    const { error: regError } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .update({
        exam_score: null,
        exam_status: 'not_started',
        exam_submitted_at: null,
        exam_juz_number: null,
      })
      .eq('id', registrationId);

    if (regError) {
      console.error('Error resetting exam score', regError, registrationId);
      return NextResponse.json({ error: 'Failed to reset exam score' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Ujian Tulis berhasil di-reset' });
  } catch (error) {
    console.error('Error resetting exam', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;
    
    // Check if user is admin using admin client
    const { data: userData, error: dbError } = await supabaseAdmin
      .from('users')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (dbError || !userData || !userData.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { registrationId, score } = body;

    if (!registrationId) {
      return NextResponse.json({ error: 'registrationId is required' }, { status: 400 });
    }
    if (score === undefined || score === null || isNaN(score) || score < 0 || score > 100) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
    }

    // Update the exam score
    const { error: regError } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .update({
        exam_score: score,
        exam_status: 'completed', // Ensure it's marked as completed if manually overridden
      })
      .eq('id', registrationId);

    if (regError) {
      console.error('Error updating exam score', regError, registrationId);
      return NextResponse.json({ error: 'Failed to update exam score' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Nilai Ujian Tulis berhasil diubah' });
  } catch (error) {
    console.error('Error updating exam score', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
