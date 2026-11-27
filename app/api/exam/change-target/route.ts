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
    const { targetJuz, skipExam, batchId } = body;

    // Get user's registration
    let registrationQuery = supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select('id, batch_id')
      .eq('user_id', user.id);

    if (batchId) {
      registrationQuery = registrationQuery.eq('batch_id', batchId);
    }

    const { data: registration, error: registrationError } = await registrationQuery
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (registrationError || !registration) {
      return NextResponse.json({
        error: 'No registration found'
      }, { status: 404 });
    }

    if (skipExam) {
      // User chose to skip the exam and downgrade to 30A
      const { error: updateError } = await supabaseAdmin
        .from('pendaftaran_tikrar_tahfidz')
        .update({
          chosen_juz: '30A',
          exam_status: 'completed',
          exam_juz_number: null,
          exam_score: 0,
          exam_attempt_id: null,
        })
        .eq('id', registration.id);

      if (updateError) {
        logger.error('Error skipping exam and downgrading', { error: updateError });
        return NextResponse.json({ error: 'Failed to update registration' }, { status: 500 });
      }

      const { error: syncSubmissionError } = await supabaseAdmin
        .from('daftar_ulang_submissions')
        .update({ confirmed_chosen_juz: '30A' })
        .eq('registration_id', registration.id);

      if (syncSubmissionError) {
        logger.warn('Failed to sync skipped-exam target to re-enrollment', {
          error: syncSubmissionError,
          registrationId: registration.id
        });
      }

      return NextResponse.json({
        message: 'Exam skipped successfully, downgraded to 30A',
        newJuz: '30A'
      });
    }

    if (targetJuz) {
      const normalizedTarget = targetJuz.trim().toUpperCase();
      const { data: targetOption, error: targetError } = await supabaseAdmin
        .from('juz_options')
        .select('code, juz_number, part')
        .eq('code', normalizedTarget)
        .eq('is_active', true)
        .maybeSingle();

      if (targetError || !targetOption) {
        return NextResponse.json({ error: 'Pilihan juz tidak tersedia' }, { status: 400 });
      }

      const { data: batchMappings, error: mappingError } = await supabaseAdmin
        .from('batch_juz_options')
        .select('juz_code')
        .eq('batch_id', registration.batch_id)
        .eq('is_active', true);

      if (!mappingError && batchMappings && batchMappings.length > 0 &&
          !batchMappings.some(mapping => mapping.juz_code === normalizedTarget)) {
        return NextResponse.json({ error: 'Pilihan juz tidak dibuka untuk batch ini' }, { status: 400 });
      }

      const requiredExamJuz = getRequiredExamJuz(normalizedTarget);
      const isNoExamTarget = !requiredExamJuz;

      // User wants to change their target juz before exam
      const { error: updateError } = await supabaseAdmin
        .from('pendaftaran_tikrar_tahfidz')
        .update({
          chosen_juz: normalizedTarget,
          exam_attempt_id: null,
          ...(isNoExamTarget
            ? {
                exam_status: 'completed',
                exam_juz_number: null,
                exam_score: 0,
              }
            : {}),
        })
        .eq('id', registration.id);

      if (updateError) {
        logger.error('Error updating target juz', { error: updateError });
        return NextResponse.json({ error: 'Failed to update target juz' }, { status: 500 });
      }

      const { error: syncSubmissionError } = await supabaseAdmin
        .from('daftar_ulang_submissions')
        .update({ confirmed_chosen_juz: normalizedTarget })
        .eq('registration_id', registration.id);

      if (syncSubmissionError) {
        logger.warn('Failed to sync changed target to re-enrollment', {
          error: syncSubmissionError,
          registrationId: registration.id
        });
      }

      return NextResponse.json({
        message: 'Target juz updated successfully',
        newJuz: normalizedTarget,
        examJuz: requiredExamJuz
      });
    }

    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });

  } catch (error) {
    logger.error('Error in POST /api/exam/change-target', { error: error as Error });
    return NextResponse.json({
      error: 'Internal server error',
    }, { status: 500 });
  }
}
