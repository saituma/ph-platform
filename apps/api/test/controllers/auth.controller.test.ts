jest.mock("../../src/services/auth.service", () => ({
  changePasswordLocal: jest.fn(),
}));

jest.mock("../../src/lib/jwt", () => ({
  verifyAccessToken: jest.fn(),
}));

import { updatePassword } from "../../src/controllers/auth.controller";
import { changePasswordLocal } from "../../src/services/auth.service";
import { verifyAccessToken } from "../../src/lib/jwt";

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
    expect(changePasswordLocal).not.toHaveBeenCalled();
  });

  it("returns 401 when auth token is missing", async () => {
    const req = { body: { oldPassword: "Password123", newPassword: "NewPassword123" }, headers: {} } as any;
    const res = createRes();

    await updatePassword(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(changePasswordLocal).not.toHaveBeenCalled();
  });

  it("calls service and returns 200", async () => {
    (verifyAccessToken as jest.Mock).mockResolvedValue({ user_id: 42 });
    const req = {
      body: { oldPassword: "Password123", newPassword: "NewPassword123" },
      headers: { authorization: "Bearer token-123" },
    } as any;
    const res = createRes();

    await updatePassword(req, res);

    expect(changePasswordLocal).toHaveBeenCalledWith({
      userId: 42,
      previousPassword: "Password123",
      proposedPassword: "NewPassword123",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});
