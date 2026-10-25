/**
 * ROLE HIERARCHY & UTILITIES - MARKAZ TIKRAR INDONESIA (MTI)
 *
 * Definisi kanonikal hak akses dan peran (Roles & Persona) MTI:
 *
 * 1. Manajemen Global / Sistem:
 *    - super_admin (100): Akses penuh sistem, database, dan konfigurasi kritis
 *    - admin (100): Pengelola operasional, keuangan, batch, dan pengguna
 *
 * 2. Manajemen Lapangan Multi-Halaqah:
 *    - musyrifah (80): Admin Lapangan / Pengawas Multi-Kelas.
 *      Mengontrol laporan kedisiplinan banyak halaqah, rekap kehadiran, dan penerbitan SP.
 *
 * 3. Edukasi / Pengajaran:
 *    - muallimah (60): Pengajar yang mengampu halaqah, membimbing tashih, dan menguji hafalan.
 *
 * 4. Koordinasi Kelas / Halaqah Spesifik:
 *    - roisah / raisah (45): Santri senior / Ketua Kelas di satu halaqah spesifik.
 *      Mengabsen dan mengoordinasikan teman sekelasnya di halaqah tersebut.
 *
 * 5. Santriwati:
 *    - thalibah (40): Santriwati aktif di siklus belajar 7-tahap Tikrar.
 *    - calon_thalibah (20): Pendaftar baru dalam fase seleksi / daftar ulang.
 *
 * Multi-Role:
 * Seseorang dapat memegang peran ganda (misal: Mu'allimah yang juga Thalibah,
 * atau Mu'allimah yang juga Musyrifah/Admin).
 */

export const ROLE_RANKS: Record<string, number> = {
  'super_admin': 100,
  'admin': 100,
  'musyrifah': 80,
  'muallimah': 60,
  'roisah': 45,
  'raisah': 45,
  'thalibah': 40,
  'calon_thalibah': 20,
};

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'musyrifah'
  | 'muallimah'
  | 'roisah'
  | 'raisah'
  | 'thalibah'
  | 'calon_thalibah';

export const ADMIN_RANK = ROLE_RANKS.admin; // 100
export const MANAGEMENT_RANK_THRESHOLD = 80; // Threshold untuk manajemen/pengawas lapangan (Musyrifah ke atas)
export const STAFF_RANK_THRESHOLD = 60; // Threshold untuk pengajar/staf akademik (Muallimah ke atas)
export const RAISAH_RANK_THRESHOLD = 45; // Threshold untuk ketua kelas (Raisah ke atas)
export const THALIBAH_RANK_THRESHOLD = 40; // Threshold untuk santriwati aktif

/**
 * Mendapatkan nilai numerik rank dari sebuah nama role.
 */
export function getRoleRank(role: string | null | undefined): number {
  if (!role) return 0;
  return ROLE_RANKS[role.toLowerCase().trim()] || 0;
}

/**
 * Memeriksa apakah nama role terdaftar di sistem.
 */
export function isValidRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return role.toLowerCase().trim() in ROLE_RANKS;
}

/**
 * Normalisasi string role ke lowercase dan trim.
 */
export function normalizeRole(role: string | null | undefined): string | null {
  if (!role) return null;
  const normalized = role.toString().toLowerCase().trim();
  return isValidRole(normalized) ? normalized : null;
}

/**
 * Ekstrak dan normalisasi semua role unik dari user data.
 */
export function extractRoles(roleData: string | string[] | null | undefined): string[] {
  if (!roleData) return [];

  const rawRoles = Array.isArray(roleData) ? roleData : [roleData];
  const normalizedRoles = rawRoles
    .map(normalizeRole)
    .filter((r): r is string => r !== null);

  return Array.from(new Set(normalizedRoles));
}

/**
 * Memeriksa apakah user memiliki role tertentu secara langsung (tanpa komparasi rank).
 * 'roisah' dan 'raisah' dianggap sama secara semantik.
 */
export function hasRole(
  userRole: string | string[] | null | undefined,
  targetRole: string
): boolean {
  if (!userRole) return false;
  const roles = extractRoles(userRole);
  const target = targetRole.toLowerCase().trim();
  if (target === 'roisah' || target === 'raisah') {
    return roles.includes('roisah') || roles.includes('raisah');
  }
  return roles.includes(target);
}

/**
 * Memeriksa apakah user memiliki salah satu dari daftar target roles.
 */
export function hasAnyRole(
  userRole: string | string[] | null | undefined,
  targetRoles: string[]
): boolean {
  if (!userRole || !targetRoles || targetRoles.length === 0) return false;
  return targetRoles.some((target) => hasRole(userRole, target));
}

/**
 * Helper spesifik per peran
 */
export function isRaisah(userRole: string | string[] | null | undefined): boolean {
  return hasRole(userRole, 'raisah') || hasRole(userRole, 'roisah');
}

