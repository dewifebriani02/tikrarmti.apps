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
      if (Array.isArray(parsed) && parsed.length > 0) blokCode = String(parsed[0]);
      else return null;
    } catch {}
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
      if (Array.isArray(parsed) && parsed.length > 0) blokCode = String(parsed[0]);
    } catch {}
  }
  const match = blokCode.match(/H\d+[A-D]/i);
  return match ? match[0].toUpperCase() : blokCode.toUpperCase();
}

async function auditCompleteZiyadah() {
  const batchRes = await pool.query(
    "SELECT * FROM batches WHERE status = 'open' ORDER BY created_at DESC LIMIT 1"
  );
  const batch = batchRes.rows[0];

  const ziyadahStart = new Date(batch.first_week_start_date || '2026-08-17'); // 17 Aug 2026

  const thalibahRes = await pool.query(
    `SELECT du.user_id, du.confirmed_chosen_juz, u.full_name, u.nama_kunyah, u.whatsapp 
     FROM daftar_ulang_submissions du 
     JOIN users u ON u.id = du.user_id 
     WHERE du.batch_id = $1 AND du.status IN ('approved', 'submitted')
     ORDER BY u.full_name ASC`,
    [batch.id]
  );
  const thalibahList = thalibahRes.rows;
  const userIds = thalibahList.map((t) => t.user_id);

  const jRes = await pool.query(
    `SELECT id, user_id, blok, tanggal_setor, created_at FROM jurnal_records WHERE user_id = ANY($1)`,
    [userIds]
  );
  const allJurnals = jRes.rows;

  const jurnalByUser = new Map();
  allJurnals.forEach((j) => {
    if (!jurnalByUser.has(j.user_id)) jurnalByUser.set(j.user_id, []);
    jurnalByUser.get(j.user_id).push(j);
  });

  console.log(`========================================================================`);
  console.log(`📋 AUDIT DETAIL PEKAN ZIYADAH 1 s/d 7 (104 THALIBAH) - BATCH 3`);
  console.log(`========================================================================\n`);

  // Tracking dynamic SP progression
  const userSPHistory = new Map();
  thalibahList.forEach((t) => userSPHistory.set(t.user_id, []));

  for (let week = 1; week <= 7; week++) {
    const weekStart = new Date(ziyadahStart);
    weekStart.setDate(weekStart.getDate() + (week - 1) * 7); // Senin
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Ahad
    weekEnd.setHours(23, 59, 59, 999);

    const weekStrStart = weekStart.toISOString().split('T')[0];
    const weekStrEnd = weekEnd.toISOString().split('T')[0];

    const onTimeCompletes = [];
    const lateCompletes = [];
    const incompleteSome = [];
    const ghaib = [];

    for (const thalibah of thalibahList) {
      const userJurnals = (jurnalByUser.get(thalibah.user_id) || []).filter(
        (j) => calculateWeekFromBlok(j.blok) === week
      );

      const isPartB = thalibah.confirmed_chosen_juz?.toUpperCase().includes('B') || false;
      const baseOffset = isPartB ? 10 : 0;
      const expectedBlockNum = week + baseOffset;
      const expectedBlocks = ['A', 'B', 'C', 'D'].map((l) => `H${expectedBlockNum}${l}`);

      const submittedBlocks = new Set();
      const ontimeBlocks = new Set();
      let lastDate = null;

      userJurnals.forEach((j) => {
        const clean = extractCleanBlok(j.blok);
        if (clean) {
          submittedBlocks.add(clean);
          const subDate = j.created_at
            ? new Date(j.created_at)
            : j.tanggal_setor
            ? new Date(j.tanggal_setor)
            : null;
          if (subDate) {
            if (!lastDate || subDate > lastDate) lastDate = subDate;
            if (subDate <= weekEnd) ontimeBlocks.add(clean);
          }
        }
      });

      const totalCount = submittedBlocks.size;
      const ontimeCount = ontimeBlocks.size;
      const missing = expectedBlocks.filter((b) => !submittedBlocks.has(b));
      const history = userSPHistory.get(thalibah.user_id);

      if (totalCount === 0) {
        // Ghaib
        const priorLevel = history.reduce((max, s) => Math.max(max, s.level), 0);
        const level = Math.min(priorLevel + 1, 3);
        const spItem = {
          thalibah,
          week,
          level,
          type: 'Ghaib (0/4 Blok)',
          reason: `Ghaib / Tidak setor sama sekali pada Pekan ${week} (0/4 blok)`,
          missing,
          submitted: [],
        };
        ghaib.push(spItem);
        history.push({ week, level, reason: spItem.reason });
      } else if (totalCount < 4) {
        // Incomplete
        const priorLevel = history.reduce((max, s) => Math.max(max, s.level), 0);
        const level = Math.min(priorLevel + 1, 3);
        const spItem = {
          thalibah,
          week,
          level,
          type: `Kurang Lengkap (${totalCount}/4 Blok)`,
          reason: `Laporan tidak lengkap pada Pekan ${week} (${totalCount}/4 blok selesai, kurang ${missing.join(', ')})`,
          missing,
          submitted: Array.from(submittedBlocks),
        };
        incompleteSome.push(spItem);
        history.push({ week, level, reason: spItem.reason });
      } else if (ontimeCount < 4) {
        // Late complete (4 blocks, but after Sunday)
        lateCompletes.push({
          thalibah,
          week,
          ontimeCount,
          lastDate: lastDate ? lastDate.toISOString().split('T')[0] : 'lewat Ahad',
        });
      } else {
        onTimeCompletes.push({ thalibah, week });
      }
    }

    console.log(`------------------------------------------------------------------------`);
    console.log(`📌 PEKAN ${week} ZIYADAH (Periode: ${weekStrStart} s/d Ahad ${weekStrEnd})`);
    console.log(`------------------------------------------------------------------------`);
    console.log(`  ✓ Tuntas Lengkap (4/4 Blok): ${onTimeCompletes.length + lateCompletes.length} thalibah`);
    console.log(`  🛑 Ghaib (0/4 Blok): ${ghaib.length} thalibah`);
    console.log(`  ⚠️ Laporan Kurang (1-3 Blok): ${incompleteSome.length} thalibah`);
    console.log(`  🚨 TOTAL PENERIMA SP: ${ghaib.length + incompleteSome.length} thalibah`);

    if (ghaib.length > 0 || incompleteSome.length > 0) {
      console.log(`\n  Daftar Penerima SP Pekan ${week}:`);
      [...ghaib, ...incompleteSome].forEach((item, idx) => {
        const name = item.thalibah.full_name || item.thalibah.nama_kunyah;
        const juz = item.thalibah.confirmed_chosen_juz || '-';
        const wa = item.thalibah.whatsapp || '-';
        console.log(`    ${idx + 1}. ${name} (${juz}) - WA: ${wa}`);
        console.log(`       ↳ SP ${item.level} | ${item.reason}`);
      });
    } else {
      console.log(`  (Semua 104 thalibah tuntas 100% pada pekan ini)`);
    }
    console.log(``);
  }

  // Summary Table of all users who ever received SP
  console.log(`========================================================================`);
  console.log(`📊 REKAPITULASI SELURUH THALIBAH PENERIMA SP (PEKAN 1 s/d 7)`);
  console.log(`========================================================================`);

  const summaryList = [];
  for (const [userId, history] of userSPHistory.entries()) {
    if (history.length > 0) {
      const thalibah = thalibahList.find((t) => t.user_id === userId);
      const currentLevel = history[history.length - 1].level;
      summaryList.push({
        thalibah,
        currentLevel,
        totalSPs: history.length,
        history,
      });
    }
  }

  summaryList.sort((a, b) => {
    if (b.currentLevel !== a.currentLevel) return b.currentLevel - a.currentLevel;
    if (b.totalSPs !== a.totalSPs) return b.totalSPs - a.totalSPs;
    return a.thalibah.full_name.localeCompare(b.thalibah.full_name);
  });

  summaryList.forEach((item, idx) => {
    const name = item.thalibah.full_name || item.thalibah.nama_kunyah;
    const juz = item.thalibah.confirmed_chosen_juz || '-';
    const wa = item.thalibah.whatsapp || '-';
    const hStr = item.history.map((h) => `Pekan ${h.week} (SP${h.level})`).join(' ➔ ');
    console.log(`${idx + 1}. ${name} (${juz}) | Status: SP ${item.currentLevel} | Total: ${item.totalSPs}x SP | WA: ${wa}`);
    console.log(`   Riwayat: ${hStr}`);
  });
}

auditCompleteZiyadah()
  .then(() => pool.end())
  .catch((e) => {
    console.error(e);
    pool.end();
  });
