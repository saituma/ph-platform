import { describe, it, expect } from "vitest";

function handleOtpChange(otp: string[], value: string, index: number): { newOtp: string[]; nextFocusIndex: number | null } {
  const digit = value.slice(-1);
  if (digit && !/^\d$/.test(digit)) return { newOtp: otp, nextFocusIndex: null };

  const newOtp = [...otp];
  newOtp[index] = digit;

  const nextFocusIndex = digit && index < 5 ? index + 1 : null;
  return { newOtp, nextFocusIndex };
}

function handleOtpPaste(otp: string[], pastedText: string): { newOtp: string[]; focusIndex: number } {
  const data = pastedText.slice(0, 6).split("");
  if (!data.every((char) => /^\d$/.test(char))) {
    return { newOtp: otp, focusIndex: 0 };
  }

  const newOtp = [...otp];
  data.forEach((char, i) => {
    newOtp[i] = char;
  });
  const focusIndex = Math.min(data.length, 5);
  return { newOtp, focusIndex };
}

function handleOtpBackspace(otp: string[], index: number): number | null {
  if (!otp[index] && index > 0) return index - 1;
  return null;
}

describe("Verification OTP Logic", () => {
  const emptyOtp = ["", "", "", "", "", ""];

  describe("handleOtpChange", () => {
    it("sets digit at correct index", () => {
      const result = handleOtpChange(emptyOtp, "5", 0);
      expect(result.newOtp[0]).toBe("5");
    });

    it("advances focus to next input", () => {
      const result = handleOtpChange(emptyOtp, "5", 2);
      expect(result.nextFocusIndex).toBe(3);
    });

    it("does not advance past last input", () => {
      const result = handleOtpChange(emptyOtp, "5", 5);
      expect(result.nextFocusIndex).toBeNull();
    });

    it("rejects non-digit characters", () => {
      const result = handleOtpChange(emptyOtp, "a", 0);
      expect(result.newOtp[0]).toBe("");
    });

    it("takes only last character of input", () => {
      const result = handleOtpChange(emptyOtp, "123", 0);
      expect(result.newOtp[0]).toBe("3");
    });

    it("allows clearing a digit", () => {
      const filledOtp = ["1", "2", "3", "4", "5", "6"];
      const result = handleOtpChange(filledOtp, "", 3);
      expect(result.newOtp[3]).toBe("");
    });
  });

  describe("handleOtpPaste", () => {
    it("fills OTP from pasted 6-digit code", () => {
      const result = handleOtpPaste(emptyOtp, "123456");
      expect(result.newOtp).toEqual(["1", "2", "3", "4", "5", "6"]);
      expect(result.focusIndex).toBe(5);
    });

    it("handles partial paste", () => {
      const result = handleOtpPaste(emptyOtp, "123");
      expect(result.newOtp.slice(0, 3)).toEqual(["1", "2", "3"]);
      expect(result.focusIndex).toBe(3);
    });

    it("rejects non-numeric paste", () => {
      const result = handleOtpPaste(emptyOtp, "abc123");
      expect(result.newOtp).toEqual(emptyOtp);
    });

    it("truncates paste longer than 6 digits", () => {
      const result = handleOtpPaste(emptyOtp, "12345678");
      expect(result.newOtp).toEqual(["1", "2", "3", "4", "5", "6"]);
    });
  });

  describe("handleOtpBackspace", () => {
    it("moves focus to previous input when current is empty", () => {
      expect(handleOtpBackspace(emptyOtp, 3)).toBe(2);
    });

    it("does not move when at first input", () => {
      expect(handleOtpBackspace(emptyOtp, 0)).toBeNull();
    });

    it("does not move when current has a digit", () => {
      const otp = ["1", "2", "3", "", "", ""];
      expect(handleOtpBackspace(otp, 2)).toBeNull();
    });
  });
});
