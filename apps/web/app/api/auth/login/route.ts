import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const rawBase = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const apiBase = rawBase.trim().replace(/\/api\/?$/, "").replace(/\/+$/, "");

const rawWorker =
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL ?? "";
const workerBase = rawWorker.trim().replace(/\/+$/, "");

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const csrfCookie = cookieStore.get("csrfToken")?.value ?? "";
  const csrfHeader = req.headers.get("x-csrf-token") ?? "";

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    console.error("[login] CSRF failed", {
      hasCsrfCookie: !!csrfCookie,
      hasCsrfHeader: !!csrfHeader,
      match: csrfCookie === csrfHeader,
      cookiePrefix: csrfCookie.slice(0, 8),
      headerPrefix: csrfHeader.slice(0, 8),
    });
    return jsonError(
      !csrfCookie
        ? "Missing CSRF cookie — reload the page and try again"
        : !csrfHeader
          ? "Missing CSRF header"
          : "CSRF token mismatch — reload the page and try again",
      403,
    );
  }

  const body = await req.json();

  let accessToken: string | undefined;
  let refreshToken: string | undefined;

  if (workerBase) {
    const signInRes = await fetch(`${workerBase}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!signInRes.ok) {
      const data = (await signInRes.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      return jsonError(data?.message ?? data?.error ?? "Login failed", signInRes.status);
    }

    const bearer = signInRes.headers.get("set-auth-token")?.trim();
    if (!bearer) {
      return jsonError("Missing auth session from worker", 401);
    }

    const tokenRes = await fetch(`${workerBase}/api/app/token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${bearer}` },
    });

    if (!tokenRes.ok) {
      const data = (await tokenRes.json().catch(() => ({}))) as { error?: string };
      return jsonError(data?.error ?? "Token exchange failed", tokenRes.status);
    }

    const data = (await tokenRes.json()) as {
      accessToken?: string;
      idToken?: string;
      refreshToken?: string;
      expiresIn?: number;
    };
    accessToken = data.accessToken ?? data.idToken;
    refreshToken = data.refreshToken;
  } else {
    const res = await fetch(`${apiBase}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return jsonError(data?.error ?? "Login failed", res.status);
    }

    const data = (await res.json()) as {
      accessToken?: string;
      idToken?: string;
      refreshToken?: string;
      expiresIn?: number;
    };
    accessToken = data.accessToken ?? data.idToken;
    refreshToken = data.refreshToken;
  }

  if (!accessToken) {
    return jsonError("Login failed", 401);
  }

  const response = NextResponse.json({ ok: true });
  const host = req.headers.get("host") ?? "";
  const isLocalhost = host.includes("localhost") || host.startsWith("127.0.0.1");
  const secure = process.env.NODE_ENV === "production" && !isLocalhost;
  const cookieMaxAge = 60 * 60 * 24 * 30;
  response.cookies.set("accessToken", accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: cookieMaxAge,
  });
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
