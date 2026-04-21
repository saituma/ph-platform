import type Stripe from "stripe";

import { summarizeStripeCheckoutSession } from "../../lib/stripe-checkout-receipt";

export function buildClientCheckoutReceipt(
  session: Stripe.Checkout.Session,
  input: {
    kind: "team" | "athlete";
    receiptPublicId: string;
    internalRequestId: number;
    status: string;
    paymentStatus: string | null;
    planBillingCycle: string | null;
    payer?: { email: string; name: string | null; role: string };
    team?: { id: number; name: string; maxAthletes: number | null };
    athlete?: { id: number; name: string | null };
    plan?: { id: number; name: string; tier: string } | null;
  },
) {
  const stripe = summarizeStripeCheckoutSession(session);
  return {
    kind: input.kind,
    receiptPublicId: input.receiptPublicId,
    internalRequestId: input.internalRequestId,
    status: input.status,
    paymentStatus: input.paymentStatus,
    planBillingCycle: input.planBillingCycle,
    payer: input.payer ?? null,
    team: input.team ?? null,
    athlete: input.athlete ?? null,
    plan: input.plan ?? null,
    stripeCheckout: {
      sessionId: session.id,
      amountTotalCents: stripe.amountTotalCents,
      amountSubtotalCents: stripe.amountSubtotalCents,
      currency: stripe.currency,
      paymentIntentId: stripe.paymentIntentId,
      customerEmail: stripe.customerEmail,
      lineItems: stripe.lineItems,
    },
  };
}
