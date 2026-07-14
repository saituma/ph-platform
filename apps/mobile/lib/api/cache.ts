type ApiCacheEntry = { data: any; savedAt: number };
const apiCache = new Map<string, ApiCacheEntry>();

export const hashString = (value: string) => {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

/** No-op — cache is in-memory only (no disk persistence for security). */
export const hydrateCache = () => Promise.resolve();

/** No-op — cache is in-memory only (no disk persistence for security). */
export function persistCache() {}

export function clearApiCache() {
  apiCache.clear();
}

/**
 * Drop cached GETs for a resource after writing to it.
 *
 * GET responses are cached for minutes, so a write followed by a refetch used to replay the
 * pre-write body: opting into team features, assigning a program, and logging a progress entry
 * all appeared to do nothing. Callers invalidate their client-side query cache, but the HTTP
 * layer underneath has to be invalidated too or it just serves the stale answer back.
 */
export function invalidateCachedPath(pathPrefix: string) {
  if (!pathPrefix) return;
  for (const key of [...apiCache.keys()]) {
    if (key.includes(pathPrefix)) apiCache.delete(key);
  }
}

export function getCachedData<T>(cacheKey: string, ttlMs: number): T | null {
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < ttlMs) {
    return cached.data as T;
  }
  if (cached) {
    apiCache.delete(cacheKey);
  }
  return null;
}

export function setCachedData(cacheKey: string, data: any) {
  apiCache.set(cacheKey, { data, savedAt: Date.now() });
  persistCache();
}
