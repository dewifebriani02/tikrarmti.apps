// API Route: /api/exam/eligibility
// Check if user is eligible to take exam

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger-secure';
import { getRequiredExamJuz } from '@/lib/exam-utils';
import { ExamEligibility } from '@/types/exam';

const supabaseAdmin = createSupabaseAdmin();

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tikrar registration
    const { data: registrations, error: regError } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (regError) {
      logger.error('Error fetching registration', { error: regError });
      return NextResponse.json({ error: 'Failed to check eligibility' }, { status: 500 });
    }

    if (!registrations || registrations.length === 0) {
      const eligibility: ExamEligibility = {
        isEligible: false,
        requiredJuz: null,
        reason: 'No approved registration found. Please register first.',
        hasCompleted: false
      };
      return NextResponse.json({ data: eligibility });
    }

    const registration = registrations[0];

    const source = request.nextUrl.searchParams.get("source");
    const isFinalExam = source === "final-exam";

    if (isFinalExam) {
      const chosenJuz = registration.chosen_juz;
      const targetJuzNum = parseInt(chosenJuz?.match(/\d+/)?.[0] || "0", 10);
      if (targetJuzNum < 1 || targetJuzNum > 30) {
        return NextResponse.json({
          data: {
            isEligible: false,
            requiredJuz: null,
            reason: "Target " + (chosenJuz || "juz") + " tidak valid untuk ujian akhir.",
            hasCompleted: false
          }
        });
      }

      // Check batch final exam window
      const { data: batch } = await supabaseAdmin
        .from("batches")
        .select("name, final_exam_start_date, final_exam_end_date")
        .eq("id", registration.batch_id)
        .single();

      const { data: profile } = await supabaseAdmin
        .from("users")
        .select("roles")
        .eq("id", user.id)
        .single();

      // Respect the active persona cookie if present (so admin simulating thalibah experiences real thalibah rules)
      const activePersonaCookie = request.cookies.get('mti_active_persona')?.value;
      const isSimulatingStudent = activePersonaCookie === 'thalibah' || activePersonaCookie === 'calon_thalibah';

      const isStaff = !isSimulatingStudent && profile?.roles && (
        profile.roles.includes("admin") ||
        profile.roles.includes("superadmin") ||
        profile.roles.includes("musyrifah")
      );

      const now = new Date();
      if (!isStaff && (!batch?.final_exam_start_date || now < new Date(batch.final_exam_start_date))) {
        return NextResponse.json({
          data: {
            isEligible: false,
            requiredJuz: targetJuzNum,
            reason: batch?.final_exam_start_date
              ? "Waktu ujian akhir pilihan ganda belum dibuka."
              : "Jadwal ujian akhir pilihan ganda belum ditentukan oleh panitia.",
            hasCompleted: false
          }
        });
      }

      if (!isStaff && batch?.final_exam_end_date && now > new Date(batch.final_exam_end_date)) {
        return NextResponse.json({
          data: {
            isEligible: false,
            requiredJuz: targetJuzNum,
            reason: "Waktu pelaksanaan ujian akhir telah berakhir.",
            hasCompleted: false
          }
        });
      }

      // Check if attempt already submitted
      const { data: attempts } = await supabaseAdmin
        .from("exam_attempts")
        .select("*")
        .eq("user_id", user.id)
        .eq("registration_id", registration.id)
        .eq("juz_number", targetJuzNum)
        .eq("status", "submitted");

      if (attempts && attempts.length > 0) {
        const attempt = attempts[0];
        return NextResponse.json({
          data: {
            isEligible: false,
            requiredJuz: targetJuzNum,
            reason: "Ukhti telah menyelesaikan ujian pilihan ganda dengan nilai " + attempt.score + ".",
            hasCompleted: true,
            attemptId: attempt.id,
            score: attempt.score,
            maxAttempts: 1,
            attemptsUsed: 1,
            attemptsRemaining: 0
          }
        });
      }

      return NextResponse.json({
        data: {
          isEligible: true,
          requiredJuz: targetJuzNum,
          hasCompleted: false,
          maxAttempts: 1,
          attemptsUsed: 0,
          attemptsRemaining: 1
        }
      });
    }

    // Check if user is Alumni
    const isAlumni = false; // Could check from registrations or user profile

    if (isAlumni) {
      // Alumni can take any exam
      const eligibility: ExamEligibility = {
        isEligible: true,
        requiredJuz: null,
        hasCompleted: false,
        maxAttempts: 3,
        attemptsUsed: 0,
        attemptsRemaining: 3
      };
      return NextResponse.json({ data: eligibility });
    }

    // Determine required exam juz based on chosen_juz
    const requiredJuz = getRequiredExamJuz(registration.chosen_juz);

    if (!requiredJuz) {
      // Juz 30 target doesn't require an exam
      const eligibility: ExamEligibility = {
        isEligible: false,
        requiredJuz: null,
        reason: `No exam required for ${registration.chosen_juz}`,
        hasCompleted: false
      };
      return NextResponse.json({ data: eligibility });
    }

    // Fetch configuration
    const { data: config } = await supabaseAdmin
      .from('exam_configurations')
      .select('*')
      .eq('is_active', true)
      .single();

    const maxAttempts = config?.max_attempts || 1;
    const passingScore = config?.passing_score || 80;

    // Check existing attempts for this user and required juz
    const { data: attempts, error: attemptError } = await supabaseAdmin
      .from('exam_attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('registration_id', registration.id)
      .eq('juz_number', requiredJuz);

    if (attemptError) {
      logger.error('Error fetching attempts', { error: attemptError });
      return NextResponse.json({ error: 'Failed to check attempts' }, { status: 500 });
    }

    const completedAttempts = attempts?.filter(a => a.status === 'submitted') || [];
    const hasPassed = completedAttempts.some(a => (a.score || 0) >= passingScore);
    const attemptsUsed = completedAttempts.length;
    const attemptsRemaining = Math.max(0, maxAttempts - attemptsUsed);

    const eligibility: ExamEligibility = {
      isEligible: !hasPassed && attemptsRemaining > 0,
      requiredJuz,
      hasCompleted: hasPassed,
      maxAttempts,
      attemptsUsed,
      attemptsRemaining,
      reason: hasPassed
        ? 'You have already passed this exam'
        : attemptsRemaining === 0
        ? 'You have reached the maximum number of attempts'
        : undefined
    };

    return NextResponse.json({ data: eligibility });
  } catch (error) {
    logger.error('Unexpected error in eligibility check', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
