import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

const supabase = createSupabaseAdmin();

export async function GET() {
  try {
    // Optimized parallel queries for faster response
    const [batchResult, programResult] = await Promise.allSettled([
      // Get batch with single query
      supabase
        .from('batches')
        .select('*')
        .eq('status', 'open')
        .ilike('name', '%Tikrar%')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),

      // Get program in parallel
      supabase
        .from('programs')
        .select('id, name')
        .ilike('name', '%Tahfidz%')
        .limit(1)
        .single()
    ]);

    // Process batch result
    let batch: any = null;
    if (batchResult.status === 'fulfilled' && !batchResult.value.error) {
      batch = batchResult.value.data;
    } else {
      // Fallback to any batch with Tikrar in name
      const fallback = await supabase
        .from('batches')
        .select('*')
        .ilike('name', '%Tikrar%')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!fallback.error) {
        batch = fallback.data;
      }
    }

    if (!batch) {
      return NextResponse.json(
        { error: 'Batch tidak ditemukan. Silakan hubungi admin.' },
        { status: 404 }
      );
    }

    // Process program result
    let program: any = null;
    if (programResult.status === 'fulfilled' && !programResult.value.error) {
      program = programResult.value.data;
    } else {
      // Fallback to any program
      const fallback = await supabase
        .from('programs')
        .select('id, name')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!fallback.error) {
        program = fallback.data;
      }
    }

    if (!program) {
      return NextResponse.json(
        { error: 'Program tidak ditemukan. Silakan hubungi admin.' },
        { status: 404 }
      );
    }

    // Count registrations - optimized with count instead of select
    const { count: registeredCount } = await supabase
      .from('tikrar_tahfidz')
      .select('*', { count: 'exact', head: true })
      .eq('batch_id', batch.id);

    // Optimized response with minimal processing
    const response = {
      batch_id: batch.id,
      program_id: program.id,
      batch_name: batch.name,
      start_date: batch.start_date,
      end_date: batch.end_date,
      duration_weeks: batch.duration_weeks || 14, // Default 14 weeks
      price: batch.price ?? 0,
      is_free: batch.is_free ?? true,
      total_quota: batch.total_quota ?? 100,
      registered_count: registeredCount ?? 0,
      scholarship_quota: (batch.total_quota ?? 100) - (registeredCount ?? 0)
    };

    // Add cache headers
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
        'CDN-Cache-Control': 'public, max-age=600', // 10 minutes CDN cache
      }
    });

  } catch (error) {
    console.error('Error fetching default batch/program:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}