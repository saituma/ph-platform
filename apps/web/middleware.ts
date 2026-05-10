import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminPortalRole } from "@ph/roles";

const publicPaths = ["/login", "/api/auth/login", "/api/auth/logout", "/api/auth/refresh", "/api/auth/clear-session"];
const csrfCookieName = "csrfToken";
const generateCsrfToken = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getTokenExpiryMs = (token?: string | null) => {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const shouldRefreshAccessToken = (token?: string | null) => {
  const expiryMs = getTokenExpiryMs(token);
  if (!expiryMs) return !token;
  return expiryMs - Date.now() < 60_000;
};

const applyCsrfCookie = (req: NextRequest, response: NextResponse) => {
  const csrfToken = req.cookies.get(csrfCookieName)?.value;
  if (csrfToken) return response;
  const host = req.headers.get("host") ?? "";
  const isLocalhost = host.includes("localhost") || host.startsWith("127.0.0.1");
  const secure = process.env.NODE_ENV === "production" && !isLocalhost;
  response.cookies.set(csrfCookieName, generateCsrfToken(), {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
  });
  return response;
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("accessToken")?.value;

  if (pathname === "/login") {
    if (token) {
      const expiryMs = getTokenExpiryMs(token);
      if (expiryMs && expiryMs > Date.now()) {
        const url = req.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
      const response = applyCsrfCookie(req, NextResponse.next());
      response.cookies.set("accessToken", "", { path: "/", maxAge: 0 });
      response.cookies.set("accessTokenClient", "", { path: "/", maxAge: 0 });
      response.cookies.set("refreshToken", "", { path: "/", maxAge: 0 });
      return response;
    }
    return applyCsrfCookie(req, NextResponse.next());
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/backend") ||
    pathname.startsWith("/invite/") ||
    publicPaths.includes(pathname)
  ) {
    return applyCsrfCookie(req, NextResponse.next());
  }

  const tokenExpired = token ? shouldRefreshAccessToken(token) : true;

  if (!token || tokenExpired) {
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.set("accessToken", "", { path: "/", maxAge: 0 });
    response.cookies.set("accessTokenClient", "", { path: "/", maxAge: 0 });
    response.cookies.set("refreshToken", "", { path: "/", maxAge: 0 });
    return response;
  }

  // Client-side RBAC: verify the token contains an admin-level role
  try {
    const parts = token.split(".");
    if (parts.length >= 2) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { role?: string };
      if (payload.role && !isAdminPortalRole(payload.role)) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }
  } catch {
    // If we can't decode the token role, allow the request through — the API will enforce auth
  }

  return applyCsrfCookie(req, NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
