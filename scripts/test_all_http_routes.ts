async function testRoutes() {
  const baseUrl = 'http://127.0.0.1:3006';

  const routesToTest = [
    // Public & Auth Pages
    { path: '/', expected: [200, 307] },
    { path: '/login', expected: [200] },
    { path: '/register', expected: [200] },
    { path: '/lupa-password', expected: [200] },
    { path: '/syarat-ketentuan', expected: [200] },
    
    // Thalibah Core Pages (Protected redirects or renders)
    { path: '/dashboard', expected: [200, 307, 308] },
    { path: '/jurnal-harian', expected: [200, 307, 308] },
    { path: '/tashih', expected: [200, 307, 308] },
    { path: '/jadwal-harian', expected: [200, 307, 308] },
    { path: '/perjalanan-saya', expected: [200, 307, 308] },
    { path: '/pendaftaran', expected: [200, 307, 308] },
    { path: '/pendaftaran/tikrar-tahfidz', expected: [200, 307, 308] },
    { path: '/pendaftaran/pra-tikrar', expected: [200, 307, 308] },
    { path: '/daftar-ulang', expected: [200, 307, 308] },
    { path: '/exam', expected: [200, 307, 308] },
    { path: '/ujian', expected: [200, 307, 308] },
    { path: '/kelulusan-sertifikat', expected: [200, 307, 308] },
    { path: '/pilih-pasangan', expected: [200, 307, 308] },
    { path: '/infaq-donasi', expected: [200, 307, 308] },
    { path: '/profile', expected: [200, 307, 308] },
    { path: '/pengaturan', expected: [200, 307, 308] },

    // Musyrifah Core Pages
    { path: '/presensi-jurnal', expected: [200, 307, 308] },
    { path: '/pendaftaran/musyrifah', expected: [200, 307, 308] },
    { path: '/pendaftaran/muallimah', expected: [200, 307, 308] },

    // Admin Core Subpages & Tabs
    { path: '/admin', expected: [200, 307, 308] },
    { path: '/admin/batch-program', expected: [200, 307, 308] },
    { path: '/admin/daftar-ulang', expected: [200, 307, 308] },
    { path: '/admin/halaqah', expected: [200, 307, 308] },
    { path: '/admin/users', expected: [200, 307, 308] },
    { path: '/admin/tikrar', expected: [200, 307, 308] },
    { path: '/admin/muallimah', expected: [200, 307, 308] },
    { path: '/admin/exams', expected: [200, 307, 308] },
    { path: '/admin/donations', expected: [200, 307, 308] },
    { path: '/admin/testimonials', expected: [200, 307, 308] },
    { path: '/admin/jadwal-harian', expected: [200, 307, 308] },
    { path: '/admin/mutasi-jadwal', expected: [200, 307, 308] },
    { path: '/admin/partner', expected: [200, 307, 308] },
    { path: '/admin/pengaturan', expected: [200, 307, 308] },

    // Public & System APIs
    { path: '/api/health', expected: [200] },
    { path: '/api/public/faqs', expected: [200] },
    { path: '/api/batches', expected: [200] },
    { path: '/api/programs', expected: [200] },
    { path: '/api/juz', expected: [200] },
  ];

  console.log('====================================================');
  console.log('🌐 TESTING ALL HTTP ENDPOINTS & ROUTE HEALTH (VPS)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  for (const item of routesToTest) {
    try {
      const res = await fetch(`${baseUrl}${item.path}`, {
        method: 'GET',
        redirect: 'manual',
      });

      const isOk = item.expected.includes(res.status);
      if (isOk) {
        passed++;
        console.log(`✅ [${res.status}] ${item.path}`);
      } else {
        failed++;
        console.log(`❌ [${res.status}] ${item.path} (Expected: ${item.expected.join(', ')})`);
      }
    } catch (e: any) {
      failed++;
      console.log(`❌ [ERROR] ${item.path} -> ${e.message}`);
    }
  }

  console.log(`\nRingkasan: ${passed} PASS, ${failed} FAIL dari total ${routesToTest.length} rute.`);
}

testRoutes();
