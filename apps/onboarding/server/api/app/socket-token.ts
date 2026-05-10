/**
 * GET /api/app/socket-token
 *
 * Reads the auth_token httpOnly cookie (which holds the main API JWT), calls the
 * API to issue a 60-second socket token, and returns it to the browser. The
 * browser never sees the long-lived auth_token — only the short-lived socket token.
 */

function getApiBase(): string {
  return (
    process.env.API_BASE_URL ??
    process.env.VITE_PUBLIC_API_URL ??
    ""
  )
    .trim()
    .replace(/\/+$/, "");
}

export default async function (request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
  const authToken = match?.[1] ?? null;

  if (!authToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiBase = getApiBase();
  if (!apiBase) {
    return new Response(JSON.stringify({ error: "API_BASE_URL not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const res = await fetch(`${apiBase}/api/auth/socket-token`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Cache-Control": "no-store",
      },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = (await res.json()) as { token: string; expiresAt: number };
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to reach API" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
