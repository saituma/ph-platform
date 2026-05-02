import { isTokenExpired } from "./token-expiry";

const AUTH_TOKEN_KEY = "ph_auth_token";

/**
 * Client-only onboarding stores the API access token in browser storage and
 * sends it to apps/api with Authorization headers.
 */
export function getClientAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

export type TokenStatus = {
  authenticated: boolean;
  expiresAt: number | null;
};

export async function getTokenStatus(): Promise<TokenStatus> {
  const token = getClientAuthToken();
  if (!token || isTokenExpired(token)) {
    await clearAuthToken();
    return { authenticated: false, expiresAt: null };
  }

  const payload = parseJwtPayload(token);
  const expiresAt = typeof payload?.exp === "number" ? payload.exp * 1000 : null;
  return { authenticated: true, expiresAt };
}

export function getAuthHeaders(): HeadersInit {
  const token = getClientAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}
