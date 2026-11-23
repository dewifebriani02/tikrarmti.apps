// API Route: /api/exam/questions/bulk-import
// Bulk import exam questions from JSON (Admin only)

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger-secure';

const supabaseAdmin = createSupabaseAdmin();

function normalizeImportedOptions(rawOptions: any[], fallbackCorrectAnswer?: string) {
  const texts = (Array.isArray(rawOptions) ? rawOptions : []).map((opt: any) =>
    String(opt?.option_text ?? opt?.text ?? '').trim()
  );
  const flaggedIndices = (Array.isArray(rawOptions) ? rawOptions : [])
    .map((opt: any, idx: number) => (opt?.is_correct === true || opt?.isCorrect === true ? idx : -1))
    .filter((idx: number) => idx >= 0);

  let winningIdx = -1;
  const trimmedFallback = fallbackCorrectAnswer ? String(fallbackCorrectAnswer).trim() : '';

  if (flaggedIndices.length > 0) {
    if (trimmedFallback) {
      const flaggedMatch = flaggedIndices.find((idx) => texts[idx] === trimmedFallback);
      winningIdx = flaggedMatch !== undefined ? flaggedMatch : flaggedIndices[0];
    } else {
      winningIdx = flaggedIndices[0];
    }
  } else if (trimmedFallback) {
    winningIdx = texts.findIndex((t) => t === trimmedFallback);
  }

  const formattedOptions = texts.map((text, idx) => ({
    text,
    isCorrect: idx === winningIdx,
  }));

  const correctAnswer = winningIdx >= 0 ? formattedOptions[winningIdx].text : trimmedFallback;
  return { formattedOptions, correctAnswer };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !userData.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { juz_number, questions, replace_existing, question_package } = body;

    if (!juz_number || !questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: 'Invalid import data' }, { status: 400 });
    }

    // If replace_existing, archive all existing questions for this juz (and specific package if provided) by setting is_active = false
    if (replace_existing) {
      let archiveQuery = supabaseAdmin
        .from('exam_questions')
        .update({ is_active: false })
        .eq('juz_number', juz_number);
        
      if (question_package) {
        archiveQuery = archiveQuery.eq('question_package', question_package);
      }

      const { error: deleteError } = await archiveQuery;

      if (deleteError) {
        // If table doesn't exist yet, that's okay - just continue
        if (deleteError.code === 'PGRST116' || deleteError.message?.includes('relation') || deleteError.message?.includes('does not exist')) {
          logger.info('exam_questions table does not exist yet, will create during import');
        } else {
          logger.error('Error deleting existing questions', { error: deleteError });
          return NextResponse.json({ error: 'Failed to delete existing questions' }, { status: 500 });
        }
      } else {
        logger.info('Deleted existing questions for bulk import', { juzNumber: juz_number, adminId: user.id });
      }
    }

    // Prepare questions for insert
    const questionsToInsert = questions.map((q: any) => {
      const { formattedOptions, correctAnswer } = normalizeImportedOptions(q.options || [], q.correct_answer);
      return {
        juz_number,
        section_number: q.section_number,
        section_title: q.section_title,
        question_number: q.question_number,
        question_text: q.question_text,
        question_type: q.question_type || 'multiple_choice',
        options: formattedOptions,
        correct_answer: correctAnswer,
        points: q.points || 1,
        is_active: q.is_active !== false,
        question_package: q.question_package || 'B',
        created_by: user.id
      };
    });

    // Insert in batches to avoid timeout (Supabase limit ~1000 rows)
    const batchSize = 100;
    const batches = [];

    for (let i = 0; i < questionsToInsert.length; i += batchSize) {
      batches.push(questionsToInsert.slice(i, i + batchSize));
    }

    let totalInserted = 0;
    const errors: any[] = [];

    for (const batch of batches) {
      const { data: insertedQuestions, error: insertError } = await supabaseAdmin
        .from('exam_questions')
        .insert(batch)
        .select();

      if (insertError) {
        logger.error('Error inserting question batch', { error: insertError, batch });
        errors.push({ error: insertError, batchSize: batch.length });
      } else {
        totalInserted += insertedQuestions?.length || 0;
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        message: `Partial import: ${totalInserted} questions imported, ${errors.length} batches failed`,
        imported: totalInserted,
        errors
      }, { status: 207 }); // Multi-Status
    }

    logger.info('Bulk import completed', {
      juzNumber: juz_number,
      totalQuestions: totalInserted,
      adminId: user.id
    });

    return NextResponse.json({
      message: `Successfully imported ${totalInserted} questions for Juz ${juz_number}`,
      imported: totalInserted,
      juz_number
    }, { status: 201 });

  } catch (error) {
    logger.error('Error in POST /api/exam/questions/bulk-import', { error: error as Error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
