import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { selectExamQuestionsByQuota, shuffleArray } from '@/lib/exam-utils';

const supabaseAdmin = createSupabaseAdmin();

// GET: Fetch exam questions for user based on their chosen_juz
// Logic:
// - Juz 28A or 28B -> Exam Juz 29
// - Juz 29A or 29B -> Exam Juz 30
// - Juz 1A or 1B -> Exam Juz 30
// - Juz 30A or 30B -> No exam (starting target)
// - Only available during selection dates of active open batch
// - Question quota rules (configurable in Admin exam_configurations):
//   * Full Juz Exam (Ujian Seleksi & Ujian Akhir Paket B): package_a_questions (50) + package_b_questions (50) = max 100 questions
//   * Half Juz Final Exam (Ujian Akhir Paket A): package_a_questions (50) questions from Paket A only
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's registration with chosen_juz and batch
    // IMPORTANT: a user can have more than one registration row (different batches,
    // re-registrations, etc). We must not just grab the most-recently-created row —
    // that can silently pick the wrong batch's registration (and therefore the wrong
    // chosen_juz), which previously caused Juz 30 students to be incorrectly told an
    // exam was required. Prefer: the batchId passed in the query string, then the
    // registration with selection_status = 'selected'/'waitlist', then fall back to
    // the most recent one.
    const requestedBatchId = request.nextUrl.searchParams.get('batchId');

    let registrationQuery = supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select('id, chosen_juz, exam_status, exam_attempt_id, batch_id, program_id, selection_status, created_at')
      .eq('user_id', user.id);

    if (requestedBatchId) {
      registrationQuery = registrationQuery.eq('batch_id', requestedBatchId);
    }

    const { data: registrations, error: registrationError } = await registrationQuery
      .order('created_at', { ascending: false });

    if (registrationError || !registrations || registrations.length === 0) {
      return NextResponse.json({
        error: 'No registration found',
        details: 'Silakan daftar tikrar terlebih dahulu'
      }, { status: 404 });
    }

    const registration =
      registrations.find((r) => r.selection_status === 'selected') ||
      registrations.find((r) => r.selection_status === 'waitlist') ||
      registrations[0];

    // Get batch to check selection/final-exam dates and status
    const { data: batch, error: batchError } = await supabaseAdmin
      .from('batches')
      .select('id, name, status, registration_start_date, registration_end_date, re_enrollment_date, opening_class_date, final_exam_start_date, final_exam_end_date, min_final_exam_score')
      .eq('id', registration.batch_id)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({
        error: 'Batch not found',
        details: 'Batch pendaftaran tidak ditemukan'
      }, { status: 404 });
    }

    // Detect source mode
    const source = request.nextUrl.searchParams.get('source') || 'selection';
    const isFinalExam = source === 'final-exam';
    const examType = isFinalExam ? 'final-exam' : 'selection';

    // For selection mode: check batch open + selection dates (which are aligned with registration dates)
    if (!isFinalExam) {
      // Check if batch is open or ongoing
      if (batch.status !== 'open' && batch.status !== 'ongoing') {
        return NextResponse.json({
          error: 'Exam not available',
          details: `Batch "${batch.name}" tidak aktif. Status: ${batch.status}`
        }, { status: 400 });
      }

      // Use re_enrollment_date to opening_class_date for written exam (Daftar Ulang phase)
      const examStartDate = batch.re_enrollment_date || batch.registration_start_date;
      const examEndDate = batch.opening_class_date || batch.registration_end_date;

      if (examStartDate && examEndDate) {
        const today = new Date();
        const startDate = new Date(examStartDate);
        const endDate = new Date(examEndDate);
        
        // Zero-out the time parts for pure date-range comparison
        today.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        if (today < startDate || today > endDate) {
          const formatDate = (date: Date) => {
            return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
          };
          return NextResponse.json({
            error: 'Exam period closed',
            details: `Ujian pilihan ganda hanya tersedia selama masa daftar ulang dari ${formatDate(startDate)} sampai ${formatDate(endDate)}. (Hari ini: ${formatDate(today)}, Batch: ${batch.name})`
          }, { status: 400 });
        }
      } else {
        return NextResponse.json({
          error: 'Re-enrollment dates not set',
          details: `Tanggal daftar ulang belum ditentukan untuk batch ini. Silakan hubungi admin.`
        }, { status: 400 });
      }
    } else {
      // For final-exam mode: verify batch exam window has started or user is staff
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
      if (!isStaff && (!batch.final_exam_start_date || now < new Date(batch.final_exam_start_date))) {
        return NextResponse.json({
          error: 'Exam period not open',
          details: 'Ujian akhir pilihan ganda belum dibuka.'
        }, { status: 400 });
      }

      if (!isStaff && batch.final_exam_end_date && now > new Date(batch.final_exam_end_date)) {
        return NextResponse.json({
          error: 'Exam period closed',
          details: 'Waktu pelaksanaan ujian akhir telah berakhir.'
        }, { status: 400 });
      }
    }

    // Determine required exam juz based on chosen_juz
    const chosenJuz = registration.chosen_juz;
    let requiredJuzNumber: number | null = null;

    if (isFinalExam) {
      // Final exam: use the thalibah's own chosen juz directly
      const juzNum = parseInt(chosenJuz?.replace(/[AB]/g, '') || '0');
      if (juzNum >= 1 && juzNum <= 30) {
        requiredJuzNumber = juzNum;
      } else {
        return NextResponse.json({
          error: 'Invalid chosen_juz',
          details: `chosen_juz "${chosenJuz}" tidak valid`
        }, { status: 400 });
      }
    } else {
      // Selection exam: map to the previous juz in the sequence (30 -> 29 -> 28 -> 1 -> 2 ... 27)
      const targetJuzNum = parseInt(chosenJuz?.replace(/[AB]/g, '') || '0');
      
      if (targetJuzNum === 30) {
        return NextResponse.json({
          data: [],
          total: 0,
          message: 'Target Juz 30 tidak memerlukan ujian tertulis',
          noExamRequired: true
        });
      } else if (targetJuzNum === 29) {
        requiredJuzNumber = 30;
      } else if (targetJuzNum === 28) {
        requiredJuzNumber = 29;
      } else if (targetJuzNum === 27) {
        requiredJuzNumber = 28;
      } else if (targetJuzNum === 1) {
        requiredJuzNumber = 30;
      } else if (targetJuzNum >= 2 && targetJuzNum <= 26) {
        requiredJuzNumber = targetJuzNum - 1;
      } else {
        return NextResponse.json({
          error: 'Invalid chosen_juz',
          details: `chosen_juz "${chosenJuz}" tidak valid`
        }, { status: 400 });
      }
    }

    // Get exam configuration
    const { data: config, error: configError } = await supabaseAdmin
      .from('exam_configurations')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (configError || !config) {
      console.error('Error fetching exam config:', configError);
      // Use default config if not found
    }

    // Check if user has reached max attempts for this exam_type
    // Only count submitted attempts, not in-progress ones
    const maxAttemptsToCheck = isFinalExam ? 1 : config?.max_attempts;
    if (maxAttemptsToCheck) {
      const { data: existingAttempts, error: attemptsError } = await supabaseAdmin
        .from('exam_attempts')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('registration_id', registration.id)
        .eq('exam_type', examType)
        .eq('status', 'submitted');

      const submittedCount = existingAttempts?.length || 0;

      if (!attemptsError && submittedCount >= maxAttemptsToCheck) {
        return NextResponse.json({
          error: 'Kesempatan Ujian Habis',
          details: `Mohon maaf ukhti, kesempatan ujian telah habis (${maxAttemptsToCheck}x percobaan). Tetap semangat dan terus berikhtiar, Allah Maha Mengetahui yang terbaik untuk hamba-Nya.`,
          maxAttempts: maxAttemptsToCheck
        }, { status: 400 });
      }
    }

    // Fetch all active questions for the required juz
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('exam_questions')
      .select('*')
      .eq('juz_number', requiredJuzNumber)
      .eq('is_active', true)
      .order('question_package', { ascending: true })
      .order('section_number', { ascending: true })
      .order('question_number', { ascending: true });

    if (questionsError) {
      console.error('Error fetching exam questions:', questionsError);
      return NextResponse.json({
        error: 'Failed to fetch questions',
        details: questionsError.message
      }, { status: 500 });
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({
        error: 'No questions available',
        details: `Belum ada soal untuk juz ${requiredJuzNumber}`
      }, { status: 404 });
    }

    // Apply quota rules:
    // - Ujian Seleksi & Ujian Akhir Paket B (1 Juz penuh): package_a_questions (50) Paket A + package_b_questions (50) Paket B (max 100)
    // - Ujian Akhir Paket A (1/2 Juz): package_a_questions (50) Paket A only
    let processedQuestions = selectExamQuestionsByQuota(questions, {
      chosenJuz,
      isFinalExam,
      config
    });

    if (processedQuestions.length === 0) {
      return NextResponse.json({
        error: 'No questions available',
        details: `Belum ada soal yang sesuai untuk juz ${requiredJuzNumber}`
      }, { status: 404 });
    }

    // Shuffle options within each question and remove correct answer data to prevent cheating
    processedQuestions = processedQuestions.map(q => {
      let currentOptions = q.options || [];
      // ALWAYS shuffle options so that correct answer (inserted at index 0) is not always 'A'
      currentOptions = shuffleArray(currentOptions);
      
      // Remove isCorrect to prevent cheating on the frontend
      const sanitizedOptions = currentOptions.map((opt: any) => ({
        text: opt.text,
      }));

      // Return question without sensitive data
      const sanitizedQuestion = { ...q, options: sanitizedOptions };
      delete sanitizedQuestion.correct_answer;
      return sanitizedQuestion;
    });

    // Final exam defaults: 120 min, passing threshold, 1 attempt
    const getFinalPassingScore = (b?: { name?: string; min_final_exam_score?: number | null } | null): number => {
      if (!b) return 70;
      if (b.min_final_exam_score !== undefined && b.min_final_exam_score !== null) return b.min_final_exam_score;
      if (b.name) {
        const match = b.name.match(/Batch\s*(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= 3) return 80;
        }
      }
      return 70;
    };

    const finalPassingScore = getFinalPassingScore(batch);

    const finalExamConfig = isFinalExam ? {
      durationMinutes: 120,
      maxAttempts: 1,
      passingScore: finalPassingScore,
      autoSubmitOnTimeout: true,
      allowReview: false,
      showResults: true,
      packageAQuestions: config?.package_a_questions ?? 50,
      packageBQuestions: config?.package_b_questions ?? 50
    } : null;

    let existingAttemptId: string | null = registration.exam_attempt_id;
    if (isFinalExam) {
      const { data: finalAttempt } = await supabaseAdmin
        .from('exam_attempts')
        .select('id')
        .eq('user_id', user.id)
        .eq('registration_id', registration.id)
        .eq('exam_type', 'final-exam')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      existingAttemptId = finalAttempt?.id || null;
    }

    return NextResponse.json({
      data: processedQuestions,
      total: processedQuestions.length,
      examJuzNumber: requiredJuzNumber,
      chosenJuz: chosenJuz,
      registrationId: registration.id,
      existingAttemptId,
      source,
      config: isFinalExam ? finalExamConfig : (config ? {
        durationMinutes: config.duration_minutes,
        maxAttempts: config.max_attempts,
        passingScore: config.passing_score,
        autoSubmitOnTimeout: config.auto_submit_on_timeout,
        allowReview: config.allow_review,
        showResults: config.show_results,
        packageAQuestions: config.package_a_questions ?? 50,
        packageBQuestions: config.package_b_questions ?? 50
      } : null)
    });

  } catch (error) {
    console.error('Error in GET /api/exam/questions/for-user:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: (error as Error).message
    }, { status: 500 });
  }
}
