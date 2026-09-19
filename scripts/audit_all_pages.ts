import { query } from '../lib/db';

async function runAudit() {
  console.log('====================================================');
  console.log('🔍 MEMULAI AUDIT KONEKSI & STRUKTUR TABEL DATABASE');
  console.log('====================================================\n');

  // 1. Audit Master Tables
  const coreTables = [
    'users',
    'batches',
    'programs',
    'halaqah',
    'halaqah_students',
    'halaqah_mentors',
    'daftar_ulang_submissions',
    'jurnal_records',
    'tashih_records',
    'exam_questions',
    'exam_attempts',
    'final_exam_schedules',
    'final_exam_registrations',
    'donations',
    'testimonials',
    'muallimah_registrations',
    'muallimah_akads',
    'study_partners',
    'surat_peringatan',
    'batch_zoom_links'
  ];

  console.log('--- 1. AUDIT JUMLAH DATA PER TABEL UTAMA ---');
  for (const table of coreTables) {
    try {
      const res = await query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`✅ [TABLE] ${table.padEnd(28)} : ${res.rows[0].count} records`);
    } catch (e: any) {
      console.log(`❌ [TABLE] ${table.padEnd(28)} : ERROR -> ${e.message}`);
    }
  }

  console.log('\n--- 2. AUDIT INTEGRITAS RELASI KUNCI ---');
  
  // Check users with roles
  try {
    const roles = await query(`
      SELECT role, count(*) as count 
      FROM users 
      GROUP BY role
    `);
    console.log('✅ [USERS BY ROLE]:', roles.rows);
  } catch (e: any) {
    console.log('❌ [USERS BY ROLE ERROR]:', e.message);
  }

  // Check active batches
  try {
    const batches = await query(`
      SELECT id, batch_name, target_juz, is_active, status, opening_class_date 
      FROM batches 
      ORDER BY batch_name DESC
    `);
    console.log('✅ [BATCHES]:', batches.rows);
  } catch (e: any) {
    console.log('❌ [BATCHES ERROR]:', e.message);
  }

  // Check halaqah with student count
  try {
    const halaqahCount = await query(`
      SELECT h.id, h.name, h.gender, count(hs.id) as students_count
      FROM halaqah h
      LEFT JOIN halaqah_students hs ON hs.halaqah_id = h.id
      GROUP BY h.id, h.name, h.gender
      ORDER BY students_count DESC
      LIMIT 5
    `);
    console.log('✅ [SAMPLE HALAQAH]:', halaqahCount.rows);
  } catch (e: any) {
    console.log('❌ [SAMPLE HALAQAH ERROR]:', e.message);
  }

  // Check jurnal and tashih records
  try {
    const jurnalSample = await query(`
      SELECT jr.id, jr.user_id, jr.surah_name, jr.block_name, jr.status, jr.created_at
      FROM jurnal_records jr
      ORDER BY jr.created_at DESC
      LIMIT 3
    `);
    console.log('✅ [LATEST JURNAL RECORDS]:', jurnalSample.rows);

    const tashihSample = await query(`
      SELECT tr.id, tr.user_id, tr.block_name, tr.status, tr.approved_by, tr.created_at
      FROM tashih_records tr
      ORDER BY tr.created_at DESC
      LIMIT 3
    `);
    console.log('✅ [LATEST TASHIH RECORDS]:', tashihSample.rows);
  } catch (e: any) {
    console.log('❌ [JURNAL/TASHIH SAMPLE ERROR]:', e.message);
  }

  process.exit(0);
}

runAudit();
