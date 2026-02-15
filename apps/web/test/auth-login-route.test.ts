import { POST } from "@/app/api/auth/login/route";

describe("web login API route", () => {
  beforeEach(() => {
    process.env.API_BASE_URL = "http://api.test";
    global.fetch = jest.fn();
  });

  it("returns 200 and sets auth cookies on success", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresIn: 3600,
      }),
    });

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "coach@test.com", password: "Password123" }),
      headers: { "Content-Type": "application/json", host: "localhost:3000" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    const cookies = res.headers.get("set-cookie") ?? "";
    expect(cookies).toContain("accessToken=access-token");
    expect(cookies).toContain("refreshToken=refresh-token");
  });

  it("returns backend error status when login fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Invalid credentials" }),
    });

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "coach@test.com", password: "wrong" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Invalid credentials" });
  });
});
