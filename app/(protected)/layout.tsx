import { getCurrentUser } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { redirect } from 'next/navigation';
import ProtectedClientLayout from './ProtectedClientLayout';
import { validateEnv, getOwnerEmails } from '@/lib/env';
import {
  extractRoles,
  getPrimaryRole,
  getRoleRank,
  consolidateRoles,
  isAdmin,
  ADMIN_RANK,
  STAFF_RANK_THRESHOLD
} from '@/lib/roles';

// Validate environment on server startup
validateEnv();

/**
 * PROTECTED LAYOUT – Server Component Auth Guard
 *
 * Direct verification against native PostgreSQL session and users table.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 1. SESSION GUARD: Ensure user is authenticated
  const userData = await getCurrentUser();

  if (!userData) {
    redirect('/login');
  }

  // 1b. FORCE PASSWORD CHANGE GUARD: If user password was reset, enforce password update
  if (userData.must_change_password) {
    console.log(`[ProtectedLayout] ${userData.email} must change password. Redirecting to /ganti-password`);
    redirect('/ganti-password');
  }

  // 2. ROLE SYNTHESIS: Rank-based primary role detection from DATABASE
  const ownerEmails = getOwnerEmails();
  const rawRoles = [...(userData.roles || [])];
  if (userData.role) rawRoles.push(userData.role);
  const dbRoles = extractRoles(rawRoles);

  const distinctRoles = consolidateRoles(dbRoles, userData.email, ownerEmails);
  const primaryRole = getPrimaryRole(distinctRoles);
  const primaryRank = getRoleRank(primaryRole);

  const normalizedRole = distinctRoles.includes(primaryRole) ? primaryRole : 'calon_thalibah';

  // 3. FREEZE APPLICATION GUARD: Check if the app is frozen (maintenance mode)
  const freezeSetting = await queryOne(
    'SELECT value FROM system_settings WHERE key = $1',
    ['app_is_frozen']
  );

  if (freezeSetting && freezeSetting.value?.frozen) {
    if (primaryRank < ADMIN_RANK) {
      console.log('[ProtectedLayout] App is frozen. Redirecting non-admin to /maintenance');
      redirect('/maintenance');
    }
  }

  // 4. PROFILE COMPLETION GUARD:
  const isProfileComplete = !!(
    userData.full_name &&
    userData.negara &&
    userData.kota &&
    userData.alamat &&
    userData.whatsapp &&
    userData.zona_waktu
  );

  if (!isProfileComplete && primaryRank < STAFF_RANK_THRESHOLD) {
    console.log('[ProtectedLayout] Profile incomplete. Redirecting to /lengkapi-profile');
    redirect('/lengkapi-profile');
  }

  console.log(`[ProtectedLayout] ${userData.email} -> Primary: ${normalizedRole} (Rank: ${primaryRank}) Roles: ${distinctRoles.join(', ')}`);

  return (
    <ProtectedClientLayout
      user={{
        id: userData.id,
        email: userData.email || '',
        full_name: userData.full_name || userData.email?.split('@')[0] || '',
        primaryRole: normalizedRole,
        roles: distinctRoles,
        avatar_url: userData.avatar_url,
        whatsapp: userData.whatsapp,
        telegram: userData.telegram,
        negara: userData.negara,
        provinsi: userData.provinsi,
        kota: userData.kota,
        alamat: userData.alamat,
        zona_waktu: userData.zona_waktu,
        tanggal_lahir: userData.tanggal_lahir ? String(userData.tanggal_lahir) : undefined,
        tempat_lahir: userData.tempat_lahir,
        jenis_kelamin: userData.jenis_kelamin,
        pekerjaan: userData.pekerjaan,
        alasan_daftar: userData.alasan_daftar,
      }}
    >
      {children}
    </ProtectedClientLayout>
  );
}
