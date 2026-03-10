import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { store } from "@/store";
import { setCredentials } from "@/store/slices/userSlice";

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
  suppressLog?: boolean;
  suppressStatusCodes?: number[];
  skipAuthRefresh?: boolean;
  skipCache?: boolean;
  forceRefresh?: boolean;
};
type ApiCacheEntry = { data: any; savedAt: number };
const apiCache = new Map<string, ApiCacheEntry>();
const ASYNC_CACHE_KEY = "ph_api_cache_v2";

let cacheHydrationPromise: Promise<void> | null = AsyncStorage.getItem(ASYNC_CACHE_KEY)
  .then((stored: string | null) => {
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Record<string, any>;
        const now = Date.now();
        for (const [key, value] of Object.entries(parsed)) {
          if (!value || typeof value !== "object") continue;
          const legacyExpiry = typeof value.expiry === "number" ? value.expiry : null;
          if (legacyExpiry !== null && legacyExpiry < now) continue;
          const data = "data" in value ? value.data : value;
          const savedAt = typeof value.savedAt === "number" ? value.savedAt : now;
          apiCache.set(key, { data, savedAt });
        }
      } catch {
        // ignore parsing errors
      }
    }
  })
  .catch(() => {});

function persistCache() {
  const obj = Object.fromEntries(apiCache.entries());
  AsyncStorage.setItem(ASYNC_CACHE_KEY, JSON.stringify(obj)).catch(() => {});
}

export function clearApiCache() {
  apiCache.clear();
  AsyncStorage.removeItem(ASYNC_CACHE_KEY).catch(() => {});
}

export function prefetchApi<T>(path: string, options: ApiRequestOptions = {}): void {
  apiRequest<T>(path, { ...options, suppressLog: true, forceRefresh: true }).catch(() => {});
}

const AUTH_TOKEN_KEY = "authToken";
const AUTH_REFRESH_KEY = "authRefreshToken";
let refreshInFlight: Promise<string | null> | null = null;

const normalizeBaseUrls = (baseUrl: string) => {
  const trimmed = baseUrl.replace(/\/+$/, "");
  const hasApiSuffix = trimmed.endsWith("/api");
  const withApi = hasApiSuffix ? trimmed : `${trimmed}/api`;
  const withoutApi = hasApiSuffix ? trimmed.replace(/\/api$/, "") : trimmed;
  return { withApi, withoutApi };
};

const extractErrorMessage = (text: string, payload: any) => {
  if (payload?.error || payload?.message) {
    return payload?.error || payload?.message;
  }
  const cannotMatch = text.match(/Cannot\s+(GET|POST|PUT|PATCH|DELETE)\s+([^\s<]+)/i);
  if (cannotMatch) {
    return `${cannotMatch[1].toUpperCase()} ${cannotMatch[2]} not found`;
  }
  return text || "Request failed";
};

const parseJsonSafe = (text: string) => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

