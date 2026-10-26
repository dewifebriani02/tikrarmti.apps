'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import { getFetcher } from '@/lib/swr/fetchers'
import { User } from '@/types/database'

/**
 * Type for dashboard statistics
 */
export interface DashboardStats {
  totalHariTarget?: number;
  hariAktual?: number;
  persentaseProgress?: number;
  totalRegistrations?: number;
  activeBatches?: number;
  activePrograms?: number;
  pendingApprovals?: number;
  completedRegistrations?: number;
  totalUsers?: number;
  userGrowth?: {
    new: number;
    active: number;
    total: number;
  };
  recentActivity?: Array<{
    id: string;
    type: 'registration' | 'approval' | 'batch_update';
    description: string;
    timestamp: string;
    user?: {
      name: string;
      avatar?: string;
    };
  }>;
}

/**
 * Type for user progress data
 */
export interface UserProgress {
  totalDays: number;
  completedDays: number;
  percentage: number;
  currentStreak: number;
  longestStreak: number;
  lastActivity: string;
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    completed: boolean;
    completedAt?: string;
    dueDate: string;
  }>;
  weeklyProgress: Array<{
    week: string;
    target: number;
    actual: number;
    percentage: number;
  }>;
}

/**
 * Type for learning journey data
 */
export interface LearningJourney {
  registrations: Array<{
    id: string;
    batchName: string;
    programName: string;
    status: 'pending' | 'approved' | 'active' | 'completed';
    startDate: string;
    endDate?: string;
    progress: number;
  }>;
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    earnedAt: string;
  }>;
  certificates: Array<{
    id: string;
    title: string;
    programName: string;
    issuedAt: string;
    downloadUrl: string;
  }>;
}

/**
 * Hook for fetching dashboard statistics
 */
