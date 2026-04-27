import { createFileRoute } from "@tanstack/react-router";

function workerAuthBase() {
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.VITE_BETTER_AUTH_URL ??
    ""
  )
    .trim()
    .replace(/\/+$/, "");
}

function sanitizeProxyHeaders(incoming: Headers) {
  const headers = new Headers(incoming);
  const hopByHop = [
    "accept-encoding",
    "connection",
    "host",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "content-length",
  ];
  for (const key of hopByHop) headers.delete(key);
  return headers;
}

async function proxyToWorker(request: Request) {
  const base = workerAuthBase();
  if (!base) {
    return new Response(
      JSON.stringify({
        error: "BETTER_AUTH_URL is not configured (Worker URL for Better Auth).",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const url = new URL(request.url);
  const target = `${base}${url.pathname}${url.search}`;
  const headers = sanitizeProxyHeaders(request.headers);
  const method = request.method;
  const shouldSendBody = method !== "GET" && method !== "HEAD";
  const payload = shouldSendBody && request.body ? request.body : undefined;
  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers,
    redirect: "manual",
    body: payload,
  };
  if (payload && typeof ReadableStream !== "undefined" && payload instanceof ReadableStream) {
    init.duplex = "half";
  }

  try {
    const upstream = await fetch(target, init);
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
      JSON.stringify({
        error:
          "Failed to reach BETTER_AUTH_URL upstream. Check Vercel Production env BETTER_AUTH_URL.",
        upstream: base,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => proxyToWorker(request),
      POST: ({ request }) => proxyToWorker(request),
      OPTIONS: ({ request }) => proxyToWorker(request),
    },
  },
});
