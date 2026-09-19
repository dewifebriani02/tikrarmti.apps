/**
 * lib/supabase/server.ts — Server-side client shim (NO Supabase dependency)
 *
 * Provides `createServerClient` / `createClient` that route files use for
 * server-side data fetching. Uses native PostgreSQL via pg-query-builder.
 * Auth calls delegate to lib/auth.ts (JWT + pg pool).
 */

import { NextResponse } from 'next/server';
import { getCurrentUser, clearSessionCookie } from '@/lib/auth';
import { createPgClient } from '@/lib/pg-query-builder';

// Legacy export kept for middleware / env config consumers
export const supabaseUrl =
  process.env.INTERNAL_DB_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://markaztikrar.id';

/**
 * Creates a server-side client with:
 * - `.from()` → direct PostgreSQL via pg-query-builder
 * - `.auth.getUser()` → native JWT session from lib/auth.ts
 * - `.auth.signOut()` → clears our session cookie
 */
export function createClient(_options?: {
  cookies?: { maxAge?: number };
  response?: NextResponse;
}) {
  const pgClient = createPgClient();

  const customAuth = {
    getUser: async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          return {
            data: { user: null },
            error: { message: 'Not authenticated', name: 'AuthError', status: 401 },
          };
        }
        return {
          data: {
            user: {
              id: user.id,
              email: user.email,
              user_metadata: {
                full_name: user.full_name,
                role: user.role,
                roles: user.roles,
              },
              app_metadata: {
                role: user.role,
                roles: user.roles,
              },
              created_at: (user as any).created_at,
            },
          },
          error: null,
        };
      } catch (err: any) {
        return {
          data: { user: null },
          error: { message: err?.message || 'Auth error', name: 'AuthError', status: 500 },
        };
      }
    },

    getSession: async () => {
      try {
        const user = await getCurrentUser();
        if (!user) return { data: { session: null }, error: null };
        return {
          data: {
            session: {
              access_token: 'mti_session_active',
              user: {
                id: user.id,
                email: user.email,
                user_metadata: {
                  full_name: user.full_name,
                  role: user.role,
                  roles: user.roles,
                },
                app_metadata: {
                  role: user.role,
                  roles: user.roles,
                },
              },
            },
          },
          error: null,
        };
      } catch {
        return { data: { session: null }, error: null };
      }
    },

    signOut: async () => {
      await clearSessionCookie();
      return { error: null };
    },

    resetPasswordForEmail: async (_email: string, _opts?: any) => {
      return { data: {}, error: null };
    },

    updateUser: async (attrs: { password?: string; data?: Record<string, any> }) => {
      try {
        const user = await getCurrentUser();
        if (!user) return { data: { user: null }, error: { message: 'Not authenticated' } };
        return await pgClient.auth.admin.updateUserById(user.id, {
          password: attrs.password,
          user_metadata: attrs.data
        });
      } catch (err: any) {
        return { data: { user: null }, error: { message: err.message } };
      }
    },

    signInWithPassword: async () => {
      return { data: { user: null, session: null }, error: { message: 'Use /api/auth/login' } };
    },

    signUp: async () => {
      return { data: { user: null, session: null }, error: { message: 'Use /api/auth/register' } };
    },

    setSession: async (_tokens: { access_token: string; refresh_token?: string }) => {
      try {
        const user = await getCurrentUser();
        return {
          data: {
            user: user ? {
              id: user.id,
              email: user.email,
              user_metadata: { full_name: user.full_name, role: user.role, roles: user.roles },
              app_metadata: { role: user.role, roles: user.roles },
              created_at: (user as any).created_at,
            } : null,
            session: { access_token: _tokens.access_token }
          },
          error: null
        };
      } catch (err: any) {
        return { data: { user: null, session: null }, error: { message: err.message } };
      }
    },

    exchangeCodeForSession: async (_code: string) => {
      return { data: { session: null, user: null }, error: null };
    },

    refreshSession: async () => {
      return { data: { session: null, user: null }, error: null };
    },

    verifyOtp: async (_params: any) => {
      return { data: { session: null, user: null }, error: null };
    },

    resend: async (_params: any) => {
      return { data: {}, error: null };
    },

    admin: pgClient.auth.admin,
  };

  return {
    from: (table: string) => pgClient.from(table),
    rpc: (fnName: string, args?: Record<string, any>) => pgClient.rpc(fnName, args),
    auth: customAuth,
    // Storage stub — migrate file uploads to local filesystem
    storage: pgClient.storage,
  };
}

// Alias for ease of migration
export const createServerClient = createClient;
