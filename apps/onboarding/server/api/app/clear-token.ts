/**
 * POST /api/app/clear-token
 * Clears the auth_token httpOnly cookie.
 */
export default async function (request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const cookie = `auth_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`;

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookie,
    },
  });
}
