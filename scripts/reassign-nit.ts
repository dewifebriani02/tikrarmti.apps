import dotenv from 'dotenv';
import { Client } from 'pg';
import { parseBatch1Raw } from './parse-batch-1';

dotenv.config({ path: '.env.local' });

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set. Add it to .env.local (never hardcode credentials).');
    process.exit(1);
  }
  return url;
}

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`Starting NIT re-assignment script (Dry Run: ${isDryRun})...`);

  const client = new Client({
    connectionString: requireDatabaseUrl()
  });

  await client.connect();

  const BATCH_1_ID = 'ad42c2a8-3892-4861-847f-326e15790ac9'; // Tikrar Tahfidz MTI Batch 1
  const BATCH_2_ID = '4bcb3020-20cb-46e2-8be4-0100f8012a49'; // Tikrar Tahfidz MTI Batch 2
  const BATCH_3_ID = '2478b493-1b6b-412a-a05f-6193db815a43'; // Tikrar Tahfidz MTI Batch 3

  // Helper normalize
  const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Fetch current data
  const usersRes = await client.query(`SELECT * FROM users ORDER BY created_at ASC;`);
  const allUsers = usersRes.rows;

  const regRes = await client.query(`SELECT * FROM pendaftaran_tikrar_tahfidz ORDER BY created_at ASC;`);
  const allRegs = regRes.rows;

  console.log(`Loaded ${allUsers.length} users and ${allRegs.length} registrations.`);

  // 2. Parse and sort Batch 1 raw entries
  const b1Entries = parseBatch1Raw();
  b1Entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  console.log(`Batch 1 has ${b1Entries.length} entries (Aug 2025).`);

  const batch1Assignments: Array<{
    seq: number;
    nit: string;
    entry: typeof b1Entries[0];
    userId?: string;
    isNewUser: boolean;
  }> = [];

  const matchedUserIds = new Set<string>();

  for (let i = 0; i < b1Entries.length; i++) {
    const entry = b1Entries[i];
    const seq = i + 1;
    const nit = `MTI-2501-${String(seq).padStart(4, '0')}`;

    const cleaned = entry.fullName
      .replace(/,\s*[a-zA-Z\.]+$/, '')
      .replace(/\s+\d+$/, '')
      .trim();
    const nClean = norm(cleaned);

    let user = allUsers.find(u => !matchedUserIds.has(u.id) && norm(u.full_name) === nClean);
    if (!user) {
      user = allUsers.find(u => {
        if (matchedUserIds.has(u.id)) return false;
        const uNorm = norm(u.full_name);
        return (uNorm.includes(nClean) || nClean.includes(uNorm)) && (uNorm.length > 4 && nClean.length > 4);
      });
    }

    if (!user) {
      if (cleaned.toLowerCase().includes('sitti aminah')) {
        user = allUsers.find(u => !matchedUserIds.has(u.id) && u.full_name.toLowerCase().includes('siti aminah'));
      } else if (cleaned.toLowerCase().includes('meyntie')) {
        user = allUsers.find(u => !matchedUserIds.has(u.id) && u.full_name.toLowerCase().includes('meyntie'));
      }
    }

    if (user) {
      matchedUserIds.add(user.id);
      batch1Assignments.push({ seq, nit, entry, userId: user.id, isNewUser: false });
    } else {
      batch1Assignments.push({ seq, nit, entry, isNewUser: true });
    }
  }

  console.log(`Batch 1: ${batch1Assignments.filter(b => !b.isNewUser).length} existing users matched, ${batch1Assignments.filter(b => b.isNewUser).length} new users to create.`);

  // 3. Batch 2 Users (First time registered in Batch 2)
  const b2Users = allUsers.filter(u => {
    if (matchedUserIds.has(u.id)) return false;
    const hasB2Reg = allRegs.some(r => r.user_id === u.id && r.batch_id === BATCH_2_ID);
    const isCurrentB2 = u.current_tikrar_batch_id === BATCH_2_ID;
    const createdIn2025OrEarly2026 = new Date(u.created_at) < new Date('2026-06-01');
    const isStudent = (u.roles || []).some((r: string) => ['thalibah', 'calon_thalibah'].includes(r)) || !!u.student_id_number;
    return (hasB2Reg || isCurrentB2 || (createdIn2025OrEarly2026 && (u.student_id_number?.startsWith('MTI-2502') || u.student_id_number?.startsWith('MTI-2602')))) && isStudent;
  });

  b2Users.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const batch2Assignments: Array<{ seq: number; nit: string; userId: string; user: any }> = [];
  for (let i = 0; i < b2Users.length; i++) {
    const u = b2Users[i];
    matchedUserIds.add(u.id);
    const seq = i + 1;
    const nit = `MTI-2602-${String(seq).padStart(4, '0')}`;
    batch2Assignments.push({ seq, nit, userId: u.id, user: u });
  }
  console.log(`Batch 2: ${batch2Assignments.length} users assigned MTI-2602-XXXX.`);

  // 4. Batch 3 Users (First time registered in Batch 3)
  const b3Users = allUsers.filter(u => {
    if (matchedUserIds.has(u.id)) return false;
    const isStudent = (u.roles || []).some((r: string) => ['thalibah', 'calon_thalibah'].includes(r)) || !!u.student_id_number;
    const hasReg = allRegs.some(r => r.user_id === u.id);
    return isStudent || hasReg;
  });

  b3Users.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const batch3Assignments: Array<{ seq: number; nit: string; userId: string; user: any }> = [];
  for (let i = 0; i < b3Users.length; i++) {
    const u = b3Users[i];
    matchedUserIds.add(u.id);
    const seq = i + 1;
    const nit = `MTI-2603-${String(seq).padStart(4, '0')}`;
    batch3Assignments.push({ seq, nit, userId: u.id, user: u });
  }
  console.log(`Batch 3: ${batch3Assignments.length} users assigned MTI-2603-XXXX.`);

  console.log('\n--- SAMPLE ASSIGNMENTS ---');
  console.log('BATCH 1 (First 5):');
  batch1Assignments.slice(0, 5).forEach(b => console.log(`  ${b.nit} -> ${b.entry.fullName} (${b.isNewUser ? 'NEW' : 'EXISTING: ' + b.userId})`));
  console.log('BATCH 1 (Wahyu Suci & Dewi Nurhayati):');
  const wahyu = batch1Assignments.find(b => b.entry.fullName.includes('Wahyu Suci'));
  const dewi = batch1Assignments.find(b => b.entry.fullName.includes('Dewi Nurhayati'));
  console.log(`  ${wahyu?.nit} -> ${wahyu?.entry.fullName}`);
  console.log(`  ${dewi?.nit} -> ${dewi?.entry.fullName}`);

  console.log('BATCH 2 (First 3):');
  batch2Assignments.slice(0, 3).forEach(b => console.log(`  ${b.nit} -> ${b.user.full_name} (${b.user.email})`));

  console.log('BATCH 3 (First 3):');
  batch3Assignments.slice(0, 3).forEach(b => console.log(`  ${b.nit} -> ${b.user.full_name} (${b.user.email})`));

  if (isDryRun) {
    console.log('\n[DRY RUN COMPLETE] No changes were written to the database.');
    await client.end();
    return;
  }

  // EXECUTE TRANSACTION
  console.log('\nExecuting database updates in a single transaction...');
  await client.query('BEGIN;');

  try {
    // A. Backup tables
    console.log('Creating safety backup tables...');
    await client.query(`DROP TABLE IF EXISTS users_backup_pre_nit_reassign;`);
    await client.query(`CREATE TABLE users_backup_pre_nit_reassign AS SELECT * FROM users;`);
    await client.query(`DROP TABLE IF EXISTS pendaftaran_backup_pre_nit_reassign;`);
    await client.query(`CREATE TABLE pendaftaran_backup_pre_nit_reassign AS SELECT * FROM pendaftaran_tikrar_tahfidz;`);

    // Temporarily disable the trigger to avoid conflicts during mass reassignment
    await client.query(`ALTER TABLE users DISABLE TRIGGER trg_assign_nit_users;`);

    // Clear student_id_number temporarily to avoid unique constraint collisions during shuffle
    await client.query(`UPDATE users SET student_id_number = NULL WHERE student_id_number IS NOT NULL;`);

    // B. Apply Batch 1
    for (const b1 of batch1Assignments) {
      let uid = b1.userId;
      if (b1.isNewUser) {
        // Create new thalibah user
        const dummyEmail = `santri.b1.${norm(b1.entry.fullName)}@markaztikrar.id`;
        const insertUserRes = await client.query(
          `INSERT INTO users (
             full_name, email, student_id_number, current_tikrar_batch_id, 
             roles, kota, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING id;`,
          [
            b1.entry.fullName,
            dummyEmail,
            b1.nit,
            BATCH_1_ID,
            ['thalibah'],
            b1.entry.city,
            b1.entry.timestamp
          ]
        );
        uid = insertUserRes.rows[0].id;
      } else {
        // Update existing user
        await client.query(
          `UPDATE users SET 
             student_id_number = $1,
             updated_at = NOW()
           WHERE id = $2;`,
          [b1.nit, uid]
        );
      }

      // Add registration record for Batch 1 if not exists
      const existingReg = await client.query(
        `SELECT id FROM pendaftaran_tikrar_tahfidz WHERE user_id = $1 AND batch_id = $2;`,
        [uid, BATCH_1_ID]
      );

      if (existingReg.rows.length === 0) {
        await client.query(
          `INSERT INTO pendaftaran_tikrar_tahfidz (
             user_id, batch_id, full_name, chosen_juz, status, selection_status, 
             age, domicile, created_at, submission_date
           ) VALUES ($1, $2, $3, $4, 'approved', 'passed', $5, $6, $7, $7);`,
          [
            uid,
            BATCH_1_ID,
            b1.entry.fullName,
            `Juz ${b1.entry.juz}`,
            String(b1.entry.age),
            b1.entry.city,
            b1.entry.timestamp
          ]
        );
      }
    }

    // C. Apply Batch 2
    for (const b2 of batch2Assignments) {
      await client.query(
        `UPDATE users SET 
           student_id_number = $1,
           updated_at = NOW()
         WHERE id = $2;`,
        [b2.nit, b2.userId]
      );
    }

    // D. Apply Batch 3
    for (const b3 of batch3Assignments) {
      await client.query(
        `UPDATE users SET 
           student_id_number = $1,
           updated_at = NOW()
         WHERE id = $2;`,
        [b3.nit, b3.userId]
      );
    }

    // Re-enable trigger
    await client.query(`ALTER TABLE users ENABLE TRIGGER trg_assign_nit_users;`);

    await client.query('COMMIT;');
    console.log('✅ TRANSACTION COMMITTED SUCCESSFULLY! All NITs have been re-assigned.');
  } catch (err) {
    await client.query('ROLLBACK;');
    try {
      await client.query(`ALTER TABLE users ENABLE TRIGGER trg_assign_nit_users;`);
    } catch {}
    console.error('❌ Error during transaction, rolled back:', err);
    throw err;
  } finally {
    await client.end();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
