function workerBase() {
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.VITE_BETTER_AUTH_URL ??
    ""
  )
    .trim()
    .replace(/\/+$/, "");
}

export default async function (request: Request): Promise<Response> {
  const base = workerBase();
  if (!base) {
    return new Response(
      JSON.stringify({ error: "BETTER_AUTH_URL is not configured." }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const url = new URL(request.url);
  const target = `${base}${url.pathname}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete("accept-encoding");
  headers.delete("host");

  // Read auth_token from httpOnly cookie and forward as Authorization header
  if (!headers.has("Authorization")) {
    const cookieHeader = headers.get("cookie") || "";
    const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
    if (match?.[1]) {
      headers.set("Authorization", `Bearer ${match[1]}`);
    }
  }

  const method = request.method;
  const body = method !== "GET" && method !== "HEAD"
    ? await request.arrayBuffer()
    : undefined;

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
      JSON.stringify({ error: "Failed to reach BETTER_AUTH_URL upstream.", upstream: base }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
