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

      // 1. Immediately clean up client storage & cookies
      if (typeof window !== 'undefined') {
        try {
          localStorage.clear();
          sessionStorage.clear();
          document.cookie.split(";").forEach((c) => {
            const cleanC = c.replace(/^ +/, "");
            document.cookie = cleanC.replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
            document.cookie = cleanC.replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";domain=.markaztikrar.id;path=/");
            document.cookie = cleanC.replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";domain=markaztikrar.id;path=/");
          });
        } catch (e) {
          console.warn('Storage cleanup warning:', e);
        }
      }

      // 2. Call server API to properly clear HttpOnly cookies
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (err) {
        console.warn('Logout fetch warning:', err);
      }

      // 3. Force full page reload to /login with cache busting
      if (typeof window !== 'undefined') {
        window.location.replace('/login?t=' + Date.now());
      }
    } catch (error) {
      console.error('Logout failed:', error);
      if (typeof window !== 'undefined') {
        window.location.replace('/login?t=' + Date.now());
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
