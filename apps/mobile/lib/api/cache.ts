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
