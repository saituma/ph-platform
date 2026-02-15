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
});
