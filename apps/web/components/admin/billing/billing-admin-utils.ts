"use client";

import { FEATURE_GROUPS, FEATURE_LABELS, normalizeFeatureKeys } from "../../../lib/billing-features";

export type PlanTier = "PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro";

export type SubscriptionPlan = {
  id: number;
  name: string;
  tier: PlanTier;
  stripePriceId: string | null;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  stripePriceIdOneTime: string | null;
  displayPrice: string;
  billingInterval: string;
  monthlyPrice: string | null;
  yearlyPrice: string | null;
  oneTimePrice: string | null;
  discountType: string | null;
  discountValue: string | null;
  discountAppliesTo: string | null;
  discounts: DiscountRule[] | null;
  features: string[] | null;
  isActive: boolean;
};

export type DiscountRule = {
  type: "percent" | "amount";
  value: string;
  appliesTo: "monthly" | "yearly" | "six_months" | "all" | "custom";
  label?: string | null;
};

export type DiscountType = "none" | "percent" | "amount";
export type DiscountAppliesTo = "monthly" | "yearly" | "one_time" | "all" | "custom";

export type PlanFormState = {
  id: number | null;
  name: string;
  tier: PlanTier;
  displayPrice: string;
  isActive: boolean;
  monthlyEnabled: boolean;
  monthlyPrice: string;
  yearlyEnabled: boolean;
  yearlyPrice: string;
  yearlyAuto: boolean;
  oneTimeEnabled: boolean;
  oneTimePrice: string;
  oneTimeAuto: boolean;
  discountType: DiscountType;
  discountAppliesTo: DiscountAppliesTo;
  discountValue: string;
  discountValueMonthly: string;
  discountValueYearly: string;
  discountValueOneTime: string;
  discounts: DiscountRule[];
  features: string[];
};

export const TIER_ITEMS: { label: string; value: PlanTier }[] = [
  { label: "PHP Program", value: "PHP" },
  { label: "PHP Premium", value: "PHP_Premium" },
  { label: "PHP Premium Plus", value: "PHP_Premium_Plus" },
  { label: "PHP Pro", value: "PHP_Pro" },
];

/**
 * Curated catalog of features that exist in the product. Surfaced as checkboxes
 * in the plan editor. Each entry pairs a stable `key` (what's stored in `plan.features`
 * and used by gates) with a human `label` (shown in the UI). Source of truth lives in
 * `lib/billing-features.ts` — this re-exposes it for the admin editor.
 */
export type FeatureCatalogEntry = { key: string; label: string };

export const FEATURE_CATALOG: Array<{ group: string; features: FeatureCatalogEntry[] }> =
  FEATURE_GROUPS.map((group) => ({
    group: group.group,
    features: group.keys.map((key) => ({ key, label: FEATURE_LABELS[key] })),
  }));

export const FLAT_FEATURE_CATALOG: FeatureCatalogEntry[] = FEATURE_CATALOG.flatMap((g) => g.features);

export const defaultFormState: PlanFormState = {
  id: null,
  name: "",
  tier: "PHP",
  displayPrice: "",
  isActive: true,
  monthlyEnabled: true,
  monthlyPrice: "",
  yearlyEnabled: false,
  yearlyPrice: "",
  yearlyAuto: false,
  oneTimeEnabled: false,
  oneTimePrice: "",
  oneTimeAuto: false,
  discountType: "none",
  discountAppliesTo: "all",
  discountValue: "",
  discountValueMonthly: "",
  discountValueYearly: "",
  discountValueOneTime: "",
  discounts: [],
  features: [],
};

