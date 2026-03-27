import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const rawBase = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const apiBase = rawBase.replace(/\/api\/?$/, "");
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
  const refreshToken = req.cookies.get("refreshToken")?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  const res = await fetch(`${apiBase}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ error: data?.error ?? "Refresh failed" }, { status: res.status });
  }

  const data = await res.json();
  const accessToken = (data.accessToken as string | undefined) ?? (data.idToken as string | undefined);
  const nextRefreshToken = data.refreshToken as string | undefined;
  const expiresIn = data.expiresIn as number | undefined;

  if (!accessToken) {
    return NextResponse.json({ error: "Refresh failed" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  const host = req.headers.get("host") ?? "";
  const isLocalhost = host.includes("localhost") || host.startsWith("127.0.0.1");
  const secure = process.env.NODE_ENV === "production" && !isLocalhost;

  // 7-day cookie lifetime as safety net; auto-refresh keeps it fresh.
  const maxAge = expiresIn ?? 60 * 60 * 24 * 7;

  response.cookies.set("accessToken", accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  response.cookies.set("accessTokenClient", accessToken, {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  if (typeof nextRefreshToken === "string" && nextRefreshToken.trim().length > 0) {
    response.cookies.set("refreshToken", nextRefreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}
