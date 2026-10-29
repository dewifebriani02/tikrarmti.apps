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

async function main() {
  const client = new Client({
    connectionString: requireDatabaseUrl()
  });

  await client.connect();

  const entries = parseBatch1Raw();
  // Sort chronologically
  entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  console.log(`Checking ${entries.length} Batch 1 entries against users table...`);

  let matched = 0;
  let unmatched = 0;
  const matches: Array<{ entry: any; user: any }> = [];
  const unmatchedList: any[] = [];

  for (const entry of entries) {
    // Clean name: remove extra numbers like "Lili Afrianti 46" -> "Lili Afrianti"
    const cleanedName = entry.fullName.replace(/\s+\d+$/, '').trim();

    // Query by exact or ILIKE match
    const res = await client.query(
      `SELECT id, full_name, email, student_id_number, current_tikrar_batch_id 
       FROM users 
       WHERE LOWER(TRIM(full_name)) = LOWER($1) 
          OR LOWER(TRIM(full_name)) = LOWER($2)
          OR LOWER(TRIM(full_name)) ILIKE $3
       LIMIT 1`,
      [entry.fullName, cleanedName, `%${cleanedName}%`]
    );

    if (res.rows.length > 0) {
      matched++;
      matches.push({ entry, user: res.rows[0] });
    } else {
      unmatched++;
      unmatchedList.push(entry);
    }
  }

  console.log(`Matched: ${matched}/${entries.length}`);
  console.log(`Unmatched: ${unmatched}/${entries.length}`);

  if (unmatchedList.length > 0) {
    console.log('\nUnmatched entries:');
    unmatchedList.forEach(u => console.log(`- Line ${u.lineNum}: [${u.rawTs}] ${u.fullName} (${u.city})`));
  }

  console.log('\nSample 10 matches:');
  matches.slice(0, 10).forEach((m, idx) => {
    console.log(`${idx + 1}. Entry: "${m.entry.fullName}" (${m.entry.rawTs}) -> User: "${m.user.full_name}" (Current NIT: ${m.user.student_id_number})`);
  });

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
