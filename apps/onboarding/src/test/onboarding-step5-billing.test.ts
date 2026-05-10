import { describe, it, expect } from "vitest";

type BillingCycle = "monthly" | "six_months" | "yearly";

function isWeeklyPlan(plan: any): boolean {
  const name = String(plan?.name ?? "").toLowerCase();
  const tier = String(plan?.tier ?? "").toLowerCase();
  const interval = String(plan?.billingInterval ?? "").toLowerCase();
  const durationWeeks = Number(plan?.durationWeeks ?? 0);
  if (name.includes("weekly") || tier.includes("weekly") || interval.includes("week")) return true;
  if (Number.isFinite(durationWeeks) && durationWeeks > 0) return true;
  return false;
}

function planSupportsBillingCycle(plan: any, cycle: BillingCycle): boolean {
  if (plan?.supports && typeof plan.supports === "object") {
    return Boolean(plan.supports[cycle]);
  }
  if (cycle === "monthly") return Boolean(plan?.stripePriceIdMonthly || plan?.monthlyPrice);
  if (cycle === "six_months") return Boolean(plan?.stripePriceIdOneTime || plan?.oneTimePrice);
  return Boolean(plan?.stripePriceIdYearly || plan?.yearlyPrice);
}

function parseMoneyToNumber(value: string): number | null {
  const cleaned = value.replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.replace(/,/g, "");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function detectCurrencySymbol(value: string): string {
  const match = value.match(/[£$€]/);
  return match?.[0] ?? "£";
}

function dedupePlansByTier(plans: any[]) {
  const score = (p: any): number => {
    if (p?.updatedAt) {
      const t = new Date(p.updatedAt).getTime();
      if (Number.isFinite(t)) return t;
    }
    return Number(p?.id ?? 0);
  };
  const best = new Map<string, any>();
  for (const p of plans) {
    const key = p.tier ? `tier:${p.tier}` : `id:${p.id}`;
    const cur = best.get(key);
    if (!cur || score(p) > score(cur)) best.set(key, p);
  }
  return [...best.values()];
}

describe("Onboarding Step 5 - Plan Selection", () => {
  describe("isWeeklyPlan", () => {
    it("detects weekly by name", () => {
      expect(isWeeklyPlan({ name: "Weekly Training" })).toBe(true);
    });

    it("detects weekly by tier", () => {
      expect(isWeeklyPlan({ tier: "weekly_basic" })).toBe(true);
    });

    it("detects weekly by billing interval", () => {
      expect(isWeeklyPlan({ billingInterval: "week" })).toBe(true);
    });

    it("detects weekly by duration weeks", () => {
      expect(isWeeklyPlan({ durationWeeks: 8 })).toBe(true);
    });

    it("returns false for standard plan", () => {
      expect(isWeeklyPlan({ name: "PHP Premium", tier: "PHP_Premium" })).toBe(false);
    });

    it("handles null/undefined", () => {
      expect(isWeeklyPlan(null)).toBe(false);
      expect(isWeeklyPlan(undefined)).toBe(false);
      expect(isWeeklyPlan({})).toBe(false);
    });
  });

  describe("planSupportsBillingCycle", () => {
    it("checks supports object first", () => {
      const plan = { supports: { monthly: true, six_months: false, yearly: true } };
      expect(planSupportsBillingCycle(plan, "monthly")).toBe(true);
      expect(planSupportsBillingCycle(plan, "six_months")).toBe(false);
      expect(planSupportsBillingCycle(plan, "yearly")).toBe(true);
    });

    it("falls back to price IDs for monthly", () => {
      expect(planSupportsBillingCycle({ stripePriceIdMonthly: "price_123" }, "monthly")).toBe(true);
      expect(planSupportsBillingCycle({ monthlyPrice: "£29" }, "monthly")).toBe(true);
      expect(planSupportsBillingCycle({}, "monthly")).toBe(false);
    });

    it("falls back to price IDs for six_months", () => {
      expect(planSupportsBillingCycle({ stripePriceIdOneTime: "price_123" }, "six_months")).toBe(true);
      expect(planSupportsBillingCycle({ oneTimePrice: "£150" }, "six_months")).toBe(true);
    });

    it("falls back to price IDs for yearly", () => {
      expect(planSupportsBillingCycle({ stripePriceIdYearly: "price_123" }, "yearly")).toBe(true);
      expect(planSupportsBillingCycle({ yearlyPrice: "£299" }, "yearly")).toBe(true);
    });
  });

  describe("parseMoneyToNumber", () => {
    it("parses pound amounts", () => {
      expect(parseMoneyToNumber("£29.99")).toBe(29.99);
    });

    it("parses dollar amounts", () => {
      expect(parseMoneyToNumber("$150")).toBe(150);
    });

    it("parses euro amounts", () => {
      expect(parseMoneyToNumber("€99.50")).toBe(99.5);
    });

    it("handles comma thousands separator", () => {
      expect(parseMoneyToNumber("£1,299.99")).toBe(1299.99);
    });

    it("returns null for empty string", () => {
      expect(parseMoneyToNumber("")).toBeNull();
    });

    it("returns null for non-numeric string", () => {
      expect(parseMoneyToNumber("free")).toBeNull();
    });
  });

  describe("detectCurrencySymbol", () => {
    it("detects pound", () => {
      expect(detectCurrencySymbol("£29")).toBe("£");
    });

    it("detects dollar", () => {
      expect(detectCurrencySymbol("$50")).toBe("$");
    });

    it("detects euro", () => {
      expect(detectCurrencySymbol("€99")).toBe("€");
    });

    it("defaults to pound", () => {
      expect(detectCurrencySymbol("29")).toBe("£");
    });
  });

  describe("dedupePlansByTier", () => {
    it("keeps latest plan per tier", () => {
      const plans = [
        { id: 1, tier: "PHP", updatedAt: "2024-01-01T00:00:00Z" },
        { id: 2, tier: "PHP", updatedAt: "2024-06-01T00:00:00Z" },
      ];
      const result = dedupePlansByTier(plans);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it("keeps plans with null tier as separate entries", () => {
      const plans = [
        { id: 1, tier: null },
        { id: 2, tier: null },
      ];
      const result = dedupePlansByTier(plans);
      expect(result).toHaveLength(2);
    });

    it("handles mixed tier and null-tier plans", () => {
      const plans = [
        { id: 1, tier: "PHP" },
        { id: 2, tier: "PHP_Premium" },
        { id: 3, tier: null },
      ];
      const result = dedupePlansByTier(plans);
      expect(result).toHaveLength(3);
    });
  });
});