async function refreshAuthToken(normalizedBaseUrl: string): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = await SecureStore.getItemAsync(AUTH_REFRESH_KEY);
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${normalizedBaseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return null;
      const payload = parseJsonSafe(await response.text());
      const nextToken = payload?.idToken ?? payload?.accessToken;
      if (!nextToken || typeof nextToken !== "string") return null;

      const nextRefreshToken =
        typeof payload?.refreshToken === "string" && payload.refreshToken.trim().length
          ? payload.refreshToken.trim()
          : refreshToken;
      await SecureStore.setItemAsync(AUTH_REFRESH_KEY, nextRefreshToken);

      const state = store.getState();
      store.dispatch(
        setCredentials({
          token: nextToken,
          refreshToken: nextRefreshToken,
          profile: state.user.profile,
        })
      );
      return nextToken;
    } catch {
      return null;
    }
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
  if (!baseUrl) {
    throw new Error("API base URL not configured");
  }

  const { withApi, withoutApi } = normalizeBaseUrls(baseUrl);
  const apiBaseUrl = withApi;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${apiBaseUrl}${normalizedPath}`;
  const fallbackBaseUrl = withoutApi !== withApi ? withoutApi : null;
  const fallbackUrl = fallbackBaseUrl ? `${fallbackBaseUrl}${normalizedPath}` : null;



  let resolvedToken =
    options.token !== undefined ? options.token : store.getState().user.token;
  if (!resolvedToken) {
    try {
      resolvedToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    } catch {
      // ignore secure store failures, request will go unauthenticated
    }
  }

  const fetchRequest = async (requestUrl: string, authToken?: string | null) =>
    fetch(requestUrl, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        ...(authToken ? { Authorization: `Bearer ${authToken.trim()}` } : {}),
        ...(options.headers ?? {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

  const method = options.method ?? "GET";
  const cacheKey = `${resolvedToken || "anon"}:${url}`;

  const shouldReadCache = method === "GET" && !options.skipCache && !options.forceRefresh;
  if (shouldReadCache) {
    if (cacheHydrationPromise) {
      await cacheHydrationPromise;
      cacheHydrationPromise = null;
    }
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return cached.data as T;
    }
  }

  const performRequest = async (authToken?: string | null) => {
    let res: Response;
    try {
      res = await fetchRequest(url, authToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network request failed";
      throw new Error(`Cannot reach API at ${url}. ${message}`);
    }

    let requestUrl = url;
    let text = await res.text();
    if (res.status === 404 && fallbackUrl) {
      try {
        const fallbackRes = await fetchRequest(fallbackUrl, authToken);
        // Use the fallback response whenever it is reachable so we surface
        // the real downstream status (401/400/etc.), not the initial route miss.
        res = fallbackRes;
        requestUrl = fallbackUrl;
        text = await fallbackRes.text();
      } catch {
        // keep original response if fallback is unreachable
      }
    }
    return { res, requestUrl, text };
  };

  let { res, requestUrl, text } = await performRequest(resolvedToken);

  const shouldTryRefresh =
    res.status === 401 &&
    Boolean(resolvedToken) &&
    !options.skipAuthRefresh &&
    normalizedPath !== "/auth/refresh";
  if (shouldTryRefresh) {
    const refreshedToken = await refreshAuthToken(apiBaseUrl);
    if (refreshedToken) {
      ({ res, requestUrl, text } = await performRequest(refreshedToken));
    }
  }

  const payload = parseJsonSafe(text);
  if (!res.ok) {
    if (res.status === 401 && !options.skipAuthRefresh && normalizedPath !== "/auth/login") {
      // Do not force logout on 401. Keep the session so users only log out explicitly.
      // The request will surface the 401 error to the caller for handling/retry.
    }
    let message = extractErrorMessage(text, payload);
    const details =
      payload?.details?.fieldErrors || payload?.details?.formErrors || payload?.details;
    if (details) {
      try {
        const detailText = typeof details === "string" ? details : JSON.stringify(details);
        message = `${message}: ${detailText}`;
      } catch {
        // ignore detail formatting errors
      }
    }
    const shouldSuppress =
      options.suppressLog ||
      (options.suppressStatusCodes ?? []).includes(res.status);
    if (!shouldSuppress) {
      if (__DEV__) {
        const tokenHint =
          resolvedToken && typeof resolvedToken === "string"
            ? `len:${resolvedToken.length} ${resolvedToken.slice(0, 8)}…`
            : "none";
        console.warn("API auth debug", { url: requestUrl, status: res.status, token: tokenHint });
      }
      console.warn("API error", { url: requestUrl, status: res.status, message });
    }
    throw new Error(`${res.status} ${message}`);
  }
  if (payload === null) {
    console.warn("API invalid response", { url: requestUrl, status: res.status, text });
    throw new Error("Invalid response from server");
  }
  
  const shouldWriteCache = method === "GET" && !options.skipCache;
  if (shouldWriteCache) {
    apiCache.set(cacheKey, { data: payload, savedAt: Date.now() });
    persistCache();
  }

  return payload as T;
}
