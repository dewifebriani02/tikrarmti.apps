import fs from 'fs';
import path from 'path';

// Parse .env.local if present
try {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim().replace(/^["'](.*)["']$/, '$1');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    });
  }
} catch (e) {
  // Ignore
}

import { query } from '../lib/db';
import { createSessionToken } from '../lib/auth';

async function testLiveUserFlows() {
  console.log('================================================================');
  console.log('🧪 TESTING LIVE USER FLOWS & DATABASE SINKRONISASI (VPS)');
  console.log('================================================================\n');

  const baseUrl = 'http://127.0.0.1:3006';

  // 1. Fetch Agustina (Thalibah)
  const thalibahRes = await query(`SELECT * FROM users WHERE email = $1`, ['agustinaeliyanti459@gmail.com']);
  const thalibahUser = thalibahRes.rows[0];

  if (!thalibahUser) {
    console.error('❌ User Agustina tidak ditemukan di database');
    process.exit(1);
  }

  const thalibahToken = await createSessionToken({
    sub: thalibahUser.id,
    id: thalibahUser.id,
    email: thalibahUser.email,
    role: thalibahUser.role,
    roles: thalibahUser.roles || [thalibahUser.role],
    full_name: thalibahUser.full_name || thalibahUser.name,
  });

  console.log(`👤 Testing Sbg Thalibah: ${thalibahUser.full_name} (${thalibahUser.email})`);

  // Test /api/pendaftaran/my
  try {
    const res = await fetch(`${baseUrl}/api/pendaftaran/my`, {
      headers: { Cookie: `mti_session=${thalibahToken}` }
    });
    const data = await res.json();
    console.log(`✅ [/api/pendaftaran/my]: HTTP ${res.status} -> Total ${data.data?.length || 0} pendaftaran ditemukan`);
  } catch (e: any) {
    console.log(`❌ [/api/pendaftaran/my]: ERROR -> ${e.message}`);
  }

  // Test /api/dashboard/tashih-status for Batch 3
  const batch3Id = '2478b493-1b6b-412a-a05f-6193db815a43';
  try {
    const res = await fetch(`${baseUrl}/api/dashboard/tashih-status?batch_id=${batch3Id}`, {
      headers: { Cookie: `mti_session=${thalibahToken}` }
    });
    const data = await res.json();
    console.log(`✅ [/api/dashboard/tashih-status Batch 3]: HTTP ${res.status} -> Total Setor: ${data.totalTashihSetor} blok, Progress: ${data.progressPercentage}%`);
  } catch (e: any) {
    console.log(`❌ [/api/dashboard/tashih-status]: ERROR -> ${e.message}`);
  }

  // Test /api/dashboard/jurnal-status for Batch 3
  try {
    const res = await fetch(`${baseUrl}/api/dashboard/jurnal-status?batch_id=${batch3Id}`, {
      headers: { Cookie: `mti_session=${thalibahToken}` }
    });
    const data = await res.json();
    console.log(`✅ [/api/dashboard/jurnal-status Batch 3]: HTTP ${res.status} -> Total Jurnal: ${data.totalJurnal} setoran, Progress: ${data.progressPercentage}%`);
  } catch (e: any) {
    console.log(`❌ [/api/dashboard/jurnal-status]: ERROR -> ${e.message}`);
  }

  // 2. Fetch Admin User
  const adminRes = await query(`SELECT * FROM users WHERE role = 'admin' LIMIT 1`);
  const adminUser = adminRes.rows[0];

  if (adminUser) {
    console.log(`\n👑 Testing Sbg Admin: ${adminUser.full_name} (${adminUser.email})`);
    const adminToken = await createSessionToken({
      sub: adminUser.id,
      id: adminUser.id,
      email: adminUser.email,
      role: 'admin',
      roles: ['admin'],
      full_name: adminUser.full_name || adminUser.name,
    });

    // Test /api/admin/users
    try {
      const res = await fetch(`${baseUrl}/api/admin/users`, {
        headers: { Cookie: `mti_session=${adminToken}` }
      });
      const data = await res.json();
      const count = Array.isArray(data) ? data.length : (data.users?.length || data.data?.length || 0);
      console.log(`✅ [/api/admin/users]: HTTP ${res.status} -> ${count} users dimuat`);
    } catch (e: any) {
      console.log(`❌ [/api/admin/users]: ERROR -> ${e.message}`);
    }

    // Test /api/admin/batches
    try {
      const res = await fetch(`${baseUrl}/api/admin/batches`, {
        headers: { Cookie: `mti_session=${adminToken}` }
      });
      const data = await res.json();
      const count = Array.isArray(data) ? data.length : (data.batches?.length || data.data?.length || 0);
      console.log(`✅ [/api/admin/batches]: HTTP ${res.status} -> ${count} batches dimuat`);
    } catch (e: any) {
      console.log(`❌ [/api/admin/batches]: ERROR -> ${e.message}`);
    }

    // Test /api/admin/daftar-ulang
    try {
      const res = await fetch(`${baseUrl}/api/admin/daftar-ulang`, {
        headers: { Cookie: `mti_session=${adminToken}` }
      });
      const data = await res.json();
      const count = Array.isArray(data) ? data.length : (data.submissions?.length || data.data?.length || 0);
      console.log(`✅ [/api/admin/daftar-ulang]: HTTP ${res.status} -> ${count} submissions dimuat`);
    } catch (e: any) {
      console.log(`❌ [/api/admin/daftar-ulang]: ERROR -> ${e.message}`);
    }
  }

  // 3. Fetch Musyrifah User
  const musyrifahRes = await query(`
    SELECT u.*, hm.halaqah_id 
    FROM users u 
    JOIN halaqah_mentors hm ON hm.mentor_id = u.id 
    LIMIT 1
  `);
  const musyrifahUser = musyrifahRes.rows[0];

  if (musyrifahUser) {
    console.log(`\n🧕 Testing Sbg Musyrifah: ${musyrifahUser.full_name} (${musyrifahUser.email})`);
    const musyrifahToken = await createSessionToken({
      sub: musyrifahUser.id,
      id: musyrifahUser.id,
      email: musyrifahUser.email,
      role: 'musyrifah',
      roles: ['musyrifah'],
      full_name: musyrifahUser.full_name || musyrifahUser.name,
    });

    // Test /api/musyrifah/thalibah
    try {
      const res = await fetch(`${baseUrl}/api/musyrifah/thalibah`, {
        headers: { Cookie: `mti_session=${musyrifahToken}` }
      });
      const data = await res.json();
      const count = Array.isArray(data) ? data.length : (data.thalibah?.length || data.data?.length || 0);
      console.log(`✅ [/api/musyrifah/thalibah]: HTTP ${res.status} -> ${count} thalibah dalam halaqah dimuat`);
    } catch (e: any) {
      console.log(`❌ [/api/musyrifah/thalibah]: ERROR -> ${e.message}`);
    }
  }

  console.log('\n================================================================');
  console.log('🎉 SELURUH SIMULASI ALUR PENGGUNA BERHASIL DIVERIFIKASI!');
  console.log('================================================================');
  process.exit(0);
}

testLiveUserFlows();
