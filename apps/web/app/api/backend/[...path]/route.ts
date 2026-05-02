import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Resolve at request time so Vercel env changes apply without relying only on build-time NEXT_PUBLIC. */
function getApiBase(): string {
  const rawBase = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return rawBase.trim().replace(/\/api\/?$/, "").replace(/\/+$/, "");
}

const csrfCookieName = "csrfToken";

function validateCsrf(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return true;
  const csrfCookie = req.cookies.get(csrfCookieName)?.value ?? "";
  const csrfHeader = req.headers.get("x-csrf-token") ?? "";
  return csrfCookie.length > 0 && csrfCookie === csrfHeader;
}

async function forward(req: NextRequest) {
  const apiBase = getApiBase();
  if (!apiBase) {
    return NextResponse.json({ error: "API base URL not configured" }, { status: 500 });
  }
  if (!validateCsrf(req)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace("/api/backend", "");
  const target = `${apiBase}/api${path}${url.search}`;

  const accessToken = req.cookies.get("accessToken")?.value ?? req.cookies.get("accessTokenClient")?.value;
  const forwardedAuth = req.headers.get("authorization") ?? "";

  const res = await fetch(target, {
    method: req.method,
    headers: {
      "Content-Type": req.headers.get("content-type") ?? "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(forwardedAuth ? { Authorization: forwardedAuth } : {}),
    },
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.text(),
    cache: "no-store",
  });

  const data = await res.text();
  const responseHeaders: Record<string, string> = {
    "Content-Type": res.headers.get("content-type") ?? "application/json",
  };

  // Cache successful GET responses in the browser for 15 seconds, then serve
  // stale while revalidating for up to 45 more seconds. Keeps the UI snappy
  // on page reload without risking stale data after mutations.
  // Real-time paths (messages, threads, videos) skip caching entirely.
  if (req.method === "GET" && res.ok) {
    const p = url.pathname;
    const isRealtime =
      p.includes("/messages") || p.includes("/threads") || p.includes("/videos");
    responseHeaders["Cache-Control"] = isRealtime
      ? "private, no-store"
      : "private, max-age=15, stale-while-revalidate=45";
  }

  return new NextResponse(data, { status: res.status, headers: responseHeaders });
}

export async function GET(req: NextRequest) {
  return forward(req);
}

export async function POST(req: NextRequest) {
  return forward(req);
}

export async function PUT(req: NextRequest) {
  return forward(req);
}

export async function PATCH(req: NextRequest) {
  return forward(req);
}

export async function DELETE(req: NextRequest) {
  return forward(req);
}
