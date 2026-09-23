/**
 * Diagnostic script: Check trouble users from migration report
 * Run: node check_trouble_batch2.js
 */
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TROUBLE_NAMES = [
  'Rina Supriati',
  'Neliana',
  'Dewi Sartika',
  'Yuliant',
];

async function main() {
  const client = await pool.connect();
  
  console.log('=== DIAGNOSIS TROUBLE USERS ===\n');
  
  for (const name of TROUBLE_NAMES) {
    console.log(`\n--- ${name} ---`);
    try {
      const { rows } = await client.query(`
        SELECT 
          au.id as user_id,
          au.email,
          au.raw_user_meta_data->>'full_name' as full_name,
          au.last_sign_in_at,
          au.email_confirmed_at,
          p.status as reg_status, 
          p.chosen_juz,
          b.name as batch_name, 
          b.status as batch_status,
          b.first_week_start_date,
          du.status as du_status,
          du.confirmed_chosen_juz,
          (SELECT COUNT(*) FROM tashih_records tr WHERE tr.user_id = au.id) as tashih_count,
          (SELECT MAX(waktu_tashih) FROM tashih_records tr WHERE tr.user_id = au.id) as last_tashih
        FROM auth.users au
        LEFT JOIN pendaftaran_tikrar_tahfidz p ON p.user_id = au.id
        LEFT JOIN batches b ON p.batch_id = b.id
        LEFT JOIN daftar_ulang_submissions du ON du.user_id = p.user_id AND du.batch_id = p.batch_id
        WHERE au.raw_user_meta_data->>'full_name' ILIKE $1
           OR au.email ILIKE $1
        ORDER BY b.status DESC NULLS LAST
        LIMIT 3
      `, [`%${name}%`]);
      
      if (rows.length === 0) {
        console.log('  ❌ USER TIDAK DITEMUKAN di database!');
      } else {
        rows.forEach(r => {
          console.log(`  Email: ${r.email}`);
          console.log(`  Nama: ${r.full_name}`);
          console.log(`  Login terakhir: ${r.last_sign_in_at || 'BELUM PERNAH'}`);
          console.log(`  Email confirmed: ${r.email_confirmed_at ? 'YES' : 'BELUM KONFIRMASI'}`);
          console.log(`  Batch: ${r.batch_name || 'TIDAK ADA'} (${r.batch_status || '-'})`);
          console.log(`  Status reg: ${r.reg_status || 'TIDAK ADA'}`);
          console.log(`  Juz: ${r.chosen_juz || '-'} / DU juz: ${r.confirmed_chosen_juz || '-'}`);
          console.log(`  Status DU: ${r.du_status || 'TIDAK ADA DU'}`);
          console.log(`  Tashih count: ${r.tashih_count}`);
          console.log(`  Tashih terakhir: ${r.last_tashih || 'BELUM ADA'}`);
          
          if (!r.email_confirmed_at) console.log(`  => MASALAH: Email belum dikonfirmasi!`);
          if (!r.reg_status) console.log(`  => MASALAH: Tidak ada pendaftaran!`);
          else if (r.reg_status !== 'approved') console.log(`  => MASALAH: reg_status = ${r.reg_status}`);
          if (r.du_status && r.du_status !== 'approved') console.log(`  => MASALAH: du_status = ${r.du_status}`);
          if (!r.chosen_juz && !r.confirmed_chosen_juz) console.log(`  => MASALAH: Tidak ada juz!`);
          console.log('');
        });
      }
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }
  }
  
  console.log('\n=== BATCH AKTIF ===');
  const { rows: batchRows } = await client.query(`
    SELECT id, name, status, start_date, first_week_start_date, opening_class_date
    FROM batches WHERE status IN ('open', 'ongoing')
    ORDER BY created_at DESC
  `);
  console.log(JSON.stringify(batchRows, null, 2));
  
  client.release();
  await pool.end();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
