import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const csrfCookieName = "csrfToken";

function validateCsrf(req: NextRequest) {
  const csrfCookie = req.cookies.get(csrfCookieName)?.value ?? "";
  const csrfHeader = req.headers.get("x-csrf-token") ?? "";
  return csrfCookie.length > 0 && csrfCookie === csrfHeader;
}

export async function POST(req: NextRequest) {
  if (!validateCsrf(req)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set("accessToken", "", { path: "/", maxAge: 0 });
  response.cookies.set("accessTokenClient", "", { path: "/", maxAge: 0 });
  response.cookies.set("refreshToken", "", { path: "/", maxAge: 0 });
  return response;
}
