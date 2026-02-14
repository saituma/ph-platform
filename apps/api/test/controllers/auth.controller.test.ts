jest.mock("../../src/services/auth.service", () => ({
  changePassword: jest.fn(),
  confirmForgotPassword: jest.fn(),
  confirmSignUp: jest.fn(),
  confirmLocal: jest.fn(),
  loginUser: jest.fn(),
  loginLocal: jest.fn(),
  resendConfirmation: jest.fn(),
  resendLocal: jest.fn(),
  signUpUser: jest.fn(),
  registerLocal: jest.fn(),
  startForgotPassword: jest.fn(),
}));

import { updatePassword } from "../../src/controllers/auth.controller";
import { changePassword } from "../../src/services/auth.service";

function createRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("auth controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 for invalid payload", async () => {
    const req = { body: { oldPassword: "short", newPassword: "tiny" }, headers: {} } as any;
    const res = createRes();

    await updatePassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("returns 401 when auth token is missing", async () => {
    const req = { body: { oldPassword: "Password123", newPassword: "NewPassword123" }, headers: {} } as any;
    const res = createRes();

    await updatePassword(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("calls service and returns 200", async () => {
    const req = {
      body: { oldPassword: "Password123", newPassword: "NewPassword123" },
      headers: { authorization: "Bearer token-123" },
    } as any;
    const res = createRes();

    await updatePassword(req, res);

    expect(changePassword).toHaveBeenCalledWith({
      accessToken: "token-123",
      previousPassword: "Password123",
      proposedPassword: "NewPassword123",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});
