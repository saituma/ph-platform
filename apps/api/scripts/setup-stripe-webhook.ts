/**
 * One-time script: registers the PH Performance webhook endpoint with Stripe
 * and prints the webhook signing secret to add to your environment.
 *
 * Usage:
 *   PH_API_SCRIPT=1 STRIPE_SECRET_KEY=sk_live_... tsx apps/api/scripts/setup-stripe-webhook.ts
 *
 * After running, copy the printed STRIPE_WEBHOOK_SECRET value to:
 *   - Render dashboard → API service → Environment Variables
 */

import "dotenv/config";
import Stripe from "stripe";

const WEBHOOK_URL =
  process.env.STRIPE_WEBHOOK_URL ??
  "https://ph-performance-2cae29f7922d.herokuapp.com/api/v1/billing/webhook";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error("Error: STRIPE_SECRET_KEY is not set.");
  console.error("Run: STRIPE_SECRET_KEY=sk_live_... tsx apps/api/scripts/setup-stripe-webhook.ts");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
});

const EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
];

async function main() {
  console.log(`\nSetting up Stripe webhook for: ${WEBHOOK_URL}\n`);

  // Check if a webhook for this URL already exists
  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  const match = existing.data.find((wh) => wh.url === WEBHOOK_URL);

  if (match) {
    console.log(`Webhook already exists: ${match.id}`);
    console.log(`Status: ${match.status}`);
    console.log(`Events: ${match.enabled_events.join(", ")}`);
    console.log(`\nTo get the signing secret, delete and recreate it, or check Stripe dashboard:`);
    console.log(`  https://dashboard.stripe.com/webhooks/${match.id}\n`);

    // Update events if needed
    const missingEvents = EVENTS.filter((e) => !match.enabled_events.includes(e));
    if (missingEvents.length > 0) {
      console.log(`Updating webhook to add missing events: ${missingEvents.join(", ")}`);
      await stripe.webhookEndpoints.update(match.id, { enabled_events: EVENTS });
      console.log("Webhook updated.");
    }
    return;
  }

  console.log("Creating new webhook endpoint...");
  const webhook = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: EVENTS,
    description: "PH Performance billing events",
  });

  console.log(`\nWebhook created: ${webhook.id}`);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Add this to your Render environment variables:`);
  console.log(`${"=".repeat(60)}`);
  console.log(`\nSTRIPE_WEBHOOK_SECRET=${webhook.secret}\n`);
  console.log(`${"=".repeat(60)}\n`);
  console.log("Also set on Render:");
  console.log(`  STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY.slice(0, 12)}...`);
  console.log(`  STRIPE_SUCCESS_URL=https://phperformance.uk/payment-success`);
  console.log(`  STRIPE_CANCEL_URL=https://phperformance.uk/portal/billing`);
}

main().catch((err) => {
  console.error("Failed:", err.message ?? err);
  process.exit(1);
});
