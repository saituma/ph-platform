import "dotenv/config";
import Stripe from "stripe";
import { env } from "../config/env";

async function verifyStripeKeys() {
  if (!env.stripeSecretKey || env.stripeSecretKey === "__ph_api_script_unused__") {
    console.error("❌ STRIPE_SECRET_KEY is not set in your .env file.");
    process.exit(1);
  }

  const stripe = new Stripe(env.stripeSecretKey, {
    apiVersion: "2025-02-24.acacia",
  });

  const expectedKeys = [
    "php_monthly", "php_six_months", "php_yearly",
    "php_pro_monthly", "php_pro_six_months", "php_pro_yearly",
    "php_premium_monthly", "php_premium_six_months", "php_premium_yearly",
    "php_premium_plus_monthly", "php_premium_plus_six_months", "php_premium_plus_yearly"
  ];

  console.log("🔍 Verifying Stripe Lookup Keys...");
  console.log("-----------------------------------");

  try {
    // Stripe limits lookup_keys to 10 per request. We have 12.
    // Batch into 2 requests.
    const batch1 = expectedKeys.slice(0, 6);
    const batch2 = expectedKeys.slice(6);

    const [prices1, prices2] = await Promise.all([
      stripe.prices.list({ lookup_keys: batch1, active: true }),
      stripe.prices.list({ lookup_keys: batch2, active: true }),
    ]);

    const foundKeys = [
      ...prices1.data.map(p => p.lookup_key),
      ...prices2.data.map(p => p.lookup_key)
    ].filter(Boolean) as string[];
    
    let allGood = true;

    for (const key of expectedKeys) {
      if (foundKeys.includes(key)) {
        console.log(`✅ FOUND: ${key}`);
      } else {
        console.log(`❌ MISSING: ${key}`);
        allGood = false;
      }
    }

    console.log("-----------------------------------");
    if (allGood) {
      console.log("🎉 SUCCESS: All 12 lookup keys are properly configured in Stripe!");
    } else {
      console.log("⚠️ WARNING: Some lookup keys are missing. Please add them in the Stripe Dashboard.");
    }

  } catch (error: any) {
    console.error("Failed to connect to Stripe or fetch prices:", error.message);
  }
}

verifyStripeKeys();
