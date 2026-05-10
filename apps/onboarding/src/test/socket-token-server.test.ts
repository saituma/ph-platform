import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// The server route handler lives in server/api/app/socket-token.ts.
// We import it directly here (no special server runtime needed for unit tests).
import handler from "../../server/api/app/socket-token";

function makeRequest(cookies: Record<string, string> = {}, method = "GET"): Request {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  return new Request("http://localhost/api/app/socket-token", {
    method,
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
}

describe("GET /api/app/socket-token (onboarding server route)", () => {
  beforeEach(() => {
    process.env.API_BASE_URL = "http://api.test";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.API_BASE_URL;
  });

  it("returns 401 when no auth_token cookie is present", async () => {
    const res = await handler(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 when the API rejects the token", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );
    const res = await handler(makeRequest({ auth_token: "invalid-jwt" }));
    expect(res.status).toBe(401);
  });

  it("returns 503 when API_BASE_URL is not configured", async () => {
    delete process.env.API_BASE_URL;
    delete process.env.VITE_PUBLIC_API_URL;
    const res = await handler(makeRequest({ auth_token: "some-jwt" }));
    expect(res.status).toBe(503);
  });

  it("returns the short-lived socket token from the API", async () => {
    const payload = { token: "short.lived.socket.jwt", expiresAt: 9999999 };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    const res = await handler(makeRequest({ auth_token: "valid-jwt" }));
    const body = (await res.json()) as typeof payload;

    expect(res.status).toBe(200);
    expect(body.token).toBe("short.lived.socket.jwt");
    expect(body.expiresAt).toBe(9999999);
  });

  it("forwards auth_token as Authorization: Bearer to the API", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ token: "t", expiresAt: 0 }), { status: 200 }),
    );

    await handler(makeRequest({ auth_token: "my-api-jwt" }));

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe("http://api.test/api/auth/socket-token");
    expect((init.headers as Record<string, string>)?.Authorization).toBe("Bearer my-api-jwt");
  });

  it("returns 405 for non-GET requests", async () => {
    const res = await handler(makeRequest({ auth_token: "jwt" }, "POST"));
    expect(res.status).toBe(405);
  });

  it("returns 502 when the API is unreachable", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network error"));
    const res = await handler(makeRequest({ auth_token: "valid-jwt" }));
    expect(res.status).toBe(502);
  });
});
