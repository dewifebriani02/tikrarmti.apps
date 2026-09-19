/**
 * lib/supabase.ts — Shim layer (NO Supabase dependency)
 *
 * Previously used @supabase/supabase-js → PostgREST.
 * Now uses lib/pg-query-builder.ts → pg pool → PostgreSQL directly.
 *
 * All API routes import `createSupabaseAdmin` from here; the interface
 * is identical so no route files need to change.
 */

import { createPgClient } from '@/lib/pg-query-builder';

// Re-export for any code that imports Database type
export type Database = any;

// Legacy env vars kept for reference but no longer used
export const supabaseUrl = process.env.INTERNAL_DB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://markaztikrar.id';
export const supabaseAnonKey = process.env.INTERNAL_DB_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Returns a PostgreSQL-backed client that is API-compatible with
 * the Supabase JS client (supports .from().select().eq().single() etc.)
 */
export function createSupabaseAdmin() {
  return createPgClient();
}
