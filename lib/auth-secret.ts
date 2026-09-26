/**
 * Edge-safe accessor for the JWT signing secret.
 * Shared by lib/auth.ts (Node) and lib/supabase/middleware.ts (Edge).
 *
 * AUTH_SECRET is required — there is deliberately no fallback, so a missing
 * secret fails loudly instead of silently signing sessions with a public value.
 */

let cached: Uint8Array | null = null;

export function getAuthSecret(): Uint8Array {
  if (cached) return cached;

  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET is not set or shorter than 32 characters');
  }

  cached = new TextEncoder().encode(secret);
  return cached;
}
