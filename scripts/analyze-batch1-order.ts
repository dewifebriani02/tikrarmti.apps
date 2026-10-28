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
  // Sort chronologically by timestamp
  entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  console.log(`Analyzing ${entries.length} chronological Batch 1 entries...`);

  // Query all users to match in memory
  const usersRes = await client.query(`SELECT id, full_name, email, student_id_number, kota, alamat, current_tikrar_batch_id FROM users;`);
  const allUsers = usersRes.rows;

  function normalize(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  const results: any[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const seq = i + 1;
    const targetNit = `MTI-2501-${String(seq).padStart(4, '0')}`;

    // Clean name: e.g. "Mista,S.Si" -> "Mista", "Lili Afrianti 46" -> "Lili Afrianti"
    const cleaned = entry.fullName
      .replace(/,\s*[a-zA-Z\.]+$/, '') // remove titles like ,S.Si
      .replace(/\s+\d+$/, '')          // remove numbers
      .trim();

    const normClean = normalize(cleaned);

    // Matching strategies
    let matchedUser = allUsers.find(u => normalize(u.full_name) === normClean);
    if (!matchedUser) {
      // Try contains or fuzzy
      matchedUser = allUsers.find(u => {
        const uNorm = normalize(u.full_name);
        return (uNorm.includes(normClean) || normClean.includes(uNorm)) && (uNorm.length > 4 && normClean.length > 4);
      });
    }

    // Manual overrides for known typos/variations
    if (!matchedUser) {
      if (cleaned.toLowerCase().includes('sitti aminah')) {
        matchedUser = allUsers.find(u => u.full_name.toLowerCase().includes('siti aminah'));
      } else if (cleaned.toLowerCase().includes('meyntie')) {
        matchedUser = allUsers.find(u => u.full_name.toLowerCase().includes('meyntie'));
      }
    }

    results.push({
      seq,
      targetNit,
      entry,
      matchedUser: matchedUser || null
    });
  }

  const matchedCount = results.filter(r => r.matchedUser !== null).length;
  console.log(`Matched with existing users: ${matchedCount}/${results.length}`);
  console.log(`Unmatched (need user creation or check): ${results.length - matchedCount}/${results.length}`);

  console.log('\n--- FULL LIST WITH TARGET NIT (MTI-2501-NNNN) ---');
  results.forEach(r => {
    const u = r.matchedUser;
    const userStr = u ? `FOUND: ${u.full_name} (${u.email}) [Current NIT: ${u.student_id_number}]` : `NEW USER NEEDED (${r.entry.city}, age ${r.entry.age})`;
    console.log(`${r.targetNit} | [${r.entry.rawTs}] ${r.entry.fullName} -> ${userStr}`);
  });

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
