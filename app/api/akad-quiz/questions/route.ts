import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getAuthorizationContext } from '@/lib/rbac';

const supabaseAdmin = createSupabaseAdmin();

const parseJsonField = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('active');

    let query = supabaseAdmin
      .from('akad_quiz_questions')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: questions, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch questions', details: fetchError.message }, { status: 500 });
    }

    const context = await getAuthorizationContext();
    const isAdmin = context?.roles.includes('admin') === true;

    // `options` column is stored as text (JSON string) — parse it first
    const parsedQuestions = (questions || []).map((question: any) => ({
      ...question,
      options: parseJsonField(question.options),
    }));

    const responseQuestions = isAdmin
      ? parsedQuestions
      : parsedQuestions.map((question: any) => {
          const sanitized = { ...question };
          delete sanitized.correct_answer;
          sanitized.options = sanitized.options.map((option: any) => {
            const cleanOption = { ...option };
            delete cleanOption.isCorrect;
            delete cleanOption.is_correct;
            return cleanOption;
          });
          return sanitized;
        });

    return NextResponse.json({
      data: responseQuestions,
      total: questions?.length || 0
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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

    if (!body.question_text) {
      return NextResponse.json({ error: 'Missing question_text' }, { status: 400 });
    }

    const insertData = {
      question_text: body.question_text,
      options: body.options || [],
      points: body.points || 10,
      sort_order: body.sort_order || 0,
      is_active: body.is_active !== false,
    };

    const { data: newQuestion, error: insertError } = await supabaseAdmin
      .from('akad_quiz_questions')
      .insert(insertData)
      .select();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create question', details: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: newQuestion[0],
      message: 'Question created successfully'
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !userData.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Question ID required' }, { status: 400 });
    }

    const { data: updatedQuestion, error: updateError } = await supabaseAdmin
      .from('akad_quiz_questions')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
    }

    return NextResponse.json({
      data: updatedQuestion,
      message: 'Question updated successfully'
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !userData.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Question ID required' }, { status: 400 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('akad_quiz_questions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Question deleted successfully'
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
