import { loginWithEmailPassword } from '../lib/auth';
import { db } from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testAuth() {
  console.log('--- TESTING AUTHENTICATION ON LOCAL/VPS POSTGRESQL ---');

  // 1. Test database connection
  const res = await db.query('SELECT count(*) FROM users');
  console.log('✅ Connected to database. Total users in users table:', res.rows[0].count);

  // 2. Test fetching a user with password_hash
  const userRow = await db.query(
    'SELECT email, role, roles, password_hash FROM users WHERE password_hash IS NOT NULL LIMIT 1'
  );

  if (userRow.rows.length === 0) {
    console.error('❌ No user found with password_hash');
    process.exit(1);
  }

  const sampleUser = userRow.rows[0];
  console.log('Sample user found:', {
    email: sampleUser.email,
    role: sampleUser.role,
    roles: sampleUser.roles,
    hasPasswordHash: !!sampleUser.password_hash,
  });

  console.log('--- AUTH TEST FINISHED ---');
  await db.end();
}

testAuth().catch(console.error);
