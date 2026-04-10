import { isTransportFailure, extractErrorMessage } from "@/lib/api/errorUtils";

describe("errorUtils", () => {
  describe("isTransportFailure", () => {
    it("should return true for AbortError", () => {
      expect(isTransportFailure({ name: "AbortError" })).toBe(true);
    });

    it("should return true for TypeError (standard fetch network error)", () => {
      expect(isTransportFailure(new TypeError())).toBe(true);
    });

    it("should return true for specific error messages", () => {
      expect(isTransportFailure(new Error("Network request failed"))).toBe(true);
      expect(isTransportFailure(new Error("Request timed out"))).toBe(true);
    });

    it("should return false for other errors", () => {
      expect(isTransportFailure(new Error("Internal Server Error"))).toBe(false);
      expect(isTransportFailure(null)).toBe(false);
    });
  });

  describe("extractErrorMessage", () => {
    it("should extract error from payload", () => {
      expect(extractErrorMessage("", { error: "Big error" })).toBe("Big error");
      expect(extractErrorMessage("", { message: "Small error" })).toBe("Small error");
    });

    it("should extract 404 style messages", () => {
      expect(extractErrorMessage("Cannot GET /users", {})).toBe("GET /users not found");
    });

    it("should fallback to raw text", () => {
      expect(extractErrorMessage("Unknown text", {})).toBe("Unknown text");
    });
  });
});
