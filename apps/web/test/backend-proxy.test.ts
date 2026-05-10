import { NextRequest } from "next/server";

describe("backend proxy route", () => {
  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn();
  });

  it("returns 500 when API base URL is missing", async () => {
    delete process.env.API_BASE_URL;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;

    const { GET } = await import("@/app/api/backend/[...path]/route");
    const req = new NextRequest("http://localhost:3000/api/backend/health");

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: "API base URL not configured" });
  });

  it("forwards request with auth cookie", async () => {
    process.env.API_BASE_URL = "http://api.test";

    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ ok: true }),
    });

    const { GET } = await import("@/app/api/backend/[...path]/route");
    const req = new NextRequest("http://localhost:3000/api/backend/messages?foo=1", {
      headers: { cookie: "accessToken=token-1" },
    });

    const res = await GET(req);
    const body = await res.json();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api.test/api/messages?foo=1",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token-1",
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
  });

  it("does not include Authorization header when httpOnly accessToken is absent (ignores accessTokenClient)", async () => {
    process.env.API_BASE_URL = "http://api.test";

    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ ok: true }),
    });

    const { GET } = await import("@/app/api/backend/[...path]/route");
    const req = new NextRequest("http://localhost:3000/api/backend/messages", {
      headers: {
        // Only the client-readable cookie is present; httpOnly accessToken is absent
        cookie: "accessTokenClient=forged-or-stale-token",
      },
    });

    await GET(req);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api.test/api/messages",
      expect.objectContaining({
        headers: expect.not.objectContaining({ Authorization: expect.any(String) }),
      })
    );
  });

  it("uses only httpOnly accessToken for the Authorization header", async () => {
    process.env.API_BASE_URL = "http://api.test";

    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ ok: true }),
    });

    const { GET } = await import("@/app/api/backend/[...path]/route");
    const req = new NextRequest("http://localhost:3000/api/backend/users", {
      headers: {
        // Both cookies present — only the httpOnly one should be forwarded
        cookie: "accessToken=server-jwt; accessTokenClient=client-jwt",
      },
    });

    await GET(req);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api.test/api/users",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer server-jwt" }),
      })
    );
  });

  it("normalizes trailing slash and /api suffix in API base URL", async () => {
    process.env.API_BASE_URL = " https://api.test/api/ ";

    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ ok: true }),
    });

    const { GET } = await import("@/app/api/backend/[...path]/route");
    const req = new NextRequest("http://localhost:3000/api/backend/admin/videos");

    await GET(req);

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.test/api/admin/videos",
      expect.any(Object)
    );
  });
});
