'use client'

import useSWR from 'swr'
import { useCallback, useMemo } from 'react'
import { getFetcher, postFetcher, putFetcher, deleteFetcher } from '@/lib/swr/fetchers'
import { cacheConfig } from '@/lib/swr/config'
import { Batch } from '@/types/database'

/**
 * Type for batch query parameters
 */
export interface BatchQueryParams {
  status?: Batch['status']
  is_open?: boolean
  limit?: number
  offset?: number
  search?: string
}

/**
 * Hook for fetching batch list
 */
export function useBatches(params: BatchQueryParams = {}) {
  // Build query string
  const queryString = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (typeof value === 'boolean') {
        queryString.append(key, value.toString())
      } else {
        queryString.append(key, String(value))
      }
    }
  })

  const url = queryString.toString() ? `/api/batch?${queryString}` : '/api/batch'

  const { data, error, isLoading, mutate } = useSWR<Batch[]>(
    url,
    getFetcher,
    {
      revalidateOnFocus: false, // Don't auto-refresh on focus
      dedupingInterval: 60000, // 1 minute cache
      refreshInterval: 0, // Manual refresh only
      fallbackData: [], // Empty array as fallback
    }
  )

  return {
    batches: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Hook for fetching single batch by ID
 */
export function useBatch(id?: string) {
  const { data, error, isLoading, mutate } = useSWR<Batch>(
    id ? `/api/batch/${id}` : null,
    getFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      refreshInterval: 0,
    }
  )

  return {
    batch: data || null,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Helper to determine which batch is currently active for registration.
 *
 * Priority logic:
 * 1. Open batch where current date is within registration period:
 *    registration_start_date <= today <= registration_end_date (until 23:59:59 WIB)
 * 2. Open batch where registration_end_date is still in the future:
 *    today <= registration_end_date (until 23:59:59 WIB)
 * 3. Open batch whose KBM has not started yet (upcoming batch, where first_week_start_date or start_date > today)
 * 4. Most recently created open batch (data[0], since API returns ORDER BY created_at DESC)
 * 5. Fallback to null
 */
export function getActiveRegistrationBatch(batches: Batch[] | null | undefined): Batch | null {
  if (!batches || batches.length === 0) return null

  const now = new Date()

  const getDeadline = (dateStr?: string | null) => {
    if (!dateStr) return null
    const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
    return match ? new Date(`${match[1]}T23:59:59+07:00`) : new Date(dateStr)
  }

  const getStartDate = (dateStr?: string | null) => {
    if (!dateStr) return null
    const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
    return match ? new Date(`${match[1]}T00:00:00+07:00`) : new Date(dateStr)
  }

  const openBatches = batches.filter(b => b.status === 'open')
  if (openBatches.length === 0) return batches[0] || null

  // Priority 1: Open batch whose registration window is currently active (start <= now <= end)
  const activeWindowBatch = openBatches.find(batch => {
    const regStart = getStartDate(batch.registration_start_date)
    const regEnd = getDeadline(batch.registration_end_date)
    if (regEnd) {
      if (regStart) {
        return now >= regStart && now <= regEnd
      }
      return now <= regEnd
    }
    return false
  })
  if (activeWindowBatch) return activeWindowBatch

  // Priority 2: Open batch whose registration_end_date is in the future
  const futureEndBatch = openBatches.find(batch => {
    const regEnd = getDeadline(batch.registration_end_date)
    return regEnd ? now <= regEnd : false
  })
  if (futureEndBatch) return futureEndBatch

  // Priority 3: Open batch whose start_date / first_week_start_date is in the future (upcoming batch awaiting start)
  const upcomingBatch = openBatches.find(batch => {
    const start = getStartDate(batch.first_week_start_date || batch.start_date)
    return start ? start > now : false
  })
  if (upcomingBatch) return upcomingBatch

  // Priority 4: Default to the latest created open batch
  return openBatches[0] || null
}

/**
 * Hook for fetching batch that is currently open for registration
 */
export function useRegistrationBatch() {
  const { data, error, isLoading, mutate } = useSWR<Batch[]>(
    '/api/batch?status=open&limit=10',
    getFetcher,
    {
      revalidateOnFocus: true,
      revalidateOnMount: true,
      dedupingInterval: 5000,
      refreshInterval: 30000,
    }
  )

  const registrationBatch = useMemo(() => {
    return getActiveRegistrationBatch(data)
  }, [data])

  return {
    registrationBatch,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Hook for fetching currently active batch for ongoing academic / learning activities
 * Logic:
 * 1. Try to get batch with status=open AND first_week_start_date <= today
 * 2. If not found, try to get batch with status=open (for upcoming batches)
 * 3. If still not found, fallback to latest closed batch that recently completed
 */
export function useActiveBatch() {
  // Try to get batch with status=open first
  const { data, error, isLoading, mutate } = useSWR<Batch[]>(
    '/api/batch?status=open&limit=10', // Get more to filter client-side
    getFetcher,
    {
      revalidateOnFocus: true,
      revalidateOnMount: true,
      dedupingInterval: 5000,
      refreshInterval: 30000,
    }
  )

  // Client-side filter: find the batch that has started (week 1 started) or is about to start soon
  const activeBatch = useMemo(() => {
    return data?.find(batch => {
      const week1Start = batch.first_week_start_date ? new Date(batch.first_week_start_date) : null
      const today = new Date()

      // Priority 1: Batch with status=open AND week 1 has started
      if (batch.status === 'open' && week1Start && week1Start <= today) {
        return true
      }

      // Priority 2: Batch with status=open that starts soon (within 7 days)
      if (batch.status === 'open' && week1Start) {
        const daysUntilStart = Math.ceil((week1Start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        if (daysUntilStart <= 7 && daysUntilStart >= 0) {
          return true
        }
      }

      return false
    }) || data?.[0] || null
  }, [data])

  const registrationBatch = useMemo(() => {
    return getActiveRegistrationBatch(data)
  }, [data])

  return {
    activeBatch,
    registrationBatch,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Hook for batch mutations (create, update, delete)
 */
export function useBatchMutations() {
  // Create new batch
  const createBatch = async (data: Partial<Batch>) => {
    try {
      const response = await fetch('/api/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to create batch')
      }

      return await response.json()
    } catch (error) {
      console.error('Create batch error:', error)
      throw error
    }
  }

  // Update existing batch
  const updateBatch = async (id: string, data: Partial<Batch>) => {
    try {
      const response = await fetch(`/api/batch/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to update batch')
      }

      return await response.json()
    } catch (error) {
      console.error('Update batch error:', error)
      throw error
    }
  }

  // Delete batch
  const deleteBatch = async (id: string) => {
    try {
      const response = await fetch(`/api/batch/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete batch')
      }

      return true
    } catch (error) {
      console.error('Delete batch error:', error)
      throw error
    }
  }

  return {
    createBatch,
    updateBatch,
    deleteBatch,
  }
}

/**
 * Hook for batch status mutations (open, close, etc.)
 */
export function useBatchStatusMutations() {
  // Open batch
  const openBatch = async (id: string) => {
    try {
      const response = await fetch(`/api/batch/${id}/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to open batch')
      }

      return await response.json()
    } catch (error) {
      console.error('Open batch error:', error)
      throw error
    }
  }

  // Close batch
  const closeBatch = async (id: string) => {
    try {
      const response = await fetch(`/api/batch/${id}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to close batch')
      }

      return await response.json()
    } catch (error) {
      console.error('Close batch error:', error)
      throw error
    }
  }

  return {
    openBatch,
    closeBatch,
  }
}

/**
 * Hook for batch analytics and statistics
 */
export function useBatchStats(id?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/batch/${id}/stats` : null,
    getFetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 30000, // 30 seconds cache
      refreshInterval: 60000, // Refresh every minute
    }
  )

  return {
    stats: data || null,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Hook for batch search functionality
 */
export function useBatchSearch(searchTerm: string, enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<Batch[]>(
    enabled && searchTerm ? `/api/batch/search?query=${encodeURIComponent(searchTerm)}` : null,
    getFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000, // 5 seconds cache for search
      refreshInterval: 0,
      fallbackData: [],
    }
  )

  return {
    searchResults: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

export default useBatches
