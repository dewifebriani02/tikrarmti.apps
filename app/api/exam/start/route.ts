// API Route: /api/exam/start
// Start a new exam attempt for a user

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger-secure';
import { getRequiredExamJuz, selectExamQuestionsByQuota } from '@/lib/exam-utils';

const supabaseAdmin = createSupabaseAdmin();

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { juz_number, source, batchId } = body;
    const isFinalExam = source === 'final-exam';
    const examType = isFinalExam ? 'final-exam' : 'selection';

    if (!juz_number || (isFinalExam ? (juz_number < 1 || juz_number > 30) : ![28, 29, 30].includes(juz_number))) {
      return NextResponse.json({ error: 'Invalid juz number' }, { status: 400 });
    }

    // Get user's tikrar registration
    let regQuery = supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'approved');

    if (batchId) {
      regQuery = regQuery.eq('batch_id', batchId);
    }

    const { data: registrations, error: regError } = await regQuery
      .order('created_at', { ascending: false });

    if (regError || !registrations || registrations.length === 0) {
      return NextResponse.json({
        error: 'No approved registration found. Please register first.'
      }, { status: 404 });
    }

    const registration =
      registrations.find((r) => r.selection_status === 'selected') ||
      registrations[0];

    // If final-exam, enforce schedule window for non-staff
    let finalPassingScore = 80;
    if (isFinalExam) {
      const { data: batch } = await supabaseAdmin
        .from('batches')
        .select('name, final_exam_start_date, final_exam_end_date, min_final_exam_score')
        .eq('id', registration.batch_id)
        .single();

      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('roles')
        .eq('id', user.id)
        .single();

      const activePersonaCookie = request.cookies.get('mti_active_persona')?.value;
      const isSimulatingStudent = activePersonaCookie === 'thalibah' || activePersonaCookie === 'calon_thalibah';

      const isStaff = !isSimulatingStudent && profile?.roles && (
        profile.roles.includes('admin') ||
        profile.roles.includes('superadmin') ||
        profile.roles.includes('musyrifah')
      );

      const now = new Date();
      if (!isStaff && (!batch?.final_exam_start_date || now < new Date(batch.final_exam_start_date))) {
        return NextResponse.json({
          error: 'Ujian akhir pilihan ganda belum dibuka.'
        }, { status: 400 });
      }

      if (!isStaff && batch?.final_exam_end_date && now > new Date(batch.final_exam_end_date)) {
        return NextResponse.json({
          error: 'Waktu pelaksanaan ujian akhir telah berakhir.'
        }, { status: 400 });
      }

      if (batch?.min_final_exam_score !== undefined && batch?.min_final_exam_score !== null) {
        finalPassingScore = batch.min_final_exam_score;
      } else if (batch?.name) {
        const match = batch.name.match(/Batch\s*(\d+)/i);
        if (match && parseInt(match[1], 10) < 3) {
          finalPassingScore = 70;
        }
      }
    }

    // Verify that this juz exam is required for their chosen juz
    const requiredJuz = isFinalExam
      ? parseInt(registration.chosen_juz?.match(/\d+/)?.[0] || "0", 10)
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

    const maxAttempts = isFinalExam ? 1 : (config?.max_attempts || 1);
    const passingScore = isFinalExam ? finalPassingScore : (config?.passing_score || 80);

    // Check if user already has completed attempts for this juz & exam_type
    const { data: existingAttempts, error: attemptError } = await supabaseAdmin
      .from('exam_attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('registration_id', registration.id)
      .eq('exam_type', examType)
      .eq('juz_number', juz_number)
      .eq('status', 'submitted');

    if (attemptError) {
      logger.error('Error checking existing attempts', { error: attemptError });
      return NextResponse.json({ error: 'Failed to check existing attempts' }, { status: 500 });
    }

    if (existingAttempts && existingAttempts.length > 0) {
      if (isFinalExam) {
        return NextResponse.json({
          error: 'Ukhti telah menyelesaikan ujian akhir pilihan ganda ini',
          attempt: existingAttempts[existingAttempts.length - 1]
        }, { status: 400 });
      }

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

    // Check for in-progress attempt of the same exam_type
    const { data: inProgressAttempts, error: inProgressError } = await supabaseAdmin
      .from('exam_attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('registration_id', registration.id)
      .eq('exam_type', examType)
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
        juzNumber: juz_number,
        examType
      });

      return NextResponse.json({
        message: 'Resuming existing exam attempt',
        attempt: inProgressAttempts[0]
      });
    }

    // Compute exact question count for this thalibah based on package A & B quotas
    const { data: activeQuestions, error: countError } = await supabaseAdmin
      .from('exam_questions')
      .select('id, question_package, section_number')
      .eq('juz_number', juz_number)
      .eq('is_active', true);

    if (countError) {
      logger.error('Error counting questions', { error: countError });
      return NextResponse.json({ error: 'Failed to load exam questions' }, { status: 500 });
    }

    const sampledForCount = selectExamQuestionsByQuota(activeQuestions || [], {
      chosenJuz: registration.chosen_juz,
      isFinalExam,
      config
    });

    const totalQuestions = sampledForCount.length;

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
        exam_type: examType,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      logger.error('Error creating exam attempt', { error: createError });
      return NextResponse.json({ error: 'Failed to start exam' }, { status: 500 });
    }

    // Only update selection exam status columns on pendaftaran_tikrar_tahfidz for selection exams
    if (!isFinalExam) {
      await supabaseAdmin
        .from('pendaftaran_tikrar_tahfidz')
        .update({
          exam_juz_number: juz_number,
          exam_status: 'in_progress',
          exam_attempt_id: newAttempt.id
        })
        .eq('id', registration.id);
    }

    logger.info('Exam attempt started', {
      attemptId: newAttempt.id,
      userId: user.id,
      juzNumber: juz_number,
      totalQuestions,
      examType
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
