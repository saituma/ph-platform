/** Thrown when `/api/auth/me` returns 401 — session invalid or expired. */
export const PORTAL_UNAUTHORIZED_ERROR = "UNAUTHORIZED";

/** Thrown when `/api/auth/me` returns 503 — API up but database unreachable (e.g. Neon paused, ECONNRESET). */
export const PORTAL_SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE";
