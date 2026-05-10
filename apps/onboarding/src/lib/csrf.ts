/**
 * CSRF double-submit cookie utilities.
 *
 * The server sets a `__csrf` cookie on every response. For state-changing
 * requests (POST/PUT/PATCH/DELETE) to protected API endpoints, we must send
 * the same value in the `X-CSRF-Token` header.
 */

import { CSRF_COOKIE_NAME, ONBOARDING_AUTH_TOKEN_STORAGE_KEY } from "@ph/auth";

/** Read the current CSRF token from cookies */
export function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]+)`),
  );
  return match?.[1] ?? "";
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ONBOARDING_AUTH_TOKEN_STORAGE_KEY);
}

/**
 * Wrapper around fetch that automatically attaches the CSRF token header
 * for state-changing requests, and the Bearer token for cross-origin API calls.
 */
export function csrfFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const needsCsrf = !["GET", "HEAD", "OPTIONS"].includes(method);
  const headers = new Headers(init?.headers);

  if (needsCsrf && !headers.has("X-CSRF-Token")) {
    headers.set("X-CSRF-Token", getCsrfToken());
  }

  if (!headers.has("Authorization")) {
    const token = getStoredToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, { ...init, credentials: "include", headers });
}
