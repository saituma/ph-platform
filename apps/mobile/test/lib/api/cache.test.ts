import { hashString } from "@/lib/api/cache";

describe("api/cache", () => {
  describe("hashString", () => {
    it("returns consistent hash for same input", () => {
      expect(hashString("test")).toBe(hashString("test"));
    });

    it("returns different hashes for different inputs", () => {
      expect(hashString("a")).not.toBe(hashString("b"));
    });

    it("returns hex string", () => {
      expect(hashString("hello")).toMatch(/^[0-9a-f]+$/);
    });
  });
});
