import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger-secure';
import { requireAdmin } from '@/lib/rbac';

const supabaseAdmin = createSupabaseAdmin();

// GET: Fetch all exam configurations
export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    let query = supabaseAdmin
      .from('exam_configurations')
      .select('*')
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: configurations, error } = await query;

    if (error) {
      logger.error('Error fetching exam configurations', { error });
      return NextResponse.json({
        error: 'Failed to fetch configurations'
      }, { status: 500 });
    }

    return NextResponse.json({
      data: configurations || [],
      total: configurations?.length || 0
    });
  } catch (error) {
    logger.error('Error in GET /api/exam/configurations', { error: error as Error });
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// POST: Create new exam configuration
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (!userProfile || !userProfile.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // If this is set as active, deactivate all other configurations
    if (body.is_active) {
      await supabaseAdmin
        .from('exam_configurations')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('is_active', true);
    }

    const packageA = body.package_a_questions !== undefined && body.package_a_questions !== null
      ? Number(body.package_a_questions)
      : 50;
    const packageB = body.package_b_questions !== undefined && body.package_b_questions !== null
      ? Number(body.package_b_questions)
      : 50;
    const totalQuestions = body.questions_per_attempt || (packageA + packageB) || 100;

    // Prepare insert data - only include created_by if it exists in users table
    const insertData: any = {
      name: body.name,
      description: body.description || null,
      duration_minutes: body.duration_minutes,
      start_time: body.start_time || null,
      end_time: body.end_time || null,
      max_attempts: body.max_attempts || null,
      shuffle_questions: body.shuffle_questions,
      randomize_order: body.randomize_order,
      show_questions_all: body.show_questions_all,
      package_a_questions: packageA,
      package_b_questions: packageB,
      questions_per_attempt: totalQuestions,
      passing_score: body.passing_score,
      auto_grade: body.auto_grade,
      score_calculation_mode: body.score_calculation_mode || 'highest',
      allow_review: body.allow_review,
      show_results: body.show_results,
      auto_submit_on_timeout: body.auto_submit_on_timeout,
      is_active: body.is_active,
    };

    // Only add created_by if the user exists in users table
    const { data: userExists } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (userExists) {
      insertData.created_by = user.id;
    }

    const { data: configuration, error } = await supabaseAdmin
      .from('exam_configurations')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error('Error creating exam configuration', { error, details: error.message });
      return NextResponse.json({
        error: 'Failed to create configuration',
        details: error.message
      }, { status: 500 });
    }

    logger.info('Exam configuration created', {
      configId: configuration.id,
      userId: user.id
    });

    return NextResponse.json({
      data: configuration,
      message: 'Configuration created successfully'
    }, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/exam/configurations', { error: error as Error });
    return NextResponse.json({
      error: 'Internal server error',
      details: (error as Error).message
    }, { status: 500 });
  }
}

// PUT: Update exam configuration
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (!userProfile || !userProfile.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({
        error: 'Configuration ID is required'
      }, { status: 400 });
    }

    // If this is set as active, deactivate all other configurations
    if (body.is_active) {
      await supabaseAdmin
        .from('exam_configurations')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('is_active', true)
        .neq('id', id);
    }

    const packageA = body.package_a_questions !== undefined && body.package_a_questions !== null
      ? Number(body.package_a_questions)
      : 50;
    const packageB = body.package_b_questions !== undefined && body.package_b_questions !== null
      ? Number(body.package_b_questions)
      : 50;
    const totalQuestions = (packageA + packageB) > 0
      ? packageA + packageB
      : (body.questions_per_attempt || 100);

    const { data: configuration, error } = await supabaseAdmin
      .from('exam_configurations')
      .update({
        name: body.name,
        description: body.description || null,
        duration_minutes: body.duration_minutes,
        start_time: body.start_time || null,
        end_time: body.end_time || null,
        max_attempts: body.max_attempts || null,
        shuffle_questions: body.shuffle_questions,
        randomize_order: body.randomize_order,
        show_questions_all: body.show_questions_all,
        package_a_questions: packageA,
        package_b_questions: packageB,
        questions_per_attempt: totalQuestions,
        passing_score: body.passing_score,
        auto_grade: body.auto_grade,
        score_calculation_mode: body.score_calculation_mode || 'highest',
        allow_review: body.allow_review,
        show_results: body.show_results,
        auto_submit_on_timeout: body.auto_submit_on_timeout,
        is_active: body.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating exam configuration', { error });
      return NextResponse.json({
        error: 'Failed to update configuration'
      }, { status: 500 });
    }

    logger.info('Exam configuration updated', {
      configId: id,
      userId: user.id
    });

    return NextResponse.json({
      data: configuration,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    logger.error('Error in PUT /api/exam/configurations', { error: error as Error });
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// DELETE: Delete exam configuration
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (!userProfile || !userProfile.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        error: 'Configuration ID is required'
      }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('exam_configurations')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting exam configuration', { error });
      return NextResponse.json({
        error: 'Failed to delete configuration'
      }, { status: 500 });
    }

    logger.info('Exam configuration deleted', {
      configId: id,
      userId: user.id
    });

    return NextResponse.json({
      message: 'Configuration deleted successfully'
    });
  } catch (error) {
    logger.error('Error in DELETE /api/exam/configurations', { error: error as Error });
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
