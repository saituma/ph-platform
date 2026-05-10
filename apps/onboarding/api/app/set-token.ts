export const config = { runtime: "edge" };

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { token?: string; maxAgeSeconds?: number };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = body?.token;
  if (!token || typeof token !== "string") {
    return new Response(JSON.stringify({ error: "Missing token" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const maxSessionSeconds = 30 * 24 * 60 * 60;
  const requestedMaxAge =
    typeof body?.maxAgeSeconds === "number" && Number.isFinite(body.maxAgeSeconds)
      ? Math.floor(body.maxAgeSeconds)
      : maxSessionSeconds;
  const maxAge = Math.max(1, Math.min(requestedMaxAge, maxSessionSeconds));

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `auth_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}; Secure`,
    },
  });
}
