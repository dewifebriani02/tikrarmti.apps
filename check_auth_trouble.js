const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const names = ['Rina Supriati', 'Neliana', 'Dewi Sartika', 'Yuliant'];

async function main() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 500 });
  if (error) { console.error('Error:', error.message); return; }
  
  console.log('Total users in Supabase auth:', users.length);
  
  for (const name of names) {
    const found = users.filter(u => {
      const fullName = (u.raw_user_meta_data?.full_name || u.user_metadata?.full_name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const nameLower = name.toLowerCase();
      const firstWord = nameLower.split(' ')[0];
      return fullName.includes(firstWord) || email.includes(firstWord);
    });
    
    console.log('\n--- ' + name + ' ---');
    if (found.length === 0) {
      console.log('  TIDAK DITEMUKAN di Supabase Auth!');
    } else {
      found.forEach(u => {
        console.log('  ID:', u.id);
        console.log('  Email:', u.email);
        console.log('  Nama:', u.raw_user_meta_data?.full_name);
        console.log('  Email confirmed:', u.email_confirmed_at ? 'YES (' + u.email_confirmed_at + ')' : 'TIDAK');
        console.log('  Last sign in:', u.last_sign_in_at || 'BELUM PERNAH LOGIN');
        console.log('  Banned until:', u.banned_until || 'TIDAK DIBLOKIR');
        console.log('  Provider:', u.app_metadata?.provider || '-');
      });
    }
  }
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
