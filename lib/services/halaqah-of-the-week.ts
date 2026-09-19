import { query } from '@/lib/db';

const parseBlokField = (blok: any): string[] => {
  if (!blok) return [];
  if (typeof blok === 'string') {
    if (blok.startsWith('[')) {
      try {
        const parsed = JSON.parse(blok);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return blok.split(',').map(b => b.trim()).filter(b => b);
  }
  if (Array.isArray(blok)) return blok;
  return [];
};

const getStudentsArray = (studentsRaw: any): any[] => {
  if (!studentsRaw) return [];
  if (Array.isArray(studentsRaw)) return studentsRaw;
  if (typeof studentsRaw === 'string') {
    try {
      const parsed = JSON.parse(studentsRaw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [];
};

const parseBatchDate = (d: any): Date | null => {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
  if (typeof d === 'string') {
    const parsed = new Date(d.includes('T') ? d : `${d}T00:00:00+07:00`);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

export async function computeHalaqahOfTheWeek(batchId?: string, authUserId?: string, isOnlyThalibah: boolean = false) {
  // 1. Get batch
  let activeBatch: any;
  if (batchId) {
    const { rows } = await query('SELECT id, name, start_date, end_date FROM batches WHERE id = $1', [batchId]);
    activeBatch = rows[0];
  } else {
    const { rows } = await query("SELECT id, name, start_date, end_date FROM batches WHERE status IN ('ongoing', 'open') ORDER BY created_at DESC LIMIT 1");
    activeBatch = rows[0];
  }

  if (!activeBatch) {
    return { topHalaqah: null, allHalaqahs: [], userRank: null };
  }

  // 2. Get programs
  const { rows: programRows } = await query('SELECT id FROM programs WHERE batch_id = $1', [activeBatch.id]);
  const programIds = programRows.map(p => p.id);
  if (programIds.length === 0) {
    return { topHalaqah: null, allHalaqahs: [], userRank: null };
  }

  // 3. Get halaqahs
  const { rows: halaqahRows } = await query(`
    SELECT 
      h.id,
      h.name,
      u.full_name as muallimah_full_name,
      u.nama_kunyah as muallimah_nama_kunyah,
      COALESCE(
        json_agg(
          json_build_object(
            'status', hs.status,
            'thalibah_id', hs.thalibah_id,
            'full_name', su.full_name
          )
        ) FILTER (WHERE hs.thalibah_id IS NOT NULL),
        '[]'::json
      ) as students
    FROM halaqah h
    LEFT JOIN users u ON u.id = h.muallimah_id
    LEFT JOIN halaqah_students hs ON hs.halaqah_id = h.id AND hs.status = 'active'
    LEFT JOIN users su ON su.id = hs.thalibah_id
    WHERE h.program_id = ANY($1::uuid[]) AND h.status = 'active'
    GROUP BY h.id, h.name, u.full_name, u.nama_kunyah
  `, [programIds]);

  const tikrarHalaqahs = halaqahRows.filter(h => 
    h.name.toLowerCase().includes('tikrar') && !h.name.toLowerCase().includes('pra')
  );

  if (tikrarHalaqahs.length === 0) {
    return { topHalaqah: null, allHalaqahs: [], userRank: null };
  }

  const thalibahIds: string[] = tikrarHalaqahs.flatMap(h => 
    getStudentsArray(h.students).filter((s: any) => s.status === 'active').map((s: any) => s.thalibah_id)
  );

  const batchStart = parseBatchDate(activeBatch.start_date);
  const currentWeek = batchStart
    ? Math.ceil((Date.now() - batchStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
    : 1;
  const targetWeek = Math.max(1, currentWeek - 1);
  const jurnalTargetWeek = Math.max(0, targetWeek - 1);

  let weekStartDate = new Date(0);
  let weekEndDate = new Date();
  if (batchStart) {
    weekStartDate = new Date(batchStart.getTime());
    weekStartDate.setDate(weekStartDate.getDate() + (targetWeek - 1) * 7);
    weekEndDate = new Date(batchStart.getTime());
    weekEndDate.setDate(weekEndDate.getDate() + targetWeek * 7);
  }

  // 4. Get Chosen Juz
  const userJuzBaseMap = new Map<string, number>();
  if (thalibahIds.length > 0) {
    const { rows: duRows } = await query(
      'SELECT user_id, confirmed_chosen_juz FROM daftar_ulang_submissions WHERE batch_id = $1 AND user_id = ANY($2::uuid[])',
      [activeBatch.id, thalibahIds]
    );
    const { rows: ptRows } = await query(
      'SELECT user_id, chosen_juz FROM pendaftaran_tikrar_tahfidz WHERE batch_id = $1 AND user_id = ANY($2::uuid[])',
      [activeBatch.id, thalibahIds]
    );

    duRows.forEach(r => {
      userJuzBaseMap.set(r.user_id, r.confirmed_chosen_juz && r.confirmed_chosen_juz.endsWith('B') ? 11 : 1);
    });
    ptRows.forEach(r => {
      if (!userJuzBaseMap.has(r.user_id)) {
        userJuzBaseMap.set(r.user_id, r.chosen_juz && r.chosen_juz.endsWith('B') ? 11 : 1);
      }
    });
  }

  // 5. Get Jurnal & Tashih
  let jurnalRecords: any[] = [];
  let tashihRecords: any[] = [];
  if (thalibahIds.length > 0) {
    const bStartIso = batchStart ? batchStart.toISOString() : new Date(0).toISOString();
    const wEndIso = weekEndDate.toISOString();

    const { rows: jRows } = await query(
      `SELECT user_id, blok, created_at, tafsir_options
       FROM jurnal_records
       WHERE user_id = ANY($1::uuid[])
         AND created_at >= $2
         AND created_at < $3`,
      [thalibahIds, bStartIso, wEndIso]
    );
    jurnalRecords = jRows;

    const { rows: tRows } = await query(
      `SELECT user_id, blok, created_at
       FROM tashih_records
       WHERE user_id = ANY($1::uuid[])
         AND created_at >= $2
         AND created_at < $3`,
      [thalibahIds, bStartIso, wEndIso]
    );
    tashihRecords = tRows;
  }

  // 6. Aggregate
  const getBlockWeek = (b: string): number => {
    const match = b.match(/\d+/);
    return match ? parseInt(match[0], 10) : -1;
  };

  const isValidTikrarBlock = (b: string): boolean => {
    const upperB = b.trim().toUpperCase();
    return upperB.endsWith('A') || upperB.endsWith('B') || upperB.endsWith('C') || upperB.endsWith('D');
  };

  const calculatePunctuality = (bloks: string[], createdAt: string) => {
    let punctualitySum = 0;
    if (!createdAt) return 0;
    const submitTime = new Date(createdAt).getTime();
    const diffTime = submitTime - weekStartDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    bloks.forEach(b => {
      let expected = -1;
      const upperB = b.trim().toUpperCase();
      if (upperB.endsWith('A')) expected = 0;
      else if (upperB.endsWith('B')) expected = 1;
      else if (upperB.endsWith('C')) expected = 2;
      else if (upperB.endsWith('D')) expected = 3;
      
      if (expected !== -1) {
        const lateness = Math.max(0, diffDays - expected);
        punctualitySum += (10 - lateness);
      }
    });
    return punctualitySum;
  };

  const jurnalCountMap = new Map();
  const userPunctualityMap = new Map<string, number[]>();
  const userJurnalBlocksMap = new Map<string, Set<string>>();

  jurnalRecords.forEach(r => {
    const bloks = parseBlokField(r.blok);
    if (bloks.length === 0) {
      jurnalCountMap.set(r.user_id, (jurnalCountMap.get(r.user_id) || 0) + 1);
      return;
    }
    
    let newBlocksForUser: string[] = [];
    const userSet = userJurnalBlocksMap.get(r.user_id) || new Set<string>();
    
    bloks.forEach(b => {
      const baseWeek = userJuzBaseMap.get(r.user_id) || 1;
      const expectedJurnalWeek = baseWeek + jurnalTargetWeek - 1;
      
      if (isValidTikrarBlock(b) && getBlockWeek(b) === expectedJurnalWeek && !userSet.has(b)) {
        userSet.add(b);
        newBlocksForUser.push(b);
      }
    });
    userJurnalBlocksMap.set(r.user_id, userSet);
    
    if (newBlocksForUser.length > 0) {
      jurnalCountMap.set(r.user_id, (jurnalCountMap.get(r.user_id) || 0) + newBlocksForUser.length);
      let punctuality = calculatePunctuality(newBlocksForUser, r.created_at);
      
      let tafsirOpts = r.tafsir_options;
      if (typeof tafsirOpts === 'string') {
        try { tafsirOpts = JSON.parse(tafsirOpts); } catch (e) {}
      }
      if (tafsirOpts && Array.isArray(tafsirOpts)) {
        const optionalPointsPerBlock = Math.min(5, tafsirOpts.length);
        punctuality += (optionalPointsPerBlock * newBlocksForUser.length);
      }

      const currentPunc = userPunctualityMap.get(r.user_id) || [];
      currentPunc.push(punctuality);
      userPunctualityMap.set(r.user_id, currentPunc);
    }
  });

  const tashihCountMap = new Map();
  const userTashihBlocksMap = new Map<string, Set<string>>();

  tashihRecords.forEach(r => {
    const bloks = parseBlokField(r.blok);
    if (bloks.length === 0) {
      tashihCountMap.set(r.user_id, (tashihCountMap.get(r.user_id) || 0) + 1);
      return;
    }

    let newBlocksForUser: string[] = [];
    const userSet = userTashihBlocksMap.get(r.user_id) || new Set<string>();
    
    bloks.forEach(b => {
      const baseWeek = userJuzBaseMap.get(r.user_id) || 1;
      const expectedTashihWeek = baseWeek + targetWeek - 1;
      
      if (isValidTikrarBlock(b) && getBlockWeek(b) === expectedTashihWeek && !userSet.has(b)) {
        userSet.add(b);
        newBlocksForUser.push(b);
      }
    });
    userTashihBlocksMap.set(r.user_id, userSet);
    
    if (newBlocksForUser.length > 0) {
      tashihCountMap.set(r.user_id, (tashihCountMap.get(r.user_id) || 0) + newBlocksForUser.length);
      const punctuality = calculatePunctuality(newBlocksForUser, r.created_at);
      const currentPunc = userPunctualityMap.get(r.user_id) || [];
      currentPunc.push(punctuality);
      userPunctualityMap.set(r.user_id, currentPunc);
    }
  });

  const targetBlocks = 4;
  const allStudentsScores: { id: string, score: number }[] = [];

  const result = tikrarHalaqahs.map(h => {
    const activeStudents = getStudentsArray(h.students).filter((s: any) => s.status === 'active');
    const halaqahStudentsStats = activeStudents.map((s: any) => {
      const jCount = jurnalCountMap.get(s.thalibah_id) || 0;
      const tCount = tashihCountMap.get(s.thalibah_id) || 0;
      const jurnal_percentage = Math.min(100, Math.round((jCount / targetBlocks) * 100));
      const tashih_percentage = Math.min(100, Math.round((tCount / targetBlocks) * 100));
      let progress = 0;
      if (jurnalTargetWeek > 0) {
        progress = Math.round((jurnal_percentage + tashih_percentage) / 2);
      } else {
        progress = tashih_percentage;
      }
      return {
        progress,
        hasTashih: tCount > 0,
        hasJurnal: jCount > 0
      };
    });

    const avg_progress = halaqahStudentsStats.length > 0 
      ? Math.round(halaqahStudentsStats.reduce((acc: number, curr: any) => acc + curr.progress, 0) / halaqahStudentsStats.length)
      : 0;
      
    const perfect_thalibah = halaqahStudentsStats.filter((stat: any) => stat.progress === 100).length;
    const active_tashih = halaqahStudentsStats.filter((stat: any) => stat.hasTashih).length;
    const active_jurnal = halaqahStudentsStats.filter((stat: any) => stat.hasJurnal).length;
    const total_interactions = active_tashih + active_jurnal;
    
    let halaqahPunctualityScore = 0;
    let studentsBreakdown: any[] = [];
    
    activeStudents.forEach((s: any) => {
       const jCount = jurnalCountMap.get(s.thalibah_id) || 0;
       const tCount = tashihCountMap.get(s.thalibah_id) || 0;
       const jurnal_percentage = Math.min(100, Math.round((jCount / targetBlocks) * 100));
       const tashih_percentage = Math.min(100, Math.round((tCount / targetBlocks) * 100));
       let progress = 0;
       if (jurnalTargetWeek > 0) {
         progress = Math.round((jurnal_percentage + tashih_percentage) / 2);
       } else {
         progress = tashih_percentage;
       }
       
       let studentPuncScore = 0;
       const puncArray = userPunctualityMap.get(s.thalibah_id) || [];
       puncArray.forEach(p => {
         studentPuncScore += p;
       });
       
       studentPuncScore = Math.max(0, Math.min(100, studentPuncScore));
       halaqahPunctualityScore += studentPuncScore;
       
       allStudentsScores.push({ id: s.thalibah_id, score: studentPuncScore });
       
       studentsBreakdown.push({
         id: s.thalibah_id,
         name: s.full_name || 'Santri',
         progress,
         jurnal: jCount,
         tashih: tCount,
         punctualityScore: studentPuncScore
       });
    });
    const on_time_score = activeStudents.length > 0 ? Math.round(halaqahPunctualityScore / activeStudents.length) : 0;

    if (isOnlyThalibah && authUserId) {
      studentsBreakdown = studentsBreakdown.filter(s => s.id === authUserId);
    }
    
    studentsBreakdown.sort((a, b) => b.punctualityScore - a.punctualityScore);

    return {
      id: h.id,
      name: h.name,
      muallimah_name: h.muallimah_nama_kunyah || h.muallimah_full_name || 'Tanpa Muallimah',
      total_thalibah: activeStudents.length,
      perfect_thalibah,
      avg_progress,
      active_tashih,
      active_jurnal,
      total_interactions,
      on_time_score,
      students: studentsBreakdown
    };
  });

  result.sort((a, b) => {
    if (b.on_time_score !== a.on_time_score) return b.on_time_score - a.on_time_score;
    if (b.perfect_thalibah !== a.perfect_thalibah) return b.perfect_thalibah - a.perfect_thalibah;
    if (b.total_interactions !== a.total_interactions) return b.total_interactions - a.total_interactions;
    if (b.avg_progress !== a.avg_progress) return b.avg_progress - a.avg_progress;
    return b.total_thalibah - a.total_thalibah;
  });

  const topHalaqah: any = result.length > 0 && (result[0].total_interactions > 0 || result[0].avg_progress > 0) 
    ? result[0] 
    : (result.length > 0 ? result[0] : null);

  if (topHalaqah && batchStart) {
    const inclusiveEndDate = new Date(weekEndDate.getTime() - 1);
    const formatOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    const startStr = weekStartDate.toLocaleDateString('id-ID', formatOptions);
    const endStr = inclusiveEndDate.toLocaleDateString('id-ID', formatOptions);
    
    topHalaqah.evaluation_period = `${startStr} - ${endStr}`;
    topHalaqah.target_week = targetWeek;
  }

  // Compute global Thalibah rank
  allStudentsScores.sort((a, b) => b.score - a.score);
  let userRank = null;
  
  if (isOnlyThalibah && authUserId) {
    const rankIndex = allStudentsScores.findIndex(s => s.id === authUserId);
    if (rankIndex !== -1) {
      userRank = {
        rank: rankIndex + 1,
        total: allStudentsScores.length,
        score: allStudentsScores[rankIndex].score
      };
    }
  }

  return { topHalaqah, allHalaqahs: result, userRank };
}
