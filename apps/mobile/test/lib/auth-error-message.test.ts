import { extractAuthErrorMessage, getFriendlyAuthErrorMessage } from "@/lib/auth-error-message";

describe("extractAuthErrorMessage", () => {
  it("returns string errors as-is", () => {
    expect(extractAuthErrorMessage("some error")).toBe("some error");
  });

  it("extracts message from Error objects", () => {
    expect(extractAuthErrorMessage(new Error("bad thing"))).toBe("bad thing");
  });

  it("extracts message from plain objects", () => {
    expect(extractAuthErrorMessage({ message: "obj error" })).toBe("obj error");
  });

  it("returns empty string for null/undefined", () => {
    expect(extractAuthErrorMessage(null)).toBe("");
    expect(extractAuthErrorMessage(undefined)).toBe("");
  });
});

describe("getFriendlyAuthErrorMessage", () => {
  it("handles network errors", () => {
    const msg = getFriendlyAuthErrorMessage(new Error("Network request failed"), "login");
    expect(msg).toContain("couldn't reach the server");
  });

  it("handles rate limit errors", () => {
    const msg = getFriendlyAuthErrorMessage(new Error("too many requests"), "login");
    expect(msg).toContain("wait a moment");
  });

  it("handles login invalid credentials", () => {
    const msg = getFriendlyAuthErrorMessage(new Error("Invalid credentials"), "login");
    expect(msg).toContain("email or password");
  });

  it("handles register duplicate email", () => {
    const msg = getFriendlyAuthErrorMessage(new Error("already exists"), "register");
    expect(msg).toContain("already in use");
  });

  it("handles verify invalid code", () => {
    const msg = getFriendlyAuthErrorMessage(new Error("invalid code"), "verify");
    expect(msg).toContain("verification code");
  });

  it("handles reset-password invalid code", () => {
    const msg = getFriendlyAuthErrorMessage(new Error("code expired"), "reset-password");
    expect(msg).toContain("reset code");
  });

  it("handles change-password wrong old password", () => {
    const msg = getFriendlyAuthErrorMessage(new Error("incorrect old password"), "change-password");
    expect(msg).toContain("current password");
  });

  it("returns generic fallback for unknown errors", () => {
    const msg = getFriendlyAuthErrorMessage(new Error("xyz"), "forgot");
    expect(msg).toContain("couldn't send a reset code");
  });

  it("returns generic fallback for resend flow", () => {
    const msg = getFriendlyAuthErrorMessage(new Error("xyz"), "resend");
    expect(msg).toContain("couldn't resend");
  });

  it("handles network error with API URL", () => {
    const msg = getFriendlyAuthErrorMessage(
      new Error("Cannot reach API at https://api.example.com."),
      "login"
    );
    expect(msg).toContain("api.example.com");
  });
});
