import { registerLocal, confirmLocal, loginLocal } from "../../src/services/auth.service";
import { db } from "../../src/db";
import { sendOtpEmail } from "../../src/lib/mailer";

jest.mock("uuid", () => ({
  v4: () => "mock-uuid",
}));

jest.mock("../../src/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("../../src/lib/mailer", () => ({
  sendOtpEmail: jest.fn().mockResolvedValue({ ok: true }),
}));

jest.mock("../../src/lib/jwt", () => ({
  createLocalToken: jest.fn().mockResolvedValue("mock-token"),
}));

describe("auth.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Local Auth", () => {
    const baseInput = { email: "local@example.com", password: "Password1!", name: "Local User" };

    test("TC-A005: registerLocal creates a new user and sends OTP", async () => {
      const mockSelect = db.select as jest.Mock;
      const mockInsert = db.insert as jest.Mock;

      const chain = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest
                .fn()
                .mockResolvedValueOnce([]) // active users: none
                .mockResolvedValueOnce([]), // soft-deleted: none → insert path
            }),
          }),
        }),
      };
      mockSelect.mockReturnValue(chain);

      mockInsert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 1 }]),
        }),
      });

      const result = await registerLocal(baseInput);
      expect(result).toEqual({ ok: true });
      expect(db.insert).toHaveBeenCalled();
      expect(sendOtpEmail).toHaveBeenCalledWith(expect.objectContaining({ to: baseInput.email }));
    });

    test("TC-A006: registerLocal throws 409 if active user already verified", async () => {
      const mockSelect = db.select as jest.Mock;
      mockSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValueOnce([{ id: 1, emailVerified: true }]),
            }),
          }),
        }),
      });

      await expect(registerLocal(baseInput)).rejects.toEqual({
        status: 409,
        message: "An account with this email already exists.",
      });
    });

    test("TC-A007: confirmLocal marks email as verified with correct code", async () => {
      const mockSelect = db.select as jest.Mock;
      const mockUpdate = db.update as jest.Mock;

      mockSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValueOnce([
                {
                  id: 1,
                  emailVerified: false,
                  verificationCode: "123456",
                  verificationExpiresAt: new Date(Date.now() + 10000),
                  cognitoSub: "local:1",
                  email: "local@example.com",
                  name: "Local",
                  role: "guardian",
                  tokenVersion: 0,
                },
              ]),
            }),
          }),
        }),
      });

      mockUpdate.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ id: 1 }]),
        }),
      });

      const result = await confirmLocal({ email: "local@example.com", code: "123456" });
      expect(result).toEqual({ ok: true, accessToken: "mock-token", tokenType: "Bearer" });
      expect(db.update).toHaveBeenCalled();
    });

    test("TC-A009: loginLocal returns tokens for valid credentials", async () => {
      const mockSelect = db.select as jest.Mock;
      const password = "Password1!";
      const crypto = require("crypto");
      const salt = "salt";
      const hash = crypto.scryptSync(password, salt, 64).toString("hex");

      mockSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValueOnce([
                {
                  id: 1,
                  email: "local@example.com",
                  passwordHash: hash,
                  passwordSalt: salt,
                  emailVerified: true,
                  cognitoSub: "local:123",
                  name: "Local",
                  role: "guardian",
                  tokenVersion: 1,
                },
              ]),
            }),
          }),
        }),
      });

      const result = await loginLocal({ email: "local@example.com", password });
      expect(result).toHaveProperty("accessToken", "mock-token");
    });
  });
});
