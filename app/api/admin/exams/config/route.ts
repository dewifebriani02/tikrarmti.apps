import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/rbac';

const supabaseAdmin = createSupabaseAdmin();

export async function GET(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { data: config, error } = await supabaseAdmin
      .from('exam_configurations')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching config:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: config || null });
  } catch (error) {
    console.error('Error in GET config:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const payload = await request.json();
    
    // Deactivate all existing configs first to ensure only one is active
    if (payload.is_active !== false) {
      await supabaseAdmin
        .from('exam_configurations')
        .update({ is_active: false })
        .neq('id', payload.id || '00000000-0000-0000-0000-000000000000');
    }

    if (payload.id) {
      // Update existing
      const { data, error } = await supabaseAdmin
        .from('exam_configurations')
        .update({
          max_attempts: payload.max_attempts,
          passing_score: payload.passing_score,
          duration_minutes: payload.duration_minutes,
          questions_per_attempt: payload.questions_per_attempt,
          shuffle_questions: payload.shuffle_questions,
          is_active: payload.is_active ?? true,
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.id)
        .select()
        .single();
        
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    } else {
      // Create new
      const { data, error } = await supabaseAdmin
        .from('exam_configurations')
        .insert({
          name: 'Exam Configuration',
          max_attempts: payload.max_attempts,
          passing_score: payload.passing_score,
          duration_minutes: payload.duration_minutes,
          questions_per_attempt: payload.questions_per_attempt,
          shuffle_questions: payload.shuffle_questions,
          is_active: payload.is_active ?? true
        })
        .select()
        .single();
        
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }
  } catch (error: any) {
    console.error('Error updating config:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
