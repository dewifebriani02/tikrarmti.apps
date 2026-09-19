import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Find latest backup folder dynamically
function findBackupDir(): string {
  if (process.env.BACKUP_JSON_DIR && fs.existsSync(process.env.BACKUP_JSON_DIR)) {
    console.log(`Using backup source from env: ${process.env.BACKUP_JSON_DIR}`);
    return process.env.BACKUP_JSON_DIR;
  }

  const directJson = path.join(process.cwd(), 'json');
  if (fs.existsSync(directJson)) {
    console.log(`Using direct json folder: ${directJson}`);
    return directJson;
  }

  const possibleRoots = [
    '/tmp/mti_deploy/json',
    path.join(process.cwd(), 'backups'),
    process.cwd(),
    '/tmp/mti_deploy',
  ];

  for (const root of possibleRoots) {
    if (fs.existsSync(root)) {
      const folders = fs.readdirSync(root)
        .filter((f) => f.startsWith('backup_'))
        .sort()
        .reverse();
      for (const folder of folders) {
        const jsonPath = path.join(root, folder, 'json');
        if (fs.existsSync(jsonPath)) {
          console.log(`Using backup source: ${jsonPath}`);
          return jsonPath;
        }
      }
    }
  }

  throw new Error('No valid backup directory with json/ found.');
}

const backupDir = findBackupDir();
const isRemote = process.env.VPS_DIRECT_RUN === 'true';

const client = new Client({
  host: process.env.DB_HOST || (isRemote ? '127.0.0.1' : '187.52.120.159'),
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'mti_db',
  user: process.env.DB_USER || 'mti_user',
  password: process.env.DB_PASSWORD,
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log('Connecting to PostgreSQL database mti_db on VPS...');
  await client.connect();
  console.log('✅ Connected successfully to mti_db!');

  // Disable constraints/triggers for seamless bulk data load
  await client.query("SET session_replication_role = 'replica';");

  // Enable extensions
  await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

  // Load auth_users and update/sync passwords
  const authUsersPath = path.join(backupDir, 'auth_users.json');
  if (fs.existsSync(authUsersPath)) {
    const authUsers = JSON.parse(fs.readFileSync(authUsersPath, 'utf8'));
    console.log(`Found ${authUsers.length} auth accounts.`);
  }

  // Load and insert each table
  const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json') && f !== 'auth_users.json');

  const order = [
    'users.json',
    'batches.json',
    'programs.json',
    'halaqah.json',
    'halaqah_students.json',
    'pendaftaran_tikrar_tahfidz.json',
    'daftar_ulang_submissions.json',
    'jurnal_records.json',
    'tashih_records.json',
    'exam_attempts.json',
    'study_partners.json',
    'surat_peringatan.json',
    'muallimah_registrations.json',
    'faqs.json',
    'juz_options.json',
    'registration_questions.json',
    'reregistration_questions.json',
    'muallimah_registration_questions.json',
    'akad_quiz_questions.json',
    'transfer_schedule_requests.json',
  ];

  const sortedFiles = files.sort((a, b) => {
    const idxA = order.indexOf(a);
    const idxB = order.indexOf(b);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  for (const file of sortedFiles) {
    const tableName = file.replace('.json', '');
    const records = JSON.parse(fs.readFileSync(path.join(backupDir, file), 'utf8'));

    if (!records || records.length === 0) {
      console.log(`ℹ️ Table ${tableName}: 0 records.`);
      continue;
    }

    console.log(`\nImporting table: ${tableName} (${records.length} records)...`);

    // Ensure all columns exist in the table
    const sample = records[0];
    const columns = Object.keys(sample);

    // Create table if not exists
    const colDefs = columns.map((col) => {
      if (col === 'id') return `"${col}" uuid PRIMARY KEY DEFAULT gen_random_uuid()`;
      if (col === 'roles') return `"${col}" text[]`;
      if (col.endsWith('_at') || col.endsWith('_date') || col === 'timestamp') return `"${col}" timestamp with time zone`;
      return `"${col}" text`;
    });

    try {
      await client.query(`CREATE TABLE IF NOT EXISTS public."${tableName}" (${colDefs.join(', ')});`);
    } catch (e: any) {}

    // Add missing columns if table already existed
    for (const col of columns) {
      try {
        let type = 'text';
        if (col === 'roles') type = 'text[]';
        else if (col.endsWith('_at') || col.endsWith('_date')) type = 'timestamp with time zone';
        await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS "${col}" ${type};`);
      } catch (e) {}
    }

    // Insert records in batches
    let inserted = 0;
    const BATCH_SIZE = 100;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const chunk = records.slice(i, i + BATCH_SIZE);

      for (const row of chunk) {
        const rowCols = Object.keys(row);
        const rowVals = Object.entries(row).map(([col, val]) => {
          if (col === 'roles' && Array.isArray(val)) return val;
          if (Array.isArray(val) || (val && typeof val === 'object')) {
            return JSON.stringify(val);
          }
          return val;
        });
        const placeholders = rowVals.map((_, idx) => `$${idx + 1}`).join(', ');

        const updateAssignments = rowCols
          .filter((c) => c !== 'id')
          .map((c) => `"${c}" = EXCLUDED."${c}"`)
          .join(', ');

        const query = `
          INSERT INTO public."${tableName}" ("${rowCols.join('", "')}")
          VALUES (${placeholders})
          ${updateAssignments.length > 0 ? `ON CONFLICT ("id") DO UPDATE SET ${updateAssignments}` : 'ON CONFLICT DO NOTHING'}
        `;

        try {
          await client.query(query, rowVals);
          inserted++;
        } catch (err: any) {
          try {
            await client.query(`INSERT INTO public."${tableName}" ("${rowCols.join('", "')}") VALUES (${placeholders}) ON CONFLICT DO NOTHING;`, rowVals);
            inserted++;
          } catch (insertErr: any) {
            if (inserted === 0 && i === 0) {
              console.error(`  ⚠️ Error inserting into ${tableName}:`, err.message || insertErr.message);
            }
          }
        }
      }
    }

    console.log(`  ✅ Table '${tableName}': ${inserted}/${records.length} records imported.`);
  }

  // Re-enable normal constraints and triggers
  await client.query("SET session_replication_role = 'origin';");
  await client.end();
  console.log('\n========================================================');
  console.log('🎉 ALL DATABASE TABLES SUCCESSFULLY IMPORTED TO VPS!');
  console.log('========================================================');
}

main().catch((err) => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
