import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger-secure';
import { getRequiredExamJuz } from '@/lib/exam-utils';

const supabaseAdmin = createSupabaseAdmin();

// POST: Create or update exam attempt
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    logger.info('POST /api/exam/attempts', {
      userId: user.id,
      hasAnswers: !!body.answers,
      answersCount: Array.isArray(body.answers) ? body.answers.length : 0
    });

    // Get user's registration with batch info
    const { data: registration, error: registrationError } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select('id, chosen_juz, exam_status, exam_attempt_id, batch_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (registrationError || !registration) {
      return NextResponse.json({
        error: 'No registration found',
        details: 'Silakan daftar tikrar terlebih dahulu'
      }, { status: 404 });
    }

    // Get batch to check selection dates and status
    const { data: batch, error: batchError } = await supabaseAdmin
      .from('batches')
      .select('id, name, status, selection_start_date, selection_end_date')
      .eq('id', registration.batch_id)
      .single();

    if (batchError || !batch) {
      logger.error('Batch not found', { batchError, registrationId: registration.id, batchId: registration.batch_id });
      return NextResponse.json({
        error: 'Batch not found',
        details: 'Batch pendaftaran tidak ditemukan'
      }, { status: 404 });
    }

    logger.info('Batch info', {
      batchId: batch.id,
      batchName: batch.name,
      batchStatus: batch.status,
      selectionStart: batch.selection_start_date,
      selectionEnd: batch.selection_end_date
    });

    // Check if batch is open or ongoing
    if (batch.status !== 'open' && batch.status !== 'ongoing') {
      logger.warn('Batch not open or ongoing', { batchStatus: batch.status });
      return NextResponse.json({
        error: 'Exam not available',
        details: `Batch "${batch.name}" tidak aktif. Status: ${batch.status}`
      }, { status: 400 });
    }



    // Fetch configuration to check passing score
    const { data: config } = await supabaseAdmin
      .from('exam_configurations')
      .select('*')
      .eq('is_active', true)
      .single();
      
    const passingScore = config?.passing_score || 80;

    // Check if exam is already completed and passed
    logger.info('Exam status check', { examStatus: registration.exam_status });
    if (registration.exam_status === 'completed') {
      const { data: attempts } = await supabaseAdmin
        .from('exam_attempts')
        .select('score')
        .eq('user_id', user.id)
        .eq('registration_id', registration.id)
        .eq('status', 'submitted');
        
      const hasPassed = attempts?.some(a => (a.score || 0) >= passingScore);
      const maxAttempts = config?.max_attempts || 1;
      
      if (hasPassed || (attempts && attempts.length >= maxAttempts)) {
        logger.warn('Exam already completed or max attempts reached', { userId: user.id });
        return NextResponse.json({
          error: 'Exam already completed',
          details: 'Ukhti sudah menyelesaikan ujian ini atau batas kesempatan habis'
        }, { status: 400 });
      }
    }

    // Use the shared target-to-exam mapping used by eligibility and start routes.
    const chosenJuz = registration.chosen_juz;
    const examJuzNumber = getRequiredExamJuz(chosenJuz);

    if (!examJuzNumber && parseInt(chosenJuz?.match(/\d+/)?.[0] || '0') === 30) {
      return NextResponse.json({
        error: 'No exam required for Juz 30',
        details: 'Target Juz 30 tidak memerlukan ujian tertulis'
      }, { status: 400 });
    }

    if (!examJuzNumber) {
      return NextResponse.json({
        error: 'Invalid chosen_juz',
        details: `chosen_juz "${chosenJuz}" tidak valid`
      }, { status: 400 });
    }

    // Fetch correct answers to calculate score
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('exam_questions')
      .select('id, correct_answer, points')
      .eq('juz_number', examJuzNumber)
      .eq('is_active', true);

    if (questionsError || !questions) {
      return NextResponse.json({
        error: 'Failed to fetch questions for grading'
      }, { status: 500 });
    }

    // Calculate score
    let correctAnswers = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    const processedAnswers = body.answers.map((answer: any) => {
      const question = questions.find((q: any) => q.id === answer.questionId);
      const isCorrect = question && answer.answer?.trim() === question.correct_answer?.trim();

      if (isCorrect) {
        correctAnswers++;
        earnedPoints += question?.points || 1;
      }
      totalPoints += question?.points || 1;

      return {
        questionId: answer.questionId,
        answer: answer.answer,
        isCorrect
      };
    });

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    // Create or update exam attempt
    let attemptId = registration.exam_attempt_id;

    // Verify if the existing attempt actually exists
    if (attemptId) {
      const { data: existingAttempt, error: checkError } = await supabaseAdmin
        .from('exam_attempts')
        .select('id')
        .eq('id', attemptId)
        .single();

      if (checkError || !existingAttempt) {
        // Attempt doesn't exist, clear the reference and create new
        logger.warn('Existing exam attempt not found, clearing reference', { attemptId });
        await supabaseAdmin
          .from('pendaftaran_tikrar_tahfidz')
          .update({ exam_attempt_id: null })
          .eq('id', registration.id);
        attemptId = null;
      }
    }

    if (attemptId) {
      // Update existing attempt
      const { error: updateError } = await supabaseAdmin
        .from('exam_attempts')
        .update({
          answers: processedAnswers,
          total_questions: questions.length,
          correct_answers: correctAnswers,
          score: score,
          status: 'submitted',
          updated_at: new Date().toISOString()
        })
        .eq('id', attemptId);

      if (updateError) {
        logger.error('Error updating exam attempt', { error: updateError });
        return NextResponse.json({
          error: 'Failed to update attempt',
          details: updateError.message
        }, { status: 500 });
      }
    } else {
      // Create new attempt
      const { data: newAttempt, error: createError } = await supabaseAdmin
        .from('exam_attempts')
        .insert({
          user_id: user.id,
          registration_id: registration.id,
          juz_number: examJuzNumber,
          answers: processedAnswers,
          total_questions: questions.length,
          correct_answers: correctAnswers,
          score: score,
          status: 'submitted'
        })
        .select()
        .single();

      if (createError || !newAttempt) {
        logger.error('Error creating exam attempt', { error: createError });
        return NextResponse.json({
          error: 'Failed to create attempt',
          details: createError?.message || 'Unknown error'
        }, { status: 500 });
      }

      attemptId = newAttempt.id;
    }

    const isPassed = score >= passingScore;
    
    // Check total attempts to apply downgrade logic if max attempts reached and failed
    const { data: allAttempts } = await supabaseAdmin
        .from('exam_attempts')
        .select('id')
        .eq('user_id', user.id)
        .eq('registration_id', registration.id)
        .eq('status', 'submitted');
    
    const attemptsCount = allAttempts?.length || 1;
    const maxAttempts = config?.max_attempts || 3;
    let downgradedTo30A = false;
    let newChosenJuz = registration.chosen_juz;

    // Only downgrade if they failed AND they have reached max attempts
    if (!isPassed && attemptsCount >= maxAttempts) {
        newChosenJuz = '30A';
        downgradedTo30A = true;
    }

    const newExamStatus = (isPassed || attemptsCount >= maxAttempts) ? 'completed' : 'in_progress';

    // Update registration with exam results
    const { error: updateRegError } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .update({
        chosen_juz: newChosenJuz,
        exam_juz_number: examJuzNumber,
        exam_attempt_id: attemptId,
        exam_score: score,
        exam_submitted_at: new Date().toISOString(),
        exam_status: newExamStatus
      })
      .eq('id', registration.id);

    if (updateRegError) {
      logger.error('Error updating registration', { error: updateRegError });
    }

    logger.info('Exam submitted successfully', {
      userId: user.id,
      attemptId,
      score,
      correctAnswers,
      totalQuestions: questions.length,
      downgradedTo30A
    });

    return NextResponse.json({
      message: 'Exam submitted successfully',
      attemptId,
      score,
      correctAnswers,
      totalQuestions: questions.length,
      downgradedTo30A
    });

  } catch (error) {
    logger.error('Error in POST /api/exam/attempts', { error: error as Error });
    return NextResponse.json({
      error: 'Internal server error',
      details: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 });
  }
}

