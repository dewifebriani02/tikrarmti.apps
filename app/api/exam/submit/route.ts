// API Route: /api/exam/submit
// Submit exam answers and calculate score

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger-secure';
import { ExamSubmitRequest, ExamAnswer } from '@/types/exam';
import { calculateScore } from '@/lib/exam-utils';

const supabaseAdmin = createSupabaseAdmin();

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ExamSubmitRequest = await request.json();
    const { attemptId, answers, flaggedQuestions } = body;

    if (!attemptId || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Invalid submission data' }, { status: 400 });
    }

    // Get the exam attempt
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('exam_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Exam attempt not found' }, { status: 404 });
    }

    if (attempt.status === 'submitted') {
      return NextResponse.json({
        error: 'Exam already submitted',
        attempt
      }, { status: 400 });
    }

    // Get all questions for this juz
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('exam_questions')
      .select('*')
      .eq('juz_number', attempt.juz_number)
      .eq('is_active', true);

    if (questionsError || !questions) {
      logger.error('Error fetching questions for grading', { error: questionsError });
      return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 });
    }

    // Create a map for quick lookup
    const questionMap = new Map<string, any>((questions as any[]).map((q: any) => [q.id, q]));

    // Grade each answer
    const gradedAnswers: ExamAnswer[] = answers.map(answer => {
      const question = questionMap.get(answer.questionId);
      if (!question) {
        return { ...answer, isCorrect: false };
      }

      const isCorrect = answer.answer.trim() === question.correct_answer?.trim();
      return { ...answer, isCorrect };
    });

    // Calculate score
    const correctAnswers = gradedAnswers.filter(a => a.isCorrect).length;
    const totalQuestions = questions.length;
    const score = calculateScore(correctAnswers, totalQuestions);

    // Update exam attempt
    const { data: updatedAttempt, error: updateError } = await supabaseAdmin
      .from('exam_attempts')
      .update({
        answers: gradedAnswers,
        correct_answers: correctAnswers,
        score,
        status: 'submitted',
        submitted_at: new Date().toISOString()
      })
      .eq('id', attemptId)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating exam attempt', { error: updateError });
      return NextResponse.json({ error: 'Failed to submit exam' }, { status: 500 });
    }

    // Fetch configuration
    const { data: config } = await supabaseAdmin
      .from('exam_configurations')
      .select('*')
      .eq('is_active', true)
      .single();
      
    const maxAttempts = config?.max_attempts || 1;
    const passingScore = config?.passing_score || 80;
    
    // Get past submitted attempts count for this user, registration, and juz
    const { data: pastAttempts } = await supabaseAdmin
      .from('exam_attempts')
      .select('id')
      .eq('user_id', user.id)
      .eq('registration_id', attempt.registration_id)
      .eq('juz_number', attempt.juz_number)
      .eq('status', 'submitted');
      
    // The current one will also be submitted now, so total submitted = pastAttempts.length (since the update above already set it to submitted, pastAttempts will include it if we query after, or maybe it won't if the transaction hasn't propagated? Actually, we just updated it above!)
    // Let's just count pastAttempts length. Since we just updated `id: attemptId` to 'submitted', `pastAttempts` will INCLUDE this attempt!
    const totalSubmitted = pastAttempts ? pastAttempts.length : 1;
    const passed = score >= passingScore;
    
    let finalJuz = undefined;
    
    if (!passed && totalSubmitted >= maxAttempts) {
       // Demotion logic! Get chosen_juz from registration
       const { data: reg } = await supabaseAdmin
         .from('pendaftaran_tikrar_tahfidz')
         .select('chosen_juz')
         .eq('id', attempt.registration_id)
         .single();
         
       if (reg && reg.chosen_juz) {
         // Demotion logic: 30 -> 30, 29 -> 30, 28 -> 29, 1 -> 30, 2 -> 1, N -> N-1
         const targetJuzNum = parseInt(reg.chosen_juz.replace(/[AB]/g, '') || '0');
         const suffix = reg.chosen_juz.replace(/\d/g, '');
         let newJuzNum = targetJuzNum;
         
         if (targetJuzNum === 29) newJuzNum = 30;
         else if (targetJuzNum === 28) newJuzNum = 29;
         else if (targetJuzNum === 1) newJuzNum = 30;
         else if (targetJuzNum >= 2 && targetJuzNum <= 27) newJuzNum = targetJuzNum - 1;
         
         finalJuz = `${newJuzNum}${suffix}`;
       }
    }

    // Update registration with exam results
    const regUpdateData: any = {
      exam_score: score,
      exam_submitted_at: new Date().toISOString(),
    };
    
    if (finalJuz) {
      regUpdateData.chosen_juz = finalJuz;
    }
    
    // Only mark it as 'completed' if they passed OR ran out of attempts.
    if (passed || totalSubmitted >= maxAttempts) {
      regUpdateData.exam_status = 'completed';
    } else {
      regUpdateData.exam_status = 'not_started'; // Or keep it in_progress, but not_started allows taking a new one smoothly.
    }

    const { error: regUpdateError } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .update(regUpdateData)
      .eq('id', attempt.registration_id);

    if (regUpdateError) {
      logger.error('Error updating registration exam score', { error: regUpdateError });
    }

    // Process flagged questions
    if (flaggedQuestions && flaggedQuestions.length > 0) {
      const flags = flaggedQuestions.map(flag => ({
        question_id: flag.questionId,
        user_id: user.id,
        attempt_id: attemptId,
        flag_type: flag.flagType,
        flag_message: flag.message || null,
        status: 'pending'
      }));

      const { error: flagError } = await supabaseAdmin
        .from('exam_question_flags')
        .insert(flags);

      if (flagError) {
        logger.error('Error creating question flags', { error: flagError });
        // Don't fail the submission if flags fail
      } else {
        logger.info('Question flags created', {
          attemptId,
          flagCount: flags.length,
          userId: user.id
        });
      }
    }

    // Calculate result summary by section
    const sectionResults = new Map<number, { total: number; correct: number; title: string }>();

    questions.forEach(q => {
      if (!sectionResults.has(q.section_number)) {
        sectionResults.set(q.section_number, {
          total: 0,
          correct: 0,
          title: q.section_title
        });
      }

      const section = sectionResults.get(q.section_number)!;
      section.total++;

      const answer = gradedAnswers.find(a => a.questionId === q.id);
      if (answer?.isCorrect) {
        section.correct++;
      }
    });

    const sections = Array.from(sectionResults.entries()).map(([section_number, data]) => ({
      section_number,
      section_title: data.title,
      total_questions: data.total,
      correct_answers: data.correct,
      percentage: calculateScore(data.correct, data.total)
    }));

    logger.info('Exam submitted successfully', {
      attemptId,
      userId: user.id,
      juzNumber: attempt.juz_number,
      score,
      correctAnswers,
      totalQuestions
    });

    return NextResponse.json({
      message: 'Exam submitted successfully',
      attempt: updatedAttempt,
      result: {
        attempt: updatedAttempt,
        sections,
        overall_percentage: score,
        passed,
        finalJuz,
        attemptsUsed: totalSubmitted,
        maxAttempts
      }
    }, { status: 200 });

  } catch (error) {
    logger.error('Error in POST /api/exam/submit', { error: error as Error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
