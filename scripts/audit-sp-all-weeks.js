const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: '127.0.0.1',
        database: 'mti_db',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }
);

function calculateWeekFromBlok(blok) {
  if (!blok) return null;
  let blokCode = String(blok).trim();
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
  if (blockNumber >= 1 && blockNumber <= 10) return blockNumber;
  if (blockNumber >= 11 && blockNumber <= 20) return blockNumber - 10;
  return null;
}

function extractCleanBlok(blok) {
  if (!blok) return null;
  let blokCode = String(blok).trim();
  if (blokCode.startsWith('[')) {
    try {
      const parsed = JSON.parse(blokCode);
      if (Array.isArray(parsed) && parsed.length > 0) {
        blokCode = String(parsed[0]);
      }
    } catch {}
  }
  const match = blokCode.match(/H\d+[A-D]/i);
  return match ? match[0].toUpperCase() : blokCode.toUpperCase();
}

async function audit() {
  const batchRes = await pool.query(
    "SELECT * FROM batches WHERE status = 'open' ORDER BY created_at DESC LIMIT 1"
  );
  const batch = batchRes.rows[0];
  console.log(`\n========================================================================`);
  console.log(`📋 AUDIT EVALUASI JURNAL & SP PEKAN 1 s/d 7 - ${batch.name.toUpperCase()}`);
  console.log(`========================================================================`);

  // Tashih starts at first_week_start_date (e.g. 2026-08-17)
  // Jurnal Week 1 starts +7 days = 2026-08-24 (Monday)
  const tashihStart = new Date(batch.first_week_start_date || '2026-08-17');
  const jurnalWeek1Start = new Date(tashihStart);
  jurnalWeek1Start.setDate(jurnalWeek1Start.getDate() + 7); // 2026-08-24

  const thalibahRes = await pool.query(
    `SELECT 
      du.user_id, 
      du.confirmed_chosen_juz, 
      u.full_name, 
      u.nama_kunyah, 
      u.whatsapp,
      u.email
    FROM daftar_ulang_submissions du 
    JOIN users u ON u.id = du.user_id 
    WHERE du.batch_id = $1 AND du.status IN ('approved', 'submitted')
    ORDER BY u.full_name ASC`,
    [batch.id]
  );
  const thalibahList = thalibahRes.rows;
  console.log(`Total Thalibah Aktif: ${thalibahList.length} orang\n`);

  const userIds = thalibahList.map((t) => t.user_id);
  const jurnalRes = await pool.query(
    `SELECT id, user_id, blok, tanggal_setor, created_at FROM jurnal_records WHERE user_id = ANY($1)`,
    [userIds]
  );
  const allJurnals = jurnalRes.rows;

  const spRes = await pool.query(
    `SELECT id, thalibah_id, week_number, sp_level, status, reason, issued_at FROM surat_peringatan WHERE batch_id = $1 AND status != 'cancelled'`,
    [batch.id]
  );
  const allSPs = spRes.rows;

  // Group jurnals by user
  const jurnalByUser = new Map();
  allJurnals.forEach((j) => {
    if (!jurnalByUser.has(j.user_id)) jurnalByUser.set(j.user_id, []);
    jurnalByUser.get(j.user_id).push(j);
  });

  // Group SP by user
  const spByUser = new Map();
  allSPs.forEach((s) => {
    if (!spByUser.has(s.thalibah_id)) spByUser.set(s.thalibah_id, []);
    spByUser.get(s.thalibah_id).push(s);
  });

  // We will simulate week by week progression (Week 1 to 7)
  // Tracking each user's SP history dynamically
  const userSPProgression = new Map(); // userId -> array of SPs { week, level, reason }
  thalibahList.forEach(t => userSPProgression.set(t.user_id, []));

  const weekSummaries = [];

  for (let week = 1; week <= 7; week++) {
    // Deadline for this week: Sunday 23:59:59 WIB of this week
    const weekStart = new Date(jurnalWeek1Start);
    weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStrStart = weekStart.toISOString().split('T')[0];
    const weekStrEnd = weekEnd.toISOString().split('T')[0];

    const completeList = [];
    const incompleteList = []; // { thalibah, completedCount, missingBlocks, spLevel, reason, isLate }

    for (const thalibah of thalibahList) {
      const userJurnals = jurnalByUser.get(thalibah.user_id) || [];
      const userHistory = userSPProgression.get(thalibah.user_id);

      // Filter journals matching this week
      const weekEntries = userJurnals.filter((j) => {
        const w = calculateWeekFromBlok(j.blok);
        return w === week;
      });

      // Distinct blocks submitted
      const submittedBlocks = new Set();
      let latestSubmissionDate = null;
      let hasLateSubmission = false;

      weekEntries.forEach((j) => {
        const clean = extractCleanBlok(j.blok);
        if (clean) submittedBlocks.add(clean);

        // Check timestamp if created after Sunday deadline
        const subDate = j.tanggal_setor ? new Date(j.tanggal_setor) : new Date(j.created_at);
        if (!latestSubmissionDate || subDate > latestSubmissionDate) {
          latestSubmissionDate = subDate;
        }
        if (subDate > weekEnd) {
          hasLateSubmission = true;
        }
      });

      const isPartB = thalibah.confirmed_chosen_juz?.toUpperCase().includes('B') || false;
      const baseOffset = isPartB ? 10 : 0;
      const expectedBlockNum = week + baseOffset;
      const expectedBlocks = ['A', 'B', 'C', 'D'].map((l) => `H${expectedBlockNum}${l}`);

      const completedBlocks = Array.from(submittedBlocks);
      const missingBlocks = expectedBlocks.filter((b) => !submittedBlocks.has(b));
      const completedCount = completedBlocks.length;

      // Check on-time completion: 4 blocks submitted on or before Sunday deadline
      // Also note if they completed late after deadline
      const isCompleteOverall = completedCount >= 4;

      if (isCompleteOverall) {
        completeList.push({
          thalibah,
          completedCount,
          submittedBlocks: completedBlocks.join(','),
        });
      } else {
        // Incomplete / Ghaib
        const highestPriorLevel = userHistory.reduce((max, s) => Math.max(max, s.level), 0);
        const nextLevel = Math.min(highestPriorLevel + 1, 3);
        const reason = completedCount === 0 
          ? `Ghaib / Tidak setor sama sekali (0/4 blok)`
          : `Laporan tidak lengkap (${completedCount}/4 blok selesai, kurang ${missingBlocks.join(', ')})`;

        const spInfo = {
          week,
          thalibah,
          completedCount,
          completedBlocks: completedBlocks.join(','),
          missingBlocks: missingBlocks.join(','),
          level: nextLevel,
          reason,
          priorLevel: highestPriorLevel,
          dbSP: allSPs.find(s => s.thalibah_id === thalibah.user_id && parseInt(s.week_number) === week)
        };

        incompleteList.push(spInfo);
        userHistory.push({ week, level: nextLevel, reason });
      }
    }

    weekSummaries.push({
      week,
      weekStrStart,
      weekStrEnd,
      totalActive: thalibahList.length,
      completeCount: completeList.length,
      incompleteCount: incompleteList.length,
      incompletes: incompleteList,
    });
  }

  // Print results
  for (const ws of weekSummaries) {
    console.log(`========================================================================`);
    console.log(`📌 PEKAN ${ws.week} (Periode: ${ws.weekStrStart} s/d Ahad ${ws.weekStrEnd})`);
    console.log(`   - Tuntas 100% (4/4 Blok): ${ws.completeCount} thalibah`);
    console.log(`   - Tidak Lengkap / Ghaib (Berhak SP): ${ws.incompleteCount} thalibah`);
    console.log(`------------------------------------------------------------------------`);
    
    if (ws.incompletes.length === 0) {
      console.log(`   (Semua thalibah tuntas 100% pada pekan ini)`);
    } else {
      console.log(`   Rincian Thalibah Penerima SP Pekan ${ws.week}:`);
      ws.incompletes.forEach((item, idx) => {
        const name = item.thalibah.full_name || item.thalibah.nama_kunyah;
        const phone = item.thalibah.whatsapp || '-';
        const dbStatus = item.dbSP ? `[Sudah ada di DB: SP${item.dbSP.sp_level}]` : `[Belum ada di DB]`;
        console.log(`   ${idx + 1}. ${name} (${item.thalibah.confirmed_chosen_juz || '-'}) - WA: ${phone}`);
        console.log(`      ↳ Dapat: SP ${item.level} | ${item.reason} ${dbStatus}`);
      });
    }
    console.log(``);
  }

  // Summary of thalibah with multiple SPs / reaching SP3 / DO
  console.log(`========================================================================`);
  console.log(`📊 REKAP AKUMULASI TINGKAT SP SEBAGAI HASIL EVALUASI HINGGA PEKAN 7:`);
  console.log(`========================================================================`);
  
  const thalibahWithSP = [];
  for (const [userId, history] of userSPProgression.entries()) {
    if (history.length > 0) {
      const thalibah = thalibahList.find(t => t.user_id === userId);
      const currentLevel = history[history.length - 1].level;
      thalibahWithSP.push({
        thalibah,
        totalSPCount: history.length,
        currentLevel,
        history,
      });
    }
  }

  thalibahWithSP.sort((a, b) => {
    if (b.currentLevel !== a.currentLevel) return b.currentLevel - a.currentLevel;
    if (b.totalSPCount !== a.totalSPCount) return b.totalSPCount - a.totalSPCount;
    return a.thalibah.full_name.localeCompare(b.thalibah.full_name);
  });

  console.log(`Total Thalibah yang Pernah Mendapat SP (Pekan 1-7): ${thalibahWithSP.length} orang\n`);
  thalibahWithSP.forEach((item, idx) => {
    const name = item.thalibah.full_name || item.thalibah.nama_kunyah;
    const historyStr = item.history.map(h => `Pekan ${h.week} (SP${h.level})`).join(', ');
    console.log(`${idx + 1}. ${name} (${item.thalibah.confirmed_chosen_juz}) -> Status Saat Ini: SP ${item.currentLevel} (Total ${item.totalSPCount}x pelanggaran)`);
    console.log(`   Riwayat: ${historyStr}`);
  });
}

audit().then(() => pool.end()).catch(e => { console.error(e); pool.end(); });
