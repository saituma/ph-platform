import { NextResponse } from "next/server";

const rawBase = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const apiBase = rawBase.replace(/\/api\/?$/, "");
const csrfCookieName = "csrfToken";

function validateCsrf(req: Request) {
  const csrfCookie = (req.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${csrfCookieName}=`))
    ?.split("=")[1];
  const csrfHeader = req.headers.get("x-csrf-token") ?? "";
  return Boolean(csrfCookie && csrfHeader && csrfCookie === csrfHeader);
}

export async function POST(req: Request) {
  if (!validateCsrf(req)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  const body = await req.json();
  const res = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ error: data?.error ?? "Login failed" }, { status: res.status });
  }

  const data = await res.json();
  const accessToken = (data.accessToken as string | undefined) ?? (data.idToken as string | undefined);
  const refreshToken = data.refreshToken as string | undefined;
  const expiresIn = data.expiresIn as number | undefined;

  if (!accessToken) {
    return NextResponse.json({ error: "Login failed" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  const host = req.headers.get("host") ?? "";
  const isLocalhost = host.includes("localhost") || host.startsWith("127.0.0.1");
  const secure = process.env.NODE_ENV === "production" && !isLocalhost;
  // 7-day cookie lifetime; auto-refresh keeps it fresh before actual expiry.
  const cookieMaxAge = 60 * 60 * 24 * 7;
  response.cookies.set("accessToken", accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: cookieMaxAge,
  });
  // Non-httpOnly token for Socket.IO auth (client-side access).
  response.cookies.set("accessTokenClient", accessToken, {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: cookieMaxAge,
  });

  if (refreshToken) {
    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}