// GET: Fetch existing attempt for user
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's registration
    const { data: registration, error: registrationError } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select('exam_attempt_id, exam_status, batch:batches(name, min_exam_score)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (registrationError || !registration) {
      return NextResponse.json({
        error: 'No registration found'
      }, { status: 404 });
    }

    if (!registration.exam_attempt_id) {
      return NextResponse.json({
        attempt: null,
        message: 'No exam attempt found'
      });
    }

    // Fetch attempt details
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('exam_attempts')
      .select('*')
      .eq('id', registration.exam_attempt_id)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({
        error: 'Failed to fetch attempt'
      }, { status: 500 });
    }

    const getPassingScore = (b?: { name?: string; min_exam_score?: number | null } | null): number => {
      if (!b) return 70;
      if (b.min_exam_score !== undefined && b.min_exam_score !== null) return b.min_exam_score;
      if (b.name) {
        const match = b.name.match(/Batch\s*(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= 3) return 80;
        }
      }
      return 70;
    };

    const minExamScore = getPassingScore((registration as any).batch);

    return NextResponse.json({
      attempt,
      examStatus: registration.exam_status,
      minExamScore
    });

  } catch (error) {
    logger.error('Error in GET /api/exam/attempts', { error: error as Error });
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// PUT: Save draft answers (autosave)
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      logger.error('Failed to parse request body', { error: parseError as Error });
      return NextResponse.json({
        error: 'Invalid JSON',
        details: 'Request body must be valid JSON'
      }, { status: 400 });
    }

    logger.info('PUT /api/exam/attempts (autosave)', {
      userId: user.id,
      bodyKeys: Object.keys(body),
      hasAnswers: !!body.answers,
      answersCount: Array.isArray(body.answers) ? body.answers.length : 0
    });

    // Validate request body
    if (!body.answers || !Array.isArray(body.answers)) {
      return NextResponse.json({
        error: 'Invalid request',
        details: 'answers array is required'
      }, { status: 400 });
    }

    // Extract current_question_index from body if provided
    const currentQuestionIndex = body.current_question_index !== undefined ? body.current_question_index : null;

    // Get user's registration
    const { data: registration, error: registrationError } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select('id, chosen_juz, exam_status, exam_attempt_id, batch_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (registrationError || !registration) {
      return NextResponse.json({
        error: 'No registration found'
      }, { status: 404 });
    }

    // Check if exam is already completed and passed
    if (registration.exam_status === 'completed') {
      const { data: attempts } = await supabaseAdmin
        .from('exam_attempts')
        .select('score')
        .eq('user_id', user.id)
        .eq('registration_id', registration.id)
        .eq('status', 'submitted');
        
      // For PUT (autosave draft), if we already passed or ran out of attempts, block.
      // But if we are taking a retake (so a new draft exists), let it through.
      const hasPassed = attempts?.some(a => (a.score || 0) >= 80); // Defaulting to 80 for quick check
      if (hasPassed) {
        return NextResponse.json({
          error: 'Exam already completed',
          details: 'Ukhti sudah menyelesaikan ujian ini'
        }, { status: 400 });
      }
    }

    // Keep autosave on the same shared target-to-exam mapping.
    const chosenJuz = registration.chosen_juz;
    const examJuzNumber = getRequiredExamJuz(chosenJuz);

    if (!examJuzNumber && parseInt(chosenJuz?.match(/\d+/)?.[0] || '0') === 30) {
      return NextResponse.json({
        error: 'No exam required for Juz 30'
      }, { status: 400 });
    }

    if (!examJuzNumber) {
      return NextResponse.json({
        error: 'Invalid chosen_juz'
      }, { status: 400 });
    }

    // Fetch questions to validate answers
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('exam_questions')
      .select('id')
      .eq('juz_number', examJuzNumber)
      .eq('is_active', true);

    if (questionsError || !questions) {
      return NextResponse.json({
        error: 'Failed to fetch questions'
      }, { status: 500 });
    }

    // Validate answers
    const questionIds = new Set(questions.map(q => q.id));
    const validAnswers = body.answers.filter((a: any) =>
      questionIds.has(a.questionId) && a.answer !== undefined && a.answer !== ''
    );

    // Prepare answers for storage (without grading for draft)
    const draftAnswers = validAnswers.map((a: any) => ({
      questionId: a.questionId,
      answer: a.answer,
      isCorrect: null // Not graded in draft mode
    }));

    let attemptId = registration.exam_attempt_id;

    if (attemptId) {
      // Verify if the existing attempt actually exists
      const { data: existingAttempt, error: checkError } = await supabaseAdmin
        .from('exam_attempts')
        .select('id, status')
        .eq('id', attemptId)
        .single();

      if (checkError || !existingAttempt) {
        // Attempt doesn't exist, clear the reference
        logger.warn('Existing exam attempt not found, clearing reference', { attemptId });
        await supabaseAdmin
          .from('pendaftaran_tikrar_tahfidz')
          .update({ exam_attempt_id: null })
          .eq('id', registration.id);
        attemptId = null;
      } else if (existingAttempt.status === 'submitted' || existingAttempt.status === 'graded') {
        // Don't overwrite submitted attempts
        return NextResponse.json({
          error: 'Exam already submitted',
          details: 'Ujian sudah dikirim dan tidak dapat diubah'
        }, { status: 400 });
      }
    }

    if (attemptId) {
      // Update existing draft
      const { error: updateError } = await supabaseAdmin
        .from('exam_attempts')
        .update({
          answers: draftAnswers,
          total_questions: questions.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', attemptId);

      if (updateError) {
        logger.error('Error updating draft', { error: updateError, attemptId });
        return NextResponse.json({
          error: 'Failed to save draft',
          details: updateError.message,
          stack: updateError.hint
        }, { status: 500 });
      }
    } else {
      // Create new draft
      const { data: newAttempt, error: createError } = await supabaseAdmin
        .from('exam_attempts')
        .insert({
          user_id: user.id,
          registration_id: registration.id,
          juz_number: examJuzNumber,
          answers: draftAnswers,
          total_questions: questions.length,
          correct_answers: 0,
          score: 0,
          status: 'in_progress'
        })
        .select()
        .single();

      if (createError || !newAttempt) {
        logger.error('Error creating draft', { error: createError, userId: user.id, registrationId: registration.id });
        return NextResponse.json({
          error: 'Failed to save draft',
          details: createError?.message || 'Unknown error'
        }, { status: 500 });
      }

      attemptId = newAttempt.id;

      // Update registration with attempt ID
      await supabaseAdmin
        .from('pendaftaran_tikrar_tahfidz')
        .update({ exam_attempt_id: attemptId })
        .eq('id', registration.id);
    }

    logger.info('Draft saved successfully', {
      userId: user.id,
      attemptId,
      answersCount: draftAnswers.length
    });

    return NextResponse.json({
      message: 'Draft saved',
      attemptId,
      answersCount: draftAnswers.length
    });

  } catch (error) {
    logger.error('Error in PUT /api/exam/attempts', { error: error as Error });
    return NextResponse.json({
      error: 'Internal server error',
      details: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 });
  }
}
