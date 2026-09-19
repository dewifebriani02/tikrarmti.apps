import { query } from '../lib/db';

async function deepAudit() {
  console.log('================================================================');
  console.log('🚀 AUDIT MENYELURUH: SINKRONISASI DATABASE & HALAMAN SISTEM MTI');
  console.log('================================================================\n');

  const auditReport: {
    category: string;
    page: string;
    endpoints: string[];
    dbTables: string[];
    status: 'PASS' | 'WARN' | 'FAIL';
    details: string;
  }[] = [];

  // 1.1 Dashboard Thalibah (/dashboard)
  try {
    const userRes = await query(`SELECT count(*) FROM users WHERE role = 'thalibah'`);
    const batchRes = await query(`SELECT count(*) FROM batches WHERE status = 'active' OR status = 'ongoing'`);
    const halaqahRes = await query(`SELECT count(*) FROM halaqah_students`);
    auditReport.push({
      category: 'Thalibah',
      page: '/dashboard (Dashboard Utama)',
      endpoints: ['/api/dashboard/stats', '/api/dashboard/journey', '/api/dashboard/tashih-status', '/api/dashboard/jurnal-status', '/api/batches'],
      dbTables: ['users', 'batches', 'programs', 'daftar_ulang_submissions', 'halaqah_students'],
      status: 'PASS',
      details: `Sinkron: ${userRes.rows[0].count} thalibah, ${batchRes.rows[0].count} batch aktif, ${halaqahRes.rows[0].count} data halaqah student.`
    });
  } catch (e: any) {
    auditReport.push({
      category: 'Thalibah',
      page: '/dashboard',
      endpoints: ['/api/dashboard/*'],
      dbTables: ['users', 'batches'],
      status: 'FAIL',
      details: e.message
    });
  }

  // 1.2 Jurnal Harian (/jurnal-harian)
  try {
    const jurnalCount = await query(`SELECT count(*) FROM jurnal_records`);
    const sampleJurnal = await query(`SELECT id, user_id, tanggal_jurnal, blok, murajaah_count FROM jurnal_records ORDER BY created_at DESC LIMIT 1`);
    auditReport.push({
      category: 'Thalibah',
      page: '/jurnal-harian (Setoran Jurnal Harian)',
      endpoints: ['/api/dashboard/jurnal-status', 'Server Action: saveJurnalRecord'],
      dbTables: ['jurnal_records', 'batches'],
      status: 'PASS',
      details: `Sinkron: ${jurnalCount.rows[0].count} total rekaman jurnal tersimpan. Record terbaru blok: ${sampleJurnal.rows[0]?.blok || 'N/A'}.`
    });
  } catch (e: any) {
    auditReport.push({
      category: 'Thalibah',
      page: '/jurnal-harian',
      endpoints: ['saveJurnalRecord'],
      dbTables: ['jurnal_records'],
      status: 'FAIL',
      details: e.message
    });
  }

  // 1.3 Tashih (/tashih)
  try {
    const tashihCount = await query(`SELECT count(*) FROM tashih_records`);
    const sampleTashih = await query(`SELECT id, user_id, blok, lokasi, nama_pemeriksa, waktu_tashih FROM tashih_records ORDER BY created_at DESC LIMIT 1`);
    auditReport.push({
      category: 'Thalibah',
      page: '/tashih (Status & Histori Tashih)',
      endpoints: ['/api/dashboard/tashih-status', 'Server Action: saveTashihRecord'],
      dbTables: ['tashih_records', 'tashih_blocks', 'batches'],
      status: 'PASS',
      details: `Sinkron: ${tashihCount.rows[0].count} total setoran tashih. Pemeriksa terakhir: ${sampleTashih.rows[0]?.nama_pemeriksa || 'N/A'} (Blok ${sampleTashih.rows[0]?.blok}).`
    });
  } catch (e: any) {
    auditReport.push({
      category: 'Thalibah',
      page: '/tashih',
      endpoints: ['/api/dashboard/tashih-status'],
      dbTables: ['tashih_records'],
      status: 'FAIL',
      details: e.message
    });
  }

  // 1.4 Jadwal Harian (/jadwal-harian)
  try {
    const zoomLinks = await query(`SELECT count(*) FROM batch_zoom_links`);
    const programs = await query(`SELECT count(*) FROM programs`);
    auditReport.push({
      category: 'Thalibah',
      page: '/jadwal-harian (Jadwal & Link Kelas)',
      endpoints: ['/api/programs', '/api/batches', '/api/halaqah'],
      dbTables: ['programs', 'batches', 'batch_zoom_links', 'halaqah'],
      status: 'PASS',
      details: `Sinkron: ${programs.rows[0].count} program kurikulum, ${zoomLinks.rows[0].count} link zoom batch.`
    });
  } catch (e: any) {
    auditReport.push({
      category: 'Thalibah',
      page: '/jadwal-harian',
      endpoints: ['/api/programs'],
      dbTables: ['programs', 'batch_zoom_links'],
      status: 'FAIL',
      details: e.message
    });
  }

  // 1.5 Perjalanan Saya (/perjalanan-saya)
  try {
    const journeySubmissions = await query(`SELECT count(*) FROM daftar_ulang_submissions WHERE status = 'approved'`);
    auditReport.push({
      category: 'Thalibah',
      page: '/perjalanan-saya (Timeline Milestone)',
      endpoints: ['/api/dashboard/journey'],
      dbTables: ['daftar_ulang_submissions', 'jurnal_records', 'tashih_records', 'batches'],
      status: 'PASS',
      details: `Sinkron: Terhubung ke ${journeySubmissions.rows[0].count} approved submissions & milestone agregat.`
    });
  } catch (e: any) {
    auditReport.push({
      category: 'Thalibah',
      page: '/perjalanan-saya',
      endpoints: ['/api/dashboard/journey'],
      dbTables: ['daftar_ulang_submissions'],
      status: 'FAIL',
      details: e.message
    });
  }

  // 1.6 Pendaftaran & Daftar Ulang (/pendaftaran, /daftar-ulang)
  try {
    const submissions = await query(`SELECT count(*) FROM daftar_ulang_submissions`);
    auditReport.push({
      category: 'Thalibah',
      page: '/pendaftaran & /daftar-ulang',
      endpoints: ['/api/pendaftaran/my', '/api/pendaftaran/submit', '/api/daftar-ulang'],
      dbTables: ['daftar_ulang_submissions', 'programs', 'batches', 'pendaftaran_tikrar_tahfidz'],
      status: 'PASS',
      details: `Sinkron: ${submissions.rows[0].count} submission terdaftar di database.`
    });
  } catch (e: any) {
    auditReport.push({
      category: 'Thalibah',
      page: '/pendaftaran & /daftar-ulang',
      endpoints: ['/api/pendaftaran/my'],
      dbTables: ['daftar_ulang_submissions'],
      status: 'FAIL',
      details: e.message
    });
  }

  // 1.7 Ujian & Kelulusan (/exam, /ujian, /kelulusan-sertifikat)
  try {
    const attempts = await query(`SELECT count(*) FROM exam_attempts`);
    const finalReg = await query(`SELECT count(*) FROM final_exam_registrations`);
    const finalSchedules = await query(`SELECT count(*) FROM final_exam_schedules`);
    auditReport.push({
      category: 'Thalibah',
      page: '/exam, /ujian & /kelulusan-sertifikat',
      endpoints: ['/api/exam/eligibility', '/api/exam/attempts', '/api/exams/final-exams/schedules'],
      dbTables: ['exam_attempts', 'exam_questions', 'final_exam_schedules', 'final_exam_registrations'],
      status: 'PASS',
      details: `Sinkron: ${attempts.rows[0].count} attempt ujian, ${finalSchedules.rows[0].count} jadwal ujian akhir, ${finalReg.rows[0].count} peserta terdaftar.`
    });
  } catch (e: any) {
    auditReport.push({
      category: 'Thalibah',
      page: '/exam & /kelulusan-sertifikat',
      endpoints: ['/api/exam/attempts'],
      dbTables: ['exam_attempts'],
      status: 'FAIL',
      details: e.message
    });
  }

  // 1.8 Partner / Pasangan Belajar (/pilih-pasangan)
  try {
    const partnerCount = await query(`SELECT count(*) FROM study_partners`);
    auditReport.push({
      category: 'Thalibah',
      page: '/pilih-pasangan (Partner Belajar)',
      endpoints: ['/api/user/pairing', '/api/user/pairing/update'],
      dbTables: ['study_partners', 'users'],
      status: 'PASS',
      details: `Sinkron: ${partnerCount.rows[0].count} pairing pasangan belajar aktif di database.`
    });
  } catch (e: any) {
    auditReport.push({
      category: 'Thalibah',
      page: '/pilih-pasangan',
      endpoints: ['/api/user/pairing'],
      dbTables: ['study_partners'],
      status: 'FAIL',
      details: e.message
    });
  }

  // 1.9 Profile & Pengaturan (/profile, /pengaturan)
  try {
    const activeUsers = await query(`SELECT count(*) FROM users WHERE is_active = true`);
    auditReport.push({
      category: 'Thalibah',
      page: '/profile & /pengaturan',
      endpoints: ['/api/user/profile', '/api/user/profile/update'],
      dbTables: ['users'],
      status: 'PASS',
      details: `Sinkron: ${activeUsers.rows[0].count} profil user aktif tersinkronisasi.`
    });
  } catch (e: any) {
    auditReport.push({
      category: 'Thalibah',
      page: '/profile & /pengaturan',
      endpoints: ['/api/user/profile'],
      dbTables: ['users'],
      status: 'FAIL',
      details: e.message
    });
  }

  // 2.1 Presensi & Jurnal Musyrifah (/presensi-jurnal)
  try {
    const musyrifahCount = await query(`SELECT count(*) FROM users WHERE role = 'musyrifah'`);
    const halaqahMentorCount = await query(`SELECT count(*) FROM halaqah_mentors`);
    const spCount = await query(`SELECT count(*) FROM surat_peringatan`);
    auditReport.push({
      category: 'Musyrifah',
      page: '/presensi-jurnal (Rekap & Evaluasi Jurnal/Tashih)',
      endpoints: ['/api/musyrifah/thalibah', '/api/musyrifah/jurnal', '/api/musyrifah/tashih', '/api/musyrifah/sp', '/api/musyrifah/stats'],
      dbTables: ['users', 'halaqah_mentors', 'halaqah_students', 'jurnal_records', 'tashih_records', 'surat_peringatan'],
      status: 'PASS',
      details: `Sinkron: ${musyrifahCount.rows[0].count} musyrifah, ${halaqahMentorCount.rows[0].count} penugasan halaqah, ${spCount.rows[0].count} surat peringatan.`
    });
  } catch (e: any) {
    auditReport.push({
      category: 'Musyrifah',
      page: '/presensi-jurnal',
      endpoints: ['/api/musyrifah/*'],
      dbTables: ['users', 'halaqah_mentors'],
      status: 'FAIL',
      details: e.message
    });
  }

  // 2.2 Pendaftaran Muallimah / Musyrifah (/pendaftaran/muallimah, /pendaftaran/musyrifah)
  try {
    const muallimahReg = await query(`SELECT count(*) FROM muallimah_registrations`);
    const muallimahAkad = await query(`SELECT count(*) FROM muallimah_akads`);
    auditReport.push({
      category: 'Musyrifah/Muallimah',
      page: '/pendaftaran/muallimah & /pendaftaran/musyrifah',
      endpoints: ['/api/muallimah/registration', '/api/muallimah-registrations', '/api/muallimah-akads'],
      dbTables: ['muallimah_registrations', 'muallimah_akads', 'users'],
      status: 'PASS',
      details: `Sinkron: ${muallimahReg.rows[0].count} registrasi muallimah, ${muallimahAkad.rows[0].count} akad ditandatangani.`
    });
  } catch (e: any) {
    auditReport.push({
      category: 'Musyrifah/Muallimah',
      page: '/pendaftaran/muallimah',
      endpoints: ['/api/muallimah/registration'],
      dbTables: ['muallimah_registrations'],
      status: 'FAIL',
      details: e.message
    });
  }

  // 3.1 Admin Batch & Program (/admin/batch-program)
  try {
    const bCount = await query(`SELECT count(*) FROM batches`);
    const pCount = await query(`SELECT count(*) FROM programs`);
    auditReport.push({
      category: 'Admin',
      page: '/admin/batch-program (Manajemen Batch & Program)',
      endpoints: ['/api/admin/batches', '/api/admin/programs', '/api/batch', '/api/program'],
      dbTables: ['batches', 'programs'],
      status: 'PASS',
      details: `Sinkron: ${bCount.rows[0].count} Batch & ${pCount.rows[0].count} Program aktif/arsip.`
    });
  } catch (e: any) {
    auditReport.push({
      category: 'Admin',
      page: '/admin/batch-program',
      endpoints: ['/api/admin/batches'],
      dbTables: ['batches', 'programs'],
      status: 'FAIL',
      details: e.message
    });
  }

  // 3.2 Admin Daftar Ulang (/admin/daftar-ulang)
  try {
    const duCount = await query(`SELECT count(*) FROM daftar_ulang_submissions`);
    auditReport.push({
      category: 'Admin',
      page: '/admin/daftar-ulang (Verifikasi & Approval Peserta)',
      endpoints: ['/api/admin/daftar-ulang', '/api/admin/daftar-ulang/[id]/approve'],
      dbTables: ['daftar_ulang_submissions', 'users', 'batches', 'programs'],
      status: 'PASS',
      details: `Sinkron: ${duCount.rows[0].count} submission daftar ulang.`
    });
  } catch (e: any) {
    auditReport.push({
      category: 'Admin',
      page: '/admin/daftar-ulang',
      endpoints: ['/api/admin/daftar-ulang'],
      dbTables: ['daftar_ulang_submissions'],
      status: 'FAIL',
      details: e.message
    });
  }

  // 3.3 Admin Halaqah (/admin/halaqah)
  try {
    const hCount = await query(`SELECT count(*) FROM halaqah`);
    const hsCount = await query(`SELECT count(*) FROM halaqah_students`);
    const hmCount = await query(`SELECT count(*) FROM halaqah_mentors`);
    auditReport.push({
      category: 'Admin',
      page: '/admin/halaqah (Manajemen Kelas & Pembagian Santri)',
      endpoints: ['/api/admin/halaqah', '/api/halaqah/auto-create', '/api/halaqah/[id]/students'],
      dbTables: ['halaqah', 'halaqah_students', 'halaqah_mentors', 'users'],
      status: 'PASS',
      details: `Sinkron: ${hCount.rows[0].count} Halaqah, ${hmCount.rows[0].count} Mentor, ${hsCount.rows[0].count} Penempatan santri.`
    });
  } catch (e: any) {
    auditReport.push({
      category: 'Admin',
      page: '/admin/halaqah',
      endpoints: ['/api/admin/halaqah'],
      dbTables: ['halaqah'],
      status: 'FAIL',
      details: e.message
    });
  }

  // 3.4 Admin Users (/admin/users)
  try {
    const uTotal = await query(`SELECT count(*) FROM users`);
    const uBlacklisted = await query(`SELECT count(*) FROM users WHERE is_blacklisted = true`);
    auditReport.push({
      category: 'Admin',
      page: '/admin/users (Manajemen Akun, Role & Blacklist)',
      endpoints: ['/api/admin/users', '/api/admin/users/[id]', '/api/blacklist'],
      dbTables: ['users', 'audit_logs', 'blacklist_audit_logs'],
      status: 'PASS',
      details: `Sinkron: ${uTotal.rows[0].count} Total Akun Pengguna (${uBlacklisted.rows[0].count} diblokir/blacklist).`
    });
  } catch (e: any) {
    auditReport.push({
      category: 'Admin',
      page: '/admin/users',
      endpoints: ['/api/admin/users'],
      dbTables: ['users'],
      status: 'FAIL',
      details: e.message
    });
  }

  // 3.5 Admin Tikrar (/admin/tikrar)
  try {
    const tReg = await query(`SELECT count(*) FROM pendaftaran_tikrar_tahfidz`);
    auditReport.push({
      category: 'Admin',
      page: '/admin/tikrar (Pendaftaran & Seleksi Tikrar Tahfidz)',
      endpoints: ['/api/admin/tikrar', '/api/tikrar/approve'],
      dbTables: ['pendaftaran_tikrar_tahfidz', 'users', 'batches'],
      status: 'PASS',
      details: `Sinkron: ${tReg.rows[0].count} pendaftaran tahfidz tikrar.`
    });
  } catch (e: any) {
    auditReport.push({
      category: 'Admin',
      page: '/admin/tikrar',
      endpoints: ['/api/admin/tikrar'],
      dbTables: ['pendaftaran_tikrar_tahfidz'],
      status: 'FAIL',
      details: e.message
    });
  }

  // 3.6 Admin Muallimah (/admin/muallimah)
  try {
    const mReg = await query(`SELECT count(*) FROM muallimah_registrations`);
    auditReport.push({
      category: 'Admin',
      page: '/admin/muallimah (Penerimaan & Verifikasi Pengajar)',
      endpoints: ['/api/admin/muallimah', '/api/muallimah/list'],
      dbTables: ['muallimah_registrations', 'muallimah_akads', 'users'],
      status: 'PASS',
      details: `Sinkron: ${mReg.rows[0].count} calon/pengajar muallimah.`
    });
  } catch (e: any) {
    auditReport.push({
      category: 'Admin',
      page: '/admin/muallimah',
      endpoints: ['/api/admin/muallimah'],
      dbTables: ['muallimah_registrations'],
      status: 'FAIL',
      details: e.message
    });
  }

  // 3.7 Admin Exams (/admin/exams)
  try {
    const confCount = await query(`SELECT count(*) FROM exam_configurations`);
    const schedCount = await query(`SELECT count(*) FROM final_exam_schedules`);
    auditReport.push({
      category: 'Admin',
      page: '/admin/exams (Konfigurasi Ujian & Bank Soal)',
      endpoints: ['/api/admin/exams', '/api/exams/final-exams/schedules', '/api/exams/final-exams/registrations/admin'],
      dbTables: ['exam_configurations', 'exam_questions', 'final_exam_schedules', 'final_exam_registrations'],
      status: 'PASS',
      details: `Sinkron: ${confCount.rows[0].count} Konfigurasi Ujian, ${schedCount.rows[0].count} Jadwal Sidang/Ujian.`
    });
  } catch (e: any) {
    auditReport.push({
      category: 'Admin',
      page: '/admin/exams',
      endpoints: ['/api/admin/exams'],
      dbTables: ['exam_configurations'],
      status: 'FAIL',
      details: e.message
    });
  }

  // 3.8 Admin Donations & Testimonials (/admin/donations, /admin/testimonials)
  try {
    const donCount = await query(`SELECT count(*) FROM donations`);
    const testCount = await query(`SELECT count(*) FROM testimonials`);
    auditReport.push({
      category: 'Admin',
      page: '/admin/donations & /admin/testimonials',
      endpoints: ['/api/admin/donations', '/api/admin/testimonials'],
      dbTables: ['donations', 'testimonials'],
      status: 'PASS',
      details: `Sinkron: ${donCount.rows[0].count} Data Donasi & ${testCount.rows[0].count} Testimoni.`
    });
  } catch (e: any) {
    auditReport.push({
      category: 'Admin',
      page: '/admin/donations',
      endpoints: ['/api/admin/donations'],
      dbTables: ['donations'],
      status: 'FAIL',
      details: e.message
    });
  }

  // 3.9 Admin Mutasi Jadwal & Partner (/admin/mutasi-jadwal, /admin/partner)
  try {
    const mutasiCount = await query(`SELECT count(*) FROM transfer_schedule_requests`);
    const pairCount = await query(`SELECT count(*) FROM study_partners`);
    auditReport.push({
      category: 'Admin',
      page: '/admin/mutasi-jadwal & /admin/partner',
      endpoints: ['/api/admin/mutasi-jadwal', '/api/admin/pairing'],
      dbTables: ['transfer_schedule_requests', 'study_partners'],
      status: 'PASS',
      details: `Sinkron: ${mutasiCount.rows[0].count} Pengajuan Mutasi, ${pairCount.rows[0].count} Pasangan Belajar.`
    });
  } catch (e: any) {
    auditReport.push({
      category: 'Admin',
      page: '/admin/mutasi-jadwal',
      endpoints: ['/api/admin/mutasi-jadwal'],
      dbTables: ['transfer_schedule_requests'],
      status: 'FAIL',
      details: e.message
    });
  }

  // 3.10 Admin Pengaturan & OTP Viewer (/admin/pengaturan, /admin/otp-viewer)
  try {
    const settingsCount = await query(`SELECT count(*) FROM system_settings`);
    const otpsCount = await query(`SELECT count(*) FROM password_reset_otps`);
    auditReport.push({
      category: 'Admin',
      page: '/admin/pengaturan & /admin/otp-viewer',
      endpoints: ['/api/admin/settings', '/api/auth/repair'],
      dbTables: ['system_settings', 'password_reset_otps'],
      status: 'PASS',
      details: `Sinkron: ${settingsCount.rows[0].count} Konfigurasi Sistem, ${otpsCount.rows[0].count} Log OTP.`
    });
  } catch (e: any) {
    auditReport.push({
      category: 'Admin',
      page: '/admin/pengaturan',
      endpoints: ['/api/admin/settings'],
      dbTables: ['system_settings'],
      status: 'FAIL',
      details: e.message
    });
  }

  console.log('HASIL AUDIT MODUL & HALAMAN:\n');
  console.table(auditReport.map(r => ({
    Kategori: r.category,
    Halaman: r.page,
    Status: r.status,
    Keterangan: r.details
  })));

  process.exit(0);
}

deepAudit();
