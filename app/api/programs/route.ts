import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const batch_id = searchParams.get('batch_id');

    let query = supabaseAdmin
      .from('programs')
      .select('*')
      .in('status', ['open', 'ongoing']);

    if (batch_id && batch_id !== 'all') {
      query = query.eq('batch_id', batch_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Programs API] Error:', error);
      return NextResponse.json(
        { error: 'Failed to load programs', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('[Programs API] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
