/**
 * Lists the four subscription tiers and their Stripe monthly price (amount + currency + interval).
 *
 * Resolves the same Price ID as checkout: DB `stripePriceId` / `stripePriceIdMonthly`, else env `STRIPE_PRICE_*`.
 *
 * Requires `DATABASE_URL` and `STRIPE_SECRET_KEY` in `.env`. Other app secrets are optional when run via
 * `pnpm run stripe:list-plan-prices` (uses `PH_API_SCRIPT=1` so env validation matches other CLI scripts).
 *
 * Usage:
 *   cd apps/api && pnpm run stripe:list-plan-prices
 */
import { asc, eq } from "drizzle-orm";

import { env } from "../config/env";
import { db } from "../db";
import { ProgramType, subscriptionPlanTable } from "../db/schema";
import { getStripeClient, tryResolveMonthlyStripePriceId } from "../services/billing/stripe.service";

const TIER_ORDER = [...ProgramType.enumValues] as (typeof ProgramType.enumValues)[number][];

function formatMoney(cents: number, currency: string) {
  const code = (currency || "gbp").toUpperCase();
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

async function main() {
  if (!env.stripeSecretKey || env.stripeSecretKey === "__ph_api_script_unused__") {
    console.error("Set STRIPE_SECRET_KEY in apps/api/.env (or environment).");
    process.exit(1);
  }

  const stripe = getStripeClient();

  const rows = await db
    .select()
    .from(subscriptionPlanTable)
    .where(eq(subscriptionPlanTable.isActive, true))
    .orderBy(asc(subscriptionPlanTable.id));

  const byTier = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (!byTier.has(r.tier)) byTier.set(r.tier, r);
  }

  const table: {
    tier: string;
    planName: string;
    stripePriceId: string;
    amount: string;
    recurring: string;
  }[] = [];

  for (const tier of TIER_ORDER) {
    const row = byTier.get(tier);
    const planLike =
      row ??
      ({
        tier,
        stripePriceId: "manual",
        stripePriceIdMonthly: null,
        stripePriceIdYearly: null,
      } as Pick<(typeof rows)[number], "tier" | "stripePriceId" | "stripePriceIdMonthly" | "stripePriceIdYearly">);

    const priceId = tryResolveMonthlyStripePriceId(planLike);
    const planName = row?.name ?? "(no DB row — env tier price only)";

    if (!priceId) {
      table.push({
        tier,
        planName,
        stripePriceId: "—",
        amount: "—",
        recurring: "—",
      });
      continue;
    }

    try {
      const price = await stripe.prices.retrieve(priceId);
      const cents = price.unit_amount;
      const cur = price.currency ?? "gbp";
      const interval = price.recurring?.interval ?? "(one-off)";
      const amount =
        cents != null ? formatMoney(cents, cur) : "(no unit_amount — metered/tiered?)";
      table.push({
        tier,
        planName,
        stripePriceId: priceId,
        amount,
        recurring: interval,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      table.push({
        tier,
        planName,
        stripePriceId: priceId,
        amount: `ERROR: ${msg}`,
        recurring: "—",
      });
    }
  }

  console.table(table);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
