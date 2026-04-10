import AsyncStorage from "@react-native-async-storage/async-storage";

type ApiCacheEntry = { data: any; savedAt: number };
const apiCache = new Map<string, ApiCacheEntry>();
const ASYNC_CACHE_KEY = "ph_api_cache_v2";

export const hashString = (value: string) => {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

export const hydrateCache = () =>
  Promise.resolve(AsyncStorage?.getItem?.(ASYNC_CACHE_KEY))
    .then((stored: string | null | undefined) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Record<string, any>;
          const now = Date.now();
          for (const [key, value] of Object.entries(parsed)) {
            if (!value || typeof value !== "object") continue;
            const legacyExpiry =
              typeof value.expiry === "number" ? value.expiry : null;
            if (legacyExpiry !== null && legacyExpiry < now) continue;
            const data = "data" in value ? value.data : value;
            const savedAt =
              typeof value.savedAt === "number" ? value.savedAt : now;
            apiCache.set(key, { data, savedAt });
          }
        } catch {
          // ignore parsing errors
        }
      }
    })
    .catch(() => {});

export function persistCache() {
  const obj = Object.fromEntries(apiCache.entries());
  Promise.resolve(
    AsyncStorage?.setItem?.(ASYNC_CACHE_KEY, JSON.stringify(obj)),
  ).catch(() => {});
}

export function clearApiCache() {
  apiCache.clear();
  Promise.resolve(AsyncStorage?.removeItem?.(ASYNC_CACHE_KEY)).catch(() => {});
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
