/**
 * Backfill 6-month and 1-year prices on every active plan from `monthly × 6` / `× 12`.
 *
 * For each plan that has a monthly price but is missing the 6-month or 1-year price,
 * this script calls `updateSubscriptionPlan(...)` which:
 *   - creates a fresh Stripe Price (in GBP) tagged with the conventional lookup key
 *     (`<tier>_six_months` / `<tier>_yearly`)
 *   - sets `transfer_lookup_key: true` so any legacy Stripe price loses the key,
 *     making the new GBP price authoritative
 *   - persists the derived display string (e.g. `£199`) on the plan row
 *
 * Safe to re-run; plans that already have both prices are skipped.
 *
 * Usage:
 *   pnpm --filter api exec tsx src/scripts/backfill-plan-prices.ts
 */

import "dotenv/config";

async function main() {
  process.env.PH_API_SCRIPT ??= "1";
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

  const force = process.argv.includes("--force");
  const onlyTier = process.argv.find((a) => a.startsWith("--tier="))?.split("=")[1] ?? null;

  const { db } = await import("../db");
  const { subscriptionPlanTable } = await import("../db/schema");
  const { eq } = await import("drizzle-orm");
  const { updateSubscriptionPlan, parsePriceToCents } = await import("../services/billing/plan.service");

  const plans = await db.select().from(subscriptionPlanTable).where(eq(subscriptionPlanTable.isActive, true));
  console.log(`[Backfill] ${plans.length} active plan(s) found.`);

  function getCurrencySymbol(value?: string | null) {
    const m = value?.match(/[£$€]/);
    return m?.[0] ?? "£";
  }
  function formatFromCents(cents: number, symbol: string) {
    const amount = cents / 100;
    const fixed = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
    return `${symbol}${fixed}`;
  }

  let updated = 0;
  let skipped = 0;

  for (const plan of plans) {
    if (onlyTier && String(plan.tier) !== onlyTier) {
      skipped += 1;
      continue;
    }
    const monthlyCents = parsePriceToCents(plan.monthlyPrice);
    if (!monthlyCents) {
      console.log(`  · skip "${plan.name}" (#${plan.id}, ${plan.tier}): no monthly price`);
      skipped += 1;
      continue;
    }
    const symbol = getCurrencySymbol(plan.monthlyPrice);

    // In `--force` mode, always set both derived values so the service regenerates the Stripe
    // prices (with `transfer_lookup_key: true`). Useful for reclaiming legacy non-GBP prices.
    const patch: Record<string, string> = {};
    if (force || !plan.oneTimePrice?.trim()) {
      patch.oneTimePrice = formatFromCents(monthlyCents * 6, symbol);
    }
    if (force || !plan.yearlyPrice?.trim()) {
      patch.yearlyPrice = formatFromCents(monthlyCents * 12, symbol);
    }

    if (Object.keys(patch).length === 0) {
      console.log(`  · skip "${plan.name}" (#${plan.id}, ${plan.tier}): already has both prices`);
      skipped += 1;
      continue;
    }

    console.log(
      `  · update "${plan.name}" (#${plan.id}, ${plan.tier})${force ? " [force]" : ""}: ${Object.entries(patch)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")}`,
    );
    try {
      // In `--force` mode, clear the existing Stripe price IDs so the update path triggers
      // a fresh `prices.create({ lookup_key, transfer_lookup_key: true })`. Otherwise unchanged
      // values would be a no-op for Stripe.
      if (force) {
        const clear: Record<string, null> = {};
        if ("yearlyPrice" in patch) clear.stripePriceIdYearly = null;
        if ("oneTimePrice" in patch) clear.stripePriceIdOneTime = null;
        if (Object.keys(clear).length > 0) {
          await db.update(subscriptionPlanTable).set(clear).where(eq(subscriptionPlanTable.id, plan.id));
        }
      }
      await updateSubscriptionPlan(plan.id, patch);
      updated += 1;
    } catch (err) {
      console.error(`    ✗ failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`[Backfill] done. updated=${updated}, skipped=${skipped}`);
}

void main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    setTimeout(() => process.exit(0), 250);
  });
