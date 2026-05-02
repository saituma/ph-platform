import { decodeJwt } from "jose";

/**
 * GET /api/app/token-status
 * Reads the auth_token cookie, decodes JWT exp, returns auth status.
 */
export default async function (request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
  const token = match?.[1] ?? null;

  if (!token) {
    return new Response(
      JSON.stringify({ authenticated: false, expiresAt: null }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const payload = decodeJwt(token);
    const expiresAt = typeof payload.exp === "number" ? payload.exp : null;

    // Check if expired
    if (expiresAt && Date.now() >= expiresAt * 1000) {
      // Clear the expired cookie
      const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
      const clearCookie = `auth_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`;
      return new Response(
        JSON.stringify({ authenticated: false, expiresAt: null }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": clearCookie,
          },
        },
      );
    }

    return new Response(
      JSON.stringify({ authenticated: true, expiresAt }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch {
    // Malformed token
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    const clearCookie = `auth_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`;
    return new Response(
      JSON.stringify({ authenticated: false, expiresAt: null }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": clearCookie,
        },
      },
    );
  }
}
