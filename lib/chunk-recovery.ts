const CHUNK_RELOAD_STORAGE_KEY = 'mti_chunk_reload_ts';
const CHUNK_RELOAD_COOLDOWN_MS = 15_000;

export function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as { name?: string; message?: string };
  const name = typeof anyErr?.name === 'string' ? anyErr.name : '';
  const message =
    typeof err === 'string'
      ? err
      : typeof anyErr?.message === 'string'
        ? anyErr.message
        : String(err);

  return (
    name === 'ChunkLoadError' ||
    /Loading chunk [\w-]+ failed|Loading CSS chunk [\w-]+ failed|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
      message
    )
  );
}

/**
 * Attempts a single guarded reload on ChunkLoadError so browsers holding stale HTML
 * from before a deployment fetch fresh chunk hashes without entering a reload loop.
 */
export function attemptChunkRecovery(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const lastReload = parseInt(sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY) || '0', 10);
    const now = Date.now();
    if (!Number.isFinite(lastReload) || now - lastReload > CHUNK_RELOAD_COOLDOWN_MS) {
      sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now));
      window.location.reload();
      return true;
    }
  } catch {
    // Ignore storage errors in restricted WebViews
  }
  return false;
}

export async function clearClientCachesAndRedirect(targetUrl = '/login'): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    localStorage.clear();
  } catch {}
  try {
    sessionStorage.clear();
  } catch {}
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    } catch {}
  }
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    } catch {}
  }
  const sep = targetUrl.includes('?') ? '&' : '?';
  window.location.replace(`${targetUrl}${sep}t=${Date.now()}`);
}
