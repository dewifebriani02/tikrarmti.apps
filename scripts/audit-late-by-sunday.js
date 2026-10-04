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

async function auditLate() {
  const batchRes = await pool.query("SELECT * FROM batches WHERE status = 'open' ORDER BY created_at DESC LIMIT 1");
  const batch = batchRes.rows[0];

  const tashihStart = new Date(batch.first_week_start_date || '2026-08-17');
  const jurnalWeek1Start = new Date(tashihStart);
  jurnalWeek1Start.setDate(jurnalWeek1Start.getDate() + 7); // 2026-08-24 (Senin)

  const thalibahRes = await pool.query(
    `SELECT du.user_id, du.confirmed_chosen_juz, u.full_name, u.nama_kunyah, u.whatsapp 
     FROM daftar_ulang_submissions du 
     JOIN users u ON u.id = du.user_id 
     WHERE du.batch_id = $1 AND du.status IN ('approved', 'submitted')
     ORDER BY u.full_name ASC`,
    [batch.id]
  );
  const thalibahList = thalibahRes.rows;
  const userIds = thalibahList.map(t => t.user_id);

  const jurnalRes = await pool.query(
    `SELECT id, user_id, blok, tanggal_setor, created_at FROM jurnal_records WHERE user_id = ANY($1)`,
    [userIds]
  );
  const allJurnals = jurnalRes.rows;

  const jurnalByUser = new Map();
  allJurnals.forEach(j => {
    if (!jurnalByUser.has(j.user_id)) jurnalByUser.set(j.user_id, []);
    jurnalByUser.get(j.user_id).push(j);
  });

  console.log(`\n========================================================================`);
  console.log(`🔍 AUDIT RINCI: KELENGKAPAN & KETEPATAN WAKTU JURNAL HINGGA AHAD (PEKAN 1-7)`);
  console.log(`========================================================================`);

  for (let week = 1; week <= 7; week++) {
    const weekStart = new Date(jurnalWeek1Start);
    weekStart.setDate(weekStart.getDate() + (week - 1) * 7); // Senin 00:00
    
    // Deadline Ahad (Sunday) 23:59:59 WIB (UTC+7)
    // weekStart is Monday 00:00 UTC, so +6 days is Sunday 23:59:59
    const deadlineSunday = new Date(weekStart);
    deadlineSunday.setDate(deadlineSunday.getDate() + 6);
    deadlineSunday.setHours(23, 59, 59, 999);

    const deadlineStr = deadlineSunday.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

    const ontimedCompletes = []; // 4 blocks on or before deadline
    const lateCompletes = [];    // 4 blocks but submitted after deadline
    const incompleteSome = [];   // 1-3 blocks
    const ghaib = [];            // 0 blocks

    for (const thalibah of thalibahList) {
      const userJurnals = (jurnalByUser.get(thalibah.user_id) || []).filter(j => calculateWeekFromBlok(j.blok) === week);

      const isPartB = thalibah.confirmed_chosen_juz?.toUpperCase().includes('B') || false;
      const baseOffset = isPartB ? 10 : 0;
      const expectedBlockNum = week + baseOffset;
      const expectedBlocks = ['A', 'B', 'C', 'D'].map(l => `H${expectedBlockNum}${l}`);

      const submittedBlocks = new Set();
      const ontimeBlocks = new Set();
      let lastSubmissionDate = null;

      userJurnals.forEach(j => {
        const clean = extractCleanBlok(j.blok);
        if (clean) {
          submittedBlocks.add(clean);
          const subDate = j.created_at ? new Date(j.created_at) : (j.tanggal_setor ? new Date(j.tanggal_setor) : null);
          if (subDate) {
            if (!lastSubmissionDate || subDate > lastSubmissionDate) lastSubmissionDate = subDate;
            if (subDate <= deadlineSunday) {
              ontimeBlocks.add(clean);
            }
          }
        }
      });

      const totalSubmitted = submittedBlocks.size;
      const ontimeSubmitted = ontimeBlocks.size;
      const missing = expectedBlocks.filter(b => !submittedBlocks.has(b));

      if (totalSubmitted === 0) {
        ghaib.push({ thalibah, missing });
      } else if (totalSubmitted < 4) {
        incompleteSome.push({ thalibah, totalSubmitted, submitted: Array.from(submittedBlocks), missing });
      } else if (ontimeSubmitted < 4) {
        // Completed 4 blocks, but some/all were submitted after Sunday deadline
        lateCompletes.push({ thalibah, ontimeSubmitted, lastSubmissionDate });
      } else {
        ontimedCompletes.push({ thalibah, lastSubmissionDate });
      }
    }

    console.log(`\n------------------------------------------------------------------------`);
    console.log(`📌 EVALUASI PEKAN ${week} (Deadline: Ahad ${deadlineStr})`);
    console.log(`------------------------------------------------------------------------`);
    console.log(`  ✓ Tuntas Tepat Waktu (≤ Ahad): ${ontimedCompletes.length} thalibah`);
    console.log(`  ⚠️ Tuntas tapi Terlambat (> Ahad): ${lateCompletes.length} thalibah`);
    console.log(`  ⚠️ Kurang Lengkap (1-3 Blok): ${incompleteSome.length} thalibah`);
    console.log(`  🛑 Ghaib / Tidak Setor (0 Blok): ${ghaib.length} thalibah`);

    const totalNeedingSP = ghaib.length + incompleteSome.length;
    console.log(`  🚨 TOTAL TIDAK TUNTAS / BERHAK SP: ${totalNeedingSP} thalibah`);

    if (totalNeedingSP > 0 || lateCompletes.length > 0) {
      console.log(`\n  Detail Thalibah Bermasalah di Pekan ${week}:`);
      
      if (ghaib.length > 0) {
        console.log(`  [GHAIB / 0 BLOK - ${ghaib.length} orang]:`);
        ghaib.forEach((g, i) => console.log(`    ${i + 1}. ${g.thalibah.full_name || g.thalibah.nama_kunyah} (${g.thalibah.confirmed_chosen_juz}) - WA: ${g.thalibah.whatsapp || '-'}`));
      }

      if (incompleteSome.length > 0) {
        console.log(`  [KURANG LENGKAP - ${incompleteSome.length} orang]:`);
        incompleteSome.forEach((inc, i) => console.log(`    ${i + 1}. ${inc.thalibah.full_name || inc.thalibah.nama_kunyah} (${inc.thalibah.confirmed_chosen_juz}) -> Setor ${inc.totalSubmitted}/4 (${inc.submitted.join(',')}), Kurang: ${inc.missing.join(',')}`));
      }

      if (lateCompletes.length > 0) {
        console.log(`  [TUNTAS 4 BLOK TAPI MELEWATI AHAD - ${lateCompletes.length} orang]:`);
        lateCompletes.forEach((lt, i) => console.log(`    ${i + 1}. ${lt.thalibah.full_name || lt.thalibah.nama_kunyah} (${lt.thalibah.confirmed_chosen_juz}) -> Tuntas pada ${lt.lastSubmissionDate ? lt.lastSubmissionDate.toISOString().split('T')[0] : 'terlambat'}`));
      }
    }
  }
}

auditLate().then(() => pool.end()).catch(e => { console.error(e); pool.end(); });
