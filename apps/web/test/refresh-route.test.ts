import { NextRequest } from "next/server";

describe("auth refresh route", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.API_BASE_URL = "http://api.test";
    global.fetch = jest.fn();
  });

  it("returns 200 and re-sets auth cookies on success", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: "new-access-token",
        expiresIn: 3600,
      }),
    });

    const { POST } = await import("@/app/api/auth/refresh/route");
    const req = new NextRequest("http://localhost/api/auth/refresh", {
      method: "POST",
      headers: { cookie: "refreshToken=my-refresh-token", host: "localhost:3000" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    const cookies = res.headers.get("set-cookie") ?? "";
    expect(cookies).toContain("accessToken=new-access-token");
    expect(cookies).toContain("accessTokenClient=new-access-token");
  });

  it("returns 401 when no refresh token cookie present", async () => {
    const { POST } = await import("@/app/api/auth/refresh/route");
    const req = new NextRequest("http://localhost/api/auth/refresh", {
      method: "POST",
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "No refresh token" });
  });

  it("returns error status when backend rejects the refresh token", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "Invalid refresh token" }),
    });

    const { POST } = await import("@/app/api/auth/refresh/route");
    const req = new NextRequest("http://localhost/api/auth/refresh", {
      method: "POST",
      headers: { cookie: "refreshToken=bad-token" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "Invalid refresh token" });
  });
});
