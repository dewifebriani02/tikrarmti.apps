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

async function inspectNurdiani() {
  const usersRes = await pool.query(
    "SELECT u.id, u.full_name, du.confirmed_chosen_juz, du.batch_id, b.name as batch_name FROM users u JOIN daftar_ulang_submissions du ON du.user_id = u.id JOIN batches b ON b.id = du.batch_id WHERE u.full_name ILIKE '%Nurdiani%' OR u.full_name ILIKE '%Izzatun%'"
  );
  console.table(usersRes.rows);

  for (const u of usersRes.rows) {
    const jRes = await pool.query(
      "SELECT blok, tanggal_setor, created_at FROM jurnal_records WHERE user_id = $1 ORDER BY created_at ASC",
      [u.id]
    );
    console.log(`\n=== JURNAL: ${u.full_name} (${u.batch_name} - ${u.confirmed_chosen_juz}) ===`);
    console.log(`Total setoran: ${jRes.rows.length}`);
    jRes.rows.forEach(r => {
      console.log(`  ${r.blok} | tgl: ${r.tanggal_setor ? r.tanggal_setor.toISOString().split('T')[0] : '-'} | created: ${r.created_at.toISOString()}`);
    });
  }
}

inspectNurdiani().then(() => pool.end()).catch(e => { console.error(e); pool.end(); });
