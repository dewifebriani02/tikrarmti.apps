import { createClient } from '@/lib/supabase/server';
import { requireAnyRole, getAuthorizationContext } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { parseBlokField } from '@/lib/blok';

export async function GET() {
  try {
    // 1. Authorization check - Standardized via requireAnyRole
    const authError = await requireAnyRole(['admin', 'musyrifah']);
    if (authError) return authError;

    const context = await getAuthorizationContext();
    if (!context) return ApiResponses.unauthorized('Unable to get authorization context');

    const supabase = createClient();

    // Get the current active batch (open or ongoing)
    const { data: activeBatch } = await supabase
      .from('batches')
      .select('id, name')
      .in('status', ['open', 'ongoing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeBatch) {
      // Fallback: Just get the last non-archived batch if no open/ongoing one exists
      const { data: lastBatch } = await supabase
        .from('batches')
        .select('id, name')
        .neq('status', 'archived')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!lastBatch) {
        return ApiResponses.success(createEmptyStats(), 'No batches found, returning empty stats');
      }
      
      // Use the last non-archived batch
      const jurnalStats = await calculateJurnalStats(supabase, lastBatch.id);
      const tashihStats = await calculateTashihStats(supabase, lastBatch.id);
      
      const { count: totalThalibah } = await supabase
        .from('daftar_ulang_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('batch_id', lastBatch.id)
        .in('status', ['approved', 'submitted']);
      
      const { count: activeHalaqah } = await supabase
        .from('halaqah')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      return ApiResponses.success({
        totalThalibah: totalThalibah || 0,
        activeHalaqah: activeHalaqah || 0,
        pendingJurnalReview: 0,
        pendingTashihReview: 0,
        pendingUjianReview: 0,
        jurnal: jurnalStats,
        tashih: tashihStats,
      });
    }

    // Calculate Jurnal Statistics
    const jurnalStats = await calculateJurnalStats(supabase, activeBatch.id);

    // Calculate Tashih Statistics
    const tashihStats = await calculateTashihStats(supabase, activeBatch.id);

    // Get total thalibah count (approved daftar ulang submissions)
    const { count: totalThalibah } = await supabase
      .from('daftar_ulang_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('batch_id', activeBatch.id)
      .in('status', ['approved', 'submitted']);

    // Get active halaqah count
    const { count: activeHalaqah } = await supabase
      .from('halaqah')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    const stats = {
      totalThalibah: totalThalibah || 0,
      activeHalaqah: activeHalaqah || 0,
      pendingJurnalReview: 0,
      pendingTashihReview: 0,
      pendingUjianReview: 0,
      jurnal: jurnalStats,
      tashih: tashihStats,
    };

    return ApiResponses.success(stats);
  } catch (error) {
    console.error('[Musyrifah Stats API] Unexpected error:', error);
    return ApiResponses.handleUnknown(error);
  }
}

function createEmptyStats() {
  return {
    totalThalibah: 0,
    activeHalaqah: 0,
    pendingJurnalReview: 0,
    pendingTashihReview: 0,
    pendingUjianReview: 0,
    jurnal: {
      totalEntries: 0,
      uniqueThalibah: 0,
      thalibahWithJurnal: 0,
      thalibahWithoutJurnal: 0,
      averageEntriesPerThalibah: 0,
      weeksWithJurnal: 0,
      totalBlocksCompleted: 0,
      completionPercentage: 0,
      thisWeekEntries: 0,
    },
    tashih: {
      totalRecords: 0,
      uniqueThalibah: 0,
      thalibahWithTashih: 0,
      thalibahWithoutTashih: 0,
      averageRecordsPerThalibah: 0,
      totalBlocksCompleted: 0,
      totalBlocks: 0,
      completionPercentage: 0,
      thisWeekRecords: 0,
    },
  };
}

async function calculateJurnalStats(supabase: any, batchId: string) {
  const { data: jurnalRecords, error } = await supabase
    .from('jurnal_records')
    .select('user_id, blok, tanggal_setor')
    .eq('batch_id', batchId);

  if (error || !jurnalRecords || jurnalRecords.length === 0) {
    return createEmptyStats().jurnal;
  }

  const { data: daftarUlangSubmissions } = await supabase
    .from('daftar_ulang_submissions')
    .select('user_id')
    .eq('batch_id', batchId)
    .in('status', ['approved', 'submitted']);

  const totalThalibah = daftarUlangSubmissions?.length || 0;
  const thalibahIds = new Set(daftarUlangSubmissions?.map((d: any) => d.user_id) || []);
  const jurnalUserIds = new Set(jurnalRecords.map((r: any) => r.user_id));

  const totalBlocksCompleted = jurnalRecords.reduce((count: number, record: any) => {
    return count + parseBlokField(record.blok).length;
  }, 0);

  const totalExpectedBlocks = totalThalibah * 40;

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const thisWeekEntries = jurnalRecords.filter((r: any) => {
    const tanggal = new Date(r.tanggal_setor);
    return tanggal >= startOfWeek && tanggal <= endOfWeek;
  }).length;

  return {
    totalEntries: jurnalRecords.length,
    uniqueThalibah: jurnalUserIds.size,
    thalibahWithJurnal: jurnalUserIds.size,
    thalibahWithoutJurnal: Math.max(0, totalThalibah - jurnalUserIds.size),
    averageEntriesPerThalibah: totalThalibah > 0 ? (jurnalRecords.length / totalThalibah) : 0,
    weeksWithJurnal: 0,
    totalBlocksCompleted: totalBlocksCompleted,
    completionPercentage: totalExpectedBlocks > 0 ? Math.round((totalBlocksCompleted / totalExpectedBlocks) * 100) : 0,
    thisWeekEntries: thisWeekEntries,
  };
}

async function calculateTashihStats(supabase: any, batchId: string) {
  const { data: tashihRecords, error } = await supabase
    .from('tashih_records')
    .select('user_id, blok, waktu_tashih')
    .eq('batch_id', batchId);

  if (error || !tashihRecords || tashihRecords.length === 0) {
    return createEmptyStats().tashih;
  }

  const { data: daftarUlangSubmissions } = await supabase
    .from('daftar_ulang_submissions')
    .select('user_id')
    .eq('batch_id', batchId)
    .in('status', ['approved', 'submitted']);

  const totalThalibah = daftarUlangSubmissions?.length || 0;
  const tashihUserIds = new Set(tashihRecords.map((r: any) => r.user_id));

  const totalBlocksCompleted = tashihRecords.reduce((count: number, record: any) => {
    return count + parseBlokField(record.blok).length;
  }, 0);

  const totalExpectedBlocks = totalThalibah * 40;

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const thisWeekRecords = tashihRecords.filter((r: any) => {
    const waktu = new Date(r.waktu_tashih);
    return waktu >= startOfWeek && waktu <= endOfWeek;
  }).length;

  return {
    totalRecords: tashihRecords.length,
    uniqueThalibah: tashihUserIds.size,
    thalibahWithTashih: tashihUserIds.size,
    thalibahWithoutTashih: Math.max(0, totalThalibah - tashihUserIds.size),
    averageRecordsPerThalibah: totalThalibah > 0 ? (tashihRecords.length / totalThalibah) : 0,
    totalBlocksCompleted: totalBlocksCompleted,
    totalBlocks: totalExpectedBlocks,
    completionPercentage: totalExpectedBlocks > 0 ? Math.round((totalBlocksCompleted / totalExpectedBlocks) * 100) : 0,
    thisWeekRecords: thisWeekRecords,
  };
}
