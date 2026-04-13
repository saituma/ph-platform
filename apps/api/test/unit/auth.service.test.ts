import {
  signUpUser,
  confirmSignUp,
  loginUser,
  registerLocal,
  confirmLocal,
  loginLocal,
} from "../../src/services/auth.service";
import { db } from "../../src/db";
import { cognitoClient } from "../../src/lib/aws";
import { sendOtpEmail } from "../../src/lib/mailer";

// Mock uuid
jest.mock("uuid", () => ({
  v4: () => "mock-uuid",
}));

// Mock db
jest.mock("../../src/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock cognito client
jest.mock("../../src/lib/aws", () => ({
  cognitoClient: {
    send: jest.fn(),
  },
}));

// Mock mailer
jest.mock("../../src/lib/mailer", () => ({
  sendOtpEmail: jest.fn().mockResolvedValue({ ok: true }),
}));

// Mock JWT
jest.mock("../../src/lib/jwt", () => ({
  createLocalToken: jest.fn().mockResolvedValue("mock-token"),
}));

describe("auth.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Cognito Auth", () => {
    test("TC-A001: signUpUser calls Cognito SignUpCommand", async () => {
      (cognitoClient.send as jest.Mock).mockResolvedValue({ UserConfirmed: false });
      const result = await signUpUser({ email: "test@example.com", password: "Password1!", name: "Test" });
      expect(cognitoClient.send).toHaveBeenCalled();
      expect(result).toHaveProperty("UserConfirmed", false);
    });

    test("TC-A002: signUpUser handles UsernameExistsException and resends confirmation", async () => {
      const error = new Error("User already exists");
      (error as any).name = "UsernameExistsException";
      (cognitoClient.send as jest.Mock)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ CodeDeliveryDetails: { Destination: "t***@e***.com" } });

      const result = await signUpUser({ email: "test@example.com", password: "Password1!", name: "Test" });
      expect(result).toHaveProperty("alreadyExists", true);
      expect(cognitoClient.send).toHaveBeenCalledTimes(2);
    });

    test("TC-A003: confirmSignUp calls Cognito ConfirmSignUpCommand", async () => {
      (cognitoClient.send as jest.Mock).mockResolvedValue({ ok: true });
      await confirmSignUp({ email: "test@example.com", code: "123456" });
      expect(cognitoClient.send).toHaveBeenCalled();
    });

    test("TC-A004: loginUser calls Cognito InitiateAuthCommand", async () => {
      (cognitoClient.send as jest.Mock).mockResolvedValue({ AuthenticationResult: { AccessToken: "abc" } });
      const result = await loginUser({ email: "test@example.com", password: "Password1!" });
      expect(result.AuthenticationResult?.AccessToken).toBe("abc");
    });
  });

  describe("Local Auth", () => {
    const baseInput = { email: "local@example.com", password: "Password1!", name: "Local User" };

    test("TC-A005: registerLocal creates a new user and sends OTP", async () => {
      const mockSelect = db.select as jest.Mock;
      const mockInsert = db.insert as jest.Mock;

      mockSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn()
              .mockResolvedValueOnce([]) // no active user
              .mockResolvedValueOnce([]), // no soft deleted user (initial check)
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValueOnce([]), // no soft deleted user (with order)
            }),
          }),
        }),
      });

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
            limit: jest.fn().mockResolvedValueOnce([{ id: 1, emailVerified: true }]),
          }),
        }),
      });

      await expect(registerLocal(baseInput)).rejects.toEqual({
        status: 409,
        message: "An account with this email already exists.",
      });
    });

    test("TC-A006b: registerLocal revives soft-deleted users and clears blocked status", async () => {
      const mockSelect = db.select as jest.Mock;
      const mockUpdate = db.update as jest.Mock;

      mockSelect
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValueOnce([]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValueOnce([
                  {
                    id: 99,
                    cognitoSub: "local:old",
                    tokenVersion: 2,
                    isDeleted: true,
                    isBlocked: true,
                  },
                ]),
              }),
            }),
          }),
        });

      const setMock = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 99 }]),
      });
      mockUpdate.mockReturnValue({ set: setMock });

      const result = await registerLocal(baseInput);
      expect(result).toEqual({ ok: true });
      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ isDeleted: false, isBlocked: false }));
      expect(sendOtpEmail).toHaveBeenCalledWith(expect.objectContaining({ to: baseInput.email }));
    });

    test("TC-A007: confirmLocal marks email as verified with correct code", async () => {
      const mockSelect = db.select as jest.Mock;
      const mockUpdate = db.update as jest.Mock;

      mockSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValueOnce([{
              id: 1,
              emailVerified: false,
              verificationCode: "123456",
              verificationExpiresAt: new Date(Date.now() + 10000),
            }]),
          }),
        }),
      });

      mockUpdate.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ id: 1 }]),
        }),
      });

      const result = await confirmLocal({ email: "local@example.com", code: "123456" });
      expect(result).toEqual({ ok: true });
      expect(db.update).toHaveBeenCalled();
    });

    test("TC-A008: confirmLocal throws 400 for expired code", async () => {
      const mockSelect = db.select as jest.Mock;
      mockSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValueOnce([{
              id: 1,
              emailVerified: false,
              verificationCode: "123456",
              verificationExpiresAt: new Date(Date.now() - 10000),
            }]),
          }),
        }),
      });

      await expect(confirmLocal({ email: "local@example.com", code: "123456" }))
        .rejects.toEqual({ status: 400, message: "Verification code expired." });
    });

    test("TC-A009: loginLocal returns tokens for valid credentials", async () => {
      const mockSelect = db.select as jest.Mock;
      // We need to hash the password to match
      const password = "Password1!";
      const crypto = require("crypto");
      const salt = "salt";
      const hash = crypto.scryptSync(password, salt, 64).toString("hex");

      mockSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValueOnce([{
              id: 1,
              email: "local@example.com",
              passwordHash: hash,
              passwordSalt: salt,
              emailVerified: true,
              cognitoSub: "local:123",
              name: "Local",
              role: "guardian",
              tokenVersion: 1,
            }]),
          }),
        }),
      });

      const result = await loginLocal({ email: "local@example.com", password });
      expect(result).toHaveProperty("accessToken", "mock-token");
    });

    test("TC-A010: loginLocal throws 401 for invalid password", async () => {
      const mockSelect = db.select as jest.Mock;
      mockSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValueOnce([{
              id: 1,
              passwordHash: "0".repeat(128), // Must be correct length for timingSafeEqual (64 bytes = 128 hex chars)
              passwordSalt: "salt",
              emailVerified: true,
            }]),
          }),
        }),
      });

      await expect(loginLocal({ email: "local@example.com", password: "wrong" }))
        .rejects.toEqual({ status: 401, message: "Invalid credentials." });
    });
  });

  describe("Error Mapping", () => {
    test("TC-A011: handles InvalidPasswordException", async () => {
      const error = new Error();
      (error as any).name = "InvalidPasswordException";
      (cognitoClient.send as jest.Mock).mockRejectedValue(error);
      await expect(signUpUser({ email: "a@b.com", password: "123", name: "A" }))
        .rejects.toEqual({ status: 400, message: expect.stringContaining("Password must include") });
    });

    test("TC-A012: handles NotAuthorizedException", async () => {
      const error = new Error();
      (error as any).name = "NotAuthorizedException";
      (cognitoClient.send as jest.Mock).mockRejectedValue(error);
      await expect(loginUser({ email: "a@b.com", password: "123" }))
        .rejects.toEqual({ status: 401, message: "Invalid credentials." });
    });

    test("TC-A013: handles UserNotConfirmedException", async () => {
      const error = new Error();
      (error as any).name = "UserNotConfirmedException";
      (cognitoClient.send as jest.Mock).mockRejectedValue(error);
      await expect(loginUser({ email: "a@b.com", password: "123" }))
        .rejects.toEqual({ status: 403, message: "User is not confirmed. Please verify your email." });
    });

    test("TC-A014: handles ExpiredCodeException", async () => {
      const error = new Error();
      (error as any).name = "ExpiredCodeException";
      (cognitoClient.send as jest.Mock).mockRejectedValue(error);
      await expect(confirmSignUp({ email: "a@b.com", code: "123" }))
        .rejects.toEqual({ status: 400, message: "Invalid or expired verification code." });
    });

    test("TC-A015: rethrows unknown errors", async () => {
      const error = new Error("Unknown error");
      (cognitoClient.send as jest.Mock).mockRejectedValue(error);
      await expect(confirmSignUp({ email: "a@b.com", code: "123" }))
        .rejects.toThrow("Unknown error");
    });
  });
});
