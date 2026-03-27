import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const rawBase = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const apiBase = rawBase.replace(/\/api\/?$/, "");

const buildCookieOptions = (req: NextRequest) => {
  const host = req.headers.get("host") ?? "";
  const isLocalhost = host.includes("localhost") || host.startsWith("127.0.0.1");
  const secure = process.env.NODE_ENV === "production" && !isLocalhost;
  return {
    secure,
    sameSite: "lax" as const,
    path: "/",
  };
};

const clearSessionCookies = (response: NextResponse) => {
  response.cookies.set("accessToken", "", { path: "/", maxAge: 0 });
  response.cookies.set("accessTokenClient", "", { path: "/", maxAge: 0 });
  response.cookies.set("refreshToken", "", { path: "/", maxAge: 0 });
  return response;
};

async function validateAccessToken(token: string) {
  const res = await fetch(`${apiBase}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  return res.ok;
}

async function refreshSession(refreshToken: string) {
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
}

export async function GET(req: NextRequest) {
  if (!apiBase) {
    return NextResponse.json({ error: "API base URL not configured" }, { status: 500 });
  }

  const accessToken = req.cookies.get("accessToken")?.value ?? req.cookies.get("accessTokenClient")?.value ?? "";
  const refreshToken = req.cookies.get("refreshToken")?.value ?? "";

  if (accessToken && (await validateAccessToken(accessToken))) {
    return NextResponse.json({ authenticated: true });
  }

  if (!refreshToken) {
    return clearSessionCookies(NextResponse.json({ authenticated: false }, { status: 401 }));
  }

  const refreshed = await refreshSession(refreshToken);
  if (!refreshed) {
    return clearSessionCookies(NextResponse.json({ authenticated: false }, { status: 401 }));
  }

  const response = NextResponse.json({ authenticated: true });
  const cookieOptions = buildCookieOptions(req);
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
