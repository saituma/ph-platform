import { canAccessTier, isPremium, normalizeProgramTier, programIdToTier, tierRank } from "@/lib/planAccess";

describe("planAccess", () => {
  it("normalizes tier names", () => {
    expect(normalizeProgramTier("PHP")).toBe("PHP");
    expect(normalizeProgramTier("php")).toBe("PHP");
    expect(normalizeProgramTier("PHP Premium Plus")).toBe("PHP_Premium_Plus");
    expect(normalizeProgramTier("php_premium")).toBe("PHP_Premium");
    expect(normalizeProgramTier("unknown")).toBeNull();
  });

  it("maps program ids to tiers", () => {
    expect(programIdToTier("php")).toBe("PHP");
    expect(programIdToTier("plus")).toBe("PHP_Premium_Plus");
    expect(programIdToTier("premium")).toBe("PHP_Premium");
    expect(programIdToTier("pro")).toBe("PHP_Pro");
  });

  it("ranks tiers consistently", () => {
    expect(tierRank("PHP")).toBeLessThan(tierRank("PHP_Premium"));
    expect(tierRank("PHP_Premium")).toBeLessThan(tierRank("PHP_Premium_Plus"));
    expect(tierRank("PHP_Premium_Plus")).toBeLessThan(tierRank("PHP_Pro"));
    expect(tierRank(null)).toBe(-1);
  });

  it("checks access correctly", () => {
    expect(canAccessTier("PHP_Premium", "PHP")).toBe(true);
    expect(canAccessTier("PHP", "PHP_Premium")).toBe(false);
    expect(canAccessTier("PHP_Premium_Plus", "PHP_Premium_Plus")).toBe(true);
    expect(canAccessTier("PHP", null)).toBe(true);
  });

  it("detects premium", () => {
    expect(isPremium("PHP_Premium")).toBe(true);
    expect(isPremium("PHP_Premium_Plus")).toBe(false);
  });
});
