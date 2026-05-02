/**
 * CSRF double-submit cookie utilities.
 *
 * The server sets a `__csrf` cookie on every response. For state-changing
 * requests (POST/PUT/PATCH/DELETE) to protected API endpoints, we must send
 * the same value in the `X-CSRF-Token` header.
 */

const CSRF_COOKIE_NAME = "__csrf";

/** Read the current CSRF token from cookies */
export function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]+)`),
  );
  return match?.[1] ?? "";
}

/**
 * Wrapper around fetch that automatically attaches the CSRF token header
 * for state-changing requests.
 */
export function csrfFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const needsCsrf = !["GET", "HEAD", "OPTIONS"].includes(method);

  if (needsCsrf) {
    const headers = new Headers(init?.headers);
    if (!headers.has("X-CSRF-Token")) {
      headers.set("X-CSRF-Token", getCsrfToken());
    }
    return fetch(input, { ...init, headers });
  }

  return fetch(input, init);
}
