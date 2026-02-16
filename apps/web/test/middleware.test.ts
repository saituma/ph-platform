import { NextRequest } from "next/server";

import { middleware } from "@/middleware";

function createRequest(url: string, cookie?: string) {
  return new NextRequest(url, {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("middleware", () => {
  it("redirects to login when unauthenticated", () => {
    const req = createRequest("http://localhost:3000/");
    const res = middleware(req);

    expect(res?.headers.get("location")).toContain("/login");
  });

  it("allows public routes", () => {
    const req = createRequest("http://localhost:3000/login");
    const res = middleware(req);

    expect(res?.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects authenticated users away from login", () => {
    const req = createRequest("http://localhost:3000/login", "accessToken=token-1");
    const res = middleware(req);

    expect(res?.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("allows authenticated requests", () => {
    const req = createRequest("http://localhost:3000/", "accessToken=token-1");
    const res = middleware(req);

    expect(res?.headers.get("x-middleware-next")).toBe("1");
  });
});
