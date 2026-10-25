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
      const targetJuzNum = parseInt(chosenJuz?.replace(/[AB]/g, "") || "0");
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
      const isStaff = profile?.roles && (
        profile.roles.includes("admin") ||
        profile.roles.includes("superadmin") ||
        profile.roles.includes("musyrifah")
      );

      const now = new Date();
      if (!isStaff && batch?.final_exam_start_date && now < new Date(batch.final_exam_start_date)) {
        return NextResponse.json({
          data: {
            isEligible: false,
            requiredJuz: targetJuzNum,
            reason: "Waktu ujian akhir pilihan ganda belum dibuka.",
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
    const { data: pastRegs } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select('status, selection_status, batch:batches(end_date, status)')
      .eq('user_id', user.id);

    let isAlumni = false;
    if (pastRegs) {
      const now = new Date();
      isAlumni = pastRegs.some((reg: any) => {
        const isApproved = reg.status === 'approved' || reg.status === 'completed';
        const isSelected = reg.selection_status === 'selected' || reg.selection_status === 'passed';
        if (!isApproved || !isSelected) return false;
        
        const batch = reg.batch;
        if (!batch) return false;
        
        const endDate = batch.end_date ? new Date(batch.end_date) : null;
        return (endDate && endDate < now) || batch.status === 'archived';
      });
    }

    if (isAlumni) {
      const eligibility: ExamEligibility = {
        isEligible: false,
        requiredJuz: null,
        reason: 'Ukhti adalah Alumni MTI sehingga tidak diwajibkan mengikuti tes tertulis.',
        hasCompleted: true
      };
      return NextResponse.json({ data: eligibility });
    }

    // Check if oral submission is completed
    if (!registration.oral_submitted_at || !registration.oral_submission_url) {
      const eligibility: ExamEligibility = {
        isEligible: false,
        requiredJuz: null,
        reason: 'Please complete voice recording submission first',
        hasCompleted: false
      };
      return NextResponse.json({ data: eligibility });
    }

    // Determine required exam juz
    const requiredJuz = getRequiredExamJuz(registration.chosen_juz);

    if (!requiredJuz) {
      const eligibility: ExamEligibility = {
        isEligible: false,
        requiredJuz: null,
        reason: `No exam required for ${registration.chosen_juz}`,
        hasCompleted: false
      };
      return NextResponse.json({ data: eligibility });
    }

    // Check if exam already completed
    const { data: attempts, error: attemptError } = await supabaseAdmin
      .from('exam_attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('registration_id', registration.id)
      .eq('juz_number', requiredJuz)
      .eq('status', 'submitted');

    // Check if akad is uploaded (from daftar_ulang_submissions)
    const { data: daftarUlang } = await supabaseAdmin
      .from('daftar_ulang_submissions')
      .select('akad_url, akad_submitted_at')
      .eq('registration_id', registration.id)
      .single();

    if (daftarUlang && (daftarUlang.akad_url || daftarUlang.akad_submitted_at)) {
      const eligibility: ExamEligibility = {
        isEligible: false,
        requiredJuz: null,
        reason: 'Test tertulis sudah ditutup karena Ukhti telah mengunggah akad.',
        hasCompleted: attempts && attempts.length > 0 ? true : false,
      };
      return NextResponse.json({ data: eligibility });
    }

    if (attemptError) {
      logger.error('Error checking exam attempts', { error: attemptError });
      return NextResponse.json({ error: 'Failed to check eligibility' }, { status: 500 });
    }

    // Get exam configuration
    const { data: config, error: configError } = await supabaseAdmin
      .from('exam_configurations')
      .select('max_attempts')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const maxAttempts = config?.max_attempts || null;

    // Count submitted attempts
    const submittedCount = attempts?.length || 0;
    const attemptsRemaining = maxAttempts !== null ? maxAttempts - submittedCount : null;

    // Check if max attempts reached
    if (maxAttempts !== null && submittedCount >= maxAttempts) {
      const attempt = attempts[0];
      const eligibility: ExamEligibility = {
        isEligible: false,
        requiredJuz,
        reason: `Kesempatan ujian telah habis (${maxAttempts}x percobaan). Tetap semangat!`,
        hasCompleted: true,
        attemptId: attempt.id,
        score: attempt.score,
        maxAttempts,
        attemptsUsed: submittedCount,
        attemptsRemaining: 0
      };
      return NextResponse.json({ data: eligibility });
    }

    if (attempts && attempts.length > 0) {
      const attempt = attempts[0];
      const eligibility: ExamEligibility = {
        isEligible: true,
        requiredJuz,
        reason: `Exam already completed with score ${attempt.score}%, but attempts remaining.`,
        hasCompleted: true,
        attemptId: attempt.id,
        score: attempt.score,
        maxAttempts,
        attemptsUsed: submittedCount,
        attemptsRemaining
      };
      return NextResponse.json({ data: eligibility });
    }

    // User is eligible
    const eligibility: ExamEligibility = {
      isEligible: true,
      requiredJuz,
      hasCompleted: false,
      maxAttempts,
      attemptsUsed: submittedCount,
      attemptsRemaining
    };

    return NextResponse.json({ data: eligibility });

  } catch (error) {
    logger.error('Error in GET /api/exam/eligibility', { error: error as Error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
