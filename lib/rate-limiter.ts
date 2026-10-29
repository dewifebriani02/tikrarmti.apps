import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// In-memory fallback for rate limiting when Redis is not available
const inMemoryCache = new Map<string, { count: number; timestamp: number }>();

// Try to create Redis client, fallback to null if not configured
let redis: Redis | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv();
  } else if (process.env.NODE_ENV === 'production') {
    // In production, rate limiting must be active — log a startup warning
    console.error(
      '[rate-limiter] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set. ' +
      'Rate limiting is DISABLED. Set these env vars to protect the application.'
    );
  } else {
    console.warn('[rate-limiter] Redis not configured, using in-memory rate limiting (dev only).');
  }
} catch (error) {
  console.warn('[rate-limiter] Failed to initialize Redis, falling back to in-memory rate limiting:', error);
}

// Create a new ratelimiter that allows 10 requests per 10 seconds
export const ratelimit = redis ? new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
}) : null;

// For registration and login endpoints - moderate limits
export const authRateLimit = redis ? new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(50, "60 s"), // 50 requests per minute - generous for shared IPs
  analytics: true,
}) : null;

// Per-account login attempts (keyed by email) — slows down password guessing
export const LOGIN_EMAIL_LIMIT = { max: 10, windowSec: 15 * 60 };
export const loginEmailRateLimit = redis ? new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(LOGIN_EMAIL_LIMIT.max, `${LOGIN_EMAIL_LIMIT.windowSec} s`),
  analytics: true,
  prefix: 'ratelimit:login-email',
}) : null;

// For general API endpoints
export const generalApiRateLimit = redis ? new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(1000, "60 s"), // 1000 requests per minute
  analytics: true,
}) : null;

// For admin endpoints — per user ID to prevent DoS from compromised accounts
export const adminRateLimit = redis ? new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(2000, "60 s"), // 2000 requests per minute
  analytics: true,
}) : null;

// In-memory rate limiter fallback
function checkInMemoryLimit(
  identifier: string,
  window: number,
  max: number
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const key = `${identifier}:${window}:${max}`;
  const record = inMemoryCache.get(key);

  // Keep the fallback map from growing forever
  if (inMemoryCache.size > 10_000) {
    inMemoryCache.forEach((v, k) => {
      if (now - v.timestamp > 60 * 60 * 1000) inMemoryCache.delete(k);
    });
  }

  if (!record || now - record.timestamp > window * 1000) {
    inMemoryCache.set(key, { count: 1, timestamp: now });
    return {
      success: true,
      limit: max,
      remaining: max - 1,
      reset: Math.ceil((now + window * 1000) / 1000),
    };
  }

  if (record.count >= max) {
    return {
      success: false,
      limit: max,
      remaining: 0,
      reset: Math.ceil((record.timestamp + window * 1000) / 1000),
    };
  }

  record.count++;
  return {
    success: true,
    limit: max,
    remaining: max - record.count,
    reset: Math.ceil((record.timestamp + window * 1000) / 1000),
  };
}

// Universal rate limit checker with fallback
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit | null,
  endpoint?: string,
  fallback: { windowSec: number; max: number } = { windowSec: 120, max: 200 }
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  let result;

  if (redis && limiter) {
    try {
      result = await limiter.limit(identifier);
    } catch (error) {
      // Redis outage must not take the endpoint down (e.g. login) — degrade to the
      // per-process limiter instead of failing open or throwing.
      console.error('[rate-limiter] Redis limiter failed, using in-memory fallback:', error);
      result = checkInMemoryLimit(identifier, fallback.windowSec, fallback.max);
    }
  } else {
    // In-memory fallback (per process). Defaults are generous for shared IPs;
    // per-account limits pass their own stricter window.
    result = checkInMemoryLimit(identifier, fallback.windowSec, fallback.max);
  }

  // Log rate limit exceeded events
  if (!result.success && endpoint) {
    try {
      const { logSecurity } = await import('./logger');
      await logSecurity.rateLimitExceeded(
        identifier,
        endpoint,
        undefined // user_agent would need to be passed separately
      );
    } catch (error) {
      // Don't fail rate limiting if logging fails
      console.warn('Failed to log rate limit event:', error);
    }
  }

  return result;
}

/**
 * Clear a limiter's counter for `identifier` (e.g. per-account login attempts after a
 * successful login or password reset). Pass the same fallback used in checkRateLimit.
 * Never throws.
 */
export async function resetRateLimit(
  identifier: string,
  limiter: Ratelimit | null,
  fallback: { windowSec: number; max: number } = { windowSec: 120, max: 200 }
): Promise<void> {
  inMemoryCache.delete(`${identifier}:${fallback.windowSec}:${fallback.max}`);
  if (redis && limiter) {
    try {
      await limiter.resetUsedTokens(identifier);
    } catch (error) {
      console.error('[rate-limiter] Failed to reset Redis limiter:', error);
    }
  }
}

// Get client IP from request
export function getClientIP(request: Request): string {
  return getClientIPFromHeaders(request.headers);
}

// Get client IP from a Headers object (e.g. next/headers in server actions)
export function getClientIPFromHeaders(headers: Headers): string {
  // Try to get IP from various headers
  const forwarded = headers.get("x-forwarded-for");
  const realIP = headers.get("x-real-ip");
  const ip = headers.get("x-client-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (ip) {
    return ip;
  }

  // Fallback to a default if no IP found
  return "127.0.0.1";
}