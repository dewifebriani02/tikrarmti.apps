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

async function auditBatch3Clean() {
  const batchRes = await pool.query(
    "SELECT * FROM batches WHERE status = 'open' ORDER BY created_at DESC LIMIT 1"
  );
  const batch = batchRes.rows[0];
  const batchStartDate = new Date(batch.start_date || '2026-08-10'); // 10 Aug 2026

  const thalibahRes = await pool.query(
    `SELECT du.user_id, du.confirmed_chosen_juz, u.full_name, u.nama_kunyah, u.whatsapp 
     FROM daftar_ulang_submissions du 
     JOIN users u ON u.id = du.user_id 
     WHERE du.batch_id = $1 
       AND du.status IN ('approved', 'submitted')
       AND (u.is_blacklisted IS FALSE OR u.is_blacklisted IS NULL)
     ORDER BY u.full_name ASC`,
    [batch.id]
  );
  const thalibahList = thalibahRes.rows;
  const userIds = thalibahList.map(t => t.user_id);

  // CRITICAL: Filter jurnal_records strictly for Batch 3 (created_at >= batch.start_date)
  const jRes = await pool.query(
    `SELECT id, user_id, blok, tanggal_setor, created_at 
     FROM jurnal_records 
     WHERE user_id = ANY($1) 
       AND (created_at >= $2 OR tanggal_setor >= $2)`,
    [userIds, batchStartDate.toISOString()]
  );
  const journals = jRes.rows;

  const jurnalByUser = new Map();
  journals.forEach(j => {
    if (!jurnalByUser.has(j.user_id)) jurnalByUser.set(j.user_id, []);
    jurnalByUser.get(j.user_id).push(j);
  });

  console.log(`========================================================================`);
  console.log(`📋 AUDIT ASLI BATCH 3 (HANYA SETORAN SEJAK ${batchStartDate.toISOString().split('T')[0]})`);
  console.log(`   Total Thalibah Aktif Non-Blacklist: ${thalibahList.length} orang`);
  console.log(`   Total Jurnal Batch 3: ${journals.length} record`);
  console.log(`========================================================================\n`);

  // User SP Progression
  const userSPHistory = new Map();
  thalibahList.forEach(t => userSPHistory.set(t.user_id, []));

  for (let week = 1; week <= 7; week++) {
    // Note: User says: "oh ya pekan 6 itu ga ada yang kena sp karena ada error sistem"
    const isPekan6Exempt = week === 6;

    const incompleted = [];

    for (const thalibah of thalibahList) {
      const isPartB = thalibah.confirmed_chosen_juz?.toUpperCase().includes('B') || false;
      const baseOffset = isPartB ? 10 : 0;
      const targetBlockNum = week + baseOffset;
      const expectedBlocks = ['A', 'B', 'C', 'D'].map(l => `H${targetBlockNum}${l}`);

      const userJurnals = jurnalByUser.get(thalibah.user_id) || [];
      const submittedBlocks = new Set();

      userJurnals.forEach(j => {
        const clean = extractCleanBlok(j.blok);
        if (clean && expectedBlocks.includes(clean)) {
          submittedBlocks.add(clean);
        }
      });

      const count = submittedBlocks.size;
      const missing = expectedBlocks.filter(b => !submittedBlocks.has(b));

      if (count < 4) {
        const history = userSPHistory.get(thalibah.user_id);
        const priorLevel = history.reduce((max, s) => Math.max(max, s.level), 0);
        const nextLevel = Math.min(priorLevel + 1, 3);
        const reason = count === 0
          ? `Ghaib (0/4 blok) pada Pekan ${week}`
          : `Laporan kurang (${count}/4 blok) pada Pekan ${week}, kurang: ${missing.join(', ')}`;

        incompleted.push({
          thalibah,
          week,
          level: nextLevel,
          count,
          missing,
          reason,
          exempt: isPekan6Exempt
        });

        // Only progress SP level if week is NOT exempt
        if (!isPekan6Exempt) {
          history.push({ week, level: nextLevel, reason });
        }
      }
    }

    console.log(`------------------------------------------------------------------------`);
    console.log(`📌 PEKAN ${week} ZIYADAH ${isPekan6Exempt ? '(⚠️ EXEMPT / BEBAS SP KARENA ERROR SISTEM)' : ''}`);
    console.log(`------------------------------------------------------------------------`);
    console.log(`  - Thalibah Belum Tuntas: ${incompleted.length} orang`);
    
    if (incompleted.length > 0) {
      incompleted.forEach((inc, i) => {
        const name = inc.thalibah.full_name || inc.thalibah.nama_kunyah;
        const juz = inc.thalibah.confirmed_chosen_juz;
        const spTag = isPekan6Exempt ? '[Bebas SP - Error Sistem]' : `[Dapat SP ${inc.level}]`;
        console.log(`    ${i + 1}. ${name} (${juz}) ➔ ${spTag} | ${inc.reason}`);
      });
    } else {
      console.log(`  (Semua thalibah tuntas 100%)`);
    }
    console.log(``);
  }

  // Rekap akumulasi
  console.log(`========================================================================`);
  console.log(`📊 REKAPITULASI STATUS SP THALIBAH (DENGAN PEKAN 6 BEBAS SP):`);
  console.log(`========================================================================`);
  const spSummary = [];
  for (const [userId, history] of userSPHistory.entries()) {
    if (history.length > 0) {
      const thalibah = thalibahList.find(t => t.user_id === userId);
      const currentLevel = history[history.length - 1].level;
      spSummary.push({ thalibah, currentLevel, history });
    }
  }

  spSummary.sort((a, b) => b.currentLevel - a.currentLevel);
  spSummary.forEach((s, i) => {
    const name = s.thalibah.full_name || s.thalibah.nama_kunyah;
    const hStr = s.history.map(h => `Pekan ${h.week} (SP${h.level})`).join(' ➔ ');
    console.log(`${i + 1}. ${name} (${s.thalibah.confirmed_chosen_juz}) ➔ Status: SP ${s.currentLevel} | Riwayat: ${hStr}`);
  });
}

auditBatch3Clean().then(() => pool.end()).catch(e => { console.error(e); pool.end(); });
