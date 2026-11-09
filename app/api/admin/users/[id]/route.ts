import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/rbac';
import { query, queryOne, transaction } from '@/lib/db';

const supabaseAdmin = createSupabaseAdmin();

interface LegacyCheckResult {
  hasLegacy: boolean;
  totalLegacyCount: number;
  items: Array<{ label: string; count: number }>;
}

async function getLegacyCheck(userId: string): Promise<LegacyCheckResult> {
  const legacySql = `
    SELECT 
      (SELECT COUNT(*) FROM pendaftaran_tikrar_tahfidz WHERE user_id = $1) as count_pendaftaran,
      (SELECT COUNT(*) FROM daftar_ulang_submissions WHERE user_id = $1 OR partner_user_id = $1) as count_daftar_ulang,
      (SELECT COUNT(*) FROM jurnal_records WHERE user_id = $1) as count_jurnal,
      (SELECT COUNT(*) FROM daily_journals WHERE user_id = $1) as count_daily_journals,
      (SELECT COUNT(*) FROM jurnal_pra_tikrar WHERE user_id = $1 OR muallimah_id = $1 OR musyrifah_id = $1) as count_jurnal_pra,
      (SELECT COUNT(*) FROM halaqah WHERE muallimah_id = $1) as count_halaqah_guru,
      (SELECT COUNT(*) FROM halaqah_students WHERE thalibah_id = $1) as count_halaqah_santri,
      (SELECT COUNT(*) FROM exam_attempts WHERE user_id = $1) as count_exam,
      (SELECT COUNT(*) FROM final_exam_registrations WHERE user_id = $1) as count_final_exam,
      (SELECT COUNT(*) FROM akad_quiz_attempts WHERE user_id = $1) as count_akad_quiz,
      (SELECT COUNT(*) FROM certificates WHERE user_id = $1) as count_certificates,
      (SELECT COUNT(*) FROM tashih_records WHERE user_id = $1) as count_tashih,
      (SELECT COUNT(*) FROM donations WHERE user_id = $1) as count_donations,
      (SELECT COUNT(*) FROM study_partners WHERE user_1_id = $1 OR user_2_id = $1) as count_partners,
      (SELECT COUNT(*) FROM muallimah_registrations WHERE user_id = $1) as count_muallimah_reg,
      (SELECT COUNT(*) FROM musyrifah_registrations WHERE user_id = $1) as count_musyrifah_reg,
      (SELECT COUNT(*) FROM muallimah_akads WHERE user_id = $1) as count_muallimah_akads,
      (SELECT COUNT(*) FROM muallimah_paid_classes WHERE muallimah_id = $1) as count_paid_classes,
      (SELECT COUNT(*) FROM murojaah_40x_logs WHERE user_id = $1) as count_murojaah,
      (SELECT COUNT(*) FROM surat_peringatan WHERE thalibah_id = $1) as count_sp,
      (SELECT COUNT(*) FROM user_badges WHERE user_id = $1) as count_badges,
      (SELECT COUNT(*) FROM testimonials WHERE user_id = $1) as count_testimonials
  `;

  const counts = await queryOne(legacySql, [userId]);
  if (!counts) {
    return { hasLegacy: false, totalLegacyCount: 0, items: [] };
  }

  const items: Array<{ label: string; count: number }> = [];
  const mapCheck: Array<{ key: string; label: string }> = [
    { key: 'count_pendaftaran', label: 'Pendaftaran Tikrar Tahfidz' },
    { key: 'count_daftar_ulang', label: 'Daftar Ulang & Pasangan Belajar' },
    { key: 'count_jurnal', label: 'Laporan Jurnal Tikrar' },
    { key: 'count_daily_journals', label: 'Jurnal Harian Legacy' },
    { key: 'count_jurnal_pra', label: 'Jurnal Pra-Tikrar' },
    { key: 'count_halaqah_guru', label: 'Penugasan Pengajar (Muallimah)' },
    { key: 'count_halaqah_santri', label: 'Peserta Halaqah (Santri)' },
    { key: 'count_exam', label: 'Riwayat Kuis / Ujian Harian' },
    { key: 'count_final_exam', label: 'Ujian Akhir (Ikhtibar)' },
    { key: 'count_akad_quiz', label: 'Kuis Akad & Komitmen' },
    { key: 'count_certificates', label: 'Sertifikat Kelulusan' },
    { key: 'count_tashih', label: 'Catatan Tashih Bacaan' },
    { key: 'count_donations', label: 'Riwayat Infaq / Donasi' },
    { key: 'count_partners', label: 'Data Study Partner' },
    { key: 'count_muallimah_reg', label: 'Pendaftaran Muallimah' },
    { key: 'count_musyrifah_reg', label: 'Pendaftaran Musyrifah' },
    { key: 'count_muallimah_akads', label: 'Akad Muallimah' },
    { key: 'count_paid_classes', label: 'Kelas Berbayar' },
    { key: 'count_murojaah', label: 'Aktivitas Murojaah 40x' },
    { key: 'count_sp', label: 'Surat Peringatan (SP)' },
    { key: 'count_badges', label: 'Badge Penghargaan' },
    { key: 'count_testimonials', label: 'Testimoni Santri' },
  ];

  let total = 0;
  for (const entry of mapCheck) {
    const val = parseInt(counts[entry.key] || '0', 10);
    if (val > 0) {
      items.push({ label: entry.label, count: val });
      total += val;
    }
  }

  return {
    hasLegacy: items.length > 0,
    totalLegacyCount: total,
    items,
  };
}

