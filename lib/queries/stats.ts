/**
 * STATS QUERIES
 *
 * Cached queries for statistics.
 * Uses parallel queries for better performance.
 */

import { unstable_cache } from 'next/cache'

export interface AdminStats {
  totalBatches: number
  totalPrograms: number
  totalHalaqah: number
  totalUsers: number
  totalThalibah: number
  totalMentors: number
  totalBlacklisted: number
  pendingRegistrations: number
  pendingTikrar: number
}

/**
 * Get admin statistics (cached).
 * All queries run in parallel using Promise.all for optimal performance.
 * Cached for 30 seconds since stats change frequently.
 */
export async function getCachedAdminStats(
  supabase: any
): Promise<AdminStats> {
  const cached = unstable_cache(
    async () => {
      // Run all queries in parallel for better performance
      const [
        batchesResult,
        programsResult,
        halaqahResult,
        usersResult,
        thalibahResult,
        mentorsResult,
        blacklistedResult,
        pendingRegsResult,
        pendingTikrarResult,
      ] = await Promise.all([
        // Total batches
        // @ts-ignore - supabase client
        supabase.from('batches').select('*', { count: 'exact', head: true }),

        // Total programs
        // @ts-ignore
        supabase.from('programs').select('*', { count: 'exact', head: true }),

        // Total halaqah
        // @ts-ignore
        supabase.from('halaqah').select('*', { count: 'exact', head: true }),

        // Total users
        // @ts-ignore
        supabase.from('users').select('*', { count: 'exact', head: true }),

        // Total thalibah
        // @ts-ignore
        supabase.from('users').select('*', { count: 'exact', head: true }).contains('roles', ['thalibah']),

        // Total mentors (admin role)
        // @ts-ignore
        supabase.from('users').select('*', { count: 'exact', head: true }).contains('roles', ['admin']),

        // Total blacklisted
        // @ts-ignore
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_blacklisted', true),

        // Pending registrations
        // @ts-ignore
        supabase.from('pendaftaran').select('*', { count: 'exact', head: true }).eq('status', 'pending'),

        // Pending tikrar
        // @ts-ignore
        supabase.from('pendaftaran_tikrar_tahfidz').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ])

      return {
        totalBatches: batchesResult.count || 0,
        totalPrograms: programsResult.count || 0,
        totalHalaqah: halaqahResult.count || 0,
        totalUsers: usersResult.count || 0,
        totalThalibah: thalibahResult.count || 0,
        totalMentors: mentorsResult.count || 0,
        totalBlacklisted: blacklistedResult.count || 0,
        pendingRegistrations: pendingRegsResult.count || 0,
        pendingTikrar: pendingTikrarResult.count || 0,
      }
    },
    ['stats:admin'],
    { revalidate: 10 } // 10 seconds - stats should feel semi real-time
  )

  return cached()
}

/**
 * Get user-specific statistics (cached).
 * Includes data relevant to the specific user (e.g., their registrations).
 */
export async function getCachedUserStats(
  supabase: any,
  userId: string
): Promise<{
  totalRegistrations: number
  activeRegistrations: number
  pendingRegistrations: number
  completedPrograms: number
}> {
  const cached = unstable_cache(
    async (id: string) => {
      const [totalResult, activeResult, pendingResult] = await Promise.all([
        // @ts-ignore
        supabase.from('pendaftaran').select('*', { count: 'exact', head: true }).eq('user_id', id),

        // @ts-ignore
        supabase.from('pendaftaran').select('*', { count: 'exact', head: true })
          .eq('user_id', id)
          .in('status', ['approved', 'submitted']),

        // @ts-ignore
        supabase.from('pendaftaran').select('*', { count: 'exact', head: true })
          .eq('user_id', id)
          .eq('status', 'pending'),
      ])

      return {
        totalRegistrations: totalResult.count || 0,
        activeRegistrations: activeResult.count || 0,
        pendingRegistrations: pendingResult.count || 0,
        completedPrograms: 0, // Can be calculated from completed registrations
      }
    },
    [`stats:user:${userId}`],
    { revalidate: 60 } // 1 minute
  )

  return cached(userId)
}

/**
 * Get dashboard statistics for thalibah (cached).
 */
export async function getCachedThalibahDashboardStats(
  supabase: any,
  userId: string
): Promise<{
  activePendaftaran: number
  completedHalaqah: number
  totalPresensi: number
  presenceRate: number
}> {
  const cached = unstable_cache(
    async (id: string) => {
      // Run queries in parallel
      const [pendaftaranResult, halaqahResult, presensiResult] = await Promise.all([
        // @ts-ignore
        supabase.from('pendaftaran').select('*', { count: 'exact', head: true })
          .eq('user_id', id)
          .in('status', ['approved', 'submitted']),

        // @ts-ignore
        supabase.from('halaqah_students').select('halaqah_id', { count: 'exact', head: true })
          .eq('thalibah_id', id)
          .eq('status', 'active'),

        // @ts-ignore
        supabase.from('presensi').select('*', { count: 'exact', head: true })
          .eq('thalibah_id', id),
      ])

      const totalPresensi = presensiResult.count || 0
      const hadirCount = totalPresensi > 0
        ? (
          // @ts-ignore
          await supabase.from('presensi').select('*', { count: 'exact', head: true })
            .eq('thalibah_id', id)
            .eq('status', 'hadir')
        ).count || 0
        : 0

      return {
        activePendaftaran: pendaftaranResult.count || 0,
        completedHalaqah: halaqahResult.count || 0,
        totalPresensi,
        presenceRate: totalPresensi > 0 ? Math.round((hadirCount / totalPresensi) * 100) : 0,
      }
    },
    [`stats:dashboard:${userId}`],
    { revalidate: 60 } // 1 minute
  )

  return cached(userId)
}
