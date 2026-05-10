import { decodeJwt } from "jose";

export const config = { runtime: "edge" };

export default async function handler(request: Request): Promise<Response> {
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
    return new Response(JSON.stringify({ authenticated: false, expiresAt: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = decodeJwt(token);
    const expiresAt = typeof payload.exp === "number" ? payload.exp : null;

    if (expiresAt && Date.now() >= expiresAt * 1000) {
      return new Response(JSON.stringify({ authenticated: false, expiresAt: null }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": "auth_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0; Secure",
        },
      });
    }

    return new Response(JSON.stringify({ authenticated: true, expiresAt }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ authenticated: false, expiresAt: null }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": "auth_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0; Secure",
      },
    });
  }
}
