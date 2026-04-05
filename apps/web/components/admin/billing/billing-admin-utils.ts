"use client";

export type PlanTier = "PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro";

export type SubscriptionPlan = {
  id: number;
  name: string;
  tier: PlanTier;
  stripePriceId: string | null;
  displayPrice: string;
  billingInterval: string;
  monthlyPrice: string | null;
  discountType: string | null;
  discountValue: string | null;
  discountAppliesTo: string | null;
  isActive: boolean;
};

export type PlanFormState = {
  id: number | null;
  name: string;
  tier: PlanTier;
  stripePriceId: string;
  displayPrice: string;
  billingInterval: string;
  monthlyPrice: string;
  discountType: string;
  monthlyDiscountEnabled: boolean;
  monthlyDiscountValue: string;
  isActive: boolean;
};

export const defaultForm: PlanFormState = {
  id: null,
  name: "",
  tier: "PHP",
  stripePriceId: "manual",
  displayPrice: "",
  billingInterval: "",
  monthlyPrice: "",
  discountType: "percent",
  monthlyDiscountEnabled: false,
  monthlyDiscountValue: "",
  isActive: true,
};

export function parseDiscountFields(
  plan: Pick<SubscriptionPlan, "discountValue" | "discountAppliesTo">
) {
  const rawValue = String(plan?.discountValue ?? "").trim();
  const appliesTo = String(plan?.discountAppliesTo ?? "").trim().toLowerCase();
  if (!rawValue) {
    return {
      monthlyDiscountEnabled: false,
      monthlyDiscountValue: "",
    };
  }
  if (appliesTo === "custom") {
    try {
      const parsed = JSON.parse(rawValue) as { monthly?: unknown };
      const monthlyValue = parsed.monthly == null ? "" : String(parsed.monthly);
      return {
        monthlyDiscountEnabled: Boolean(monthlyValue.trim()),
        monthlyDiscountValue: monthlyValue,
      };
    } catch {
      return {
        monthlyDiscountEnabled: false,
        monthlyDiscountValue: "",
      };
    }
  }
  if (appliesTo === "monthly") {
    return {
      monthlyDiscountEnabled: true,
      monthlyDiscountValue: rawValue,
    };
  }
  return {
    monthlyDiscountEnabled: false,
    monthlyDiscountValue: "",
  };
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export const getCsrfToken = () =>
  document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("csrfToken="))
    ?.split("=")[1] ?? "";

export function buildDisplayPrice(plan: Pick<PlanFormState, "monthlyPrice">) {
  const monthly = plan.monthlyPrice.trim();
  return monthly ? `Monthly ${monthly}` : "Free";
}

export function normalizeBillingInterval(
  plan: Pick<PlanFormState, "monthlyPrice" | "billingInterval">
) {
  const hasMonthly = Boolean(plan.monthlyPrice.trim());
  if (hasMonthly) return "monthly";
  return plan.billingInterval.trim() || "free";
}
