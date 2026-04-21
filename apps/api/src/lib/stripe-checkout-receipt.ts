import type Stripe from "stripe";

export function checkoutSessionPaymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (typeof pi === "string") return pi;
  if (pi && typeof (pi as Stripe.PaymentIntent).id === "string") return (pi as Stripe.PaymentIntent).id;
  return null;
}

export type StripeLineSummary = {
  description: string | null;
  quantity: number | null;
  unitAmount: number | null;
  currency: string | null;
};

export function summarizeStripeCheckoutSession(session: Stripe.Checkout.Session): {
  amountTotalCents: number | null;
  amountSubtotalCents: number | null;
  currency: string | null;
  paymentIntentId: string | null;
  customerEmail: string | null;
  lineItems: StripeLineSummary[];
} {
  const amountTotalCents = typeof session.amount_total === "number" ? session.amount_total : null;
  const amountSubtotalCents = typeof session.amount_subtotal === "number" ? session.amount_subtotal : null;
  const currency = typeof session.currency === "string" ? session.currency : null;
  const paymentIntentId = checkoutSessionPaymentIntentId(session);
  const customerEmail =
    session.customer_details?.email?.trim() ||
    (typeof session.customer_email === "string" ? session.customer_email.trim() : null) ||
    null;

  const rawItems = (session as Stripe.Checkout.Session & { line_items?: Stripe.ApiList<Stripe.LineItem> }).line_items;
  const data = rawItems?.data ?? [];
  const lineItems: StripeLineSummary[] = data.map((li) => {
    const price = li.price;
    const unitAmount =
      price && typeof price === "object" && typeof (price as Stripe.Price).unit_amount === "number"
        ? (price as Stripe.Price).unit_amount
        : null;
    return {
      description:
        li.description ??
        (typeof price === "object" && price && "nickname" in price ? (price as Stripe.Price).nickname : null) ??
        null,
      quantity: typeof li.quantity === "number" ? li.quantity : null,
      unitAmount,
      currency:
        typeof price === "object" && price && typeof (price as Stripe.Price).currency === "string"
          ? (price as Stripe.Price).currency
          : currency,
    };
  });

  return {
    amountTotalCents,
    amountSubtotalCents,
    currency,
    paymentIntentId,
    customerEmail,
    lineItems,
  };
}
