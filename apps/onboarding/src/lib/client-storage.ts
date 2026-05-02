/**
 * Auth token storage — migrated from localStorage to httpOnly cookies.
 * The token is stored server-side in a cookie and sent automatically with requests.
 * These helpers interact with the server-side cookie endpoints.
 */

/**
 * Returns null always — the token is in an httpOnly cookie and not accessible from JS.
 * Kept for backward-compat with code that checks truthiness.
 * Use `getTokenStatus()` to check if authenticated.
 */
export function getClientAuthToken(): string | null {
  return null;
}

/**
 * Stores the auth token as an httpOnly cookie via the server endpoint.
 */
export async function setAuthToken(token: string): Promise<void> {
  await fetch("/api/app/set-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token }),
  });
}

/**
 * Clears the auth token cookie via the server endpoint.
 */
export async function clearAuthToken(): Promise<void> {
  await fetch("/api/app/clear-token", {
    method: "POST",
    credentials: "include",
  });
}

export type TokenStatus = {
  authenticated: boolean;
  expiresAt: number | null;
};

/**
 * Checks whether there is a valid auth token in the httpOnly cookie.
 */
export async function getTokenStatus(): Promise<TokenStatus> {
  try {
    const res = await fetch("/api/app/token-status", {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return { authenticated: false, expiresAt: null };
    return await res.json();
  } catch {
    return { authenticated: false, expiresAt: null };
  }
}
