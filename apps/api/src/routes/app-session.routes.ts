import { Router } from "express";
import type { Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt";

const router = Router();

const COOKIE_NAME = "ph_app_session";
const CSRF_COOKIE = "__csrf";
const IS_PROD = process.env.NODE_ENV === "production";

function readCookie(cookieHeader: unknown, name: string): string | null {
  if (typeof cookieHeader !== "string") return null;
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === name) {
      const value = rawValue.join("=");
      return value ? decodeURIComponent(value) : null;
    }
  }
  return null;
}

// GET /api/app/token-status
// Returns whether the httpOnly session cookie holds a valid JWT.
export async function getAppTokenStatus(req: Request, res: Response) {
  const token = readCookie(req.headers.cookie, COOKIE_NAME);
  if (!token) return res.json({ authenticated: false, expiresAt: null });
  try {
    const payload = await verifyAccessToken(token);
    const exp = typeof payload.exp === "number" ? payload.exp : null;
    if (exp && exp < Math.floor(Date.now() / 1000)) {
      return res.json({ authenticated: false, expiresAt: null });
    }
    return res.json({ authenticated: true, expiresAt: exp });
  } catch {
    return res.json({ authenticated: false, expiresAt: null });
  }
}

// POST /api/app/set-token
// Mirrors a JWT into an httpOnly cookie for CSRF-safe requests.
export function setAppToken(req: Request, res: Response) {
  const { token, maxAgeSeconds } = req.body ?? {};
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "token required" });
  }
  const maxAge = typeof maxAgeSeconds === "number" && maxAgeSeconds > 0
    ? maxAgeSeconds
    : 30 * 24 * 60 * 60;

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "none" : "lax",
    maxAge: maxAge * 1000,
    path: "/",
  });

  // Set CSRF double-submit cookie (readable by JS)
  const csrf = Math.random().toString(36).slice(2) + Date.now().toString(36);
  res.cookie(CSRF_COOKIE, csrf, {
    httpOnly: false,
    secure: IS_PROD,
    sameSite: IS_PROD ? "none" : "lax",
    maxAge: maxAge * 1000,
    path: "/",
  });

  return res.json({ ok: true });
}

// POST /api/app/clear-token
// Clears the session cookie on logout.
export function clearAppToken(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.clearCookie(CSRF_COOKIE, { path: "/" });
  return res.json({ ok: true });
}

router.get("/app/token-status", getAppTokenStatus);
router.post("/app/set-token", setAppToken);
router.post("/app/clear-token", clearAppToken);
router.post("/app/logout", clearAppToken);

export default router;
