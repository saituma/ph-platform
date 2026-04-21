/**
 * Lists each subscription plan's 3 Stripe Price lookup keys (monthly, 6 months, yearly) with amounts.
 * Convention: `{tier_lower}_{monthly|six_months|yearly}` — same as team checkout (`team.service.ts`).
 *
 * **App behavior** (createTeamCheckoutSession `mode`):
 * - `*_monthly` → subscription (monthly recurring)
 * - `*_six_months` / `*_yearly` → payment (one-time charge for that period)
 *
 * Requires only STRIPE_SECRET_KEY (loads `.env` from cwd or `apps/api/.env`).
 *
 * Usage: cd apps/api && pnpm run stripe:list-lookup-prices
 */
import fs from "fs";
import path from "path";
import Stripe from "stripe";

import { config } from "dotenv";

for (const p of [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "apps/api/.env"),
  path.resolve(__dirname, "../../.env"),
]) {
  if (fs.existsSync(p)) {
    config({ path: p });
    break;
  }
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
if (!stripeSecretKey || stripeSecretKey === "__ph_api_script_unused__") {
  console.error("Set STRIPE_SECRET_KEY in .env");
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-02-24.acacia" });

/** `checkout` matches team Stripe session: monthly = subscription, 6mo/year = one-time payment. */
const PLAN_LOOKUPS: {
  planLabel: string;
  keys: { label: string; lookupKey: string; checkout: "subscription" | "payment" }[];
}[] = [
  {
    planLabel: "Foundation (PHP)",
    keys: [
      { label: "Monthly", lookupKey: "php_monthly", checkout: "subscription" },
      { label: "6 months", lookupKey: "php_six_months", checkout: "payment" },
      { label: "Yearly", lookupKey: "php_yearly", checkout: "payment" },
    ],
  },
  {
    planLabel: "Premium (PHP_Premium)",
    keys: [
      { label: "Monthly", lookupKey: "php_premium_monthly", checkout: "subscription" },
      { label: "6 months", lookupKey: "php_premium_six_months", checkout: "payment" },
      { label: "Yearly", lookupKey: "php_premium_yearly", checkout: "payment" },
    ],
  },
  {
    planLabel: "Plus (PHP_Premium_Plus)",
    keys: [
      { label: "Monthly", lookupKey: "php_premium_plus_monthly", checkout: "subscription" },
      { label: "6 months", lookupKey: "php_premium_plus_six_months", checkout: "payment" },
      { label: "Yearly", lookupKey: "php_premium_plus_yearly", checkout: "payment" },
    ],
  },
  {
    planLabel: "PHP Pro (PHP_Pro)",
    keys: [
      { label: "Monthly", lookupKey: "php_pro_monthly", checkout: "subscription" },
      { label: "6 months", lookupKey: "php_pro_six_months", checkout: "payment" },
      { label: "Yearly", lookupKey: "php_pro_yearly", checkout: "payment" },
    ],
  },
];

function appCheckoutLabel(checkout: "subscription" | "payment") {
  return checkout === "subscription" ? "Monthly recurring (subscription)" : "One-time payment (upfront)";
}

function stripeMatchesApp(price: Stripe.Price, expected: "subscription" | "payment"): boolean {
  if (expected === "subscription") return price.type === "recurring";
  return price.type === "one_time";
}

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

/** Stripe `Price.type`: recurring = subscription; one_time = single charge (e.g. prepaid). */
function humanRecurringSchedule(r: Stripe.Price.Recurring) {
  const n = r.interval_count ?? 1;
  const u = r.interval;
  if (u === "month" && n === 1) return "Every month";
  if (u === "month" && n === 6) return "Every 6 months";
  if (u === "year" && n === 1) return "Every year";
  if (u === "week" && n === 1) return "Every week";
  if (n === 1) return `Every ${u}`;
  return `Every ${n} ${u}s`;
}

function describeStripeBilling(price: Stripe.Price): { mode: string; schedule: string } {
  if (price.type === "recurring" && price.recurring) {
    return {
      mode: "Recurring (subscription)",
      schedule: humanRecurringSchedule(price.recurring),
    };
  }
  if (price.type === "one_time") {
    return {
      mode: "One-time payment",
      schedule: "Single invoice (not a subscription)",
    };
  }
  return {
    mode: price.type ?? "unknown",
    schedule: "—",
  };
}

async function main() {
  console.log("How each billing option is used in this app (team checkout → Stripe session mode):");
  console.log("  • Monthly → subscription  → monthly recurring billing");
  console.log("  • 6 months / Yearly → payment → one-time charge for that period\n");

  const allLookupKeys = PLAN_LOOKUPS.flatMap((p) => p.keys.map((k) => k.lookupKey));

  // Stripe allows up to 10 lookup_keys per list request.
  const batch1 = allLookupKeys.slice(0, 10);
  const batch2 = allLookupKeys.slice(10);

  const [res1, res2] = await Promise.all([
    stripe.prices.list({ lookup_keys: batch1, active: true, limit: 20 }),
    batch2.length
      ? stripe.prices.list({ lookup_keys: batch2, active: true, limit: 20 })
      : Promise.resolve({ data: [] as Stripe.Price[] }),
  ]);

  const byLookup = new Map<string, Stripe.Price>();
  for (const p of [...res1.data, ...res2.data]) {
    if (p.lookup_key) byLookup.set(p.lookup_key, p);
  }

  for (const { planLabel, keys } of PLAN_LOOKUPS) {
    console.log("");
    console.log(`━━ ${planLabel} ━━`);
    const rows: {
      billing: string;
      lookupKey: string;
      amount: string;
      inApp: string;
      stripePrice: string;
      ok: string;
    }[] = [];

    for (const { label, lookupKey, checkout } of keys) {
      const price = byLookup.get(lookupKey);
      if (!price) {
        rows.push({
          billing: label,
          lookupKey,
          amount: "—",
          inApp: appCheckoutLabel(checkout),
          stripePrice: "(missing)",
          ok: "—",
        });
        continue;
      }
      const cents = price.unit_amount;
      const cur = price.currency ?? "gbp";
      const amount = cents != null ? formatMoney(cents, cur) : "(no unit_amount)";
      const { mode, schedule } = describeStripeBilling(price);
      const stripeShort = price.type === "recurring" ? `${mode} (${schedule})` : mode;
      const ok = stripeMatchesApp(price, checkout) ? "✓" : "⚠ mismatch";
      rows.push({
        billing: label,
        lookupKey,
        amount,
        inApp: appCheckoutLabel(checkout),
        stripePrice: stripeShort,
        ok,
      });
    }
    console.table(rows);
  }

  const missing = allLookupKeys.filter((k) => !byLookup.has(k));
  if (missing.length) {
    console.log("");
    console.warn("Missing lookup keys (create Prices in Stripe Dashboard with these lookup keys):");
    missing.forEach((k) => console.warn(`  - ${k}`));
  } else {
    console.log("");
    console.log("All 12 lookup keys resolved.");
  }

  console.log("");
  console.log("Column hints:");
  console.log(
    "  inApp     — Monthly = recurring subscription; 6 months / Yearly = one-time upfront (see team.service.ts).",
  );
  console.log("  stripePrice — What the Stripe Price object is (recurring vs one_time).");
  console.log("  ok        — ✓ if Stripe matches the app; ⚠ if you should fix the Price in Stripe Dashboard.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
