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

/**
 * Returns a PostgreSQL-backed client that is API-compatible with
 * the Supabase JS client (supports .from().select().eq().single() etc.)
 */
export function createSupabaseAdmin() {
  return createPgClient();
}
