import { middleware } from "../middleware";
import { NextResponse, NextRequest } from "next/server";

function makeRequest(pathname: string, cookies: Record<string, string> = {}) {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  const headers: Record<string, string> = {};
  if (cookieHeader) headers.cookie = cookieHeader;
  return new NextRequest(`http://localhost${pathname}`, { headers });
}

/** Shorthand: only the httpOnly accessToken cookie */
function withToken(pathname: string, token: string) {
  return makeRequest(pathname, { accessToken: token });
}

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

const futureExp = Math.floor(Date.now() / 1000) + 3600;
const pastExp = Math.floor(Date.now() / 1000) - 60;

describe("web middleware", () => {
  // ── Existing baseline ──────────────────────────────────────────────────────

  test("redirects to /login when token missing for protected route", async () => {
    const req = makeRequest("/parent/dashboard");
    const res = await middleware(req);
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.headers.get("location")).toBe("http://localhost/login");
  });

  test("allows public paths without token", async () => {
    const req = makeRequest("/login");
    const res = await middleware(req);
    // NextResponse.next() returns a response with no location header
    expect(res.headers.get("location")).toBeNull();
  });

  test("redirects authenticated users away from /login", async () => {
    const req = withToken("/login", makeJwt({ exp: futureExp, role: "admin" }));
    const res = await middleware(req);
    expect(res.headers.get("location")).toBe("http://localhost/");
  });

  // ── Valid admin session ────────────────────────────────────────────────────

  test("allows protected route with valid admin httpOnly token", async () => {
    const req = withToken("/dashboard", makeJwt({ exp: futureExp, role: "admin" }));
    const res = await middleware(req);
    expect(res.headers.get("location")).toBeNull();
  });

  test("allows protected route with coach httpOnly token", async () => {
    const req = withToken("/dashboard", makeJwt({ exp: futureExp, role: "coach" }));
    const res = await middleware(req);
    expect(res.headers.get("location")).toBeNull();
  });

  // ── Role enforcement ───────────────────────────────────────────────────────

  test("redirects non-admin role from protected route", async () => {
    const req = withToken("/dashboard", makeJwt({ exp: futureExp, role: "athlete" }));
    const res = await middleware(req);
    expect(res.headers.get("location")).toContain("/login");
  });

  test("redirects guardian role from admin protected route", async () => {
    const req = withToken("/dashboard", makeJwt({ exp: futureExp, role: "guardian" }));
    const res = await middleware(req);
    expect(res.headers.get("location")).toContain("/login");
  });

  // ── Forged client token cannot bypass httpOnly guard ──────────────────────

  test("accessTokenClient alone does not grant admin access (no httpOnly accessToken)", async () => {
    const req = makeRequest("/dashboard", {
      accessTokenClient: makeJwt({ exp: futureExp, role: "admin" }),
    });
    const res = await middleware(req);
    // No httpOnly accessToken → redirects regardless of accessTokenClient value
    expect(res.headers.get("location")).toContain("/login");
  });

  test("forged accessTokenClient with admin role cannot override non-admin httpOnly token", async () => {
    const req = makeRequest("/dashboard", {
      accessToken: makeJwt({ exp: futureExp, role: "athlete" }),
      accessTokenClient: makeJwt({ exp: futureExp, role: "admin" }),
    });
    const res = await middleware(req);
    // httpOnly token says athlete → redirected; forged client cookie is ignored
    expect(res.headers.get("location")).toContain("/login");
  });

  // ── Session expiry / logout ────────────────────────────────────────────────

  test("redirects and clears cookies when httpOnly token is expired", async () => {
    const req = withToken("/dashboard", makeJwt({ exp: pastExp, role: "admin" }));
    const res = await middleware(req);
    expect(res.headers.get("location")).toContain("/login");
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/accessToken=;/);
    expect(setCookie).toMatch(/accessTokenClient=;/);
    expect(setCookie).toMatch(/refreshToken=;/);
  });

  test("redirects and clears cookies when token is completely absent", async () => {
    const req = makeRequest("/dashboard");
    const res = await middleware(req);
    expect(res.headers.get("location")).toContain("/login");
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/accessToken=;/);
  });

  // ── /parent/* admin management routes are admin-only ──────────────────────
  // These routes are the admin's management section for parent-related config.
  // They are NOT the parent portal runtime (which lives in apps/parent).

  test.each([
    "/parent",
    "/parent/content",
    "/parent/completed",
    "/parent/athlete",
    "/parent/onboarding",
    "/parent/php-plus",
    "/parent/progress",
    "/parent/schedule",
    "/parent/settings",
    "/parent/messages",
    "/parent/support",
  ])("blocks unauthenticated access to admin /parent section: %s", async (path) => {
    const req = makeRequest(path);
    const res = await middleware(req);
    expect(res.headers.get("location")).toContain("/login");
  });

  test.each([
    "/parent",
    "/parent/content",
    "/parent/schedule",
  ])("blocks guardian role from admin /parent section: %s", async (path) => {
    const req = withToken(path, makeJwt({ exp: futureExp, role: "guardian" }));
    const res = await middleware(req);
    expect(res.headers.get("location")).toContain("/login");
  });

  test.each([
    "/parent",
    "/parent/content",
    "/parent/schedule",
  ])("allows admin role to access /parent management section: %s", async (path) => {
    const req = withToken(path, makeJwt({ exp: futureExp, role: "admin" }));
    const res = await middleware(req);
    expect(res.headers.get("location")).toBeNull();
  });

  // ── /parents/* admin guardian management routes are admin-only ────────────

  test("blocks unauthenticated access to /parents (guardian list)", async () => {
    const req = makeRequest("/parents");
    const res = await middleware(req);
    expect(res.headers.get("location")).toContain("/login");
  });

  test("blocks guardian role from /parents (admin management)", async () => {
    const req = withToken("/parents", makeJwt({ exp: futureExp, role: "guardian" }));
    const res = await middleware(req);
    expect(res.headers.get("location")).toContain("/login");
  });

  test("allows admin role to access /parents (guardian management list)", async () => {
    const req = withToken("/parents", makeJwt({ exp: futureExp, role: "admin" }));
    const res = await middleware(req);
    expect(res.headers.get("location")).toBeNull();
  });

  test("allows admin role to access /parents/[parentId] (guardian detail)", async () => {
    const req = withToken("/parents/42", makeJwt({ exp: futureExp, role: "admin" }));
    const res = await middleware(req);
    expect(res.headers.get("location")).toBeNull();
  });
});
