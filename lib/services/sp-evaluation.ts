import { query } from '@/lib/db';

export interface EvaluatedThalibahSP {
  thalibah_id: string;
  full_name: string;
  nama_kunyah?: string;
  whatsapp?: string;
  email?: string;
  batch_id: string;
  batch_name: string;
  confirmed_chosen_juz?: string;
  week_number: number;
  completed_blocks_count: number;
  completed_blocks: string[];
  missing_blocks: string[];
  is_complete: boolean;
  status_jurnal: 'lengkap' | 'tidak_lengkap' | 'ghaib';
  current_active_sp_level: number;
  next_sp_level: number;
  existing_sp_id?: string;
  existing_sp_level?: number;
  reason_code: 'tidak_lapor_jurnal' | 'laporan_tidak_lengkap';
  reason_text: string;
  notes: string;
  sp_type: string | null;
  action_needed: 'create_sp' | 'already_issued' | 'none';
}

export interface SPEvaluationResult {
  success: boolean;
  batch_id: string;
  batch_name: string;
  target_week: number;
  current_week: number;
  total_active_thalibah: number;
  completed_thalibah_count: number;
  incomplete_thalibah_count: number;
  sp_to_issue_count: number;
  already_issued_sp_count: number;
  issued_sp_count?: number;
  thalibah_list: EvaluatedThalibahSP[];
}

/**
 * Calculates week number from block string
 * (e.g. "H1A" -> 1, "H7B" -> 7, "H17C" -> 7, "[\"H7A\"]" -> 7)
 */
export function calculateWeekFromBlok(blok: string | null): number | null {
  if (!blok) return null;

  let blokCode: string = String(blok).trim();

  if (blokCode.startsWith('[')) {
    try {
      const parsed = JSON.parse(blokCode);
      if (Array.isArray(parsed) && parsed.length > 0) {
        blokCode = String(parsed[0]);
      } else {
        return null;
      }
    } catch {
      // ignore
    }
  }

  const match = blokCode.match(/H(\d+)/i);
  if (!match) return null;

  const blockNumber = parseInt(match[1], 10);
  if (blockNumber >= 1 && blockNumber <= 10) {
    return blockNumber;
  } else if (blockNumber >= 11 && blockNumber <= 20) {
    return blockNumber - 10;
  }

  return null;
}

/**
 * Extract clean block code string (e.g., "H7A" or "H17A")
 */
export function extractCleanBlok(blok: string | null): string | null {
  if (!blok) return null;
  let blokCode = String(blok).trim();
  if (blokCode.startsWith('[')) {
    try {
      const parsed = JSON.parse(blokCode);
      if (Array.isArray(parsed) && parsed.length > 0) {
        blokCode = String(parsed[0]);
      }
    } catch {
      // ignore
    }
  }
  const match = blokCode.match(/H\d+[A-D]/i);
  return match ? match[0].toUpperCase() : blokCode.toUpperCase();
}

/**
 * Evaluates weekly journal compliance and optionally issues SP records
 */
