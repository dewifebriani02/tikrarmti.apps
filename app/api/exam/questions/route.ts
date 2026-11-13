// API Route: /api/exam/questions
// CRUD operations for exam questions (Admin only)

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger-secure';
import { requireAdmin, getAuthorizationContext } from '@/lib/rbac';

const supabaseAdmin = createSupabaseAdmin();

// GET: Fetch exam questions (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const searchParams = request.nextUrl.searchParams;
    const juzNumber = searchParams.get('juz');
    const sectionNumber = searchParams.get('section');
    const isActive = searchParams.get('active');

    let query = supabaseAdmin
      .from('exam_questions')
      .select('*')
      .order('juz_number', { ascending: true })
      .order('section_number', { ascending: true })
      .order('question_number', { ascending: true });

    if (juzNumber) {
      query = query.eq('juz_number', parseInt(juzNumber));
    }

    if (sectionNumber) {
      query = query.eq('section_number', parseInt(sectionNumber));
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: questions, error: fetchError } = await query;

    if (fetchError) {
      logger.error('Error fetching exam questions', { error: fetchError });

      // If table doesn't exist yet, return empty array instead of error
      if (fetchError.code === 'PGRST116' || fetchError.message?.includes('relation') || fetchError.message?.includes('does not exist')) {
        logger.info('exam_questions table does not exist yet, returning empty array');
        return NextResponse.json({
          data: [],
          total: 0
        });
      }

      return NextResponse.json({ error: 'Failed to fetch questions', details: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: questions || [],
      total: questions?.length || 0
    });

  } catch (error) {
    logger.error('Error in GET /api/exam/questions', { error: error as Error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create new exam question (Admin only)
export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const context = await getAuthorizationContext();

    const body = await request.json();

    // Get juz_number from juz_code if provided
    let juzNumber = body.juz_number;
    if (body.juz_code) {
      const { data: juzData, error: juzError } = await supabaseAdmin
        .from('juz_options')
        .select('juz_number')
        .eq('code', body.juz_code)
        .single();

      if (juzError || !juzData) {
        logger.error('Invalid juz_code', { juz_code: body.juz_code, error: juzError });
        return NextResponse.json({ error: 'Invalid juz_code', details: juzError?.message }, { status: 400 });
      }

      juzNumber = juzData.juz_number;
    }

    // Validate required fields
    if (!juzNumber || !body.section_number || !body.question_text) {
      return NextResponse.json({
        error: 'Missing required fields',
        required: { juz_number: juzNumber, section_number: body.section_number, question_text: !!body.question_text }
      }, { status: 400 });
    }

    // Get next question_number
    const { data: lastQuestion } = await supabaseAdmin
      .from('exam_questions')
      .select('question_number')
      .eq('juz_number', juzNumber)
      .eq('section_number', body.section_number)
      .order('question_number', { ascending: false })
      .limit(1);

    const nextQuestionNumber = lastQuestion && lastQuestion.length > 0
      ? (lastQuestion[0].question_number || 0) + 1
      : 1;

    // Format options and find correct answer
    const rawOptions = body.options || [];
    const formattedOptions = rawOptions.map((opt: any) => ({
      text: opt.option_text || opt.text || '',
      isCorrect: opt.is_correct === true || opt.isCorrect === true
    }));

    const correctOption = formattedOptions.find((opt: any) => opt.isCorrect === true);
    const correctAnswer = correctOption?.text || body.correct_answer || '';

    // Prepare insert data - match exact schema from migration
    const insertData: Record<string, any> = {
      juz_number: juzNumber,
      juz_code: body.juz_code || null,
      section_number: body.section_number,
      section_title: body.section_title || 'Umum',
      question_number: nextQuestionNumber,
      question_text: body.question_text,
      question_type: body.question_type || 'multiple_choice',
      options: formattedOptions,
      correct_answer: correctAnswer,
      points: body.points || 1,
      is_active: body.is_active !== false,
      question_package: body.question_package || 'A',
      created_by: context?.userId || null
    };

    // Insert with admin client to bypass RLS
    const { data: newQuestion, error: insertError } = await supabaseAdmin
      .from('exam_questions')
      .insert(insertData)
      .select();

    if (insertError) {
      logger.error('Insert failed', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      return NextResponse.json({
        error: 'Failed to create question',
        details: insertError.message,
        code: insertError.code
      }, { status: 500 });
    }

    if (!newQuestion || newQuestion.length === 0) {
      logger.error('Insert returned no data');
      return NextResponse.json({
        error: 'Failed to create question - no data returned'
      }, { status: 500 });
    }

    logger.info('Question created successfully', { id: newQuestion[0].id, adminId: context?.userId });

    return NextResponse.json({
      data: newQuestion[0],
      message: 'Question created successfully'
    }, { status: 201 });

  } catch (error) {
    logger.error('Error in POST /api/exam/questions', {
      error: error as Error,
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    return NextResponse.json({
      error: 'Internal server error',
      details: (error as Error).message
    }, { status: 500 });
  }
}

// PUT: Update exam question (Admin only)
export async function PUT(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const context = await getAuthorizationContext();

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Question ID required' }, { status: 400 });
    }

    // Update options and correct_answer
    if (updateData.options && Array.isArray(updateData.options)) {
      const formattedOptions = updateData.options.map((opt: any) => ({
        text: opt.option_text || opt.text || '',
        isCorrect: opt.is_correct === true || opt.isCorrect === true
      }));

      const correctOption = formattedOptions.find((opt: any) => opt.isCorrect === true);
      if (correctOption) {
        updateData.correct_answer = correctOption.text;
      } else if (updateData.correct_answer) {
        const matched = formattedOptions.find((opt: any) => opt.text.trim() === updateData.correct_answer.trim());
        if (matched) matched.isCorrect = true;
      }

      updateData.options = formattedOptions;
    }

    const { data: updatedQuestion, error: updateError } = await supabaseAdmin
      .from('exam_questions')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating exam question', { error: updateError });
      return NextResponse.json({ error: 'Failed to update question', details: updateError.message }, { status: 500 });
    }

    logger.info('Exam question updated', { questionId: id, adminId: context?.userId });

    return NextResponse.json({
      data: updatedQuestion,
      message: 'Question updated successfully'
    });

  } catch (error) {
    logger.error('Error in PUT /api/exam/questions', { error: error as Error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete exam question (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const context = await getAuthorizationContext();

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Question ID required' }, { status: 400 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('exam_questions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('Error deleting exam question', { error: deleteError });
      return NextResponse.json({ error: 'Failed to delete question', details: deleteError.message }, { status: 500 });
    }

    logger.info('Exam question deleted', { questionId: id, adminId: context?.userId });

    return NextResponse.json({
      message: 'Question deleted successfully'
    });

  } catch (error) {
    logger.error('Error in DELETE /api/exam/questions', { error: error as Error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
