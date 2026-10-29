const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Add it to .env.local (never hardcode credentials).');
    process.exit(1);
  }
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const sql = `
      -- DROP OLD
      ALTER TABLE public.jurnal_records DROP CONSTRAINT IF EXISTS jurnal_records_tikrar_bi_al_ghaib_type_check;
      ALTER TABLE public.jurnal_records DROP CONSTRAINT IF EXISTS jurnal_records_tikrar_bi_al_ghaib_40x_check;

      -- ADD NEW
      ALTER TABLE public.jurnal_records ADD CONSTRAINT jurnal_records_tikrar_bi_al_ghaib_type_check 
      CHECK (tikrar_bi_al_ghaib_type IS NULL OR tikrar_bi_al_ghaib_type = '' OR (tikrar_bi_al_ghaib_type IN (
          'pasangan_40', 'pasangan_40_wa', 'keluarga_40', 
          'keluarga_40_suami', 'keluarga_40_ayah', 'keluarga_40_ibu', 
          'keluarga_40_kakak', 'keluarga_40_adik', 'keluarga_40_saudara',
          'keluarga_40_anak', 'keluarga_40_teman', 'tarteel_40',
          'pasangan_20', 'pasangan_20_wa', 'voice_note_20'
      )));

      ALTER TABLE public.jurnal_records ADD CONSTRAINT jurnal_records_tikrar_bi_al_ghaib_40x_check
      CHECK (tikrar_bi_al_ghaib_40x IS NULL OR array_length(tikrar_bi_al_ghaib_40x, 1) = 0 OR
      tikrar_bi_al_ghaib_40x <@ ARRAY[
          'pasangan_40', 'pasangan_40_wa', 'keluarga_40', 
          'keluarga_40_suami', 'keluarga_40_ayah', 'keluarga_40_ibu', 
          'keluarga_40_kakak', 'keluarga_40_adik', 'keluarga_40_saudara',
          'keluarga_40_anak', 'keluarga_40_teman', 'tarteel_40'
      ]::TEXT[]);

      -- VERIFY
      SELECT conname FROM pg_constraint WHERE conrelid = 'jurnal_records'::regclass AND conname LIKE 'tikrar%';
    `;

    const res = await client.query(sql);
    console.log('SQL executed successfully');
    console.log('Constraints updated:', res);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