export function useDashboardStats(enabled: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR<DashboardStats>(
    enabled ? '/api/dashboard/stats' : null,
    async (url: string) => {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats')
        }

        const result = await response.json()
        return result.data || result
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        return null
      }
    },
    {
      revalidateOnFocus: true,
      refreshInterval: 30000, // 30 seconds
      dedupingInterval: 60000, // 1 minute
      fallbackData: {
        totalHariTarget: 0,
        hariAktual: 0,
        persentaseProgress: 0,
        totalRegistrations: 0,
        activeBatches: 0,
        activePrograms: 0,
        pendingApprovals: 0,
        completedRegistrations: 0,
      },
    }
  )

  return {
    stats: data || {
      totalHariTarget: 0,
      hariAktual: 0,
      persentaseProgress: 0,
      totalRegistrations: 0,
      activeBatches: 0,
      activePrograms: 0,
      pendingApprovals: 0,
      completedRegistrations: 0,
    },
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Hook for fetching user dashboard statistics (non-admin users)
 */
export function useUserDashboardStats() {
  const { data, error, isLoading, mutate } = useSWR<DashboardStats>(
    '/api/dashboard/user-stats',
    getFetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 30000,
      dedupingInterval: 60000,
      fallbackData: {
        totalHariTarget: 0,
        hariAktual: 0,
        persentaseProgress: 0,
      },
    }
  )

  return {
    stats: data || {
      totalHariTarget: 0,
      hariAktual: 0,
      persentaseProgress: 0,
    },
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Hook for fetching user progress data
 */
export function useUserProgress() {
  const { data, error, isLoading, mutate } = useSWR<UserProgress>(
    '/api/dashboard/progress',
    async (url: string) => {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch user progress')
        }

        const result = await response.json()
        return result.data || result
      } catch (error) {
        console.error('Error fetching user progress:', error)
        return null
      }
    },
    {
      revalidateOnFocus: true,
      refreshInterval: 30000,
      dedupingInterval: 60000,
      fallbackData: {
        totalDays: 0,
        completedDays: 0,
        percentage: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActivity: new Date().toISOString(),
        milestones: [],
        weeklyProgress: [],
      },
    }
  )

  return {
    progress: data || {
      totalDays: 0,
      completedDays: 0,
      percentage: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActivity: new Date().toISOString(),
      milestones: [],
      weeklyProgress: [],
    },
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Hook for fetching learning journey data
 */
export function useLearningJourney() {
  const { data, error, isLoading, mutate } = useSWR<LearningJourney>(
    '/api/dashboard/journey',
    getFetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 30000,
      dedupingInterval: 60000,
      fallbackData: {
        registrations: [],
        achievements: [],
        certificates: [],
      },
    }
  )

  return {
    journey: data || {
      registrations: [],
      achievements: [],
      certificates: [],
    },
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Hook for fetching recent activity
 */
export function useRecentActivity(limit = 10) {
  const { data, error, isLoading, mutate } = useSWR<
    DashboardStats['recentActivity']
  >(
    `/api/dashboard/activity?limit=${limit}`,
    getFetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 30000,
      dedupingInterval: 60000,
      fallbackData: [],
    }
  )

  return {
    activities: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Hook for fetching admin dashboard analytics
 */
export function useAdminAnalytics(dateRange?: { start: string; end: string }) {
  const queryString = dateRange
    ? `?start=${encodeURIComponent(dateRange.start)}&end=${encodeURIComponent(dateRange.end)}`
    : ''

  const { data, error, isLoading, mutate } = useSWR(
    `/api/dashboard/analytics${queryString}`,
    getFetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 30000,
      dedupingInterval: 60000,
    }
  )

  return {
    analytics: data || null,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Hook for fetching quick stats cards data
 */
export function useQuickStats() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/dashboard/quick-stats',
    getFetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 30000,
      dedupingInterval: 60000,
      fallbackData: {
        users: { total: 0, active: 0, new: 0 },
        registrations: { total: 0, pending: 0, approved: 0 },
        batches: { total: 0, active: 0, upcoming: 0 },
        revenue: { total: 0, monthly: 0, growth: 0 },
      },
    }
  )

  return {
    quickStats: data || {
      users: { total: 0, active: 0, new: 0 },
      registrations: { total: 0, pending: 0, approved: 0 },
      batches: { total: 0, active: 0, upcoming: 0 },
      revenue: { total: 0, monthly: 0, growth: 0 },
    },
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Hook for personalized dashboard recommendations
 */
export function useDashboardRecommendations() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/dashboard/recommendations',
    getFetcher,
    {
      revalidateOnFocus: false, // Don't auto-refresh recommendations
      dedupingInterval: 600000, // 10 minutes cache
      refreshInterval: 0,
      fallbackData: {
        programs: [],
        actions: [],
        tips: [],
      },
    }
  )

  return {
    recommendations: data || {
      programs: [],
      actions: [],
      tips: [],
    },
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Hook for dashboard notifications
 */
export function useDashboardNotifications() {
  const { data, error, isLoading, mutate } = useSWR<any[]>(
    '/api/dashboard/notifications',
    async (url: string) => {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch notifications')
        }

        const result = await response.json()
        return result.data || result || []
      } catch (error) {
        console.error('Error fetching notifications:', error)
        return []
      }
    },
    {
      revalidateOnFocus: true,
      refreshInterval: 30000,
      dedupingInterval: 60000,
      fallbackData: [],
    }
  )

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/dashboard/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }

      // Revalidate notifications
      await mutate()
    } catch (error) {
      console.error('Mark notification as read error:', error)
      throw error
    }
  }, [mutate])

  return {
    notifications: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
    markAsRead,
    unreadCount: data?.filter(n => !n.read).length || 0,
  }
}

/**
 * Hook for system health and performance metrics
 */
