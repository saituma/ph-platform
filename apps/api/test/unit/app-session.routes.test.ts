import type { Request, Response } from "express";
import appSessionRoutes, { clearAppToken, getAppTokenStatus } from "../../src/routes/app-session.routes";

const verifyAccessToken = jest.fn();

jest.mock("../../src/lib/jwt", () => ({
  verifyAccessToken: (token: string) => verifyAccessToken(token),
}));

describe("app session cookie routes", () => {
  type MockResponse = Pick<Response, "json" | "clearCookie"> & {
    json: jest.Mock;
    clearCookie: jest.Mock;
  };

  function mockRequest(cookie?: string): Request {
    return {
      headers: cookie ? { cookie } : {},
    } as Request;
  }

  function mockResponse(): MockResponse {
    return {
      json: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    } as MockResponse;
  }

  beforeEach(() => {
    verifyAccessToken.mockReset();
  });

  it("reads a valid parent session cookie", async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    verifyAccessToken.mockResolvedValue({ exp: expiresAt });

    const res = mockResponse();
    await getAppTokenStatus(mockRequest("ph_app_session=session-token"), res as unknown as Response);

    expect(res.json).toHaveBeenCalledWith({ authenticated: true, expiresAt });
    expect(verifyAccessToken).toHaveBeenCalledWith("session-token");
  });

  it("returns unauthenticated for missing session cookie", async () => {
    const res = mockResponse();
    await getAppTokenStatus(mockRequest(), res as unknown as Response);

    expect(res.json).toHaveBeenCalledWith({ authenticated: false, expiresAt: null });
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });

  it("returns unauthenticated for expired or invalid session cookie", async () => {
    verifyAccessToken.mockRejectedValue(new Error("expired"));

    const res = mockResponse();
    await getAppTokenStatus(mockRequest("ph_app_session=expired-token"), res as unknown as Response);

    expect(res.json).toHaveBeenCalledWith({ authenticated: false, expiresAt: null });
  });

  it("clears parent session cookies on logout", async () => {
    const res = mockResponse();
    clearAppToken(mockRequest(), res as unknown as Response);

    expect(res.clearCookie).toHaveBeenCalledWith("ph_app_session", { path: "/" });
    expect(res.clearCookie).toHaveBeenCalledWith("__csrf", { path: "/" });
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("registers the production logout route alias", () => {
    type RouteLayer = {
      route?: {
        path: string;
        methods: Record<string, boolean>;
      };
    };
    const stack = (appSessionRoutes as unknown as { stack: RouteLayer[] }).stack;

    expect(stack.some((layer) => layer.route?.path === "/app/logout" && layer.route.methods.post)).toBe(true);
  });
});

export {};