export async function evaluateWeeklyJurnalSP({
  batchId,
  weekNumber,
  execute = false,
  issuedByUserId,
  issuedAtDate,
}: {
  batchId?: string;
  weekNumber?: number;
  execute?: boolean;
  issuedByUserId?: string;
  issuedAtDate?: string;
}): Promise<SPEvaluationResult> {
  // 1. Get Batch Info
  let batchQuery = `SELECT * FROM batches WHERE status = 'open' ORDER BY created_at DESC LIMIT 1`;
  let batchParams: any[] = [];

  if (batchId && batchId !== 'all') {
    batchQuery = `SELECT * FROM batches WHERE id = $1`;
    batchParams = [batchId];
  }

  const { rows: batchRows } = await query(batchQuery, batchParams);
  if (!batchRows || batchRows.length === 0) {
    throw new Error('Batch aktif tidak ditemukan.');
  }

  const activeBatch = batchRows[0];
  const activeBatchId = activeBatch.id;
  const activeBatchName = activeBatch.name || 'Batch Aktif';

  // 2. Determine target week
  let targetWeek = weekNumber;
  let calculatedCurrentWeek = 1;

  if (activeBatch.first_week_start_date) {
    const startDate = new Date(activeBatch.first_week_start_date);
    const now = new Date();
    const diffWeeks = Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    calculatedCurrentWeek = Math.max(1, Math.min(diffWeeks + 1, 10));
  }

  if (!targetWeek) {
    // If today is Monday or during the week, evaluate the immediately prior completed week if > 1, else current week
    targetWeek = Math.max(1, calculatedCurrentWeek > 1 ? calculatedCurrentWeek - 1 : 1);
  }

  // 3. Get all active registered thalibah in this batch
  const thalibahSql = `
    SELECT 
      du.user_id,
      du.confirmed_chosen_juz,
      du.status as du_status,
      u.full_name,
      u.nama_kunyah,
      u.whatsapp,
      u.email
    FROM daftar_ulang_submissions du
    JOIN users u ON u.id = du.user_id
    WHERE du.batch_id = $1 
      AND du.status IN ('approved', 'submitted')
      AND (u.is_blacklisted IS FALSE OR u.is_blacklisted IS NULL)
    ORDER BY u.full_name ASC
  `;
  const { rows: thalibahList } = await query(thalibahSql, [activeBatchId]);

  if (!thalibahList || thalibahList.length === 0) {
    return {
      success: true,
      batch_id: activeBatchId,
      batch_name: activeBatchName,
      target_week: targetWeek,
      current_week: calculatedCurrentWeek,
      total_active_thalibah: 0,
      completed_thalibah_count: 0,
      incomplete_thalibah_count: 0,
      sp_to_issue_count: 0,
      already_issued_sp_count: 0,
      issued_sp_count: 0,
      thalibah_list: [],
    };
  }

  const userIds = thalibahList.map(t => t.user_id);

  const batchStart = new Date(activeBatch.start_date || '2026-08-10');

  // 4. Fetch all journal records for these users strictly for the active batch
  const jurnalSql = `
    SELECT 
      user_id,
      blok,
      tanggal_setor,
      created_at
    FROM jurnal_records
    WHERE user_id = ANY($1)
      AND (created_at >= $2 OR tanggal_setor >= $2)
  `;
  const { rows: jurnalRecords } = await query(jurnalSql, [userIds, batchStart.toISOString()]);

  // Group journal by user
  const jurnalByUser = new Map<string, any[]>();
  jurnalRecords.forEach(rec => {
    if (!jurnalByUser.has(rec.user_id)) {
      jurnalByUser.set(rec.user_id, []);
    }
    jurnalByUser.get(rec.user_id)!.push(rec);
  });

  // 5. Fetch all existing SP records in this batch
  const spSql = `
    SELECT 
      id,
      thalibah_id,
      week_number,
      sp_level,
      sp_type,
      status,
      reason,
      issued_at
    FROM surat_peringatan
    WHERE batch_id = $1 AND status != 'cancelled'
  `;
  const { rows: existingSPs } = await query(spSql, [activeBatchId]);

  const spByUser = new Map<string, any[]>();
  existingSPs.forEach(sp => {
    if (!spByUser.has(sp.thalibah_id)) {
      spByUser.set(sp.thalibah_id, []);
    }
    spByUser.get(sp.thalibah_id)!.push(sp);
  });

  // 6. Evaluate each thalibah
  const evaluatedList: EvaluatedThalibahSP[] = [];
  let completedCount = 0;
  let incompleteCount = 0;
  let spToIssueCount = 0;
  let alreadyIssuedCount = 0;

  const issueDate = issuedAtDate ? new Date(issuedAtDate).toISOString() : new Date().toISOString();

  for (const thalibah of thalibahList) {
    const userJurnals = jurnalByUser.get(thalibah.user_id) || [];
    const userSPs = spByUser.get(thalibah.user_id) || [];

    const isPartB = thalibah.confirmed_chosen_juz?.toUpperCase().includes('B') || false;
    const baseOffset = isPartB ? 10 : 0;
    const expectedBlockNumbers = targetWeek + baseOffset;
    const expectedLetters = ['A', 'B', 'C', 'D'];
    const expectedBlocks = expectedLetters.map(l => `H${expectedBlockNumbers}${l}`);

    // Extract unique submitted blocks specifically matching this week's expected blocks
    const submittedBlockCodes = new Set<string>();
    userJurnals.forEach(rec => {
      const cleanBlok = extractCleanBlok(rec.blok);
      if (cleanBlok && expectedBlocks.includes(cleanBlok)) {
        submittedBlockCodes.add(cleanBlok);
      }
    });

    const completedBlocks = Array.from(submittedBlockCodes);
    const missingBlocks = expectedBlocks.filter(b => !submittedBlockCodes.has(b));
    const completedBlocksCount = completedBlocks.length;
    const isComplete = completedBlocksCount >= 4;

    if (isComplete) {
      completedCount++;
      evaluatedList.push({
        thalibah_id: thalibah.user_id,
        full_name: thalibah.full_name,
        nama_kunyah: thalibah.nama_kunyah,
        whatsapp: thalibah.whatsapp,
        email: thalibah.email,
        batch_id: activeBatchId,
        batch_name: activeBatchName,
        confirmed_chosen_juz: thalibah.confirmed_chosen_juz,
        week_number: targetWeek,
        completed_blocks_count: completedBlocksCount,
        completed_blocks: completedBlocks,
        missing_blocks: missingBlocks,
        is_complete: true,
        status_jurnal: 'lengkap',
        current_active_sp_level: 0,
        next_sp_level: 0,
        reason_code: 'tidak_lapor_jurnal',
        reason_text: 'Tuntas / Lengkap',
        notes: '',
        sp_type: null,
        action_needed: 'none',
      });
      continue;
    }

    // Thalibah is incomplete
    incompleteCount++;
    const statusJurnal = completedBlocksCount === 0 ? 'ghaib' : 'tidak_lengkap';
    const reasonCode = completedBlocksCount === 0 ? 'tidak_lapor_jurnal' : 'laporan_tidak_lengkap';
    const reasonText = completedBlocksCount === 0
      ? `Tidak menyetorkan laporan jurnal sama sekali pada Pekan ${targetWeek} (0/4 blok)`
      : `Laporan jurnal tidak lengkap pada Pekan ${targetWeek} (${completedBlocksCount}/4 blok)`;

    const notesText = completedBlocksCount === 0
      ? `Ghaib pada Pekan ${targetWeek}. Belum menyetor blok ${expectedBlocks.join(', ')}.`
      : `Hanya menyetor ${completedBlocks.join(', ')}. Belum menyetor ${missingBlocks.join(', ')}.`;

    // Check prior active SPs in this batch (excluding Pekan 5 which is exempt due to system error)
    const priorSPs = userSPs.filter(s => {
      const w = parseInt(String(s.week_number), 10);
      return w < targetWeek && w !== 5;
    });
    const highestPriorLevel = priorSPs.reduce((max, s) => Math.max(max, parseInt(String(s.sp_level || 0), 10)), 0);
    const nextLevel = Math.min(highestPriorLevel + 1, 3);
    const spType = nextLevel === 3 ? 'temporary_do' : null;

    // Check if SP for target week already exists
    const existingTargetSP = userSPs.find(s => parseInt(String(s.week_number), 10) === targetWeek);

    if (existingTargetSP) {
      alreadyIssuedCount++;
      evaluatedList.push({
        thalibah_id: thalibah.user_id,
        full_name: thalibah.full_name,
        nama_kunyah: thalibah.nama_kunyah,
        whatsapp: thalibah.whatsapp,
        email: thalibah.email,
        batch_id: activeBatchId,
        batch_name: activeBatchName,
        confirmed_chosen_juz: thalibah.confirmed_chosen_juz,
        week_number: targetWeek,
        completed_blocks_count: completedBlocksCount,
        completed_blocks: completedBlocks,
        missing_blocks: missingBlocks,
        is_complete: false,
        status_jurnal: statusJurnal,
        current_active_sp_level: highestPriorLevel,
        next_sp_level: parseInt(String(existingTargetSP.sp_level), 10),
        existing_sp_id: existingTargetSP.id,
        existing_sp_level: parseInt(String(existingTargetSP.sp_level), 10),
        reason_code: reasonCode,
        reason_text: reasonText,
        notes: notesText,
        sp_type: existingTargetSP.sp_type || spType,
        action_needed: 'already_issued',
      });
    } else {
      spToIssueCount++;
      evaluatedList.push({
        thalibah_id: thalibah.user_id,
        full_name: thalibah.full_name,
        nama_kunyah: thalibah.nama_kunyah,
        whatsapp: thalibah.whatsapp,
        email: thalibah.email,
        batch_id: activeBatchId,
        batch_name: activeBatchName,
        confirmed_chosen_juz: thalibah.confirmed_chosen_juz,
        week_number: targetWeek,
        completed_blocks_count: completedBlocksCount,
        completed_blocks: completedBlocks,
        missing_blocks: missingBlocks,
        is_complete: false,
        status_jurnal: statusJurnal,
        current_active_sp_level: highestPriorLevel,
        next_sp_level: nextLevel,
        reason_code: reasonCode,
        reason_text: reasonText,
        notes: notesText,
        sp_type: spType,
        action_needed: 'create_sp',
      });
    }
  }

  // 7. If execute === true, insert records for those needing SP
  let newlyIssuedCount = 0;
  if (execute) {
    const candidatesToInsert = evaluatedList.filter(item => item.action_needed === 'create_sp');

    for (const item of candidatesToInsert) {
      const insertSql = `
        INSERT INTO surat_peringatan (
          thalibah_id,
          batch_id,
          week_number,
          sp_level,
          sp_type,
          reason,
          notes,
          status,
          is_blacklisted,
          issued_at,
          issued_by,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9, $10, NOW(), NOW())
        RETURNING id
      `;

      const isBlacklist = item.next_sp_level >= 3 && item.sp_type === 'blacklist';

      const { rows: inserted } = await query(insertSql, [
        item.thalibah_id,
        item.batch_id,
        item.week_number,
        item.next_sp_level,
        item.sp_type,
        item.reason_code,
        item.notes,
        isBlacklist,
        issueDate,
        issuedByUserId || null,
      ]);

      if (inserted && inserted.length > 0) {
        item.existing_sp_id = inserted[0].id;
        item.action_needed = 'already_issued';
        newlyIssuedCount++;
      }
    }
  }

  // Sort list: pending SP first, then already issued, then completed
  evaluatedList.sort((a, b) => {
    if (a.is_complete !== b.is_complete) return a.is_complete ? 1 : -1;
    if (a.next_sp_level !== b.next_sp_level) return b.next_sp_level - a.next_sp_level;
    return a.full_name.localeCompare(b.full_name);
  });

  return {
    success: true,
    batch_id: activeBatchId,
    batch_name: activeBatchName,
    target_week: targetWeek,
    current_week: calculatedCurrentWeek,
    total_active_thalibah: thalibahList.length,
    completed_thalibah_count: completedCount,
    incomplete_thalibah_count: incompleteCount,
    sp_to_issue_count: spToIssueCount,
    already_issued_sp_count: alreadyIssuedCount,
    issued_sp_count: newlyIssuedCount,
    thalibah_list: evaluatedList,
  };
}
