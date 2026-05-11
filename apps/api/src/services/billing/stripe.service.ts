import Stripe from "stripe";
import { env } from "../../config/env";
import { ProgramType } from "../../db/schema";
import { logger } from "../../lib/logger";
import { stripeBreaker } from "../../lib/circuit-breaker";

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

/**
 * Stripe Checkout requires absolute URLs with a scheme. A common .env mistake is
 * `localhost:3000/...` (no scheme), which yields Stripe error "Not a valid URL".
 */
export function normalizeStripeRedirectUrl(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return s;
  const trimmed = s.replace(/^\/+/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

export function getSuccessUrl() {
  return normalizeStripeRedirectUrl(env.stripeSuccessUrl);
}

export function getCancelUrl() {
  return normalizeStripeRedirectUrl(env.stripeCancelUrl);
}

/** Stripe 404 on Price retrieve/create — wrong account, test vs live, deleted/archived price, or bad lookup key. */
export function isStripePriceMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { statusCode?: unknown; code?: unknown; param?: unknown };
  return e.statusCode === 404 && e.code === "resource_missing" && e.param === "price";
}

function stripeModeFromSecretKey(secretKey: string | null | undefined): "test" | "live" | "unknown" {
  const normalized = String(secretKey ?? "").trim();
  if (normalized.startsWith("sk_test_")) return "test";
  if (normalized.startsWith("sk_live_")) return "live";
  return "unknown";
}

/** Session retrieve: invalid id or STRIPE_SECRET_KEY mode does not match the session. */
export function isStripeCheckoutSessionNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { statusCode?: unknown; code?: unknown; message?: unknown };
  if (e.statusCode !== 404) return false;
  if (e.code === "resource_missing") return true;
  const msg = String(e.message ?? "").toLowerCase();
  return msg.includes("no such checkout.session");
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
  sponsoredLineItem?: { priceLookupKey: string; tier: (typeof ProgramType.enumValues)[number]; quantity: number };
}) {
  const stripeClient = getStripeClient();

  let priceId: string | undefined;
  const looksLikePriceId = input.priceLookupKey.startsWith("price_");

  // 1. Resolve direct price id vs lookup key.
  if (looksLikePriceId) {
    priceId = input.priceLookupKey;
  } else {
    try {
      const prices = await stripeBreaker.fire(() =>
        stripeClient.prices.list({
          lookup_keys: [input.priceLookupKey],
          active: true,
        }),
      );
      if (prices.data[0]) {
        priceId = prices.data[0].id;
      }
    } catch (err) {
      logger.warn({ err, priceLookupKey: input.priceLookupKey }, "[Stripe] Lookup key search failed");
    }
  }

  // 2. If lookup key failed, fallback to ENV variables (only valid for monthly)
  if (!priceId && input.interval === "monthly") {
    priceId = resolveTierFallbackPrice(input.tier, "monthly");
  }

  if (!priceId) {
    throw new Error(
      `Price not found. Please ensure Stripe price reference '${input.priceLookupKey}' exists and is active, or ${input.tier} environment variable is configured.`,
    );
  }

  try {
    await stripeBreaker.fire(() => stripeClient.prices.retrieve(priceId!));
  } catch (error: unknown) {
    if (isStripePriceMissingError(error)) {
      const mode = stripeModeFromSecretKey(env.stripeSecretKey);
      throw new Error(
        `Stripe could not find price "${priceId}" for team checkout (lookup key "${input.priceLookupKey}", ${input.interval}). ` +
          `Create or re-activate that Price in Stripe (${mode} mode) so it matches STRIPE_SECRET_KEY.`,
      );
    }
    throw error;
  }

  const lineItemQtyByPrice = new Map<string, number>();
  lineItemQtyByPrice.set(priceId, Math.max(1, input.quantity));

  if (input.sponsoredLineItem && input.sponsoredLineItem.quantity > 0) {
    let sponsoredPriceId: string | undefined;
    const sponsoredKey = input.sponsoredLineItem.priceLookupKey;
    try {
      const prices = await stripeBreaker.fire(() =>
        stripeClient.prices.list({ lookup_keys: [sponsoredKey], active: true }),
      );
      if (prices.data[0]) sponsoredPriceId = prices.data[0].id;
    } catch {
      // lookup failed, try fallback
    }
    if (!sponsoredPriceId && input.interval === "monthly") {
      sponsoredPriceId = resolveTierFallbackPrice(input.sponsoredLineItem.tier, "monthly") || undefined;
    }
    if (sponsoredPriceId) {
      const existing = lineItemQtyByPrice.get(sponsoredPriceId) ?? 0;
      lineItemQtyByPrice.set(
        sponsoredPriceId,
        existing + Math.max(1, input.sponsoredLineItem.quantity),
      );
    }
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [...lineItemQtyByPrice.entries()].map(
    ([price, quantity]) => ({ price, quantity }),
  );

  const session = await stripeBreaker.fire(() => stripeClient.checkout.sessions.create({
    mode: input.mode,
    customer_email: input.customerEmail,
    ...(input.mode === "payment" ? { customer_creation: "always" } : {}),
    payment_method_types: ["card"],
    line_items: lineItems,
    ...(input.mode === "payment" && input.customerEmail
      ? { payment_intent_data: { receipt_email: input.customerEmail } }
      : {}),
    metadata: {
      teamId: input.teamId,
      adminId: input.adminId,
      type: "team_subscription",
      ...input.metadata,
    },
    success_url: `${getSuccessUrl()}?session_id={CHECKOUT_SESSION_ID}&team_created=${input.teamId}`,
    cancel_url: getCancelUrl(),
  }));

  return session;
}

export function resolveTierFallbackPrice(
  tier: (typeof ProgramType.enumValues)[number],
  interval?: "monthly" | "yearly" | "six_months",
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
    tier?: (typeof ProgramType.enumValues)[number] | null;
  },
  interval?: "monthly" | "yearly",
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
  tier?: (typeof ProgramType.enumValues)[number] | null;
}): string | null {
  try {
    return ensureStripePriceId(plan, "monthly");
  } catch {
    return null;
  }
}

