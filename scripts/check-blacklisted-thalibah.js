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

async function check() {
  const batchRes = await pool.query("SELECT id FROM batches WHERE status = 'open'");
  const batchId = batchRes.rows[0].id;

  const res = await pool.query(
    `SELECT 
       u.id, 
       u.full_name, 
       u.nama_kunyah, 
       u.is_blacklisted, 
       u.blacklisted_at, 
       u.blacklist_reason, 
       u.blacklist_notes 
     FROM daftar_ulang_submissions du 
     JOIN users u ON u.id = du.user_id 
     WHERE du.batch_id = $1 
       AND du.status IN ('approved', 'submitted') 
       AND u.is_blacklisted = true`,
    [batchId]
  );

  console.log(`Thalibah di Batch 3 yang statusnya Blacklist (${res.rows.length} orang):`);
  console.table(res.rows);
}

check()
  .then(() => pool.end())
  .catch((e) => {
    console.error(e);
    pool.end();
  });
