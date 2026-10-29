/**
 * Validate a post-login / post-action redirect target taken from the URL.
 *
 * Only same-origin relative paths are allowed ("/dashboard?tab=1"). Absolute URLs,
 * protocol-relative URLs ("//evil.com"), backslash tricks ("/\evil.com") and
 * scheme URLs ("javascript:...") fall back to `fallback`.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || typeof value !== 'string') return fallback;

  const target = value.trim();
  // Must be a single leading slash; reject "//", "/\" and control characters
  if (!target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(target)) return fallback;

  try {
    const base = 'http://safe-redirect.invalid';
    const url = new URL(target, base);
    if (url.origin !== base) return fallback;
    const result = `${url.pathname}${url.search}${url.hash}`;
    // Normalization can turn "/.//evil.com" or "/a/..//evil.com" into "//evil.com",
    // which browsers treat as protocol-relative — re-check the final value.
    if (!result.startsWith('/') || result.startsWith('//') || result.startsWith('/\\')) return fallback;
    return result;
  } catch {
    return fallback;
  }
}
