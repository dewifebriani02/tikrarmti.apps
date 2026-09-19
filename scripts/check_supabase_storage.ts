import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkBuckets() {
  console.log('Fetching storage buckets from Supabase...');
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Error listing buckets:', error);
    return;
  }

  console.log('Found buckets:', buckets?.map(b => b.name));

  for (const b of (buckets || [])) {
    console.log(`\n--- BUCKET: ${b.name} ---`);
    const { data: files, error: fError } = await supabase.storage.from(b.name).list('', { limit: 100 });
    if (fError) {
      console.error(`Error listing files in ${b.name}:`, fError);
    } else {
      console.log(`Files/folders count in root of ${b.name}:`, files?.length);
      console.log('Sample items:', files?.slice(0, 5).map(f => f.name));
    }
  }
}

checkBuckets();
