import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const TABLES = [
  'users',
  'batches',
  'programs',
  'halaqah',
  'halaqah_mentors',
  'halaqah_students',
  'pendaftaran_tikrar_tahfidz',
  'pendaftaran',
  'daftar_ulang_submissions',
  'jurnal_records',
  'daily_journals',
  'tashih_records',
  'tashih_blocks',
  'exam_attempts',
  'exam_questions',
  'study_partners',
  'surat_peringatan',
  'sp_history',
  'muallimah_registrations',
  'musyrifah_registrations',
  'muallimah_schedules',
  'muallimah_akads',
  'faqs',
  'juz_options',
  'registration_questions',
  'reregistration_questions',
  'muallimah_registration_questions',
  'akad_quiz_questions',
  'akad_quiz_attempts',
  'transfer_schedule_requests',
  'final_exam_schedules',
  'final_exam_registrations',
  'final_exam_questions',
  'system_logs',
  'audit_logs',
  'activity_logs',
  'error_logs',
  'blacklist_audit_logs',
  'password_reset_otps',
];

function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (Array.isArray(val)) {
    if (val.length > 0 && typeof val[0] === 'object' && val[0] !== null) {
      return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
    }
    const escapedElements = val.map((item) => {
      if (item === null || item === undefined) return 'NULL';
      if (typeof item === 'object') return `"${JSON.stringify(item).replace(/"/g, '\\"')}"`;
      return `"${String(item).replace(/"/g, '\\"')}"`;
    });
    return `ARRAY[${escapedElements.map(e => e === 'NULL' ? 'NULL' : `'${e.slice(1, -1).replace(/'/g, "''")}'`).join(', ')}]`;
  }
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function fetchAllRows(tableName: string): Promise<{ rows: any[]; exists: boolean; errorMsg?: string }> {
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      if (
        error.code === '42P01' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('relation') ||
        error.message?.includes('not found')
      ) {
        return { rows: [], exists: false };
      }
      return { rows: allRows, exists: true, errorMsg: error.message };
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allRows = allRows.concat(data);
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        from += PAGE_SIZE;
      }
    }
  }

  return { rows: allRows, exists: true };
}

async function fetchAllAuthUsers(): Promise<any[]> {
  let allUsers: any[] = [];
  let page = 1;
  const perPage = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error('Error fetching auth users:', error.message);
      break;
    }

    if (!data || !data.users || data.users.length === 0) {
      hasMore = false;
    } else {
      allUsers = allUsers.concat(data.users);
      if (data.users.length < perPage) {
        hasMore = false;
      } else {
        page += 1;
      }
    }
  }

  return allUsers;
}

