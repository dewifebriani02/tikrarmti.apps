'use client'

import { useCallback } from 'react'
import { useServerUserData } from '@/contexts/AuthContext'

export function useAuth() {

  // Get server-fetched user data (single source of truth)
  const serverUserData = useServerUserData()

  // Logout function
  const logout = useCallback(async () => {
    try {
      console.log('Starting logout process...')

      // Call server API to properly clear cookies
      // Server-side signOut is required to clear HttpOnly cookies
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error('Logout API failed:', response.status)
      }

      const result = await response.json()
      console.log('Logout API response:', result)

      // Force full page reload to /login with cache busting
      // This ensures:
      // 1. All client-side state is cleared
      // 2. Browser fetches fresh JavaScript (not cached)
      // 3. Middleware sees cleared cookies
      if (typeof window !== 'undefined') {
        // Add timestamp to prevent caching
        const loginUrl = result.redirect || '/login'
        const cacheBuster = loginUrl.includes('?')
          ? `&t=${Date.now()}`
          : `?t=${Date.now()}`

        // Hard redirect to clear all client state and fetch fresh code
        window.location.href = loginUrl + cacheBuster
      }
    } catch (error) {
      console.error('Logout failed:', error)
      // Still try to redirect even if logout fails
      if (typeof window !== 'undefined') {
        window.location.href = '/login?t=' + Date.now()
      }
    }
  }, [])

  // Check if user is authenticated (has server data)
  const isAuthenticated = Boolean(serverUserData)

  // Get user role from server data (for UI display only, NOT for authorization)
  // Backward compatible: check both new 'roles' array and legacy 'role' string
  const userRole = serverUserData?.roles?.[0] || (serverUserData as any)?.role || null

  return {
    // User data from server
    user: serverUserData,
    isLoading: false, // Server data is already loaded
    isAuthenticated,
    isUnauthenticated: !isAuthenticated,

    // Role (for UI display only – NOT for authorization)
    userRole,

    // Actions
    logout,
  }
}

/**
 * Hook for authentication mutations (register, etc.)
 * Note: Login is handled client-side using Supabase Auth directly
 */
export function useAuthMutations() {
  return {
    // Registration mutations can be added here if needed
  }
}

export default useAuth
