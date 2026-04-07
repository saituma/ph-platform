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

export function resolveTierFallbackPrice(
  tier: (typeof ProgramType.enumValues)[number],
  interval?: "monthly" | "yearly"
) {
  if (interval === "monthly") {
    if (tier === "PHP") return env.stripePricePhpMonthly || env.stripePricePhp;
    if (tier === "PHP_Premium") return env.stripePricePremiumMonthly || env.stripePricePremium;
    if (tier === "PHP_Premium_Plus") return env.stripePricePlusMonthly || env.stripePricePlus;
    if (tier === "PHP_Pro") return env.stripePriceProMonthly || env.stripePricePro;
  }
  if (interval === "yearly") {
    if (tier === "PHP") return env.stripePricePhpYearly || env.stripePricePhp;
    if (tier === "PHP_Premium") return env.stripePricePremiumYearly || env.stripePricePremium;
    if (tier === "PHP_Premium_Plus") return env.stripePricePlusYearly || env.stripePricePlus;
    if (tier === "PHP_Pro") return env.stripePriceProYearly || env.stripePricePro;
  }
  if (tier === "PHP") return env.stripePricePhp;
  if (tier === "PHP_Premium") return env.stripePricePremium;
  if (tier === "PHP_Premium_Plus") return env.stripePricePlus;
  if (tier === "PHP_Pro") return env.stripePricePro;
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
