'use client';

/**
 * lib/supabase/client.ts — Browser-side shim (NO Supabase dependency)
 *
 * Previously used @supabase/ssr createBrowserClient.
 * Now returns a no-op stub since all data fetching goes through
 * Next.js API routes (which use the server-side pg client).
 *
 * Auth state in the browser is managed by our native JWT cookie —
 * no client-side Supabase auth needed.
 */

// Singleton stub — browser code that calls createClient() gets a harmless object
let _client: any = null;

export function createClient() {
  if (_client) return _client;

  // Clean up any legacy Supabase tokens that were previously cached
  if (typeof window !== 'undefined') {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith('sb-')) localStorage.removeItem(k);
      }
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith('sb-')) sessionStorage.removeItem(k);
      }
      document.cookie.split(';').forEach(c => {
        const name = c.split('=')[0].trim();
        if (name.startsWith('sb-')) {
          document.cookie = `${name}=; path=/; max-age=0;`;
          document.cookie = `${name}=; path=/; domain=.markaztikrar.id; max-age=0;`;
        }
      });
    } catch {}
  }

  _client = {
    from: () => {
      console.warn('[pg-client] from() called on browser client — use API routes instead');
      return { select: () => Promise.resolve({ data: [], error: null }) };
    },
    rpc: () => {
      console.warn('[pg-client] rpc() called on browser client — use API routes instead');
      return Promise.resolve({ data: null, error: null });
    },
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => {
        // Delegate to server-side logout API
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        return { error: null };
      },
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } }
      }),
      updateUser: async (attrs: any) => {
        try {
          if (attrs?.password) {
            const res = await fetch('/api/user/change-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ newPassword: attrs.password }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
              return { data: { user: null }, error: { message: data.error || 'Gagal mengubah password' } };
            }
            return { data: { user: data.user }, error: null };
          }
          return { data: { user: null }, error: null };
        } catch (err: any) {
          return { data: { user: null }, error: { message: err.message } };
        }
      },
      resetPasswordForEmail: async (_email: string) => ({ data: {}, error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
      signUp: async () => ({ data: { user: null, session: null }, error: null }),
      setSession: async (_tokens: any) => ({ data: { user: null, session: null }, error: null }),
      exchangeCodeForSession: async (_code: string) => ({ data: { session: null, user: null }, error: null }),
      refreshSession: async () => ({ data: { session: null, user: null }, error: null }),
      verifyOtp: async (_params: any) => ({ data: { session: null, user: null }, error: null }),
      resend: async (_params: any) => ({ data: {}, error: null }),
    },
    // Storage stub — Supabase Storage removed. Use API routes for file uploads.
    storage: {
      from: (_bucket: string) => ({
        upload: async (_path: string, _file: any, _opts?: any) => {
          console.warn('[storage stub] upload() — use /api routes for file upload');
          return { data: null, error: { message: 'Storage not available. Use API route.' } };
        },
        remove: async (_paths: string[]) => ({ data: null, error: null }),
        getPublicUrl: (_path: string) => ({ data: { publicUrl: '' } }),
        download: async (_path: string) => ({ data: null, error: { message: 'Not available' } }),
        list: async (_prefix?: string) => ({ data: [], error: null }),
      }),
    },
  };

  return _client;
}