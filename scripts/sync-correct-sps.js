require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://' + process.env.POSTGRES_USER + ':' + process.env.POSTGRES_PASSWORD + '@' + process.env.POSTGRES_HOST + ':' + process.env.POSTGRES_PORT + '/' + process.env.POSTGRES_DB
});

async function run() {
  try {
    const batchId = '2478b493-1b6b-412a-a05f-6193db815a43';

    // 1. Delete Week 5 SPs because Week 5 is exempt from SP due to system error
    const delWeek5 = await pool.query('DELETE FROM surat_peringatan WHERE batch_id = $1 AND (week_number = $2 OR week_number = $3)', [batchId, '5', 5]);
    console.log(`Deleted Week 5 SPs (${delWeek5.rowCount} rows).`);

    // 2. Delete any blacklisted user from surat_peringatan (e.g., Kardina)
    const delBlacklist = await pool.query(`
      DELETE FROM surat_peringatan sp
      USING users u
      WHERE sp.thalibah_id = u.id AND (u.is_blacklisted IS TRUE)
    `);
    console.log(`Deleted Blacklisted SPs (${delBlacklist.rowCount} rows).`);

    // 3. Clear Week 6 SPs first to re-insert accurately
    await pool.query('DELETE FROM surat_peringatan WHERE batch_id = $1 AND (week_number = $2 OR week_number = $3)', [batchId, '6', 6]);

    // 4. Insert SP 1 for the 6 thalibahs who did not complete Week 6:
    // earlyta arsyfa khoirina (0/4), Farida (3/4), Izzatu Dini (0/4), Lina Wartabone (0/4), Nurdiani (0/4), Zainab Binti yusri (0/4)
    const week6Incomplete = [
      { name: 'earlyta arsyfa khoirina', reason: 'tidak_lapor_jurnal', notes: 'Ghaib pada Pekan 6. Belum menyetor blok H6A, H6B, H6C, H6D.' },
      { name: 'Farida', reason: 'laporan_tidak_lengkap', notes: 'Hanya menyetor H16A, H16B, H16C. Belum menyetor H16D.' },
      { name: 'Izzatu Dini', reason: 'tidak_lapor_jurnal', notes: 'Ghaib pada Pekan 6. Belum menyetor blok H6A, H6B, H6C, H6D.' },
      { name: 'Lina Wartabone', reason: 'tidak_lapor_jurnal', notes: 'Ghaib pada Pekan 6. Belum menyetor blok H6A, H6B, H6C, H6D.' },
      { name: 'Nurdiani', reason: 'tidak_lapor_jurnal', notes: 'Ghaib pada Pekan 6. Belum menyetor blok H6A, H6B, H6C, H6D.' },
      { name: 'Zainab Binti yusri', reason: 'tidak_lapor_jurnal', notes: 'Ghaib pada Pekan 6. Belum menyetor blok H6A, H6B, H6C, H6D.' }
    ];

    for (const item of week6Incomplete) {
      const uRes = await pool.query('SELECT id, full_name FROM users WHERE full_name ILIKE $1', [`%${item.name}%`]);
      const user = uRes.rows[0];
      if (user) {
        await pool.query(`
          INSERT INTO surat_peringatan (
            thalibah_id, batch_id, week_number, sp_level, reason, status, notes, created_at, updated_at
          ) VALUES (
            $1, $2, '6', 1, $3, 'active', $4, NOW(), NOW()
          )
        `, [user.id, batchId, item.reason, item.notes]);
        console.log(`✅ SP 1 terbit di Pekan 6 untuk: ${user.full_name}`);
      } else {
        console.warn(`⚠️ User not found for: ${item.name}`);
      }
    }

    // 5. Check all active SPs
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
