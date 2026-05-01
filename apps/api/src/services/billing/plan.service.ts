import crypto from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  athleteTable,
  subscriptionPlanTable,
  userTable,
  ProgramType,
  AthleteType,
} from "../../db/schema";
import { getUserByEmail } from "../user.service";
import { generateProvisionPassword, hashLocalProvisionPassword } from "../admin/user.service";
import { createCheckoutSession } from "./request.service";
import { sendPlanInviteEmail } from "../../lib/mailer/billing.mailer";
import { sendAdminWelcomeCredentialsEmail } from "../../lib/mailer";
import { createPlanInviteToken, verifyPlanInviteToken } from "../../lib/jwt";
import { env } from "../../config/env";
import {
  stripe,
  createStripePriceForPlan,
  tryResolveMonthlyStripePriceId,
  ensureAthleteCheckoutPriceId,
  checkoutModeForBillingCycle,
  lookupKeyForAthleteBilling,
  type AthleteBillingCycle,
} from "./stripe.service";

/** Access window end for athlete checkout by billing choice (approval / period start). */
export function computeAthleteAccessEnd(billingCycle: AthleteBillingCycle, from: Date): Date {
  const d = new Date(from.getTime());
  if (billingCycle === "monthly") {
    d.setMonth(d.getMonth() + 1);
    return d;
  }
  if (billingCycle === "six_months") {
    d.setMonth(d.getMonth() + 6);
    return d;
  }
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

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

/** Format Stripe minor units using the price's ISO currency (source of truth for checkout). */
function formatMoneyFromStripeCents(cents: number, currencyCode: string) {
  const code = (currencyCode || "gbp").toUpperCase();
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${code}`;
  }
}

function stripeErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function stripeErrorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err && typeof (err as { code: unknown }).code === "string") {
    return (err as { code: string }).code;
  }
  return undefined;
}

function logStripePriceDisplayWarning(priceId: string, err: unknown) {
  const message = stripeErrorMessage(err);
  const code = stripeErrorCode(err);
  const hint =
    code === "resource_missing"
      ? " (DB price IDs must exist in the Stripe account for STRIPE_SECRET_KEY — check test vs live and account match.)"
      : "";
  console.warn(`[Billing] Could not load Stripe price for display ${priceId}: ${message}${hint}`);
}

export async function quoteAthleteBillingCycleAmount(
  plan: {
    tier: (typeof ProgramType.enumValues)[number];
    stripePriceId?: string | null;
    stripePriceIdMonthly?: string | null;
    stripePriceIdYearly?: string | null;
    displayPrice?: string | null;
    monthlyPrice?: string | null;
    yearlyPrice?: string | null;
  },
  billingCycle: AthleteBillingCycle,
): Promise<{ amount: string | null; mode: "subscription" | "payment" }> {
  const mode = checkoutModeForBillingCycle(billingCycle);

  if (stripe) {
    try {
      const priceId = await ensureAthleteCheckoutPriceId(
        {
          tier: plan.tier,
          stripePriceId: plan.stripePriceId,
          stripePriceIdMonthly: plan.stripePriceIdMonthly,
          stripePriceIdYearly: plan.stripePriceIdYearly,
        },
        billingCycle,
      );
      const price = await stripe.prices.retrieve(priceId);
      const cents = price.unit_amount;
      const cur = price.currency ?? "gbp";
      if (cents == null) return { amount: null, mode };
      return { amount: formatMoneyFromStripeCents(cents, cur), mode };
    } catch {
      // fall through to non-stripe quoting
    }
  }

  if (billingCycle === "monthly") {
    const raw = plan.monthlyPrice ?? plan.displayPrice ?? null;
    const cleaned = raw
      ? raw
          .replace(/\/\s*month\b/gi, "")
          .replace(/\bper\s+month\b/gi, "")
          .trim()
      : null;
    return { amount: cleaned, mode };
  }

  if (billingCycle === "yearly") {
    const raw = plan.yearlyPrice ?? null;
    const cleaned = raw
      ? raw
          .replace(/\/\s*year\b/gi, "")
          .replace(/\bper\s+year\b/gi, "")
          .trim()
      : null;
    return { amount: cleaned, mode };
  }

  // six_months: prefer the admin-set explicit value (stored in oneTimePrice column),
  // otherwise derive monthly × 6.
  const explicit = (plan as { oneTimePrice?: string | null }).oneTimePrice ?? null;
  if (explicit && explicit.trim()) {
    return { amount: explicit.trim(), mode };
  }
  const base = plan.monthlyPrice ?? plan.displayPrice ?? null;
  const cents = parsePriceToCents(base);
  if (!cents) return { amount: null, mode };
  const symbol = getCurrencySymbol(base);
  return { amount: formatPriceFromCents(cents * 6, symbol), mode };
}

function parseDiscountConfig(input: {
  discountType?: string | null;
  discountValue?: string | null;
  discountAppliesTo?: string | null;
}) {
  const legacyType = input.discountType ?? null;
  const rawValue = String(input.discountValue ?? "").trim();
  const appliesTo = String(input.discountAppliesTo ?? "")
    .trim()
    .toLowerCase();

  const empty = {
    monthly: null as string | null,
    yearly: null as string | null,
    one_time: null as string | null,
    discountType: legacyType,
  };

  if (!rawValue) return empty;

  if (appliesTo === "custom") {
    try {
      const parsed = JSON.parse(rawValue) as { monthly?: unknown; yearly?: unknown; one_time?: unknown };
      return {
        monthly: parsed.monthly == null ? null : String(parsed.monthly).trim() || null,
        yearly: parsed.yearly == null ? null : String(parsed.yearly).trim() || null,
        one_time: parsed.one_time == null ? null : String(parsed.one_time).trim() || null,
        discountType: legacyType,
      };
    } catch {
      return empty;
    }
  }

  if (appliesTo === "monthly") {
    return { monthly: rawValue, yearly: null, one_time: null, discountType: legacyType };
  }
  if (appliesTo === "yearly") {
    return { monthly: null, yearly: rawValue, one_time: null, discountType: legacyType };
  }
  if (appliesTo === "one_time") {
    return { monthly: null, yearly: null, one_time: rawValue, discountType: legacyType };
  }
  if (appliesTo === "both" || appliesTo === "all") {
    return { monthly: rawValue, yearly: rawValue, one_time: rawValue, discountType: legacyType };
  }

  return empty;
}

export type DiscountRule = {
  type: "percent" | "amount";
  value: string;
  appliesTo: "monthly" | "yearly" | "six_months" | "all" | "custom";
  label?: string | null;
};

/**
 * Apply a single percent or amount discount to a base cents amount.
 * Returns the resulting cents (>= 0). Returns the input when the rule is invalid.
 */
function applySingleDiscount(originalCents: number, type: string, value: string | null | undefined): number {
  if (!type || !value) return originalCents;
  if (type === "percent") {
    const cleaned = String(value).replace(/[^\d.]/g, "");
    const percent = Number(cleaned);
    if (!Number.isFinite(percent) || percent <= 0 || percent >= 100) return originalCents;
    const next = Math.round(originalCents * (1 - percent / 100));
    return next > 0 ? next : originalCents;
  }
  if (type === "amount") {
    const offCents = parsePriceToCents(value);
    if (!offCents || offCents <= 0) return originalCents;
    // For an "amount" rule we treat the value as an absolute "off" amount, not a final price.
    // (Earlier code interpreted it as a final price; clamp to non-negative.)
    const next = originalCents - offCents;
    return next > 0 ? next : 0;
  }
  return originalCents;
}

function ruleAppliesToInterval(rule: DiscountRule, interval: "monthly" | "yearly" | "one_time"): boolean {
  const at = String(rule.appliesTo ?? "").toLowerCase();
  if (!at) return false;
  if (at === "all" || at === "both") return true;
  if (at === interval) return true;
  // map admin's "six_months" rule onto the "one_time" column (6 months payment).
  if (at === "six_months" && interval === "one_time") return true;
  if (at === "one_time" && interval === "one_time") return true;
  return false;
}

export function applyDiscountToAmount(input: {
  originalCents: number;
  discountType?: string | null;
  discountValue?: string | null;
  discountAppliesTo?: string | null;
  /** Optional array of rules; when present, stacks them multiplicatively (percent) or sums (amount). */
  discounts?: DiscountRule[] | null;
  interval: "monthly" | "yearly" | "one_time";
}) {
  const { originalCents, interval } = input;

  // New path: stack every rule that applies to this interval.
  if (Array.isArray(input.discounts) && input.discounts.length > 0) {
    let cents = originalCents;
    for (const rule of input.discounts) {
      if (!ruleAppliesToInterval(rule, interval)) continue;
      cents = applySingleDiscount(cents, String(rule.type), rule.value);
    }
    return cents;
  }

  // Legacy path: single discountType/Value/AppliesTo triple via parseDiscountConfig.
  const parsedDiscounts = parseDiscountConfig(input);
  const discountType = parsedDiscounts.discountType;
  const intervalDiscountValue =
    interval === "monthly"
      ? parsedDiscounts.monthly
      : interval === "yearly"
        ? parsedDiscounts.yearly
        : parsedDiscounts.one_time;
  if (!discountType || !intervalDiscountValue) return originalCents;
  return applySingleDiscount(originalCents, String(discountType), intervalDiscountValue);
}

function buildPublicPlanPricing(plan: {
  displayPrice?: string | null;
  monthlyPrice?: string | null;
  yearlyPrice?: string | null;
  discountType?: string | null;
  discountValue?: string | null;
  discountAppliesTo?: string | null;
}) {
  const buildEntry = (
    label: "Monthly" | "Yearly",
    rawValue: string | null | undefined,
    interval: "monthly" | "yearly",
  ) => {
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
      : (plan.displayPrice ?? null),
    monthly,
    yearly,
  };
}

type PlanRowForPricing = Parameters<typeof buildPublicPlanPricing>[0] & {
  stripePriceId?: string | null;
  stripePriceIdMonthly?: string | null;
  stripePriceIdYearly?: string | null;
  tier?: (typeof ProgramType.enumValues)[number];
};

async function fetchStripeMonthlyUnit(
  plan: PlanRowForPricing,
): Promise<{ unitAmount: number; currency: string } | null> {
  if (!stripe) return null;
  const priceId = tryResolveMonthlyStripePriceId(plan);
  if (!priceId) return null;
  try {
    const price = await stripe.prices.retrieve(priceId);
    if (price.unit_amount == null) return null;
    return { unitAmount: price.unit_amount, currency: price.currency ?? "gbp" };
  } catch (err) {
    logStripePriceDisplayWarning(priceId, err);
    return null;
  }
}

/**
 * When Stripe is configured, replace DB string prices with amounts from the linked Stripe Price
 * so public plan lists match what Checkout charges.
 */
function mergeStripeMonthlyPricing(
  plan: PlanRowForPricing,
  base: ReturnType<typeof buildPublicPlanPricing>,
  stripeMonthly: { unitAmount: number; currency: string },
) {
  const originalCents = stripeMonthly.unitAmount;
  const discountedCents = applyDiscountToAmount({
    originalCents,
    discountType: plan.discountType,
    discountValue: plan.discountValue,
    discountAppliesTo: plan.discountAppliesTo,
    interval: "monthly",
  });
  const hasDiscount = discountedCents < originalCents;
  const intervalDiscountValue = parseDiscountConfig(plan).monthly;
  const discountLabel =
    hasDiscount && plan.discountType === "percent" && intervalDiscountValue
      ? `${String(intervalDiscountValue).trim()}% off`
      : hasDiscount && plan.discountType === "amount"
        ? "Discount applied"
        : null;

  const monthly = {
    label: "Monthly" as const,
    interval: "monthly" as const,
    original: formatMoneyFromStripeCents(originalCents, stripeMonthly.currency),
    discounted: formatMoneyFromStripeCents(discountedCents, stripeMonthly.currency),
    hasDiscount,
    discountLabel,
    originalCents,
    discountedCents,
  };

  const yearly = base.yearly;
  const featured = monthly ?? yearly;
  return {
    monthly,
    yearly,
    badge: featured
      ? featured.hasDiscount
        ? `${featured.label} ${featured.discounted}`
        : featured.original
      : (plan.displayPrice ?? null),
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

  const withStripe = await Promise.all(
    rows.map(async (plan) => {
      const base = buildPublicPlanPricing(plan);
      const stripeMonthly = await fetchStripeMonthlyUnit(plan as PlanRowForPricing);
      const pricing = stripeMonthly ? mergeStripeMonthlyPricing(plan as PlanRowForPricing, base, stripeMonthly) : base;
      return {
        ...plan,
        pricing,
      };
    }),
  );

  return withStripe;
}

/** Adds `billingQuote` for onboarding plan picker (Stripe lookup + same resolution as checkout). */
export async function enrichPlansWithBillingQuotes(
  plans: Awaited<ReturnType<typeof listSubscriptionPlans>>,
  billingCycle: AthleteBillingCycle,
) {
  if (!stripe) {
    return plans.map((p) => ({ ...p, billingQuote: null }));
  }
  const stripeClient = stripe;
  return Promise.all(
    plans.map(async (plan) => {
      try {
        const priceId = await ensureAthleteCheckoutPriceId(
          {
            stripePriceId: plan.stripePriceId,
            stripePriceIdMonthly: plan.stripePriceIdMonthly,
            stripePriceIdYearly: plan.stripePriceIdYearly,
            tier: plan.tier,
          },
          billingCycle,
        );
        const price = await stripeClient.prices.retrieve(priceId);
        const cents = price.unit_amount;
        const cur = price.currency ?? "gbp";
        const amount =
          cents != null
            ? new Intl.NumberFormat("en-GB", {
                style: "currency",
                currency: cur.toUpperCase(),
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              }).format(cents / 100)
            : "—";
        return {
          ...plan,
          billingQuote: {
            billingCycle,
            lookupKey: plan.tier ? lookupKeyForAthleteBilling(plan.tier, billingCycle) : null,
            amount,
            mode: checkoutModeForBillingCycle(billingCycle),
          },
        };
      } catch {
        return { ...plan, billingQuote: null };
      }
    }),
  );
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

  const display = String(plan.displayPrice ?? "")
    .trim()
    .toLowerCase();
  if (display === "free" || display === "included") {
    return true;
  }

  const hasStripePrice = [plan.stripePriceId, plan.stripePriceIdMonthly, plan.stripePriceIdYearly].some((value) => {
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();
    return Boolean(normalized) && normalized !== "manual";
  });

  return !hasStripePrice;
}

function deriveDurationOneTimeAmount(input: {
  durationWeeks?: number | null;
  durationWeeksPrice?: number | null;
  durationDaysPerWeek?: number | null;
  durationDaysPrice?: number | null;
}): number | null {
  if (input.durationWeeksPrice && input.durationWeeksPrice > 0) {
    return input.durationWeeksPrice;
  }
  if (
    input.durationDaysPrice &&
    input.durationDaysPrice > 0 &&
    input.durationDaysPerWeek &&
    input.durationDaysPerWeek > 0 &&
    input.durationWeeks &&
    input.durationWeeks > 0
  ) {
    return input.durationDaysPrice * input.durationDaysPerWeek * input.durationWeeks;
  }
  return null;
}

function formatPenceAsGbp(cents: number): string {
  return `£${(cents / 100).toFixed(2)}`;
}

export async function createSubscriptionPlan(input: {
  name: string;
  tier?: (typeof ProgramType.enumValues)[number] | null;
  stripePriceId: string;
  stripePriceIdMonthly?: string | null;
  stripePriceIdYearly?: string | null;
  stripePriceIdOneTime?: string | null;
  displayPrice: string;
  billingInterval: string;
  monthlyPrice?: string | null;
  yearlyPrice?: string | null;
  oneTimePrice?: string | null;
  discountType?: string | null;
  discountValue?: string | null;
  discountAppliesTo?: string | null;
  discounts?: DiscountRule[] | null;
  features?: string[] | null;
  durationWeeks?: number | null;
  durationWeeksPrice?: number | null;
  durationDaysPerWeek?: number | null;
  durationDaysPrice?: number | null;
  isActive?: boolean;
}) {
  let stripePriceIdMonthly = input.stripePriceIdMonthly ?? null;
  let stripePriceIdYearly = input.stripePriceIdYearly ?? null;
  let stripePriceIdOneTime = input.stripePriceIdOneTime ?? null;
  let stripePriceId = input.stripePriceId || "manual";

  // If duration pricing is configured but no explicit oneTimePrice was provided,
  // treat the duration price as the single charge for the whole programme.
  const durationOneTimeAmount = deriveDurationOneTimeAmount(input);
  let effectiveOneTimePrice = input.oneTimePrice ?? null;
  let effectiveBillingInterval = input.billingInterval;
  let effectiveDisplayPrice = input.displayPrice;
  if (!parsePriceToCents(effectiveOneTimePrice) && durationOneTimeAmount) {
    effectiveOneTimePrice = formatPenceAsGbp(durationOneTimeAmount);
    effectiveBillingInterval = "one_time";
    if (!effectiveDisplayPrice || effectiveDisplayPrice.trim() === "") {
      effectiveDisplayPrice = effectiveOneTimePrice;
    }
  }

  if (stripe) {
    const monthlyAmount = parsePriceToCents(input.monthlyPrice);
    const yearlyAmount = parsePriceToCents(input.yearlyPrice);
    const oneTimeAmount = parsePriceToCents(effectiveOneTimePrice);
    if (monthlyAmount) {
      const discountedMonthly = applyDiscountToAmount({
        originalCents: monthlyAmount,
        discountType: input.discountType,
        discountValue: input.discountValue,
        discountAppliesTo: input.discountAppliesTo,
        discounts: input.discounts ?? null,
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
        discounts: input.discounts ?? null,
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
    if (oneTimeAmount) {
      const discountedOneTime = applyDiscountToAmount({
        originalCents: oneTimeAmount,
        discountType: input.discountType,
        discountValue: input.discountValue,
        discountAppliesTo: input.discountAppliesTo,
        discounts: input.discounts ?? null,
        interval: "one_time",
      });
      stripePriceIdOneTime = await createStripePriceForPlan({
        name: input.name,
        tier: input.tier,
        interval: "one_time",
        unitAmount: discountedOneTime,
      });
      if (!stripePriceId || stripePriceId === "manual") stripePriceId = stripePriceIdOneTime;
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
      stripePriceIdOneTime,
      displayPrice: effectiveDisplayPrice,
      billingInterval: effectiveBillingInterval,
      monthlyPrice: input.monthlyPrice ?? null,
      yearlyPrice: input.yearlyPrice ?? null,
      oneTimePrice: effectiveOneTimePrice,
      discountType: input.discountType ?? null,
      discountValue: input.discountValue ?? null,
      discountAppliesTo: input.discountAppliesTo ?? null,
      discounts: input.discounts ?? null,
      features: input.features ?? null,
      durationWeeks: input.durationWeeks ?? null,
      durationWeeksPrice: input.durationWeeksPrice ?? null,
      durationDaysPerWeek: input.durationDaysPerWeek ?? null,
      durationDaysPrice: input.durationDaysPrice ?? null,
      isActive: input.isActive ?? true,
    })
    .returning();
  return result[0] ?? null;
}

export async function importStripePriceAsPlan(input: {
  name: string;
  tier: (typeof ProgramType.enumValues)[number];
  stripePriceId: string;
  interval: "monthly" | "yearly" | "one_time";
  displayPrice: string;
  priceLabel: string;
  features?: string[] | null;
  isActive?: boolean;
}) {
  const stripePriceIdMonthly = input.interval === "monthly" ? input.stripePriceId : null;
  const stripePriceIdYearly = input.interval === "yearly" ? input.stripePriceId : null;
  const stripePriceIdOneTime = input.interval === "one_time" ? input.stripePriceId : null;
  const billingInterval = input.interval;

  const result = await db
    .insert(subscriptionPlanTable)
    .values({
      name: input.name,
      tier: input.tier,
      stripePriceId: input.stripePriceId,
      stripePriceIdMonthly,
      stripePriceIdYearly,
      stripePriceIdOneTime,
      displayPrice: input.displayPrice,
      billingInterval,
      monthlyPrice: input.interval === "monthly" ? input.priceLabel : null,
      yearlyPrice: input.interval === "yearly" ? input.priceLabel : null,
      oneTimePrice: input.interval === "one_time" ? input.priceLabel : null,
      features: input.features ?? null,
      isActive: input.isActive ?? true,
    })
    .returning();
  return result[0] ?? null;
}

export async function updateSubscriptionPlan(
  planId: number,
  input: Partial<{
    name: string;
    tier: (typeof ProgramType.enumValues)[number] | null;
    stripePriceId: string;
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
    durationWeeks: number | null;
    durationWeeksPrice: number | null;
    durationDaysPerWeek: number | null;
    durationDaysPrice: number | null;
    isActive: boolean;
  }>,
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
  let stripePriceIdOneTime = input.stripePriceIdOneTime ?? existing.stripePriceIdOneTime ?? null;
  let stripePriceId = input.stripePriceId ?? existing.stripePriceId;

  const nextDurationFields = {
    durationWeeks: ("durationWeeks" in input ? input.durationWeeks : existing.durationWeeks) ?? null,
    durationWeeksPrice: ("durationWeeksPrice" in input ? input.durationWeeksPrice : existing.durationWeeksPrice) ?? null,
    durationDaysPerWeek:
      ("durationDaysPerWeek" in input ? input.durationDaysPerWeek : existing.durationDaysPerWeek) ?? null,
    durationDaysPrice: ("durationDaysPrice" in input ? input.durationDaysPrice : existing.durationDaysPrice) ?? null,
  };
  const durationOneTimeAmount = deriveDurationOneTimeAmount(nextDurationFields);
  let effectiveOneTimePrice = input.oneTimePrice ?? existing.oneTimePrice ?? null;
  let effectiveBillingInterval = input.billingInterval ?? existing.billingInterval;
  let effectiveDisplayPrice = input.displayPrice ?? existing.displayPrice;
  if (!parsePriceToCents(effectiveOneTimePrice) && durationOneTimeAmount) {
    effectiveOneTimePrice = formatPenceAsGbp(durationOneTimeAmount);
    effectiveBillingInterval = "one_time";
    if (!effectiveDisplayPrice || effectiveDisplayPrice.trim() === "") {
      effectiveDisplayPrice = effectiveOneTimePrice;
    }
  }

  if (stripe) {
    const nextName = input.name ?? existing.name;
    const nextTier = input.tier ?? existing.tier;
    const nextMonthlyRaw = input.monthlyPrice ?? existing.monthlyPrice;
    const nextYearlyRaw = input.yearlyPrice ?? existing.yearlyPrice;
    const nextOneTimeRaw = effectiveOneTimePrice;
    const monthlyAmount = parsePriceToCents(nextMonthlyRaw);
    const yearlyAmount = parsePriceToCents(nextYearlyRaw);
    const oneTimeAmount = parsePriceToCents(nextOneTimeRaw);
    const discountType = input.discountType ?? existing.discountType ?? null;
    const discountValue = input.discountValue ?? existing.discountValue ?? null;
    const discountAppliesTo = input.discountAppliesTo ?? existing.discountAppliesTo ?? null;
    const discounts = ("discounts" in input ? input.discounts : (existing.discounts as DiscountRule[] | null)) ?? null;

    const monthlyChanged =
      "monthlyPrice" in input && (input.monthlyPrice ?? null) !== (existing.monthlyPrice ?? null);
    const yearlyChanged =
      "yearlyPrice" in input && (input.yearlyPrice ?? null) !== (existing.yearlyPrice ?? null);
    const oneTimeChanged =
      ("oneTimePrice" in input && (input.oneTimePrice ?? null) !== (existing.oneTimePrice ?? null)) ||
      (effectiveOneTimePrice ?? null) !== (existing.oneTimePrice ?? null);
    const discountChanged =
      ("discountType" in input && (input.discountType ?? null) !== (existing.discountType ?? null)) ||
      ("discountValue" in input && (input.discountValue ?? null) !== (existing.discountValue ?? null)) ||
      ("discountAppliesTo" in input && (input.discountAppliesTo ?? null) !== (existing.discountAppliesTo ?? null)) ||
      ("discounts" in input && JSON.stringify(input.discounts ?? null) !== JSON.stringify(existing.discounts ?? null));

    if (monthlyAmount && (monthlyChanged || discountChanged || !stripePriceIdMonthly)) {
      const discountedMonthly = applyDiscountToAmount({
        originalCents: monthlyAmount,
        discountType,
        discountValue,
        discountAppliesTo,
        discounts,
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
    if (yearlyAmount && (yearlyChanged || discountChanged || !stripePriceIdYearly)) {
      const discountedYearly = applyDiscountToAmount({
        originalCents: yearlyAmount,
        discountType,
        discountValue,
        discountAppliesTo,
        discounts,
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
    if (oneTimeAmount && (oneTimeChanged || discountChanged || !stripePriceIdOneTime)) {
      const discountedOneTime = applyDiscountToAmount({
        originalCents: oneTimeAmount,
        discountType,
        discountValue,
        discountAppliesTo,
        discounts,
        interval: "one_time",
      });
      stripePriceIdOneTime = await createStripePriceForPlan({
        name: nextName,
        tier: nextTier,
        interval: "one_time",
        unitAmount: discountedOneTime,
      });
      if (!stripePriceId || stripePriceId === "manual") stripePriceId = stripePriceIdOneTime;
    }
  }
  const result = await db
    .update(subscriptionPlanTable)
    .set({
      ...input,
      oneTimePrice: effectiveOneTimePrice,
      billingInterval: effectiveBillingInterval,
      displayPrice: effectiveDisplayPrice,
      stripePriceId,
      stripePriceIdMonthly,
      stripePriceIdYearly,
      stripePriceIdOneTime,
      updatedAt: new Date(),
    })
    .where(eq(subscriptionPlanTable.id, planId))
    .returning();
  return result[0] ?? null;
}

export type InviteBillingCycle = "monthly" | "yearly" | "one_time";

/**
 * Generate a public invite token for the plan and email the invitee a link to
 * `${ADMIN_WEB_URL}/invite/<token>` — a public page where they complete onboarding
 * + payment in one step. No user/athlete/Stripe row is created here.
 */
export async function inviteUserToPlan(input: {
  planId: number;
  email: string;
  invitedByUserId: number;
  invitedByName?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw { status: 400, message: "Invalid email." };
  }

  const planRows = await db
    .select()
    .from(subscriptionPlanTable)
    .where(eq(subscriptionPlanTable.id, input.planId))
    .limit(1);
  const plan = planRows[0];
  if (!plan || !plan.isActive) {
    throw { status: 404, message: "Plan not found or inactive." };
  }

  // Pick a default summary amount for the email (the user picks the actual cycle on the public page).
  const summaryAmount =
    plan.monthlyPrice
      ? `${plan.monthlyPrice}/mo`
      : plan.oneTimePrice
        ? `${plan.oneTimePrice} (6 months)`
        : plan.yearlyPrice
          ? `${plan.yearlyPrice} (1 year)`
          : plan.displayPrice;

  const token = await createPlanInviteToken({
    planId: plan.id,
    email,
    invitedByUserId: input.invitedByUserId,
    invitedByName: input.invitedByName ?? undefined,
  });

  const baseUrl = (env.adminWebUrl ?? "").replace(/\/+$/, "");
  if (!baseUrl) {
    throw { status: 500, message: "ADMIN_WEB_URL is not configured." };
  }
  const inviteUrl = `${baseUrl}/invite/${encodeURIComponent(token)}`;

  await sendPlanInviteEmail({
    to: email,
    name: email.split("@")[0],
    planName: plan.name,
    planTier: String(plan.tier),
    amountLabel: summaryAmount ?? null,
    checkoutUrl: inviteUrl,
    invitedByName: input.invitedByName ?? null,
    loginCredentials: null,
  });

  return { email, inviteUrl };
}

/** Public summary of a plan from a valid invite token, used by the public invite page. */
export async function getPlanInviteSummary(token: string) {
  const decoded = await verifyPlanInviteToken(token);
  const planRows = await db
    .select()
    .from(subscriptionPlanTable)
    .where(eq(subscriptionPlanTable.id, decoded.planId))
    .limit(1);
  const plan = planRows[0];
  if (!plan || !plan.isActive) {
    throw { status: 404, message: "This invite is no longer valid." };
  }
  return {
    email: decoded.email,
    invitedByName: decoded.invitedByName,
    plan: {
      id: plan.id,
      name: plan.name,
      tier: plan.tier,
      displayPrice: plan.displayPrice,
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      oneTimePrice: plan.oneTimePrice,
      features: Array.isArray(plan.features) ? plan.features : [],
      supports: {
        monthly: Boolean(plan.stripePriceIdMonthly || plan.monthlyPrice),
        yearly: Boolean(plan.stripePriceIdYearly || plan.yearlyPrice),
        six_months: Boolean(plan.stripePriceIdOneTime || plan.oneTimePrice),
      },
    },
  };
}

/**
 * Public consume: the invitee fills onboarding answers and picks a billing cycle on the
 * public invite page; we create their account + athlete + Stripe checkout in one shot,
 * then return the Stripe URL. After they pay, the existing approval flow grants the tier.
 */
export async function consumePlanInvite(input: {
  token: string;
  fullName: string;
  birthDate: string;
  phone?: string | null;
  trainingPerWeek?: number | null;
  performanceGoals?: string | null;
  injuries?: string | null;
  billingCycle: "monthly" | "yearly" | "six_months";
}) {
  const decoded = await verifyPlanInviteToken(input.token);
  const planRows = await db
    .select()
    .from(subscriptionPlanTable)
    .where(eq(subscriptionPlanTable.id, decoded.planId))
    .limit(1);
  const plan = planRows[0];
  if (!plan || !plan.isActive) {
    throw { status: 404, message: "This invite is no longer valid." };
  }

  const fullName = input.fullName.trim();
  if (!fullName) throw { status: 400, message: "Name is required." };

  const birth = new Date(input.birthDate);
  if (Number.isNaN(birth.getTime())) {
    throw { status: 400, message: "Invalid date of birth." };
  }
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  if (age < 13 || age > 120) {
    throw { status: 400, message: "Invalid age." };
  }
  const athleteType = (age >= 18 ? "adult" : "youth") as (typeof AthleteType.enumValues)[number];

  // Validate cycle support on the plan.
  const supports = {
    monthly: Boolean(plan.stripePriceIdMonthly || plan.monthlyPrice),
    yearly: Boolean(plan.stripePriceIdYearly || plan.yearlyPrice),
    six_months: Boolean(plan.stripePriceIdOneTime || plan.oneTimePrice),
  };
  if (!supports[input.billingCycle]) {
    throw { status: 400, message: "This plan doesn't support that billing cycle." };
  }

  // Find or create user.
  let user = await getUserByEmail(decoded.email);
  let issuedTempPassword: string | null = null;
  if (!user) {
    issuedTempPassword = generateProvisionPassword();
    const { hash, salt } = hashLocalProvisionPassword(issuedTempPassword);
    const inserted = await db
      .insert(userTable)
      .values({
        cognitoSub: `local:${crypto.randomUUID()}`,
        name: fullName,
        email: decoded.email,
        role: athleteType === "adult" ? "adult_athlete" : "youth_athlete",
        passwordHash: hash,
        passwordSalt: salt,
        emailVerified: true,
      })
      .returning();
    user = inserted[0] ?? null;
    if (!user) throw { status: 500, message: "Failed to create user." };
  } else {
    // Update display name if user kept the default.
    await db.update(userTable).set({ name: fullName, updatedAt: new Date() }).where(eq(userTable.id, user.id));
  }

  // Find or create athlete row, populating the onboarding fields.
  const existing = await db
    .select()
    .from(athleteTable)
    .where(eq(athleteTable.userId, user.id))
    .limit(1);
  const onboardingFields = {
    name: fullName,
    age,
    birthDate: input.birthDate,
    athleteType,
    trainingPerWeek: input.trainingPerWeek ?? 3,
    performanceGoals: input.performanceGoals?.trim() || null,
    injuries: input.injuries?.trim() ? { notes: input.injuries.trim() } : null,
    extraResponses: input.phone?.trim() ? { phone: input.phone.trim() } : null,
  };
  let athleteId: number | null = existing[0]?.id ?? null;
  if (!athleteId) {
    const inserted = await db
      .insert(athleteTable)
      .values({
        userId: user.id,
        guardianId: null,
        team: "",
        ...onboardingFields,
        onboardingCompleted: false,
      })
      .returning();
    athleteId = inserted[0]?.id ?? null;
  } else {
    await db
      .update(athleteTable)
      .set({ ...onboardingFields, updatedAt: new Date() })
      .where(eq(athleteTable.id, athleteId));
  }
  if (!athleteId) throw { status: 500, message: "Failed to create athlete profile." };

  // Create Stripe checkout (existing flow handles approval + tier grant after payment).
  const { session } = await createCheckoutSession({
    userId: user.id,
    userEmail: user.email,
    athleteId,
    planId: plan.id,
    billingCycle: input.billingCycle,
  });
  if (!session.url) {
    throw { status: 502, message: "Stripe did not return a checkout URL." };
  }

  // For brand-new accounts, email the mobile login credentials so the user can sign in
  // immediately after paying. (Existing accounts already have a password.)
  if (issuedTempPassword) {
    await sendAdminWelcomeCredentialsEmail({
      to: user.email,
      guardianName: fullName,
      temporaryPassword: issuedTempPassword,
    });
  }

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    issuedTempPassword,
    email: user.email,
  };
}
