import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/api/auth/login", "/api/auth/logout"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/backend") ||
    publicPaths.includes(pathname)
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("accessToken")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
