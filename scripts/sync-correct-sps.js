require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://' + process.env.POSTGRES_USER + ':' + process.env.POSTGRES_PASSWORD + '@' + process.env.POSTGRES_HOST + ':' + process.env.POSTGRES_PORT + '/' + process.env.POSTGRES_DB
});

async function run() {
  try {
    const batchId = '2478b493-1b6b-412a-a05f-6193db815a43';

    // 1. Delete Week 6 SPs because Week 6 is exempt from SP due to system error
    const delWeek6 = await pool.query('DELETE FROM surat_peringatan WHERE batch_id = $1 AND (week_number = $2 OR week_number = $3)', [batchId, '6', 6]);
    console.log(`Deleted Week 6 SPs (${delWeek6.rowCount} rows).`);

    // 2. Delete any blacklisted user from surat_peringatan (e.g., Kardina)
    const delBlacklist = await pool.query(`
      DELETE FROM surat_peringatan sp
      USING users u
      WHERE sp.thalibah_id = u.id AND (u.is_blacklisted IS TRUE)
    `);
    console.log(`Deleted Blacklisted SPs (${delBlacklist.rowCount} rows).`);

    // 3. Insert SP 1 for Nurdiani in Week 5
    const nurdianiUserRes = await pool.query("SELECT id, full_name FROM users WHERE full_name ILIKE '%Nurdiani%'");
    const nurdiani = nurdianiUserRes.rows[0];

    if (nurdiani) {
      const checkRes = await pool.query('SELECT id FROM surat_peringatan WHERE batch_id = $1 AND thalibah_id = $2 AND (week_number = $3 OR week_number = $4)', [batchId, nurdiani.id, '5', 5]);
      if (checkRes.rows.length === 0) {
        await pool.query(`
          INSERT INTO surat_peringatan (
            thalibah_id, batch_id, week_number, sp_level, reason, status, notes, created_at, updated_at
          ) VALUES (
            $1, $2, '5', 1, 'tidak_lapor_jurnal', 'active', 'Ghaib pada Pekan 5. Belum menyetor blok H5A, H5B, H5C, H5D.', NOW(), NOW()
          )
        `, [nurdiani.id, batchId]);
        console.log(`Inserted SP 1 for ${nurdiani.full_name} in Week 5.`);
      } else {
        console.log(`SP 1 for ${nurdiani.full_name} in Week 5 already exists.`);
      }
    }

    // 4. Check all active SPs
    const spRes = await pool.query(`
      SELECT sp.id, u.full_name, sp.week_number, sp.sp_level, sp.status, sp.notes 
      FROM surat_peringatan sp 
      JOIN users u ON u.id = sp.thalibah_id 
      WHERE sp.batch_id = $1 
      ORDER BY sp.week_number::int, u.full_name
    `, [batchId]);

    console.log('\n--- Active Batch 3 SP Records in Database ---');
    console.table(spRes.rows);

  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await pool.end();
  }
}

run();
