import { createHash, timingSafeEqual } from 'crypto';

/** httpOnly cookie holding the OAuth CSRF nonce between /api/auth/google and /auth/callback */
export const OAUTH_STATE_COOKIE = 'mti_oauth_state';
export const OAUTH_STATE_MAX_AGE = 10 * 60; // seconds

/** Constant-time comparison of the nonce from `state` with the one in the cookie. */
export function oauthNonceMatches(fromState: unknown, fromCookie: string | undefined): boolean {
  if (typeof fromState !== 'string' || !fromState || !fromCookie) return false;
  const a = createHash('sha256').update(fromState).digest();
  const b = createHash('sha256').update(fromCookie).digest();
  return timingSafeEqual(a, b);
}
