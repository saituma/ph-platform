/**
 * Nitro server middleware: CSRF double-submit cookie protection.
 *
 * - Sets a `__csrf` cookie (httpOnly=false so JS can read it) with a random token.
 * - For state-changing requests (POST/PUT/PATCH/DELETE) to /api/auth/* and /api/app/*,
 *   verifies that the `X-CSRF-Token` header matches the cookie value.
 *
 * GET/HEAD/OPTIONS are always allowed (safe methods).
 */
import { randomBytes } from "node:crypto";

const CSRF_COOKIE_NAME = "__csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const PROTECTED_PREFIXES = ["/api/auth", "/api/app"];
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader.split(";")) {
    const [key, ...rest] = pair.split("=");
    if (key) cookies[key.trim()] = rest.join("=").trim();
  }
  return cookies;
}

export default function csrf(event: {
  node: { req: import("http").IncomingMessage; res: import("http").ServerResponse };
  path: string;
  method: string;
}) {
  const req = event.node.req;
  const res = event.node.res;
  const method = (event.method || req.method || "GET").toUpperCase();
  const path = event.path || req.url || "/";

  const cookies = parseCookies(req.headers.cookie);

  // Ensure the CSRF cookie exists — set it if missing
  if (!cookies[CSRF_COOKIE_NAME]) {
    const token = randomBytes(32).toString("hex");
    res.appendHeader(
      "Set-Cookie",
      `${CSRF_COOKIE_NAME}=${token}; Path=/; SameSite=Lax; Secure`,
    );
    cookies[CSRF_COOKIE_NAME] = token;
  }

  // Only enforce on state-changing methods to protected API paths
  if (SAFE_METHODS.has(method)) return;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (!isProtected) return;

  const cookieToken = cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.statusCode = 403;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "CSRF token mismatch" }));
  }
}
