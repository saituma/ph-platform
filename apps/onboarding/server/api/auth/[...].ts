import { authRateLimiter } from "../../../src/lib/rate-limiter";

function workerAuthBase() {
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.VITE_BETTER_AUTH_URL ??
    ""
  )
    .trim()
    .replace(/\/+$/, "");
}

function buildUpstreamHeaders(incoming: Headers) {
  const headers = new Headers();
  const passthrough = [
    "accept",
    "accept-language",
    "authorization",
    "content-type",
    "cookie",
    "origin",
    "referer",
    "user-agent",
    "access-control-request-method",
    "access-control-request-headers",
  ];
  for (const key of passthrough) {
    const value = incoming.get(key);
    if (value) headers.set(key, value);
  }
  return headers;
}

export default async function (request: Request): Promise<Response> {
  // Rate-limit auth requests by IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const { success, limit, remaining, reset } = await authRateLimiter.limit(ip);
  if (!success) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(reset),
        },
      },
    );
  }

  const base = workerAuthBase();
  if (!base) {
    return new Response(
      JSON.stringify({ error: "BETTER_AUTH_URL is not configured." }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const url = new URL(request.url);
  const target = `${base}${url.pathname}${url.search}`;
  const method = request.method;
  const headers = buildUpstreamHeaders(request.headers);
  const shouldSendBody = method !== "GET" && method !== "HEAD";
  const body = shouldSendBody && request.body ? request.body : undefined;
  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers,
    body,
    redirect: "manual",
  };
  if (body && typeof ReadableStream !== "undefined" && body instanceof ReadableStream) {
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
      JSON.stringify({ error: "Failed to reach BETTER_AUTH_URL upstream.", upstream: base }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
