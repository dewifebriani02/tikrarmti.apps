const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to .env.local (never hardcode credentials).');
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  await client.connect();
  console.log('Connected');
  await client.query('ALTER TABLE public.muallimah_akads ADD COLUMN IF NOT EXISTS final_assigned_juz TEXT;');
  console.log('Migration applied');
  await client.end();
}

run().catch(console.error);
