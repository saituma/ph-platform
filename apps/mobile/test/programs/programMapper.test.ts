import { mapPublicPlans, mapTeamWorkspace, mapPhpPlusTabs, mapMergedSectionContent } from "@/lib/programs/programMapper";
import { buildPlanPricing } from "@/lib/billing";

jest.mock("@/lib/billing", () => ({
  buildPlanPricing: jest.fn((plan) => ({ badge: `Price for ${plan.id}`, lines: [] })),
}));

describe("programMapper", () => {
  describe("mapPublicPlans", () => {
    it("should map plans correctly to tier-based objects", () => {
      const plans = [
        { id: 1, tier: "PHP", monthlyPrice: "10" },
        { id: 2, tier: "PHP_Premium", monthlyPrice: "20" },
      ];

      const result = mapPublicPlans(plans as any);

      expect(result.plansByTier["PHP"]).toBe(1);
      expect(result.plansByTier["PHP_Premium"]).toBe(2);
      expect(result.planDetailsByTier["PHP"].id).toBe(1);
      expect(result.pricingByTier["PHP"].badge).toBe("Price for 1");
    });
  });

  describe("mapTeamWorkspace", () => {
    it("should provide default tabs if missing", () => {
      const response = { title: "Team" };
      const result = mapTeamWorkspace(response as any);
      expect(result.tabs).toEqual(["Modules"]);
    });

    it("should preserve existing tabs", () => {
      const response = { tabs: ["Custom"] };
      const result = mapTeamWorkspace(response as any);
      expect(result.tabs).toEqual(["Custom"]);
    });
  });

  describe("mapMergedSectionContent", () => {
    it("should merge and sort content by order and updatedAt", () => {
      const responses = [
        {
          items: [
            { id: 1, order: 2, updatedAt: "2023-01-01" },
            { id: 2, order: 1, updatedAt: "2023-01-01" },
          ],
        },
        {
          items: [
            { id: 3, order: 1, updatedAt: "2023-01-02" },
          ],
        },
      ];

      const result = mapMergedSectionContent(responses as any);

      expect(result[0].id).toBe(3); // order 1, newer updatedAt
      expect(result[1].id).toBe(2); // order 1, older updatedAt
      expect(result[2].id).toBe(1); // order 2
    });
  });
});
