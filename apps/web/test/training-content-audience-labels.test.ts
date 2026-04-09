import { isYouthAgeAudienceLabel } from "@/components/admin/training-content-v2/api";

describe("training content audience labels", () => {
  describe("isYouthAgeAudienceLabel", () => {
    it("accepts youth exact ages and ranges up to 18", () => {
      expect(isYouthAgeAudienceLabel("7")).toBe(true);
      expect(isYouthAgeAudienceLabel("18")).toBe(true);
      expect(isYouthAgeAudienceLabel("7-18")).toBe(true);
      expect(isYouthAgeAudienceLabel(" 7 - 18 ")).toBe(true);
      expect(isYouthAgeAudienceLabel("All")).toBe(true);
      expect(isYouthAgeAudienceLabel("")).toBe(true);
    });

    it("rejects adult ages and ranges above 18 (e.g. 19-99)", () => {
      expect(isYouthAgeAudienceLabel("19")).toBe(false);
      expect(isYouthAgeAudienceLabel("19-99")).toBe(false);
      expect(isYouthAgeAudienceLabel("18-99")).toBe(false);
      expect(isYouthAgeAudienceLabel("adult::PHP Program")).toBe(false);
      expect(isYouthAgeAudienceLabel("PHP Premium")).toBe(false);
    });

    it("supports a custom maxYouthAge", () => {
      expect(isYouthAgeAudienceLabel("18", 17)).toBe(false);
      expect(isYouthAgeAudienceLabel("17", 17)).toBe(true);
      expect(isYouthAgeAudienceLabel("7-18", 17)).toBe(false);
      expect(isYouthAgeAudienceLabel("7-17", 17)).toBe(true);
    });
  });
});
