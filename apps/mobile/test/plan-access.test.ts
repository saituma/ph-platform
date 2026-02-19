import { canAccessTier, isPremium, normalizeProgramTier, programIdToTier, tierRank } from "@/lib/planAccess";

describe("planAccess", () => {
  it("normalizes tier names", () => {
    expect(normalizeProgramTier("PHP")).toBe("PHP");
    expect(normalizeProgramTier("php")).toBe("PHP");
    expect(normalizeProgramTier("PHP Plus")).toBe("PHP_Plus");
    expect(normalizeProgramTier("php_premium")).toBe("PHP_Premium");
    expect(normalizeProgramTier("unknown")).toBeNull();
  });

  it("maps program ids to tiers", () => {
    expect(programIdToTier("php")).toBe("PHP");
    expect(programIdToTier("plus")).toBe("PHP_Plus");
    expect(programIdToTier("premium")).toBe("PHP_Premium");
  });

  it("ranks tiers consistently", () => {
    expect(tierRank("PHP")).toBeLessThan(tierRank("PHP_Plus"));
    expect(tierRank("PHP_Plus")).toBeLessThan(tierRank("PHP_Premium"));
    expect(tierRank(null)).toBe(-1);
  });

  it("checks access correctly", () => {
    expect(canAccessTier("PHP_Premium", "PHP")).toBe(true);
    expect(canAccessTier("PHP", "PHP_Premium")).toBe(false);
    expect(canAccessTier("PHP_Plus", "PHP_Plus")).toBe(true);
    expect(canAccessTier("PHP", null)).toBe(true);
  });

  it("detects premium", () => {
    expect(isPremium("PHP_Premium")).toBe(true);
    expect(isPremium("PHP_Plus")).toBe(false);
  });
});
