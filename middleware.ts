import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * MIDDLEWARE - The Cookie Refresher
 *
 * ARCHITECTURE V3 COMPLIANCE ✅
 *
 * Purpose:
 * - Refresh expired auth tokens automatically
 * - Write updated cookies to browser via Set-Cookie headers
 * - Prevent logout loops when tokens expire
 *
 * What happens here:
 * 1. Every request passes through this middleware
 * 2. updateSession() checks if auth token needs refresh
 * 3. If token is expired/expiring, it gets refreshed
 * 4. New token is written to cookies (both request and response)
 * 5. Server Components receive fresh token automatically
 *
 * What does NOT happen here:
 * ❌ Authorization checks (done in Server Layout via getUser)
 * ❌ Role-based access control (done via RLS in database)
 * ❌ Heavy business logic (keep middleware fast)
 *
 * Security Architecture:
 * - Middleware: Token refresh only (this file)
 * - Layout: Auth guard with getUser() (app/(protected)/layout.tsx)
 *
 * Reference:
 * - arsitektur.md section 6 "Middleware (The Cookie Refresher)"
 *
 * CRITICAL: Do not add route-based redirect logic here.
 * Let Server Components handle authorization decisions.
 */
export async function middleware(request: NextRequest) {
  // Delegate to helper that handles cookie refresh
  // This returns a response with updated Set-Cookie headers if token was refreshed
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
