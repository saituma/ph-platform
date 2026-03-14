import type { NextFunction, Request, Response } from "express";

const verifyAccessToken = jest.fn();
const getUserById = jest.fn();
const getUserByCognitoSub = jest.fn();
const createUserFromCognito = jest.fn();
const listGuardianAthletes = jest.fn();

jest.mock("../../src/lib/jwt", () => ({
  verifyAccessToken: (...args: any[]) => verifyAccessToken(...args),
}));

jest.mock("../../src/services/user.service", () => ({
  getUserById: (...args: any[]) => getUserById(...args),
  getUserByCognitoSub: (...args: any[]) => getUserByCognitoSub(...args),
  createUserFromCognito: (...args: any[]) => createUserFromCognito(...args),
  listGuardianAthletes: (...args: any[]) => listGuardianAthletes(...args),
}));

describe("requireAuth middleware", () => {
  beforeEach(() => {
    jest.resetModules();
    verifyAccessToken.mockReset();
    getUserById.mockReset();
    getUserByCognitoSub.mockReset();
    createUserFromCognito.mockReset();
    listGuardianAthletes.mockReset();
    process.env.AUTH_MODE = "local";
    process.env.ALLOW_JWT_BYPASS = "false";
  });

  test("returns 401 when no Authorization header is present", async () => {
    const { requireAuth } = await import("../../src/middlewares/auth");

    const req = { headers: {}, method: "GET", path: "/secure" } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("attaches user to req when token is valid", async () => {
    const { requireAuth } = await import("../../src/middlewares/auth");

    verifyAccessToken.mockResolvedValue({
      sub: "sub-1",
      email: "a@b.com",
      name: "A",
      user_id: 10,
      token_version: 1,
    });
    getUserById.mockResolvedValue({
      id: 10,
      role: "guardian",
      email: "a@b.com",
      name: "A",
      cognitoSub: "sub-1",
      profilePicture: null,
      tokenVersion: 1,
      isBlocked: false,
    });

    const req = {
      headers: { authorization: "Bearer token" },
      method: "GET",
      path: "/secure",
    } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).user).toMatchObject({ id: 10, email: "a@b.com", role: "guardian" });
  });
});
