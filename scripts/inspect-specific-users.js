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

async function inspectUsers() {
  const names = ['Nurdiani', 'Izzatun', 'Lina Wartabone'];
  
  for (const name of names) {
    console.log(`\n========================================================`);
    console.log(`🔍 INSPECT: ${name}`);
    console.log(`========================================================`);
    
    const uRes = await pool.query(
      `SELECT u.id, u.full_name, u.nama_kunyah, u.whatsapp, u.is_blacklisted, du.batch_id, du.confirmed_chosen_juz, du.status as du_status, b.name as batch_name
       FROM users u
       LEFT JOIN daftar_ulang_submissions du ON du.user_id = u.id
       LEFT JOIN batches b ON b.id = du.batch_id
       WHERE u.full_name ILIKE $1 OR u.nama_kunyah ILIKE $1`,
      [`%${name}%`]
    );
    
    console.log('User & Daftar Ulang:');
    console.table(uRes.rows);

    if (uRes.rows.length > 0) {
      const userId = uRes.rows[0].id;
      
      const jRes = await pool.query(
        `SELECT id, blok, tanggal_setor, created_at FROM jurnal_records WHERE user_id = $1 ORDER BY created_at ASC`,
        [userId]
      );
      console.log(`Jurnal Records (${jRes.rows.length} total):`);
      jRes.rows.forEach(r => {
        console.log(`  - Blok: ${r.blok} | Tgl Setor: ${r.tanggal_setor ? r.tanggal_setor.toISOString().split('T')[0] : '-'} | Created: ${r.created_at ? r.created_at.toISOString() : '-'}`);
      });

      const spRes = await pool.query(
        `SELECT id, week_number, sp_level, status, reason, is_blacklisted, created_at FROM surat_peringatan WHERE thalibah_id = $1 ORDER BY created_at ASC`,
        [userId]
      );
      console.log(`Surat Peringatan (${spRes.rows.length} total):`);
      console.table(spRes.rows);
    }
  }
}

inspectUsers().then(() => pool.end()).catch(e => { console.error(e); pool.end(); });
