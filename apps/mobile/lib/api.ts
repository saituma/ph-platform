import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { store } from "@/store";
import {
  hashString,
  hydrateCache,
  getCachedData,
  setCachedData,
  clearApiCache,
} from "./api/cache";
import { isTransportFailure, extractErrorMessage } from "./api/errorUtils";
import {
  getToken,
  refreshAccessToken,
  clearCredentials,
} from "./auth/session";

export { clearApiCache };

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
  suppressLog?: boolean;
  suppressStatusCodes?: number[];
  skipAuthRefresh?: boolean;
  skipSessionInvalidateOn401?: boolean;
  skipCache?: boolean;
  forceRefresh?: boolean;
  timeoutMs?: number;
};

let cacheHydrationPromise: Promise<void> | null = hydrateCache();

export function prefetchApi<T>(
  path: string,
  options: ApiRequestOptions = {},
): void {
  apiRequest<T>(path, {
    ...options,
    suppressLog: true,
    forceRefresh: true,
  }).catch(() => {});
}

const normalizeBaseUrls = (baseUrl: string) => {
  const trimmed = baseUrl.replace(/\/+$/, "");
  const hasApiSuffix = trimmed.endsWith("/api");
  const withApi = hasApiSuffix ? trimmed : `${trimmed}/api`;
  const withoutApi = hasApiSuffix ? trimmed.replace(/\/api$/, "") : trimmed;
  return { withApi, withoutApi };
};

const parseJsonSafe = (text: string) => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error("API base URL not configured");
  }

  const { withApi, withoutApi } = normalizeBaseUrls(baseUrl);
  const apiBaseUrl = withApi;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${apiBaseUrl}${normalizedPath}`;
  const fallbackBaseUrl = withoutApi !== withApi ? withoutApi : null;
  const fallbackUrl = fallbackBaseUrl
    ? `${fallbackBaseUrl}${normalizedPath}`
    : null;

  // Prefer explicitly-passed token, then Redux, then SecureStore (via session).
  let resolvedToken: string | null =
    options.token !== undefined ? options.token : store.getState().user.token;
  if (!resolvedToken) {
    resolvedToken = await getToken();
  }

  const fetchRequest = async (requestUrl: string, authToken?: string | null) => {
    const controller = new AbortController();
    const timeoutMs = Number.isFinite(options.timeoutMs)
      ? (options.timeoutMs as number)
      : 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(requestUrl, {
        method: options.method ?? "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          ...(authToken ? { Authorization: `Bearer ${authToken.trim()}` } : {}),
          ...(options.headers ?? {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const method = options.method ?? "GET";
  const tokenKey = resolvedToken ? hashString(resolvedToken) : "anon";
  const headerVariant = (() => {
    const headers = options.headers;
    if (!headers) return "";
    const normalized = Object.entries(headers)
      .filter(([, v]) => typeof v === "string" && v.trim().length)
      .map(([k, v]) => [k.trim().toLowerCase(), v.trim()] as const)
      .sort((a, b) => a[0].localeCompare(b[0]));
    if (!normalized.length) return "";
    return `:h=${hashString(JSON.stringify(normalized))}`;
  })();

  const cacheKey = `${tokenKey}:${method}:${url}${headerVariant}`;

  const shouldReadCache =
    method === "GET" && !options.skipCache && !options.forceRefresh;
  if (shouldReadCache) {
    if (cacheHydrationPromise) {
      await cacheHydrationPromise;
      cacheHydrationPromise = null;
    }
    const cached = getCachedData<T>(cacheKey, 5 * 60 * 1000);
    if (cached) return cached;
  }

  const performRequest = async (authToken?: string | null) => {
    let res: Response;
    try {
      res = await fetchRequest(url, authToken);
    } catch (error) {
      const isAbort =
        !!error &&
        typeof error === "object" &&
        "name" in error &&
        (error as { name: string }).name === "AbortError";
      const timeoutMs = Number.isFinite(options.timeoutMs)
        ? (options.timeoutMs as number)
        : 30000;
      const message = isAbort
        ? `Request timed out after ${timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : "Network request failed";
      throw new Error(`Cannot reach API at ${url}. ${message}`);
    }

    let requestUrl = url;
    let text = await res.text();
    if (res.status === 404 && fallbackUrl) {
      try {
        const fallbackRes = await fetchRequest(fallbackUrl, authToken);
        res = fallbackRes;
        requestUrl = fallbackUrl;
        text = await fallbackRes.text();
      } catch {
        // keep original
      }
    }
    return { res, requestUrl, text };
  };

  let { res, requestUrl, text } = await performRequest(resolvedToken);

  const shouldRetryOnce =
    method === "GET" &&
    (res.status === 502 || res.status === 503 || res.status === 504);
  if (shouldRetryOnce) {
    await new Promise((r) => setTimeout(r, 650));
    ({ res, requestUrl, text } = await performRequest(resolvedToken));
  }

  const shouldTryRefresh =
    res.status === 401 &&
    Boolean(resolvedToken) &&
    !options.skipAuthRefresh &&
    normalizedPath !== "/auth/refresh";
  if (shouldTryRefresh) {
    try {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        ({ res, requestUrl, text } = await performRequest(refreshedToken));
      }
    } catch (e) {
      if (isTransportFailure(e)) {
        const message =
          e instanceof Error ? e.message : "Network request failed";
        throw new Error(`Cannot reach API at ${url}. ${message}`);
      }
    }
  }

  const payload = parseJsonSafe(text);
  if (!res.ok) {
    const shouldInvalidateSession =
      res.status === 401 &&
      !options.skipAuthRefresh &&
      normalizedPath !== "/auth/login" &&
      !options.skipSessionInvalidateOn401;
    if (shouldInvalidateSession) {
      void clearCredentials();
    }
    let message = extractErrorMessage(text, payload);
    if (payload?.upstreamStatus && Number.isFinite(payload.upstreamStatus)) {
      message = `${message} (upstream ${payload.upstreamStatus})`;
    }
    if (
      payload?.hint &&
      typeof payload.hint === "string" &&
      payload.hint.trim().length
    ) {
      message = `${message} — ${payload.hint.trim()}`;
    }
    const details =
      payload?.details?.fieldErrors ||
      payload?.details?.formErrors ||
      payload?.details;
    if (details) {
      try {
        const detailText =
          typeof details === "string" ? details : JSON.stringify(details);
        message = `${message}: ${detailText}`;
      } catch {
        // ignore
      }
    }
    const shouldSuppress =
      options.suppressLog ||
      (options.suppressStatusCodes ?? []).includes(res.status);
    if (!shouldSuppress) {
      console.warn("API error", {
        url: requestUrl,
        status: res.status,
        message,
      });
    }
    throw new Error(`${res.status} ${message}`);
  }
  if (payload === null) {
    throw new Error("Invalid response from server");
  }

  const shouldWriteCache = method === "GET" && !options.skipCache;
  if (shouldWriteCache) {
    setCachedData(cacheKey, payload);
  }

  return payload as T;
}