export const ATHLETE_BILLING_CYCLES = ["weekly", "monthly", "six_months", "yearly"] as const;
export type AthleteBillingCycle = (typeof ATHLETE_BILLING_CYCLES)[number];

export function lookupKeyForAthleteBilling(
  tier: (typeof ProgramType.enumValues)[number],
  billingCycle: AthleteBillingCycle,
) {
  const suffix =
    billingCycle === "weekly"
      ? "weekly"
      : billingCycle === "monthly"
        ? "monthly"
        : billingCycle === "six_months"
          ? "six_months"
          : "yearly";
  return `${tier.toLowerCase()}_${suffix}`;
}

export async function resolvePriceIdByTierLookup(
  tier: (typeof ProgramType.enumValues)[number],
  billingCycle: AthleteBillingCycle,
): Promise<string | null> {
  if (!stripe) return null;
  const lookupKey = lookupKeyForAthleteBilling(tier, billingCycle);
  try {
    const prices = await stripeBreaker.fire(() =>
      stripe!.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 }),
    );
    return prices.data[0]?.id ?? null;
  } catch (err) {
    logger.warn({ err, lookupKey }, "[Stripe] Lookup failed");
    return null;
  }
}

async function resolvePriceIdByLookupKey(lookupKey: string): Promise<string | null> {
  if (!stripe) return null;
  const key = String(lookupKey ?? "").trim();
  if (!key) return null;
  try {
    const prices = await stripeBreaker.fire(() =>
      stripe!.prices.list({ lookup_keys: [key], active: true, limit: 1 }),
    );
    return prices.data[0]?.id ?? null;
  } catch (err) {
    logger.warn({ err, lookupKey: key }, "[Stripe] Lookup failed");
    return null;
  }
}

