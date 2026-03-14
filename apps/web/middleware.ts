import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/api/auth/login", "/api/auth/logout", "/api/auth/refresh"];
const csrfCookieName = "csrfToken";
const generateCsrfToken = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("accessToken")?.value;
  const csrfToken = req.cookies.get(csrfCookieName)?.value;

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
    const response = NextResponse.next();
    if (!csrfToken) {
      const host = req.headers.get("host") ?? "";
      const isLocalhost = host.includes("localhost") || host.startsWith("127.0.0.1");
      const secure = process.env.NODE_ENV === "production" && !isLocalhost;
      response.cookies.set(csrfCookieName, generateCsrfToken(), {
        httpOnly: false,
        secure,
        sameSite: "lax",
        path: "/",
      });
    }
    return response;
  }

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  if (!csrfToken) {
    const host = req.headers.get("host") ?? "";
    const isLocalhost = host.includes("localhost") || host.startsWith("127.0.0.1");
    const secure = process.env.NODE_ENV === "production" && !isLocalhost;
    response.cookies.set(csrfCookieName, generateCsrfToken(), {
      httpOnly: false,
      secure,
      sameSite: "lax",
      path: "/",
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
