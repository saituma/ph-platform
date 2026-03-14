import { middleware } from "../middleware";
import { NextResponse, NextRequest } from "next/server";

function makeRequest(pathname: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) {
    headers.cookie = `accessToken=${token}`;
  }
  return new NextRequest(`http://localhost${pathname}`, { headers });
}

describe("web middleware", () => {
  test("redirects to /login when token missing for protected route", () => {
    const req = makeRequest("/parent/dashboard");
    const res = middleware(req);
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.headers.get("location")).toBe("http://localhost/login");
  });

  test("allows public paths without token", () => {
    const req = makeRequest("/login");
    const res = middleware(req);
    // NextResponse.next() returns a response with no location header
    expect(res.headers.get("location")).toBeNull();
  });

  test("redirects authenticated users away from /login", () => {
    const req = makeRequest("/login", "token");
    const res = middleware(req);
    expect(res.headers.get("location")).toBe("http://localhost/");
  });
});