export function useSystemHealth() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/dashboard/health',
    getFetcher,
    {
      revalidateOnFocus: false, // Don't auto-refresh health
      dedupingInterval: 30000, // 30 seconds cache
      refreshInterval: 60000, // Refresh every minute
      fallbackData: {
        status: 'healthy',
        database: 'connected',
        storage: 'connected',
        responseTime: 0,
        uptime: 0,
      },
    }
  )

  return {
    health: data || {
      status: 'healthy',
      database: 'connected',
      storage: 'connected',
      responseTime: 0,
      uptime: 0,
    },
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Type for tashih block status
 */
export interface TashihBlockStatus {
  block_code: string
  week_number: number
  part: string
  start_page: number
  end_page: number
  is_completed: boolean
  tashih_date?: string
  tashih_count: number
}

export interface TashihStatusData {
  juz_code: string
  juz_info: {
    id: string
    code: string
    name: string
    juz_number: number
    part: string
    start_page: number
    end_page: number
  }
  blocks: TashihBlockStatus[]
  summary: {
    total_blocks: number
    completed_blocks: number
    pending_blocks: number
    streak_count?: number
  }
}

/**
 * Type for jurnal block status
 */
export interface JurnalBlockStatus {
  block_code: string
  week_number: number
  part: string
  start_page: number
  end_page: number
  is_completed: boolean
  jurnal_date?: string
  jurnal_count: number
}

export interface JurnalStatusData {
  juz_code: string
  juz_info: {
    id: string
    code: string
    name: string
    juz_number: number
    part: string
    start_page: number
    end_page: number
  }
  blocks: JurnalBlockStatus[]
  summary: {
    total_blocks: number
    completed_blocks: number
    pending_blocks: number
    streak_count?: number
    sp_summary: {
      sp_level: number
      week_number: number
      issued_at: string
      reason: string
      is_blacklisted: boolean
      sp_type?: 'permanent_do' | 'temporary_do'
    } | null
  }
}

/**
 * Hook for fetching tashih block status for dashboard
 */
export function useTashihStatus(userId?: string, batchId?: string) {
  const queryParams = new URLSearchParams()
  if (userId) queryParams.append('user_id', userId)
  if (batchId) queryParams.append('batch_id', batchId)
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''
  const { data, error, isLoading, mutate } = useSWR<TashihStatusData | null>(
    `/api/dashboard/tashih-status${queryString}`,
    async (url: string): Promise<TashihStatusData | null> => {
      try {
        console.log('[useTashihStatus] Fetching...')
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        console.log('[useTashihStatus] Response status:', response.status)

        if (!response.ok) {
          if (response.status === 404 || response.status === 401) {
            // No active registration or not authorized
            console.log('[useTashihStatus] No active registration, returning null')
            return null
          }
          throw new Error('Failed to fetch tashih status')
        }

        const result = await response.json()
        console.log('[useTashihStatus] Result:', result.success ? 'success' : 'failed', 'data:', result.data ? 'found' : 'null')
        return result.data || null
      } catch (error) {
        console.error('[useTashihStatus] Error:', error)
        return null
      }
    },
    {
      revalidateOnFocus: true,
      refreshInterval: 60000, // 1 minute
      dedupingInterval: 120000, // 2 minutes
      fallbackData: null,
    }
  )

  console.log('[useTashihStatus] State:', { isLoading, isError: !!error, hasData: !!data })

  return {
    tashihStatus: data || null,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Hook for fetching jurnal block status for dashboard
 */
export function useJurnalStatus(userId?: string, batchId?: string) {
  const queryParams = new URLSearchParams()
  if (userId) queryParams.append('user_id', userId)
  if (batchId) queryParams.append('batch_id', batchId)
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''
  const { data, error, isLoading, mutate } = useSWR<any>(
    `/api/dashboard/jurnal-status${queryString}`,
    getFetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 60000, // 1 minute
      dedupingInterval: 30000, // 30 seconds
    }
  )

  return {
    jurnalStatus: (data as JurnalStatusData) || null,
    isLoading: isLoading && !data,
    isError: !!error,
    error,
    mutate,
  }
}

export interface HalaqahStudentStat {
  id: string;
  name: string;
  progress: number;
  jurnal: number;
  tashih: number;
  punctualityScore: number;
}

export interface HalaqahOfTheWeekData {
  id: string
  name: string
  muallimah_name: string
  total_thalibah: number
  avg_progress: number
  perfect_thalibah: number
  active_tashih: number
  active_jurnal: number
  total_interactions: number
  on_time_score?: number
  evaluation_period?: string
  target_week?: number
  students?: HalaqahStudentStat[]
}

export interface HalaqahRankingResponse {
  topHalaqah: HalaqahOfTheWeekData | null;
  allHalaqahs: HalaqahOfTheWeekData[];
  userRank?: { rank: number; total: number; score: number } | null;
}

/**
 * Hook for fetching halaqah of the week and ranking
 */
export function useHalaqahOfTheWeek(batchId?: string) {
  const queryParams = new URLSearchParams()
  if (batchId) queryParams.append('batch_id', batchId)
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''
  const { data, error, isLoading, mutate } = useSWR<HalaqahRankingResponse | null>(
    `/api/dashboard/halaqah-of-the-week${queryString}`,
    getFetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 300000, // 5 minutes
      dedupingInterval: 300000,
    }
  )

  return {
    halaqahOfTheWeek: data?.topHalaqah || null,
    allHalaqahs: data?.allHalaqahs || [],
    userRank: data?.userRank || null,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

export default useDashboardStats