export function planToFormState(plan: SubscriptionPlan): PlanFormState {
  const monthlyPrice = (plan.monthlyPrice ?? "").trim();
  const yearlyPrice = (plan.yearlyPrice ?? "").trim();
  const oneTimePrice = (plan.oneTimePrice ?? "").trim();
  const discountType = (plan.discountType as DiscountType) || "none";
  const rawAppliesTo = (plan.discountAppliesTo ?? "").toLowerCase();
  const appliesTo: DiscountAppliesTo =
    rawAppliesTo === "monthly" ||
    rawAppliesTo === "yearly" ||
    rawAppliesTo === "one_time" ||
    rawAppliesTo === "custom"
      ? (rawAppliesTo as DiscountAppliesTo)
      : rawAppliesTo === "both" || rawAppliesTo === "all"
        ? "all"
        : "all";

  let discountValue = plan.discountValue ?? "";
  let valueMonthly = "";
  let valueYearly = "";
  let valueOneTime = "";
  if (appliesTo === "custom" && plan.discountValue) {
    try {
      const parsed = JSON.parse(plan.discountValue) as { monthly?: unknown; yearly?: unknown; one_time?: unknown };
      valueMonthly = parsed.monthly == null ? "" : String(parsed.monthly);
      valueYearly = parsed.yearly == null ? "" : String(parsed.yearly);
      valueOneTime = parsed.one_time == null ? "" : String(parsed.one_time);
      discountValue = "";
    } catch {
      // leave raw
    }
  }

  return {
    id: plan.id,
    name: plan.name,
    tier: plan.tier,
    displayPrice: plan.displayPrice,
    isActive: plan.isActive,
    monthlyEnabled: Boolean(monthlyPrice),
    monthlyPrice,
    yearlyEnabled: Boolean(yearlyPrice),
    yearlyPrice,
    oneTimeEnabled: Boolean(oneTimePrice),
    oneTimePrice,
    discountType: discountType === "percent" || discountType === "amount" ? discountType : "none",
    discountAppliesTo: appliesTo,
    discountValue,
    discountValueMonthly: valueMonthly,
    discountValueYearly: valueYearly,
    discountValueOneTime: valueOneTime,
    discounts: Array.isArray(plan.discounts)
      ? plan.discounts
          .filter((d): d is DiscountRule => Boolean(d) && (d as any).type && (d as any).value && (d as any).appliesTo)
          .map((d) => ({
            type: (d.type as DiscountRule["type"]) ?? "percent",
            value: String(d.value ?? ""),
            appliesTo: (d.appliesTo as DiscountRule["appliesTo"]) ?? "all",
            label: d.label ?? null,
          }))
      : [],
    // Normalize legacy label-stored features into stable keys.
    features: normalizeFeatureKeys(plan.features as unknown[] | null | undefined),
    yearlyAuto: false,
    oneTimeAuto: false,
  };
}

/** Derive a multiplied price string from a monthly value, preserving currency symbol. */
export function deriveMultipliedPrice(monthly: string, multiplier: number): string {
  const trimmed = monthly.trim();
  if (!trimmed) return "";
  const symbolMatch = trimmed.match(/[£$€]/);
  const symbol = symbolMatch?.[0] ?? "£";
  const numeric = Number(trimmed.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  const result = numeric * multiplier;
  const formatted = Number.isInteger(result) ? String(result) : result.toFixed(2);
  return `${symbol}${formatted}`;
}

export function planFormToPayload(form: PlanFormState) {
  const monthlyPrice = form.monthlyEnabled ? form.monthlyPrice.trim() : "";
  const yearlyPrice = form.yearlyEnabled
    ? (form.yearlyAuto ? deriveMultipliedPrice(form.monthlyPrice, 12) : form.yearlyPrice.trim())
    : "";
  const oneTimePrice = form.oneTimeEnabled
    ? (form.oneTimeAuto ? deriveMultipliedPrice(form.monthlyPrice, 6) : form.oneTimePrice.trim())
    : "";

  const billingInterval =
    monthlyPrice ? "monthly" : yearlyPrice ? "yearly" : oneTimePrice ? "one_time" : "free";

  const displayPrice = form.displayPrice.trim() || buildDefaultDisplayPrice({ monthlyPrice, yearlyPrice, oneTimePrice });

  let discountType: string | null = null;
  let discountValue: string | null = null;
  let discountAppliesTo: string | null = null;

  if (form.discountType !== "none") {
    discountType = form.discountType;
    if (form.discountAppliesTo === "custom") {
      discountAppliesTo = "custom";
      discountValue = JSON.stringify({
        monthly: form.discountValueMonthly.trim() || undefined,
        yearly: form.discountValueYearly.trim() || undefined,
        one_time: form.discountValueOneTime.trim() || undefined,
      });
    } else {
      discountAppliesTo = form.discountAppliesTo;
      discountValue = form.discountValue.trim();
    }
    if (!discountValue) {
      discountType = null;
      discountValue = null;
      discountAppliesTo = null;
    }
  }

  return {
    name: form.name.trim(),
    tier: form.tier,
    displayPrice,
    billingInterval,
    monthlyPrice: monthlyPrice || null,
    yearlyPrice: yearlyPrice || null,
    oneTimePrice: oneTimePrice || null,
    discountType,
    discountValue,
    discountAppliesTo,
    discounts: form.discounts
      .map((d) => ({
        type: d.type,
        value: String(d.value ?? "").trim(),
        appliesTo: d.appliesTo,
        label: d.label?.trim() || null,
      }))
      .filter((d) => d.value.length > 0),
    features: normalizeFeatureKeys(form.features),
    isActive: form.isActive,
  };
}

function buildDefaultDisplayPrice(input: {
  monthlyPrice: string;
  yearlyPrice: string;
  oneTimePrice: string;
}) {
  const parts: string[] = [];
  if (input.monthlyPrice) parts.push(`${input.monthlyPrice}/mo`);
  if (input.yearlyPrice) parts.push(`${input.yearlyPrice}/yr`);
  if (input.oneTimePrice) parts.push(`${input.oneTimePrice} once`);
  return parts.length > 0 ? parts.join(" · ") : "Free";
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
