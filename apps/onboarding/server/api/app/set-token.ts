import { decodeJwt } from "jose";

/**
 * POST /api/app/set-token
 * Receives { token } in the body, sets it as an httpOnly cookie.
 */
export default async function (request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { token?: string };
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

  // Decode JWT to get exp claim for cookie MaxAge
  let maxAge = 7 * 24 * 60 * 60; // default 7 days
  try {
    const payload = decodeJwt(token);
    if (typeof payload.exp === "number") {
      const secondsUntilExpiry = payload.exp - Math.floor(Date.now() / 1000);
      if (secondsUntilExpiry > 0) {
        maxAge = secondsUntilExpiry;
      }
    }
  } catch {
    // If decode fails, use default maxAge — server will reject bad tokens anyway
  }

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const cookie = `auth_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookie,
    },
  });
}
