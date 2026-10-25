// API Route: /api/exam/start
// Start a new exam attempt for a user

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger-secure';
import { getRequiredExamJuz } from '@/lib/exam-utils';

const supabaseAdmin = createSupabaseAdmin();

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { juz_number, source } = body;
    const isFinalExam = source === 'final-exam';

    if (!juz_number || (isFinalExam ? (juz_number < 1 || juz_number > 30) : ![28, 29, 30].includes(juz_number))) {
      return NextResponse.json({ error: 'Invalid juz number' }, { status: 400 });
    }

    // Get user's tikrar registration
    const { data: registrations, error: regError } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (regError || !registrations || registrations.length === 0) {
      return NextResponse.json({
        error: 'No approved registration found. Please register first.'
      }, { status: 404 });
    }

    const registration = registrations[0];

    // Verify that this juz exam is required for their chosen juz
    const requiredJuz = isFinalExam
      ? parseInt(registration.chosen_juz?.replace(/[AB]/g, "") || "0")
      : getRequiredExamJuz(registration.chosen_juz);

    if (requiredJuz !== juz_number) {
      return NextResponse.json({
        error: `Exam not required. Your chosen juz (${registration.chosen_juz}) ${requiredJuz ? `requires Juz ${requiredJuz} exam` : 'does not require an exam'}`
      }, { status: 400 });
    }

    // Fetch configuration
    const { data: config } = await supabaseAdmin
      .from('exam_configurations')
      .select('*')
      .eq('is_active', true)
      .single();
      
    const maxAttempts = config?.max_attempts || 1;
    const passingScore = config?.passing_score || 80;

    // Check if user already has completed attempts for this juz
    const { data: existingAttempts, error: attemptError } = await supabaseAdmin
      .from('exam_attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('registration_id', registration.id)
      .eq('juz_number', juz_number)
      .eq('status', 'submitted');

    if (attemptError) {
      logger.error('Error checking existing attempts', { error: attemptError });
      return NextResponse.json({ error: 'Failed to check existing attempts' }, { status: 500 });
    }

    if (existingAttempts && existingAttempts.length > 0) {
      // Check if any attempt passed
      const hasPassed = existingAttempts.some(a => (a.score || 0) >= passingScore);
      
      if (hasPassed) {
        return NextResponse.json({
          error: 'You have already passed this exam',
          attempt: existingAttempts.find(a => (a.score || 0) >= passingScore)
        }, { status: 400 });
      }
      
      if (existingAttempts.length >= maxAttempts) {
        return NextResponse.json({
          error: 'You have reached the maximum number of attempts for this exam',
          attempt: existingAttempts[existingAttempts.length - 1]
        }, { status: 400 });
      }
    }

    // Check for in-progress attempt
    const { data: inProgressAttempts, error: inProgressError } = await supabaseAdmin
      .from('exam_attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('registration_id', registration.id)
      .eq('juz_number', juz_number)
      .eq('status', 'in_progress');

    if (inProgressError) {
      logger.error('Error checking in-progress attempts', { error: inProgressError });
      return NextResponse.json({ error: 'Failed to check in-progress attempts' }, { status: 500 });
    }

    // If there's already an in-progress attempt, return it
    if (inProgressAttempts && inProgressAttempts.length > 0) {
      logger.info('Resuming existing exam attempt', {
        attemptId: inProgressAttempts[0].id,
        userId: user.id,
        juzNumber: juz_number
      });

      return NextResponse.json({
        message: 'Resuming existing exam attempt',
        attempt: inProgressAttempts[0]
      });
    }

    // Get total questions for this juz
    const { count, error: countError } = await supabaseAdmin
      .from('exam_questions')
      .select('*', { count: 'exact', head: true })
      .eq('juz_number', juz_number)
      .eq('is_active', true);

    if (countError) {
      logger.error('Error counting questions', { error: countError });
      return NextResponse.json({ error: 'Failed to load exam questions' }, { status: 500 });
    }

    const totalQuestions = count || 0;

    if (totalQuestions === 0) {
      return NextResponse.json({
        error: 'No questions available for this exam. Please contact administrator.'
      }, { status: 404 });
    }

    // Create new exam attempt
    const { data: newAttempt, error: createError } = await supabaseAdmin
      .from('exam_attempts')
      .insert({
        user_id: user.id,
        registration_id: registration.id,
        juz_number,
        total_questions: totalQuestions,
        answers: [],
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      logger.error('Error creating exam attempt', { error: createError });
      return NextResponse.json({ error: 'Failed to start exam' }, { status: 500 });
    }

    // Update registration exam status
    await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .update({
        exam_juz_number: juz_number,
        exam_status: 'in_progress',
        exam_attempt_id: newAttempt.id
      })
      .eq('id', registration.id);

    logger.info('Exam attempt started', {
      attemptId: newAttempt.id,
      userId: user.id,
      juzNumber: juz_number,
      totalQuestions
    });

    return NextResponse.json({
      message: 'Exam started successfully',
      attempt: newAttempt
    }, { status: 201 });

  } catch (error) {
    logger.error('Error in POST /api/exam/start', { error: error as Error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
