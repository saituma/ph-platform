import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db";
import { launchPromoCampaignTable, launchPromoCodeTable } from "../../db/schema";
import { getStripeClient } from "./stripe.service";
import { nextBillingAnchor } from "./request.service";

function nextBillingAnchorDate(): Date {
  return new Date(nextBillingAnchor() * 1000);
}

function makeCode(email: string): string {
  const prefix = "PHL";
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  const emailPart = email.split("@")[0]?.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "") ?? "USR";
  return `${prefix}-${emailPart}-${rand}`;
}

export async function createLaunchPromoCampaign(input: {
  name: string;
  discountPercent: number;
  emails: string[];
}) {
  const stripe = getStripeClient();
  const expiresAt = nextBillingAnchorDate();
  const expiresAtUnix = Math.floor(expiresAt.getTime() / 1000);

  const coupon = await stripe.coupons.create({
    percent_off: input.discountPercent,
    duration: "once",
    name: input.name,
    redeem_by: expiresAtUnix,
  });

  const [campaign] = await db
    .insert(launchPromoCampaignTable)
    .values({
      name: input.name,
      stripeCouponId: coupon.id,
      discountPercent: input.discountPercent,
      expiresAt,
    })
    .returning();

  if (!campaign) throw new Error("Failed to create campaign");

  const codeRows: { campaignId: number; email: string; stripePromoCodeId: string; code: string }[] = [];

  // Create promo codes one at a time — Stripe doesn't batch this endpoint
  for (const email of input.emails) {
    const code = makeCode(email);
    const promoCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code,
      max_redemptions: 1,
      expires_at: expiresAtUnix,
    });
    codeRows.push({ campaignId: campaign.id, email: email.toLowerCase().trim(), stripePromoCodeId: promoCode.id, code });
  }

  const insertedCodes = await db.insert(launchPromoCodeTable).values(codeRows).returning();

  return { campaign, codes: insertedCodes };
}

export async function listLaunchPromoCampaigns() {
  const campaigns = await db.select().from(launchPromoCampaignTable).orderBy(launchPromoCampaignTable.createdAt);

  const codesAll = await db.select().from(launchPromoCodeTable);

  return campaigns.map((c) => {
    const codes = codesAll.filter((code) => code.campaignId === c.id);
    return {
      ...c,
      totalCodes: codes.length,
      redeemedCount: codes.filter((code) => code.redeemedAt != null).length,
    };
  });
}

export async function getLaunchPromoCampaignCodes(campaignId: number) {
  return db
    .select()
    .from(launchPromoCodeTable)
    .where(eq(launchPromoCodeTable.campaignId, campaignId))
    .orderBy(launchPromoCodeTable.email);
}

export async function deleteLaunchPromoCampaign(campaignId: number) {
  const [campaign] = await db
    .select()
    .from(launchPromoCampaignTable)
    .where(eq(launchPromoCampaignTable.id, campaignId))
    .limit(1);

  if (!campaign) throw new Error("Campaign not found");

  const stripe = getStripeClient();
  await stripe.coupons.del(campaign.stripeCouponId);

  await db.delete(launchPromoCampaignTable).where(eq(launchPromoCampaignTable.id, campaignId));
}

export async function createStandalonePromoCode(input: { email: string; discountPercent: number }) {
  const stripe = getStripeClient();
  const expiresAt = nextBillingAnchorDate();
  const expiresAtUnix = Math.floor(expiresAt.getTime() / 1000);

  const coupon = await stripe.coupons.create({
    percent_off: input.discountPercent,
    duration: "once",
    name: `Discount ${input.discountPercent}% - ${input.email.split("@")[0]?.slice(0, 20) ?? "user"}`,
    redeem_by: expiresAtUnix,
  });

  const code = makeCode(input.email);
  await stripe.promotionCodes.create({
    coupon: coupon.id,
    code,
    max_redemptions: 1,
    expires_at: expiresAtUnix,
  });

  return { code, discountPercent: input.discountPercent, expiresAt };
}

export async function markPromoCodeRedeemed(stripePromoCodeId: string) {
  await db
    .update(launchPromoCodeTable)
    .set({ redeemedAt: new Date() })
    .where(
      and(eq(launchPromoCodeTable.stripePromoCodeId, stripePromoCodeId), isNull(launchPromoCodeTable.redeemedAt)),
    );
}
