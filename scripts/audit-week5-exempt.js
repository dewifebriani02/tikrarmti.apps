require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://' + process.env.POSTGRES_USER + ':' + process.env.POSTGRES_PASSWORD + '@' + process.env.POSTGRES_HOST + ':' + process.env.POSTGRES_PORT + '/' + process.env.POSTGRES_DB
});

async function auditWithWeek5Exempt() {
  const batchId = '2478b493-1b6b-412a-a05f-6193db815a43';
  const batchStart = '2026-08-10T00:00:00.000Z';

  // 1. Get active thalibahs non-blacklisted
  const thalibahRes = await pool.query(`
    SELECT du.id as thalibah_id, du.user_id, du.confirmed_chosen_juz, u.full_name, u.email
    FROM daftar_ulang_submissions du
    JOIN users u ON u.id = du.user_id
    WHERE du.batch_id = $1 
      AND du.status IN ('approved', 'submitted')
      AND (u.is_blacklisted IS FALSE OR u.is_blacklisted IS NULL)
    ORDER BY u.full_name ASC
  `, [batchId]);

  const thalibahList = thalibahRes.rows;
  const userIds = thalibahList.map(t => t.user_id);

  // 2. Fetch journal records strictly for active batch
  const jurnalRes = await pool.query(`
    SELECT user_id, blok, created_at, tanggal_setor
    FROM jurnal_records
    WHERE user_id = ANY($1)
      AND (created_at >= $2 OR tanggal_setor >= $2)
  `, [userIds, batchStart]);

  const jurnalByUser = new Map();
  jurnalRes.rows.forEach(r => {
    if (!jurnalByUser.has(r.user_id)) jurnalByUser.set(r.user_id, []);
    jurnalByUser.get(r.user_id).push(r);
  });

  function cleanBlok(raw) {
    if (!raw) return null;
    const match = raw.toUpperCase().match(/H\d+[A-D]/);
    return match ? match[0] : null;
  }

  // Week evaluation helper
  function evaluateWeek(w) {
    const incomplete = [];
    thalibahList.forEach(t => {
      const isPartB = (t.confirmed_chosen_juz || '').toUpperCase().includes('B');
      const baseOffset = isPartB ? 10 : 0;
      const blockNum = w + baseOffset;
      const expected = ['A', 'B', 'C', 'D'].map(l => `H${blockNum}${l}`);

      const userRecs = jurnalByUser.get(t.user_id) || [];
      const submitted = new Set();
      userRecs.forEach(r => {
        const b = cleanBlok(r.blok);
        if (b && expected.includes(b)) submitted.add(b);
      });

      if (submitted.size < 4) {
        incomplete.push({
          user_id: t.user_id,
          thalibah_id: t.thalibah_id,
          full_name: t.full_name,
          completed_blocks: Array.from(submitted),
          missing_blocks: expected.filter(b => !submitted.has(b)),
          completed_count: submitted.size
        });
      }
    });
    return incomplete;
  }

  console.log('=== AUDIT STATUS SETORAN BATCH 3 (PEKAN 5 BEBAS SP) ===');
  console.log('Total Thalibah Aktif Non-Blacklist:', thalibahList.length);

  const spHistory = new Map(); // user_id -> highest SP level

  for (let w = 1; w <= 7; w++) {
    const inc = evaluateWeek(w);
    console.log(`\n--------------------------------------------------`);
    console.log(`Pekan ${w}: ${inc.length} thalibah belum tuntas 4 blok.`);
    
    if (w === 5) {
      console.log(`⭐ PEKAN 5: DIBEBASKAN DARI SP (Error Sistem) -> 0 SP Diterbitkan.`);
      console.log(`   (Catatan: Ada ${inc.length} thalibah yang belum tuntas di Pekan 5, tapi TIDAK dikenakan SP):`);
      inc.forEach(item => {
        console.log(`     * ${item.full_name}: Setor ${item.completed_count}/4 [${item.completed_blocks.join(', ')}] (Bebas SP)`);
      });
      continue;
    }

    if (inc.length === 0) {
      console.log(`✅ 100% Thalibah Tuntas! (0 SP)`);
    } else {
      console.log(`⚠️ DAFTAR THALIBAH BERHAK SP DI PEKAN ${w}:`);
      inc.forEach((item, idx) => {
        const currentLevel = spHistory.get(item.user_id) || 0;
        const nextLevel = currentLevel + 1;
        spHistory.set(item.user_id, nextLevel);
        console.log(`  ${idx + 1}. ${item.full_name} -> [SP ${nextLevel}] | Setor: ${item.completed_count}/4 [${item.completed_blocks.join(', ')}] | Kurang: [${item.missing_blocks.join(', ')}]`);
      });
    }
  }

  await pool.end();
}

auditWithWeek5Exempt();