/**
 * GET /api/admin/users/[id]
 * Mengambil detail status akun dan memeriksa keberadaan data legacy (riwayat transaksi/akademik)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const userId = params.id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await queryOne(
      `SELECT id, full_name, email, role, roles, whatsapp, student_id_number, is_active, is_blacklisted, created_at, avatar_url
       FROM users WHERE id = $1`,
      [userId]
    );

    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    const legacy = await getLegacyCheck(userId);
    const userRoles = Array.isArray(user.roles) ? user.roles : [];
    const isAdminUser =
      user.role === 'admin' ||
      user.role === 'super_admin' ||
      userRoles.includes('admin') ||
      userRoles.includes('super_admin');

    const canDeletePermanently = !isAdminUser && !legacy.hasLegacy;

    return NextResponse.json({
      success: true,
      user,
      isAdminUser,
      hasLegacy: legacy.hasLegacy,
      totalLegacyCount: legacy.totalLegacyCount,
      legacyItems: legacy.items,
      canDeletePermanently,
    });
  } catch (error: any) {
    console.error('[Admin Users Detail/Legacy API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Hapus permanen hanya untuk akun yang belum memiliki legacy data.
 * Akun yang telah memiliki riwayat data (legacy) ditolak untuk dihapus permanen demi integritas sistem.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const userId = params.id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 1. Ambil data user
    const targetUser = await queryOne(
      `SELECT id, full_name, email, role, roles FROM users WHERE id = $1`,
      [userId]
    );

    if (!targetUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    // 2. Proteksi akun Admin / Super Admin
    const userRoles = Array.isArray(targetUser.roles) ? targetUser.roles : [];
    const isAdmin =
      targetUser.role === 'admin' ||
      targetUser.role === 'super_admin' ||
      userRoles.includes('admin') ||
      userRoles.includes('super_admin');

    if (isAdmin) {
      return NextResponse.json(
        {
          error: 'Akun dengan hak akses Admin / SuperAdmin dilindungi dan tidak dapat dihapus.',
          protected: true,
        },
        { status: 403 }
      );
    }

    // 3. Validasi Keberadaan Data Legacy
    const legacy = await getLegacyCheck(userId);

    if (legacy.hasLegacy) {
      return NextResponse.json(
        {
          error:
            'Akun ini memiliki riwayat data aktif (legacy) dan tidak diizinkan untuk dihapus secara permanen demi integritas data.',
          hasLegacy: true,
          totalLegacyCount: legacy.totalLegacyCount,
          legacyItems: legacy.items,
          message:
            'Akun yang sudah memiliki riwayat pendaftaran, jurnal, atau halaqah tidak dapat dihapus permanen. Gunakan fitur Nonaktifkan / Blacklist untuk membatasi akses.',
        },
        { status: 400 }
      );
    }

    // 4. Eksekusi Penghapusan Permanen (Akun Bersih Tanpa Legacy)
    await transaction(async (client) => {
      // Bersihkan log transien terkait user ini agar tidak terganjal referensi
      await client.query('DELETE FROM activity_logs WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM audit_logs WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM error_logs WHERE resolved_by = $1', [userId]);
      await client.query('DELETE FROM system_logs WHERE user_id = $1', [userId]);
      await client.query(
        'DELETE FROM blacklist_audit_logs WHERE user_id = $1 OR target_user_id = $1 OR created_by = $1',
        [userId]
      );

      // Hapus data pengguna dari tabel users
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
    });

    // 5. Hapus akun dari Supabase Auth jika ada
    try {
      if ((supabaseAdmin as any)?.auth?.admin?.deleteUser) {
        await (supabaseAdmin as any).auth.admin.deleteUser(userId);
      }
    } catch (authErr) {
      console.warn('[Admin Delete User] Supabase Auth cleanup warning (ignored):', authErr);
    }

    return NextResponse.json({
      success: true,
      message: `Akun ${targetUser.full_name || targetUser.email} berhasil dihapus secara permanen.`,
      permanentDelete: true,
    });
  } catch (error: any) {
    console.error('[Admin Delete User API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error saat menghapus akun' },
      { status: 500 }
    );
  }
}