async function downloadStorageBucket(bucketName: string, targetDir: string) {
  const bucketDir = path.join(targetDir, bucketName);
  if (!fs.existsSync(bucketDir)) {
    fs.mkdirSync(bucketDir, { recursive: true });
  }

  console.log(`\nChecking Storage Bucket: ${bucketName}...`);

  async function listAllFiles(prefix = ''): Promise<string[]> {
    let fileList: string[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase.storage.from(bucketName).list(prefix, {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });

      if (error) {
        console.error(`  Error listing ${bucketName}/${prefix}:`, error.message);
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        for (const item of data) {
          const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
          if (item.id === null || !item.metadata) {
            // It's a folder/sub-prefix
            const subFiles = await listAllFiles(itemPath);
            fileList = fileList.concat(subFiles);
          } else {
            fileList.push(itemPath);
          }
        }
        if (data.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }
    }
    return fileList;
  }

  const files = await listAllFiles();
  console.log(`Found ${files.length} files in bucket '${bucketName}'. Downloading...`);

  let downloadedCount = 0;
  for (const filePath of files) {
    const destPath = path.join(bucketDir, filePath);
    const destFolder = path.dirname(destPath);
    if (!fs.existsSync(destFolder)) {
      fs.mkdirSync(destFolder, { recursive: true });
    }

    try {
      const { data, error } = await supabase.storage.from(bucketName).download(filePath);
      if (error) {
        console.error(`  Failed to download ${filePath}: ${error.message}`);
      } else if (data) {
        const buffer = Buffer.from(await data.arrayBuffer());
        fs.writeFileSync(destPath, buffer);
        downloadedCount++;
        if (downloadedCount % 20 === 0 || downloadedCount === files.length) {
          console.log(`  Downloaded ${downloadedCount}/${files.length} files...`);
        }
      }
    } catch (e: any) {
      console.error(`  Exception downloading ${filePath}:`, e.message);
    }
  }

  console.log(`Completed bucket '${bucketName}': ${downloadedCount} files saved to ${bucketDir}`);
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups', `backup_${timestamp}`);
  const jsonDir = path.join(backupDir, 'json');
  const sqlDir = path.join(backupDir, 'sql');
  const storageDir = path.join(backupDir, 'storage');

  fs.mkdirSync(jsonDir, { recursive: true });
  fs.mkdirSync(sqlDir, { recursive: true });
  fs.mkdirSync(storageDir, { recursive: true });

  console.log('========================================================');
  console.log(`🚀 STARTING DATABASE & STORAGE BACKUP`);
  console.log(`Timestamp: ${timestamp}`);
  console.log(`Target Directory: ${backupDir}`);
  console.log('========================================================\n');

  // 1. Export Auth Users
  console.log('1. Exporting Auth Users (from Supabase Auth)...');
  const authUsers = await fetchAllAuthUsers();
  fs.writeFileSync(
    path.join(jsonDir, 'auth_users.json'),
    JSON.stringify(authUsers, null, 2),
    'utf8'
  );
  console.log(`✅ Saved ${authUsers.length} auth users to json/auth_users.json`);

  // 2. Export Database Tables
  console.log('\n2. Exporting Database Tables (Data & SQL Inserts)...');
  const summary: Record<string, number> = {};
  let combinedSql = `-- MTI DATABASE BACKUP\n-- Generated at: ${new Date().toISOString()}\n\n`;

  for (const table of TABLES) {
    const result = await fetchAllRows(table);

    if (!result.exists) {
      console.log(`  ⏭️ Table '${table}' does not exist in schema (skipped)`);
      continue;
    }

    if (result.errorMsg) {
      console.warn(`  ⚠️ Warning fetching '${table}': ${result.errorMsg}`);
    }

    const rows = result.rows;
    summary[table] = rows.length;

    // Save JSON
    fs.writeFileSync(
      path.join(jsonDir, `${table}.json`),
      JSON.stringify(rows, null, 2),
      'utf8'
    );

    // Generate SQL Inserts
    if (rows.length > 0) {
      const columns = Object.keys(rows[0]);
      let tableSql = `-- Table: ${table} (${rows.length} rows)\n`;
      for (const row of rows) {
        const values = columns.map((col) => escapeSqlValue(row[col]));
        tableSql += `INSERT INTO public.${table} ("${columns.join('", "')}") VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`;
      }
      tableSql += '\n';

      fs.writeFileSync(path.join(sqlDir, `${table}.sql`), tableSql, 'utf8');
      combinedSql += tableSql;
      console.log(`  ✅ Table '${table}': ${rows.length} rows exported`);
    } else {
      console.log(`  ℹ️ Table '${table}': 0 rows (empty)`);
    }
  }

  // Save combined SQL
  fs.writeFileSync(path.join(sqlDir, 'all_tables_inserts.sql'), combinedSql, 'utf8');
  console.log(`\n✅ Saved combined SQL inserts to sql/all_tables_inserts.sql`);

  // 3. Backup Storage Buckets
  console.log('\n3. Backing up Supabase Storage Buckets...');
  const { data: buckets, error: bError } = await supabase.storage.listBuckets();
  if (bError) {
    console.error('Error listing buckets:', bError.message);
  } else if (buckets && buckets.length > 0) {
    for (const b of buckets) {
      await downloadStorageBucket(b.name, storageDir);
    }
  } else {
    console.log('No storage buckets found or empty.');
  }

  // Write Summary Manifest
  const manifest = {
    backupDate: new Date().toISOString(),
    supabaseUrl,
    authUsersCount: authUsers.length,
    tableCounts: summary,
    backupFolder: backupDir,
  };

  fs.writeFileSync(
    path.join(backupDir, 'backup_manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  console.log('\n========================================================');
  console.log(`🎉 BACKUP COMPLETED SUCCESSFULLY!`);
  console.log(`Manifest: ${path.join(backupDir, 'backup_manifest.json')}`);
  console.log(`Total Auth Users: ${authUsers.length}`);
  console.log(`Total Jurnal Records: ${summary['jurnal_records'] || 0}`);
  console.log(`Total Tashih Records: ${summary['tashih_records'] || 0}`);
  console.log(`Total Users Data: ${summary['users'] || 0}`);
  console.log('========================================================');
}

main().catch((err) => {
  console.error('Fatal backup error:', err);
  process.exit(1);
});
