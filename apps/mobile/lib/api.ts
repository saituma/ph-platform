import * as SecureStore from "expo-secure-store";

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
};

const AUTH_REFRESH_KEY = "authRefreshToken";
let refreshInFlight: Promise<string | null> | null = null;

const buildFallbackBaseUrl = (baseUrl: string) => {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (!trimmed.endsWith("/api")) {
    return null;
  }
  return trimmed.slice(0, -4);
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

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${normalizedBaseUrl}${normalizedPath}`;
  const fallbackBaseUrl = buildFallbackBaseUrl(normalizedBaseUrl);
  const fallbackUrl = fallbackBaseUrl ? `${fallbackBaseUrl}${normalizedPath}` : null;

  const fetchRequest = async (requestUrl: string, authToken?: string | null) =>
    fetch(requestUrl, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken.trim()}` } : {}),
        ...(options.headers ?? {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

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

  let { res, requestUrl, text } = await performRequest(options.token);

  const shouldTryRefresh =
    res.status === 401 &&
    Boolean(options.token) &&
    !options.skipAuthRefresh &&
    normalizedPath !== "/auth/refresh";
  if (shouldTryRefresh) {
    const refreshedToken = await refreshAuthToken(normalizedBaseUrl);
    if (refreshedToken) {
      ({ res, requestUrl, text } = await performRequest(refreshedToken));
    }
  }

  const payload = parseJsonSafe(text);
  if (!res.ok) {
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
      console.warn("API error", { url: requestUrl, status: res.status, message });
    }
    throw new Error(`${res.status} ${message}`);
  }
  if (payload === null) {
    console.warn("API invalid response", { url: requestUrl, status: res.status, text });
    throw new Error("Invalid response from server");
  }
  return payload as T;
}
