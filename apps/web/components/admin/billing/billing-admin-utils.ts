"use client";

export type PlanTier = "PHP" | "PHP_Plus" | "PHP_Premium";

export type SubscriptionPlan = {
  id: number;
  name: string;
  tier: PlanTier;
  stripePriceId: string | null;
  displayPrice: string;
  billingInterval: string;
  monthlyPrice: string | null;
  yearlyPrice: string | null;
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
  yearlyPrice: string;
  discountType: string;
  monthlyDiscountEnabled: boolean;
  monthlyDiscountValue: string;
  yearlyDiscountEnabled: boolean;
  yearlyDiscountValue: string;
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
  yearlyPrice: "",
  discountType: "percent",
  monthlyDiscountEnabled: false,
  monthlyDiscountValue: "",
  yearlyDiscountEnabled: false,
  yearlyDiscountValue: "",
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
      yearlyDiscountEnabled: false,
      yearlyDiscountValue: "",
    };
  }
  if (appliesTo === "custom") {
    try {
      const parsed = JSON.parse(rawValue) as { monthly?: unknown; yearly?: unknown };
      const monthlyValue = parsed.monthly == null ? "" : String(parsed.monthly);
      const yearlyValue = parsed.yearly == null ? "" : String(parsed.yearly);
      return {
        monthlyDiscountEnabled: Boolean(monthlyValue.trim()),
        monthlyDiscountValue: monthlyValue,
        yearlyDiscountEnabled: Boolean(yearlyValue.trim()),
        yearlyDiscountValue: yearlyValue,
      };
    } catch {
      return {
        monthlyDiscountEnabled: false,
        monthlyDiscountValue: "",
        yearlyDiscountEnabled: false,
        yearlyDiscountValue: "",
      };
    }
  }
  if (appliesTo === "monthly") {
    return {
      monthlyDiscountEnabled: true,
      monthlyDiscountValue: rawValue,
      yearlyDiscountEnabled: false,
      yearlyDiscountValue: "",
    };
  }
  if (appliesTo === "yearly") {
    return {
      monthlyDiscountEnabled: false,
      monthlyDiscountValue: "",
      yearlyDiscountEnabled: true,
      yearlyDiscountValue: rawValue,
    };
  }
  if (appliesTo === "both") {
    return {
      monthlyDiscountEnabled: true,
      monthlyDiscountValue: rawValue,
      yearlyDiscountEnabled: true,
      yearlyDiscountValue: rawValue,
    };
  }
  return {
    monthlyDiscountEnabled: false,
    monthlyDiscountValue: "",
    yearlyDiscountEnabled: false,
    yearlyDiscountValue: "",
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

export function buildDisplayPrice(plan: Pick<PlanFormState, "monthlyPrice" | "yearlyPrice">) {
  const parts: string[] = [];
  const monthly = plan.monthlyPrice.trim();
  const yearly = plan.yearlyPrice.trim();
  if (monthly) parts.push(`Monthly ${monthly}`);
  if (yearly) parts.push(`Yearly ${yearly}`);
  return parts.length ? parts.join(" • ") : "Free";
}

export function normalizeBillingInterval(
  plan: Pick<PlanFormState, "monthlyPrice" | "yearlyPrice" | "billingInterval">
) {
  const hasMonthly = Boolean(plan.monthlyPrice.trim());
  const hasYearly = Boolean(plan.yearlyPrice.trim());
  if (hasMonthly && hasYearly) return "monthly, yearly";
  if (hasMonthly) return "monthly";
  if (hasYearly) return "yearly";
  return plan.billingInterval.trim() || "free";
}
