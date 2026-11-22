'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import { getFetcher, postFetcher, putFetcher, deleteFetcher } from '@/lib/swr/fetchers'
import { Pendaftaran } from '@/types/database'

/**
 * Type for registration query parameters
 */
export interface RegistrationQueryParams {
  user_id?: string
  batch_id?: string
  program_id?: string
  status?: Pendaftaran['status']
  limit?: number
  offset?: number
  search?: string
}

/**
 * Type for registration form data
 */
export interface PendaftaranForm {
  batch_id: string
  program_id: string
  registration_data: {
    full_name?: string
    email?: string
    phone?: string
    address?: string
    birth_date?: string
    gender?: string
    education?: string
    motivation?: string
    experience?: string
    emergency_contact?: {
      name: string
      phone: string
      relationship: string
    }
  }
}

/**
 * Hook for fetching user's registrations (with batch filter - for dashboard)
 */
export function useMyRegistrations(userId?: string) {
  const queryString = userId ? `?user_id=${userId}` : ''
  const { data, error, isLoading, mutate } = useSWR<Pendaftaran[]>(
    `/api/pendaftaran/my${queryString}`,
    getFetcher,
    {
      revalidateOnFocus: true, // Refresh on focus for better UX
      revalidateOnMount: true,
      dedupingInterval: 5000,
      refreshInterval: 30000, // 30 seconds
      fallbackData: [], // Empty array as fallback
    }
  )

  return {
    registrations: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Hook for fetching ALL user registrations (no batch filter - for perjalanan-saya)
 */
export function useAllRegistrations() {
  const { data, error, isLoading, mutate } = useSWR<Pendaftaran[]>(
    '/api/pendaftaran/all',
    getFetcher,
    {
      revalidateOnFocus: true,
      revalidateOnMount: true,
      dedupingInterval: 5000,
      refreshInterval: 30000,
      fallbackData: [],
    }
  )

  return {
    registrations: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Hook for fetching all registrations (admin only)
 */
export function useAllRegistrationsAdmin(params: RegistrationQueryParams = {}) {
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

  const url = queryString.toString() ? `/api/pendaftaran?${queryString}` : '/api/pendaftaran'

  const { data, error, isLoading, mutate } = useSWR<Pendaftaran[]>(
    url,
    getFetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 60000, // 1 minute cache
      refreshInterval: 30000, // 30 seconds for real-time updates
      fallbackData: [],
    }
  )

  return {
    registrations: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Hook for fetching single registration by ID
 */
export function useRegistration(id?: string) {
  const { data, error, isLoading, mutate } = useSWR<Pendaftaran>(
    id ? `/api/pendaftaran/${id}` : null,
    getFetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 60000, // 1 minute cache
      refreshInterval: 0, // Manual refresh only
    }
  )

  return {
    registration: data || null,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Hook for registration mutations (create, update, delete)
 */
export function useRegistrationMutations() {
  // Create new registration
  const createRegistration = async (data: Partial<Pendaftaran>) => {
    try {
      const response = await fetch('/api/pendaftaran', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to create registration')
      }

      return await response.json()
    } catch (error) {
      console.error('Create registration error:', error)
      throw error
    }
  }

  // Update existing registration
  const updateRegistration = async (id: string, data: Partial<Pendaftaran>) => {
    try {
      const response = await fetch(`/api/pendaftaran/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to update registration')
      }

      return await response.json()
    } catch (error) {
      console.error('Update registration error:', error)
      throw error
    }
  }

  // Delete registration
  const deleteRegistration = async (id: string) => {
    try {
      const response = await fetch(`/api/pendaftaran/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete registration')
      }

      return true
    } catch (error) {
      console.error('Delete registration error:', error)
      throw error
    }
  }

  return {
    createRegistration,
    updateRegistration,
    deleteRegistration,
  }
}

/**
 * Hook for registration status mutations (approve, reject, etc.)
 */
export function useRegistrationStatusMutations() {
  // Approve registration
  const approveRegistration = async (id: string) => {
    try {
      const response = await fetch(`/api/pendaftaran/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to approve registration')
      }

      return await response.json()
    } catch (error) {
      console.error('Approve registration error:', error)
      throw error
    }
  }

  // Reject registration
  const rejectRegistration = async (id: string, reason?: string) => {
    try {
      const response = await fetch(`/api/pendaftaran/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reason ? { reason } : {}),
      })

      if (!response.ok) {
        throw new Error('Failed to reject registration')
      }

      return await response.json()
    } catch (error) {
      console.error('Reject registration error:', error)
      throw error
    }
  }

  // Withdraw registration
  const withdrawRegistration = async (id: string) => {
    try {
      const response = await fetch(`/api/pendaftaran/${id}/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to withdraw registration')
      }

      return await response.json()
    } catch (error) {
      console.error('Withdraw registration error:', error)
      throw error
    }
  }

  return {
    approveRegistration,
    rejectRegistration,
    withdrawRegistration,
  }
}

/**
 * Hook for checking registration eligibility
 */
export function useRegistrationEligibility(batchId?: string, programId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    (batchId && programId) ? `/api/pendaftaran/eligibility?batch_id=${batchId}&program_id=${programId}` : null,
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
          throw new Error('Failed to fetch registration eligibility')
        }

        const result = await response.json()
        return result.data || result || { eligible: false, restrictions: [] }
      } catch (error) {
        console.error('Error fetching registration eligibility:', error)
        return { eligible: false, restrictions: [] }
      }
    },
    {
      revalidateOnFocus: true, // Check eligibility on focus
      dedupingInterval: 30000, // 30 seconds cache
      refreshInterval: 0,
    }
  )

  return {
    eligibility: data || null,
    isLoading,
    isError: !!error,
    error,
    mutate,
    isEligible: data?.eligible || false,
    restrictions: data?.restrictions || [],
  }
}

/**
 * Hook for registration statistics
 */
export function useRegistrationStats(params: { batch_id?: string; user_id?: string } = {}) {
  const queryString = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) queryString.append(key, value)
  })

  const url = queryString.toString() ? `/api/pendaftaran/stats?${queryString}` : '/api/pendaftaran/stats'

  const { data, error, isLoading, mutate } = useSWR(
    url,
    getFetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 60000,
      refreshInterval: 30000,
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
 * Hook for registration search functionality (admin only)
 */
export function useRegistrationSearch(searchTerm: string, enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<Pendaftaran[]>(
    enabled && searchTerm ? `/api/pendaftaran/search?query=${encodeURIComponent(searchTerm)}` : null,
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

/**
 * Hook for checking if user is registered for a specific batch/program
 */
export function useRegistrationStatus(batchId?: string, programId?: string) {
  const { data, error, isLoading, mutate } = useSWR<Pendaftaran>(
    (batchId && programId) ? `/api/pendaftaran/status?batch_id=${batchId}&program_id=${programId}` : null,
    getFetcher,
    {
      revalidateOnFocus: true, // Check status on focus
      dedupingInterval: 60000,
      refreshInterval: 0,
    }
  )

  return {
    registration: data || null,
    isLoading,
    isError: !!error,
    error,
    mutate,
    isRegistered: !!data,
    isPending: data?.status === 'pending',
    isApproved: data?.status === 'approved',
    isRejected: data?.status === 'rejected',
    canRegister: !data && !error,
  }
}


export default useMyRegistrations