import { describe, expect, it } from "vitest";
import {
  getPasswordStrengthChecks,
  isStrongPassword,
  getPasswordStrengthMeter,
  STRONG_PASSWORD_MAX,
} from "#/lib/password-strength";

describe("password-strength", () => {
  describe("getPasswordStrengthChecks", () => {
    it("returns 5 checks", () => {
      expect(getPasswordStrengthChecks("")).toHaveLength(5);
    });

    it("all checks fail for empty string", () => {
      const checks = getPasswordStrengthChecks("");
      expect(checks.every((c) => !c.met)).toBe(true);
    });

    it("length check passes for 10+ chars within max", () => {
      const checks = getPasswordStrengthChecks("abcdefghij");
      const lenCheck = checks.find((c) => c.id === "len");
      expect(lenCheck?.met).toBe(true);
    });

    it("length check fails for 9 chars", () => {
      const checks = getPasswordStrengthChecks("abcdefghi");
      const lenCheck = checks.find((c) => c.id === "len");
      expect(lenCheck?.met).toBe(false);
    });

    it("length check fails for string exceeding max", () => {
      const checks = getPasswordStrengthChecks("a".repeat(STRONG_PASSWORD_MAX + 1));
      const lenCheck = checks.find((c) => c.id === "len");
      expect(lenCheck?.met).toBe(false);
    });

    it("lowercase check detects lowercase letters", () => {
      const checks = getPasswordStrengthChecks("abc");
      expect(checks.find((c) => c.id === "lower")?.met).toBe(true);
    });

    it("uppercase check detects uppercase letters", () => {
      const checks = getPasswordStrengthChecks("ABC");
      expect(checks.find((c) => c.id === "upper")?.met).toBe(true);
    });

    it("number check detects digits", () => {
      const checks = getPasswordStrengthChecks("123");
      expect(checks.find((c) => c.id === "num")?.met).toBe(true);
    });

    it("symbol check detects special characters", () => {
      const checks = getPasswordStrengthChecks("!@#");
      expect(checks.find((c) => c.id === "sym")?.met).toBe(true);
    });

    it("symbol check treats spaces as symbols", () => {
      const checks = getPasswordStrengthChecks(" ");
      expect(checks.find((c) => c.id === "sym")?.met).toBe(true);
    });
  });

  describe("isStrongPassword", () => {
    it("returns false for empty string", () => {
      expect(isStrongPassword("")).toBe(false);
    });

    it("returns false for short password with all char types", () => {
      expect(isStrongPassword("Aa1!")).toBe(false);
    });

    it("returns true for password meeting all criteria", () => {
      expect(isStrongPassword("Abcdef123!")).toBe(true);
    });

    it("returns false for password missing uppercase", () => {
      expect(isStrongPassword("abcdef123!")).toBe(false);
    });

    it("returns false for password missing number", () => {
      expect(isStrongPassword("Abcdefghi!")).toBe(false);
    });

    it("returns false for password missing symbol", () => {
      expect(isStrongPassword("Abcdefg123")).toBe(false);
    });

    it("returns true for password at exactly min length", () => {
      // 10 chars: uppercase, lowercase, number, symbol
      expect(isStrongPassword("Abcdefg1!x")).toBe(true);
    });

    it("returns true for password at max length", () => {
      const pw = "A" + "a".repeat(STRONG_PASSWORD_MAX - 4) + "1!x";
      expect(isStrongPassword(pw)).toBe(true);
    });
  });

  describe("getPasswordStrengthMeter", () => {
    it("returns muted tone and empty label for empty password", () => {
      const result = getPasswordStrengthMeter("");
      expect(result.tone).toBe("muted");
      expect(result.label).toBe("");
      expect(result.filled).toBe(0);
    });

    it("returns destructive for weak passwords (2 or fewer checks)", () => {
      const result = getPasswordStrengthMeter("ab");
      expect(result.tone).toBe("destructive");
      expect(result.label).toBe("Weak");
    });

    it("returns amber for good passwords (3-4 checks met)", () => {
      // lowercase + uppercase + number, but short and no symbol
      const result = getPasswordStrengthMeter("Abc1");
      expect(result.tone).toBe("amber");
      expect(result.label).toBe("Good");
    });

    it("returns success for strong passwords (all checks met)", () => {
      const result = getPasswordStrengthMeter("Abcdef123!");
      expect(result.tone).toBe("success");
      expect(result.label).toBe("Strong");
      expect(result.filled).toBe(result.total);
    });

    it("total is always 5", () => {
      expect(getPasswordStrengthMeter("x").total).toBe(5);
    });
  });
});
