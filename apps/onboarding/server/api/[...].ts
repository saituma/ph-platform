/**
 * Production catch-all API proxy: /api/* → VITE_PUBLIC_API_URL/api/*
 *
 * Reads the auth_token httpOnly cookie and forwards it as an Authorization
 * header so browser requests don't need localStorage-sourced tokens.
 *
 * In development, the Vite proxy handles /api/* directly (this file is never hit
 * for browser requests in dev).
 *
 * More specific routes (server/api/app/[...].ts, server/api/auth/[...].ts) take
 * precedence over this catch-all in the Vinxi/h3 router.
 */

function apiBase(): string {
  return (process.env.VITE_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
}

export default async function (request: Request): Promise<Response> {
  const base = apiBase();
  if (!base) {
    return new Response(
      JSON.stringify({ error: "VITE_PUBLIC_API_URL is not configured." }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const url = new URL(request.url);
  const target = `${base}${url.pathname}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete("accept-encoding");
  headers.delete("host");

  if (!headers.has("Authorization")) {
    const cookieHeader = headers.get("cookie") ?? "";
    const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
    if (match?.[1]) {
      headers.set("Authorization", `Bearer ${match[1]}`);
    }
  }

  const method = request.method;
  const body = method !== "GET" && method !== "HEAD" ? await request.arrayBuffer() : undefined;

  try {
    const upstream = await fetch(target, { method, headers, body, redirect: "manual" });
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Failed to reach upstream API." }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
