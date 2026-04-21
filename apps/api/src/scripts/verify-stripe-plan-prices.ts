import Stripe from "stripe";
import { env } from "../config/env";
import { db } from "../db";
import { subscriptionPlanTable } from "../db/schema";
import {
  ATHLETE_BILLING_CYCLES,
  ensureAthleteCheckoutPriceId,
  lookupKeyForAthleteBilling,
  type AthleteBillingCycle,
} from "../services/billing/stripe.service";

function stripeModeFromSecretKey(secretKey: string): "test" | "live" | "unknown" {
  const normalized = String(secretKey ?? "").trim();
  if (normalized.startsWith("sk_test_")) return "test";
  if (normalized.startsWith("sk_live_")) return "live";
  return "unknown";
}

async function main() {
  if (!env.stripeSecretKey || env.stripeSecretKey === "__ph_api_script_unused__") {
    console.error("❌ STRIPE_SECRET_KEY is not set.");
    process.exit(1);
  }

  const stripe = new Stripe(env.stripeSecretKey, { apiVersion: "2025-02-24.acacia" });
  const stripeMode = stripeModeFromSecretKey(env.stripeSecretKey);

  const plans = await db.select().from(subscriptionPlanTable).orderBy(subscriptionPlanTable.id);
  console.log(`🔍 Verifying Stripe prices for ${plans.length} plan(s) (${stripeMode} mode)`);
  console.log("------------------------------------------------------------");

  for (const plan of plans) {
    console.log(`#${plan.id} ${plan.tier} — ${plan.name}`);
    for (const cycle of ATHLETE_BILLING_CYCLES) {
      const lookupKey = lookupKeyForAthleteBilling(plan.tier, cycle);
      try {
        const priceId = await ensureAthleteCheckoutPriceId(
          {
            tier: plan.tier,
            stripePriceId: plan.stripePriceId,
            stripePriceIdMonthly: plan.stripePriceIdMonthly,
            stripePriceIdYearly: plan.stripePriceIdYearly,
          },
          cycle as AthleteBillingCycle,
        );
        await stripe.prices.retrieve(priceId);
        console.log(`  ✅ ${cycle}: ${priceId} (lookup key: ${lookupKey})`);
      } catch (err: any) {
        const message = typeof err?.message === "string" ? err.message : String(err);
        console.log(`  ❌ ${cycle}: ${message} (lookup key: ${lookupKey})`);
      }
    }
    console.log("");
  }
}

main().catch((err) => {
  console.error("❌ Failed to verify Stripe plan prices:", err);
  process.exit(1);
});