export function isMusyrifah(userRole: string | string[] | null | undefined): boolean {
  return hasRole(userRole, 'musyrifah');
}

export function isMuallimah(userRole: string | string[] | null | undefined): boolean {
  return hasRole(userRole, 'muallimah');
}

export function isThalibah(userRole: string | string[] | null | undefined): boolean {
  return hasRole(userRole, 'thalibah');
}

export function isCalonThalibah(userRole: string | string[] | null | undefined): boolean {
  return hasRole(userRole, 'calon_thalibah');
}

/**
 * Mengambil peran utama (Primary Role) berdasarkan rank tertinggi sebagai fallback default.
 * Tetap mempertahankan calon_thalibah sebagai tingkatan dasar terendah.
 */
export function getPrimaryRole(roles: string[] | null | undefined): string {
  if (!roles || roles.length === 0) return 'calon_thalibah';

  const roleArray = Array.isArray(roles) ? roles : [roles];
  const validRoles = roleArray.filter(isValidRole);

  if (validRoles.length === 0) return 'calon_thalibah';

  return [...validRoles].sort((a, b) => getRoleRank(b) - getRoleRank(a))[0];
}

/**
 * Cek apakah user memenuhi kualifikasi rank minimal.
 */
export function hasRequiredRank(userRole: string | string[], minRank: number): boolean {
  const roles = Array.isArray(userRole) ? userRole : [userRole];
  const maxRank = Math.max(...roles.map(getRoleRank));
  return maxRank >= minRank;
}

/**
 * Cek apakah user adalah Staf Pengajar / Akademik (Mu'allimah ke atas).
 */
export function isStaff(userRole: string | string[]): boolean {
  return hasRequiredRank(userRole, STAFF_RANK_THRESHOLD);
}

/**
 * Cek apakah user adalah Tim Manajemen / Pengawas Lapangan (Musyrifah ke atas).
 */
export function isManagement(userRole: string | string[]): boolean {
  return hasRequiredRank(userRole, MANAGEMENT_RANK_THRESHOLD);
}

/**
 * Cek apakah user memiliki hak akses Admin (baik dari DB atau email pemilik).
 */
export function isAdmin(
  userEmail: string | null | undefined,
  userRoles: string[],
  ownerEmails: string[] = []
): boolean {
  if (userRoles.includes('admin') || userRoles.includes('super_admin')) return true;

  if (userEmail && ownerEmails.length > 0) {
    const normalizedEmail = userEmail.toLowerCase().trim();
    return ownerEmails.includes(normalizedEmail);
  }

  return false;
}

/**
 * Konsolidasi peran user dengan fallback email pemilik.
 */
export function consolidateRoles(
  databaseRoles: string[],
  userEmail: string | null | undefined,
  ownerEmails: string[] = []
): string[] {
  const roles = new Set(extractRoles(databaseRoles));

  if (userEmail && ownerEmails.length > 0) {
    const normalizedEmail = userEmail.toLowerCase().trim();
    if (ownerEmails.includes(normalizedEmail)) {
      roles.add('admin');
    }
  }

  if (roles.size === 0) {
    roles.add('calon_thalibah');
  }

  return Array.from(roles);
}

/**
 * Mendapatkan daftar persona/mode tampilan yang bisa dipilih oleh user.
 * Mengurutkan dari peran tertinggi ke santri.
 */
export function getAvailablePersonas(roles: string[] | null | undefined): UserRole[] {
  const extracted = extractRoles(roles) as UserRole[];
  if (extracted.length === 0) return ['calon_thalibah'];

  // Normalisasi roisah / raisah agar rapi
  const hasRaisahRole = extracted.some((r) => r === 'roisah' || r === 'raisah');
  const distinctPersonas = new Set<UserRole>();

  for (const r of extracted) {
    if (r === 'roisah' || r === 'raisah') {
      distinctPersonas.add('raisah');
    } else {
      distinctPersonas.add(r);
    }
  }

  return Array.from(distinctPersonas).sort((a, b) => getRoleRank(b) - getRoleRank(a));
}

/**
 * Label ramah pengguna untuk setiap role/persona
 */
export function getPersonaLabel(role: string): string {
  switch (role.toLowerCase().trim()) {
    case 'super_admin':
      return 'Super Admin';
    case 'admin':
      return 'Administrator';
    case 'musyrifah':
      return 'Musyrifah (Pengawas)';
    case 'muallimah':
      return "Mu'allimah (Pengajar)";
    case 'roisah':
    case 'raisah':
      return 'Raisah (Ketua Kelas)';
    case 'thalibah':
      return 'Thalibah (Santriwati)';
    case 'calon_thalibah':
      return 'Calon Thalibah';
    default:
      return role;
  }
}
