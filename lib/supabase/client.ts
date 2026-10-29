'use client';

/**
 * lib/supabase/client.ts — Browser-side shim (NO Supabase dependency)
 *
 * Previously used @supabase/ssr createBrowserClient.
 * Now returns a stub since all data access goes through Next.js API routes
 * (which use the server-side pg client). Reads resolve to empty results; writes
 * (insert/update/upsert/delete) reject with BrowserWriteNotSupportedError and rpc()
 * returns an error, so a missed migration fails loudly instead of losing data.
 *
 * Auth state in the browser is managed by our native JWT cookie —
 * no client-side Supabase auth needed.
 */

// Singleton stub — browser code that calls createClient() gets a harmless object
let _client: any = null;

const WRITE_METHODS = new Set(['insert', 'update', 'upsert', 'delete']);

/** Thrown when browser code tries to write through the shim — writes must go through an API route. */
export class BrowserWriteNotSupportedError extends Error {
  constructor(method: string, table: string) {
    super(
      `Penyimpanan data dari browser tidak didukung (${method} pada "${table}"). ` +
      'Gunakan API route.'
    );
    this.name = 'BrowserWriteNotSupportedError';
  }
}

/**
 * Supabase-style chain for browser code. Reads resolve to empty results so legacy
 * read-only screens don't crash, but any write (insert/update/upsert/delete) REJECTS:
 * silently "succeeding" without saving (as before) made users believe data was stored.
 */
function createQueryChain(table: string, writeMethod: string | null = null): any {
  const settle = (empty: { data: any; error: null }) =>
    writeMethod
      ? Promise.reject(new BrowserWriteNotSupportedError(writeMethod, table))
      : Promise.resolve(empty);

  const handler: any = {
    then: (resolve: any, reject: any) => settle({ data: [], error: null }).then(resolve, reject),
    single: () => settle({ data: null, error: null }),
    maybeSingle: () => settle({ data: null, error: null }),
  };
  return new Proxy(handler, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'string' && WRITE_METHODS.has(prop)) {
        return () => {
          console.error(`[pg-client] ${prop}() on "${table}" called from the browser — use an API route`);
          return createQueryChain(table, prop);
        };
      }
      return () => createQueryChain(table, writeMethod);
    }
  });
}

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
    from: (table: string) => {
      console.warn('[pg-client] from() called on browser client — use API routes instead');
      return createQueryChain(table);
    },
    rpc: (fnName: string) => {
      // RPCs may write (e.g. exec_sql) — report failure instead of pretending to succeed
      console.error(`[pg-client] rpc("${fnName}") called from the browser — use an API route`);
      return Promise.resolve({
        data: null,
        error: { message: `RPC "${fnName}" tidak didukung dari browser. Gunakan API route.`, code: 'BROWSER_RPC_NOT_SUPPORTED' },
      });
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
              body: JSON.stringify({ newPassword: attrs.password, currentPassword: attrs.currentPassword }),
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
