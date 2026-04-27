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

export default async function (request: Request): Promise<Response> {
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
  const headers = sanitizeProxyHeaders(request.headers);
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
