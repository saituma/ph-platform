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
  const headers = new Headers(request.headers);

  const payload =
    request.method !== "GET" && request.method !== "HEAD"
      ? await request.text()
      : undefined;

  try {
    return await fetch(target, {
      method: request.method,
      headers,
      body: payload,
      redirect: "manual",
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
