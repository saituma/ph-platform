import { describe, it, expect } from "vitest";

function validatePassword(password: string) {
  return {
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    hasMinLength: password.length >= 8,
  };
}

function isPasswordStrong(password: string) {
  const req = validatePassword(password);
  return Object.values(req).every(Boolean);
}

function canContinue(selected: string | null, password: string, confirmPassword: string, isPending: boolean) {
  const isStrong = isPasswordStrong(password);
  const match = password === confirmPassword && password !== "";
  return !!selected && isStrong && match && !isPending;
}

describe("Onboarding Step 1 - Password Validation", () => {
  describe("validatePassword", () => {
    it("rejects empty password", () => {
      const r = validatePassword("");
      expect(r.hasMinLength).toBe(false);
      expect(r.hasUpper).toBe(false);
      expect(r.hasNumber).toBe(false);
      expect(r.hasSpecial).toBe(false);
    });

    it("rejects short password", () => {
      expect(validatePassword("Ab1!").hasMinLength).toBe(false);
    });

    it("detects missing uppercase", () => {
      expect(validatePassword("abcdefg1!").hasUpper).toBe(false);
    });

    it("detects missing number", () => {
      expect(validatePassword("Abcdefgh!").hasNumber).toBe(false);
    });

    it("detects missing special character", () => {
      expect(validatePassword("Abcdefg1").hasSpecial).toBe(false);
    });

    it("accepts strong password", () => {
      const r = validatePassword("StrongP@ss1");
      expect(r.hasMinLength).toBe(true);
      expect(r.hasUpper).toBe(true);
      expect(r.hasNumber).toBe(true);
      expect(r.hasSpecial).toBe(true);
    });

    it("accepts password with exactly 8 characters", () => {
      expect(validatePassword("Abcd1@ef").hasMinLength).toBe(true);
    });
  });

  describe("isPasswordStrong", () => {
    it("returns false for weak passwords", () => {
      expect(isPasswordStrong("password")).toBe(false);
      expect(isPasswordStrong("12345678")).toBe(false);
      expect(isPasswordStrong("ABCDEFGH")).toBe(false);
    });

    it("returns true for strong password", () => {
      expect(isPasswordStrong("MyP@ssw0rd")).toBe(true);
    });
  });

  describe("canContinue", () => {
    it("requires user type selection", () => {
      expect(canContinue(null, "MyP@ssw0rd", "MyP@ssw0rd", false)).toBe(false);
    });

    it("requires strong password", () => {
      expect(canContinue("youth", "weak", "weak", false)).toBe(false);
    });

    it("requires matching passwords", () => {
      expect(canContinue("youth", "MyP@ssw0rd", "Different1!", false)).toBe(false);
    });

    it("blocks when mutation is pending", () => {
      expect(canContinue("youth", "MyP@ssw0rd", "MyP@ssw0rd", true)).toBe(false);
    });

    it("allows when all conditions met", () => {
      expect(canContinue("youth", "MyP@ssw0rd", "MyP@ssw0rd", false)).toBe(true);
      expect(canContinue("adult", "MyP@ssw0rd", "MyP@ssw0rd", false)).toBe(true);
      expect(canContinue("team", "MyP@ssw0rd", "MyP@ssw0rd", false)).toBe(true);
    });

    it("rejects empty confirm password", () => {
      expect(canContinue("youth", "MyP@ssw0rd", "", false)).toBe(false);
    });
  });
});
