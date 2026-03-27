import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/api/auth/login", "/api/auth/logout", "/api/auth/refresh"];
const csrfCookieName = "csrfToken";
const rawBase = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const apiBase = rawBase.replace(/\/api\/?$/, "");
const generateCsrfToken = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

const buildSessionCookieOptions = (req: NextRequest) => {
  const host = req.headers.get("host") ?? "";
  const isLocalhost = host.includes("localhost") || host.startsWith("127.0.0.1");
  const secure = process.env.NODE_ENV === "production" && !isLocalhost;
  return {
    secure,
    sameSite: "lax" as const,
    path: "/",
  };
};

async function tryRefreshSession(req: NextRequest) {
  const refreshToken = req.cookies.get("refreshToken")?.value;
  if (!refreshToken || !apiBase) return null;

  try {
    const res = await fetch(`${apiBase}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    const accessToken =
      typeof data?.accessToken === "string"
        ? data.accessToken
        : typeof data?.idToken === "string"
          ? data.idToken
          : null;
    if (!accessToken) return null;

    const nextRefreshToken =
      typeof data?.refreshToken === "string" && data.refreshToken.trim().length > 0
        ? data.refreshToken
        : refreshToken;
    const maxAge =
      typeof data?.expiresIn === "number" && Number.isFinite(data.expiresIn) && data.expiresIn > 0
        ? data.expiresIn
        : 60 * 60 * 24 * 7;

    return { accessToken, nextRefreshToken, maxAge };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("accessToken")?.value;

  if (pathname === "/login" && token) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/backend") ||
    publicPaths.includes(pathname)
  ) {
    return applyCsrfCookie(req, NextResponse.next());
  }

  if (!token) {
    const refreshed = await tryRefreshSession(req);
    if (refreshed) {
      const response = applyCsrfCookie(req, NextResponse.next());
      const cookieOptions = buildSessionCookieOptions(req);
      response.cookies.set("accessToken", refreshed.accessToken, {
        httpOnly: true,
        ...cookieOptions,
        maxAge: refreshed.maxAge,
      });
      response.cookies.set("accessTokenClient", refreshed.accessToken, {
        httpOnly: false,
        ...cookieOptions,
        maxAge: refreshed.maxAge,
      });
      response.cookies.set("refreshToken", refreshed.nextRefreshToken, {
        httpOnly: true,
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 30,
      });
      return response;
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return applyCsrfCookie(req, NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
