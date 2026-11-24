import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { createServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/rbac';
import { logError } from '@/lib/logger';
import { logAudit } from '@/lib/audit-log';

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const supabaseAdmin = createSupabaseAdmin();

    let requestedBatchId: string | null = null;
    try {
      const body = await request.json();
      requestedBatchId = body?.batchId || body?.batch_id || null;
    } catch {
      // No JSON body provided
    }

    // Get target active/open batch
    let batchQuery = supabaseAdmin
      .from('batches')
      .select('id, name, status');

    if (requestedBatchId) {
      batchQuery = batchQuery.eq('id', requestedBatchId);
    } else {
      batchQuery = batchQuery.in('status', ['open', 'ongoing']).order('created_at', { ascending: false }).limit(1);
    }

    const { data: activeBatches } = await batchQuery;
    const activeBatch = activeBatches?.[0];

    if (!activeBatch) {
      return NextResponse.json({ error: 'Tidak ada batch yang aktif' }, { status: 400 });
    }

    // Get config for passing score
    const { data: config } = await supabaseAdmin
      .from('exam_configurations')
      .select('passing_score')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const passingScore = config?.passing_score || 80;

    // Find all selected users in active batch who haven't passed the exam (and target is not Juz 30)
    const { data: pendaftarans, error: fetchError } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .select(`
        id, 
        user_id, 
        chosen_juz, 
        exam_score, 
        exam_status,
        selection_status
      `)
      .eq('batch_id', activeBatch.id)
      .eq('selection_status', 'selected')
      .not('chosen_juz', 'in', '("30A","30B","30")');

    if (fetchError) {
      throw fetchError;
    }

    const toDowngrade = (pendaftarans || []).filter(p => p.exam_score === null || p.exam_score < passingScore);

    if (toDowngrade.length === 0) {
      return NextResponse.json({ 
        message: 'Tidak ada thalibah yang perlu di-downgrade.',
        downgradedCount: 0
      });
    }

    // Start processing
    let successCount = 0;
    let failedCount = 0;

    for (const p of toDowngrade) {
      try {
        // 1. Update pendaftaran
        const { error: updatePendaftaranError } = await supabaseAdmin
          .from('pendaftaran_tikrar_tahfidz')
          .update({
            chosen_juz: '30A',
            exam_status: 'completed',
          })
          .eq('id', p.id);

        if (updatePendaftaranError) throw updatePendaftaranError;

        // 2. Update daftar_ulang_submissions if exists
        await supabaseAdmin
          .from('daftar_ulang_submissions')
          .update({
            confirmed_chosen_juz: '30A'
          })
          .eq('registration_id', p.id);

        successCount++;
      } catch (err) {
        logError(err as Error, { context: `Failed to downgrade user ${p.user_id}` });
        failedCount++;
      }
    }

    // Log the bulk action
    if (user?.id) {
      await logAudit({
        userId: user.id,
        action: 'UPDATE',
        resource: 'pendaftaran_tikrar_tahfidz',
        details: {
          batchName: activeBatch.name,
          targetDowngradeCount: toDowngrade.length,
          successCount,
          failedCount,
          passingScore
        }
      });
    }

    return NextResponse.json({
      message: `Berhasil men-downgrade ${successCount} thalibah ke Juz 30A. (Gagal: ${failedCount})`,
      downgradedCount: successCount
    });

  } catch (error) {
    logError(error as Error, { context: 'Error in POST /api/admin/daftar-ulang/finalize-exams' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
