import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { subscriptionPlanTable, ProgramType } from "../../db/schema";
import { stripe, createStripePriceForPlan } from "./stripe.service";

/** Next period end from plan billing interval (coach approval time). One-time plans → no auto-expiry. */
export function computePlanPeriodEnd(billingInterval: string | null | undefined, from: Date): Date | null {
  const bi = (billingInterval ?? "").trim().toLowerCase();
  if (!bi || bi === "one_time") return null;
  const d = new Date(from.getTime());
  if (bi === "monthly") {
    d.setMonth(d.getMonth() + 1);
    return d;
  }
  if (bi === "yearly" || bi === "annual") {
    d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  return null;
}

export function parsePriceToCents(value?: string | null): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

function getCurrencySymbol(value?: string | null) {
  if (!value) return "£";
  const match = value.match(/[£$€]/);
  return match?.[0] ?? "£";
}

function formatPriceFromCents(cents: number, symbol = "£") {
  const amount = cents / 100;
  const fixed = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${symbol}${fixed}`;
}

function parseDiscountConfig(input: {
  discountType?: string | null;
  discountValue?: string | null;
  discountAppliesTo?: string | null;
}) {
  const legacyType = input.discountType ?? null;
  const rawValue = String(input.discountValue ?? "").trim();
  const appliesTo = String(input.discountAppliesTo ?? "").trim().toLowerCase();

  const empty = {
    monthly: null as string | null,
    yearly: null as string | null,
    discountType: legacyType,
  };

  if (!rawValue) return empty;

  if (appliesTo === "custom") {
    try {
      const parsed = JSON.parse(rawValue) as { monthly?: unknown; yearly?: unknown };
      return {
        monthly: parsed.monthly == null ? null : String(parsed.monthly).trim() || null,
        yearly: parsed.yearly == null ? null : String(parsed.yearly).trim() || null,
        discountType: legacyType,
      };
    } catch {
      return empty;
    }
  }

  if (appliesTo === "monthly") {
    return { monthly: rawValue, yearly: null, discountType: legacyType };
  }
  if (appliesTo === "yearly") {
    return { monthly: null, yearly: rawValue, discountType: legacyType };
  }
  if (appliesTo === "both") {
    return { monthly: rawValue, yearly: rawValue, discountType: legacyType };
  }

  return empty;
}

export function applyDiscountToAmount(input: {
  originalCents: number;
  discountType?: string | null;
  discountValue?: string | null;
  discountAppliesTo?: string | null;
  interval: "monthly" | "yearly";
}) {
  const { originalCents, interval } = input;
  const parsedDiscounts = parseDiscountConfig(input);
  const discountType = parsedDiscounts.discountType;
  const intervalDiscountValue = interval === "monthly" ? parsedDiscounts.monthly : parsedDiscounts.yearly;
  if (!discountType || !intervalDiscountValue) {
    return originalCents;
  }
  if (discountType === "percent") {
    const percent = Number(intervalDiscountValue);
    if (!Number.isFinite(percent) || percent <= 0) return originalCents;
    const discounted = Math.round(originalCents * (1 - percent / 100));
    return discounted > 0 ? discounted : originalCents;
  }
  if (discountType === "amount") {
    const discounted = parsePriceToCents(intervalDiscountValue);
    if (!discounted || discounted <= 0) return originalCents;
    return discounted;
  }
  return originalCents;
}

function buildPublicPlanPricing(plan: {
  displayPrice?: string | null;
  monthlyPrice?: string | null;
  yearlyPrice?: string | null;
  discountType?: string | null;
  discountValue?: string | null;
  discountAppliesTo?: string | null;
}) {
  const buildEntry = (label: "Monthly" | "Yearly", rawValue: string | null | undefined, interval: "monthly" | "yearly") => {
    if (!rawValue?.trim()) return null;
    const originalCents = parsePriceToCents(rawValue);
    if (!originalCents) {
      return {
        label,
        interval,
        original: rawValue,
        discounted: rawValue,
        hasDiscount: false,
        discountLabel: null,
      };
    }
    const symbol = getCurrencySymbol(rawValue);
    const discountedCents = applyDiscountToAmount({
      originalCents,
      discountType: plan.discountType,
      discountValue: plan.discountValue,
      discountAppliesTo: plan.discountAppliesTo,
      interval,
    });
    const hasDiscount = discountedCents < originalCents;
    const intervalDiscountValue = parseDiscountConfig(plan)[interval];
    const discountLabel =
      hasDiscount && plan.discountType === "percent" && intervalDiscountValue
        ? `${String(intervalDiscountValue).trim()}% off`
        : hasDiscount && plan.discountType === "amount"
        ? "Discount applied"
        : null;
    return {
      label,
      interval,
      original: formatPriceFromCents(originalCents, symbol),
      discounted: formatPriceFromCents(discountedCents, symbol),
      hasDiscount,
      discountLabel,
      originalCents,
      discountedCents,
    };
  };

  const monthly = buildEntry("Monthly", plan.monthlyPrice, "monthly");
  const yearly = buildEntry("Yearly", plan.yearlyPrice, "yearly");
  const featured = monthly ?? yearly;

  return {
    badge: featured
      ? featured.hasDiscount
        ? `${featured.label} ${featured.discounted}`
        : featured.original
      : plan.displayPrice ?? null,
    monthly,
    yearly,
  };
}

export async function listActiveSubscriptionPlans() {
  return db
    .select()
    .from(subscriptionPlanTable)
    .where(eq(subscriptionPlanTable.isActive, true))
    .orderBy(subscriptionPlanTable.tier);
}

export async function listSubscriptionPlans(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false;
  const rows = includeInactive
    ? await db.select().from(subscriptionPlanTable).orderBy(subscriptionPlanTable.id)
    : await db
        .select()
        .from(subscriptionPlanTable)
        .where(eq(subscriptionPlanTable.isActive, true))
        .orderBy(subscriptionPlanTable.id);

  return rows.map((plan) => ({
    ...plan,
    pricing: buildPublicPlanPricing(plan),
  }));
}

export async function getActiveSubscriptionPlanByTier(tier: (typeof ProgramType.enumValues)[number]) {
  const rows = await db
    .select()
    .from(subscriptionPlanTable)
    .where(and(eq(subscriptionPlanTable.tier, tier), eq(subscriptionPlanTable.isActive, true)))
    .orderBy(desc(subscriptionPlanTable.updatedAt), desc(subscriptionPlanTable.id))
    .limit(1);
  return rows[0] ?? null;
}

export function isSubscriptionPlanFree(plan: {
  displayPrice?: string | null;
  monthlyPrice?: string | null;
  yearlyPrice?: string | null;
  stripePriceId?: string | null;
  stripePriceIdMonthly?: string | null;
  stripePriceIdYearly?: string | null;
}) {
  const monthlyAmount = parsePriceToCents(plan.monthlyPrice);
  const yearlyAmount = parsePriceToCents(plan.yearlyPrice);
  if (monthlyAmount || yearlyAmount) {
    return false;
  }

  const display = String(plan.displayPrice ?? "").trim().toLowerCase();
  if (display === "free" || display === "included") {
    return true;
  }

  const hasStripePrice = [
    plan.stripePriceId,
    plan.stripePriceIdMonthly,
    plan.stripePriceIdYearly,
  ].some((value) => {
    const normalized = String(value ?? "").trim().toLowerCase();
    return Boolean(normalized) && normalized !== "manual";
  });

  return !hasStripePrice;
}

export async function createSubscriptionPlan(input: {
  name: string;
  tier: (typeof ProgramType.enumValues)[number];
  stripePriceId: string;
  stripePriceIdMonthly?: string | null;
  stripePriceIdYearly?: string | null;
  displayPrice: string;
  billingInterval: string;
  monthlyPrice?: string | null;
  yearlyPrice?: string | null;
  discountType?: string | null;
  discountValue?: string | null;
  discountAppliesTo?: string | null;
  isActive?: boolean;
}) {
  let stripePriceIdMonthly = input.stripePriceIdMonthly ?? null;
  let stripePriceIdYearly = input.stripePriceIdYearly ?? null;
  let stripePriceId = input.stripePriceId || "manual";

  if (stripe) {
    const monthlyAmount = parsePriceToCents(input.monthlyPrice);
    const yearlyAmount = parsePriceToCents(input.yearlyPrice);
    if (monthlyAmount) {
      const discountedMonthly = applyDiscountToAmount({
        originalCents: monthlyAmount,
        discountType: input.discountType,
        discountValue: input.discountValue,
        discountAppliesTo: input.discountAppliesTo,
        interval: "monthly",
      });
      stripePriceIdMonthly = await createStripePriceForPlan({
        name: input.name,
        tier: input.tier,
        interval: "monthly",
        unitAmount: discountedMonthly,
      });
      stripePriceId = stripePriceIdMonthly;
    }
    if (yearlyAmount) {
      const discountedYearly = applyDiscountToAmount({
        originalCents: yearlyAmount,
        discountType: input.discountType,
        discountValue: input.discountValue,
        discountAppliesTo: input.discountAppliesTo,
        interval: "yearly",
      });
      stripePriceIdYearly = await createStripePriceForPlan({
        name: input.name,
        tier: input.tier,
        interval: "yearly",
        unitAmount: discountedYearly,
      });
      if (!stripePriceId || stripePriceId === "manual") stripePriceId = stripePriceIdYearly;
    }
  }

  const result = await db
    .insert(subscriptionPlanTable)
    .values({
      name: input.name,
      tier: input.tier,
      stripePriceId,
      stripePriceIdMonthly,
      stripePriceIdYearly,
      displayPrice: input.displayPrice,
      billingInterval: input.billingInterval,
      monthlyPrice: input.monthlyPrice ?? null,
      yearlyPrice: input.yearlyPrice ?? null,
      discountType: input.discountType ?? null,
      discountValue: input.discountValue ?? null,
      discountAppliesTo: input.discountAppliesTo ?? null,
      isActive: input.isActive ?? true,
    })
    .returning();
  return result[0] ?? null;
}

export async function updateSubscriptionPlan(
  planId: number,
  input: Partial<{
    name: string;
    tier: (typeof ProgramType.enumValues)[number];
    stripePriceId: string;
    stripePriceIdMonthly: string | null;
    stripePriceIdYearly: string | null;
    displayPrice: string;
    billingInterval: string;
    monthlyPrice: string | null;
    yearlyPrice: string | null;
    discountType: string | null;
    discountValue: string | null;
    discountAppliesTo: string | null;
    isActive: boolean;
  }>
) {
  const existingRows = await db
    .select()
    .from(subscriptionPlanTable)
    .where(eq(subscriptionPlanTable.id, planId))
    .limit(1);
  const existing = existingRows[0];
  if (!existing) {
    return null;
  }

  let stripePriceIdMonthly = input.stripePriceIdMonthly ?? existing.stripePriceIdMonthly ?? null;
  let stripePriceIdYearly = input.stripePriceIdYearly ?? existing.stripePriceIdYearly ?? null;
  let stripePriceId = input.stripePriceId ?? existing.stripePriceId;
  if (stripe) {
    const nextName = input.name ?? existing.name;
    const nextTier = input.tier ?? existing.tier;
    const monthlyAmount = parsePriceToCents(input.monthlyPrice ?? existing.monthlyPrice);
    const yearlyAmount = parsePriceToCents(input.yearlyPrice ?? existing.yearlyPrice);
    const discountType = input.discountType ?? existing.discountType ?? null;
    const discountValue = input.discountValue ?? existing.discountValue ?? null;
    const discountAppliesTo = input.discountAppliesTo ?? existing.discountAppliesTo ?? null;
    if (monthlyAmount) {
      const discountedMonthly = applyDiscountToAmount({
        originalCents: monthlyAmount,
        discountType,
        discountValue,
        discountAppliesTo,
        interval: "monthly",
      });
      stripePriceIdMonthly = await createStripePriceForPlan({
        name: nextName,
        tier: nextTier,
        interval: "monthly",
        unitAmount: discountedMonthly,
      });
      stripePriceId = stripePriceIdMonthly;
    }
    if (yearlyAmount) {
      const discountedYearly = applyDiscountToAmount({
        originalCents: yearlyAmount,
        discountType,
        discountValue,
        discountAppliesTo,
        interval: "yearly",
      });
      stripePriceIdYearly = await createStripePriceForPlan({
        name: nextName,
        tier: nextTier,
        interval: "yearly",
        unitAmount: discountedYearly,
      });
      if (!stripePriceId || stripePriceId === "manual") stripePriceId = stripePriceIdYearly;
    }
  }
  const result = await db
    .update(subscriptionPlanTable)
    .set({
      ...input,
      stripePriceId,
      stripePriceIdMonthly,
      stripePriceIdYearly,
      updatedAt: new Date(),
    })
    .where(eq(subscriptionPlanTable.id, planId))
    .returning();
  return result[0] ?? null;
}
