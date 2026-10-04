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

async function inspect() {
  const userId = '420e6d27-fa53-414d-9318-2ea5ff64bfd4';

  const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = userRes.rows[0];

  console.log('=== DATA USER KARDINA ENGELINA SIREGAR ===');
  console.log('ID:', user.id);
  console.log('Nama:', user.full_name, `(${user.nama_kunyah})`);
  console.log('Email:', user.email);
  console.log('WA:', user.whatsapp);
  console.log('Status Blacklist:', user.is_blacklisted);
  console.log('Tanggal Blacklist:', user.blacklisted_at);
  console.log('Alasan Blacklist:', user.blacklist_reason);
  console.log('Catatan Blacklist:', user.blacklist_notes);

  const jRes = await pool.query(
    'SELECT id, blok, tanggal_setor, created_at FROM jurnal_records WHERE user_id = $1 ORDER BY created_at ASC',
    [userId]
  );
  console.log(`\n=== JURNAL RECORDS (${jRes.rows.length} records) ===`);
  jRes.rows.forEach((r, i) => {
    console.log(
      `${i + 1}. Blok ${r.blok} | Tgl Setor: ${r.tanggal_setor ? r.tanggal_setor.toISOString().split('T')[0] : '-'} | Created At: ${r.created_at ? r.created_at.toISOString() : '-'}`
    );
  });

  const tRes = await pool.query(
    'SELECT id, blok, tanggal_setor, created_at FROM tashih_records WHERE user_id = $1 ORDER BY created_at ASC',
    [userId]
  );
  console.log(`\n=== TASHIH RECORDS (${tRes.rows.length} records) ===`);
  tRes.rows.forEach((r, i) => {
    console.log(
      `${i + 1}. Blok ${r.blok} | Tgl Setor: ${r.tanggal_setor ? r.tanggal_setor.toISOString().split('T')[0] : '-'} | Created At: ${r.created_at ? r.created_at.toISOString() : '-'}`
    );
  });
}

inspect()
  .then(() => pool.end())
  .catch((e) => {
    console.error(e);
    pool.end();
  });
