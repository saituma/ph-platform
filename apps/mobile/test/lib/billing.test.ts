import { buildPlanPricing } from "@/lib/billing";

describe("buildPlanPricing", () => {
  it("returns badge with plan id", () => {
    expect(buildPlanPricing({ id: 1 }).badge).toBe("Price for 1");
    expect(buildPlanPricing({ id: "premium" }).badge).toBe("Price for premium");
  });

  it("returns empty lines array", () => {
    expect(buildPlanPricing({ id: 1 }).lines).toEqual([]);
  });

  it("accepts optional tier", () => {
    const result = buildPlanPricing({ id: 2, tier: "PHP_Premium" });
    expect(result.badge).toBe("Price for 2");
  });
});
