import Stripe from "stripe";
import { env } from "../../config/env";
import { ProgramType } from "../../db/schema";

export const stripe = env.stripeSecretKey
  ? new Stripe(env.stripeSecretKey, {
      apiVersion: "2025-02-24.acacia",
    })
  : null;

export function getStripeClient() {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }
  return stripe;
}

export function getSuccessUrl() {
  return env.stripeSuccessUrl;
}

export function getCancelUrl() {
  return env.stripeCancelUrl;
}

export async function createTeamCheckoutSession(input: {
  teamId: number;
  adminId: number;
  priceLookupKey: string;
  tier: (typeof ProgramType.enumValues)[number];
  interval: "monthly" | "yearly" | "six_months";
  quantity: number;
  mode: "subscription" | "payment";
  customerEmail?: string;
  metadata?: Record<string, string>;
}) {
  const stripeClient = getStripeClient();

  let priceId: string | undefined;

  // 1. Try to find the price using the lookup key in Stripe (handles all intervals)
  try {
    const prices = await stripeClient.prices.list({
      lookup_keys: [input.priceLookupKey],
      active: true,
    });
    if (prices.data[0]) {
      priceId = prices.data[0].id;
    }
  } catch (err) {
    console.warn(`[Stripe] Lookup key search failed for '${input.priceLookupKey}':`, err);
  }

  // 2. If lookup key failed, fallback to ENV variables (only valid for monthly)
  if (!priceId && input.interval === "monthly") {
    priceId = resolveTierFallbackPrice(input.tier, "monthly");
  }

  if (!priceId) {
    throw new Error(
      `Price not found. Please ensure Lookup Key '${input.priceLookupKey}' is set in Stripe, or ${input.tier} environment variable is configured.`
    );
  }

  const session = await stripeClient.checkout.sessions.create({
    mode: input.mode,
    customer_email: input.customerEmail,
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: input.quantity,
      },
    ],
    metadata: {
      teamId: input.teamId,
      adminId: input.adminId,
      type: "team_subscription",
      ...input.metadata,
    },
    success_url: `${getSuccessUrl()}?team_created=${input.teamId}`,
    cancel_url: getCancelUrl(),
  });

  return session;
}

export function resolveTierFallbackPrice(
  tier: (typeof ProgramType.enumValues)[number],
  interval?: "monthly" | "yearly" | "six_months"
) {
  // We only have fallbacks in .env for monthly.
  // Upfront (six_months/yearly) MUST be configured in Stripe via Lookup Keys.
  if (interval === "monthly" || !interval) {
    if (tier === "PHP") return env.stripePricePhp;
    if (tier === "PHP_Premium") return env.stripePricePremium;
    if (tier === "PHP_Premium_Plus") return env.stripePricePlus;
    if (tier === "PHP_Pro") return env.stripePricePro;
  }
  return "";
}

export function ensureStripePriceId(
  plan: {
    stripePriceId?: string | null;
    stripePriceIdMonthly?: string | null;
    stripePriceIdYearly?: string | null;
    tier?: (typeof ProgramType.enumValues)[number];
  },
  interval?: "monthly" | "yearly"
) {
  const intervalPrice =
    interval === "monthly"
      ? (plan.stripePriceIdMonthly ?? "").trim()
      : interval === "yearly"
      ? (plan.stripePriceIdYearly ?? "").trim()
      : "";
  if (intervalPrice) return intervalPrice;
  const normalized = (plan.stripePriceId ?? "").trim();
  if (!normalized || normalized === "manual") {
    const fallback = plan.tier ? resolveTierFallbackPrice(plan.tier, interval).trim() : "";
    if (fallback) return fallback;
    throw new Error("Plan is not configured for Stripe payments");
  }
  return normalized;
}

/** Same resolution as `ensureStripePriceId(..., "monthly")` but returns null instead of throwing. */
export function tryResolveMonthlyStripePriceId(plan: {
  stripePriceId?: string | null;
  stripePriceIdMonthly?: string | null;
  stripePriceIdYearly?: string | null;
  tier?: (typeof ProgramType.enumValues)[number];
}): string | null {
  try {
    return ensureStripePriceId(plan, "monthly");
  } catch {
    return null;
  }
}

export const ATHLETE_BILLING_CYCLES = ["monthly", "six_months", "yearly"] as const;
export type AthleteBillingCycle = (typeof ATHLETE_BILLING_CYCLES)[number];

export function lookupKeyForAthleteBilling(
  tier: (typeof ProgramType.enumValues)[number],
  billingCycle: AthleteBillingCycle
) {
  const suffix =
    billingCycle === "monthly" ? "monthly" : billingCycle === "six_months" ? "six_months" : "yearly";
  return `${tier.toLowerCase()}_${suffix}`;
}

export async function resolvePriceIdByTierLookup(
  tier: (typeof ProgramType.enumValues)[number],
  billingCycle: AthleteBillingCycle
): Promise<string | null> {
  if (!stripe) return null;
  const lookupKey = lookupKeyForAthleteBilling(tier, billingCycle);
  try {
    const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
    return prices.data[0]?.id ?? null;
  } catch (err) {
    console.warn(`[Stripe] Lookup failed for ${lookupKey}`, err);
    return null;
  }
}

/** Checkout line item: lookup key first, then DB/env (monthly/yearly only for fallback). */
export async function ensureAthleteCheckoutPriceId(
  plan: {
    stripePriceId?: string | null;
    stripePriceIdMonthly?: string | null;
    stripePriceIdYearly?: string | null;
    tier: (typeof ProgramType.enumValues)[number];
  },
  billingCycle: AthleteBillingCycle
): Promise<string> {
  const fromLookup = await resolvePriceIdByTierLookup(plan.tier, billingCycle);
  if (fromLookup) return fromLookup;
  if (billingCycle === "monthly") {
    return ensureStripePriceId(plan, "monthly");
  }
  if (billingCycle === "yearly") {
    return ensureStripePriceId(plan, "yearly");
  }
  const lk = lookupKeyForAthleteBilling(plan.tier, billingCycle);
  throw new Error(
    `No Stripe price for ${plan.tier} / ${billingCycle}. Create a Price with lookup key "${lk}" in Stripe.`
  );
}

export function checkoutModeForBillingCycle(cycle: AthleteBillingCycle): "subscription" | "payment" {
  return cycle === "monthly" ? "subscription" : "payment";
}

export async function createStripePriceForPlan(input: {
  name: string;
  tier: (typeof ProgramType.enumValues)[number];
  interval: "monthly" | "yearly";
  unitAmount: number;
}) {
  const stripeClient = getStripeClient();
  const price = await stripeClient.prices.create({
    unit_amount: input.unitAmount,
    currency: "gbp",
    recurring: { interval: input.interval === "yearly" ? "year" : "month" },
    product_data: {
      name: `${input.name} - ${input.interval === "yearly" ? "Yearly" : "Monthly"}`,
      metadata: { tier: input.tier },
    },
  });
  return price.id;
}