async function ensureStripePriceIdOrLookupKeyId(raw: string): Promise<string> {
  const normalized = String(raw ?? "").trim();
  if (!normalized) {
    throw new Error("Missing Stripe price id");
  }
  if (normalized.startsWith("price_")) return normalized;
  const fromLookup = await resolvePriceIdByLookupKey(normalized);
  if (fromLookup) return fromLookup;
  throw new Error(
    `Invalid Stripe price reference "${normalized}". Expected a Stripe Price id (price_...) or a valid Stripe Price lookup key.`,
  );
}

/** Checkout line item: lookup key first, then DB/env fallback. */
export async function ensureAthleteCheckoutPriceId(
  plan: {
    stripePriceId?: string | null;
    stripePriceIdMonthly?: string | null;
    stripePriceIdYearly?: string | null;
    stripePriceIdWeekly?: string | null;
    tier?: (typeof ProgramType.enumValues)[number] | null;
  },
  billingCycle: AthleteBillingCycle,
): Promise<string> {
  // Tier-based lookup key is only available on plans that have a tier set.
  if (plan.tier) {
    const fromLookup = await resolvePriceIdByTierLookup(plan.tier, billingCycle);
    if (fromLookup) return fromLookup;
  }
  if (billingCycle === "weekly") {
    const raw = (plan.stripePriceIdWeekly ?? "").trim();
    if (raw) return ensureStripePriceIdOrLookupKeyId(raw);
  }
  if (billingCycle === "monthly") {
    const raw = ensureStripePriceId(plan, "monthly");
    return ensureStripePriceIdOrLookupKeyId(raw);
  }
  if (billingCycle === "yearly") {
    const raw = ensureStripePriceId(plan, "yearly");
    return ensureStripePriceIdOrLookupKeyId(raw);
  }
  const tierStr = plan.tier ?? "custom";
  const lk = plan.tier ? lookupKeyForAthleteBilling(plan.tier, billingCycle) : `${tierStr}_${billingCycle}`;
  throw new Error(
    `No Stripe price for plan (tier: ${tierStr}) / ${billingCycle}. Set the plan's Stripe price id, or create a Stripe Price with lookup key "${lk}".`,
  );
}

export function checkoutModeForBillingCycle(cycle: AthleteBillingCycle): "subscription" | "payment" {
  return cycle === "weekly" || cycle === "monthly" ? "subscription" : "payment";
}

export async function createStripePriceForPlan(input: {
  name: string;
  tier?: (typeof ProgramType.enumValues)[number] | null;
  interval: "weekly" | "monthly" | "yearly" | "one_time";
  unitAmount: number;
  intervalLabel?: string | null;
}) {
  const stripeClient = getStripeClient();
  const intervalLabel =
    (input.intervalLabel ?? "").trim() ||
    (input.interval === "weekly"
      ? "Weekly"
      : input.interval === "yearly"
        ? "1 year"
        : input.interval === "one_time"
          ? "One-time"
          : "Monthly");
  // The DB column is `stripePriceIdOneTime`, but semantically this is a 6-month one-time payment,
  // so we tag the Stripe price with the `_six_months` lookup key to match athlete checkout's existing convention.
  const lookupSuffix = input.interval === "one_time" ? "six_months" : input.interval;
  const tierSlug = input.tier ? input.tier.toLowerCase() : "custom";
  const lookupKey = `${tierSlug}_${lookupSuffix}`;
  const recurringInterval: Record<string, "week" | "month"> = { weekly: "week", monthly: "month" };
  const stripeInterval = recurringInterval[input.interval];
  const price = await stripeBreaker.fire(() =>
    stripeClient.prices.create({
      unit_amount: input.unitAmount,
      currency: "gbp",
      lookup_key: lookupKey,
      transfer_lookup_key: true,
      ...(stripeInterval ? { recurring: { interval: stripeInterval } } : {}),
      product_data: {
        name: `${input.name} - ${intervalLabel}`,
        metadata: { tier: input.tier ?? "" },
      },
    }),
  );
  return price.id;
}
