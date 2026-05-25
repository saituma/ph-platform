import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db";
import { launchPromoCampaignTable, launchPromoCodeTable } from "../../db/schema";
import { getStripeClient } from "./stripe.service";

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
  expiresAt?: Date;
}) {
  const stripe = getStripeClient();

  const coupon = await stripe.coupons.create({
    percent_off: input.discountPercent,
    duration: "once",
    name: input.name,
    ...(input.expiresAt ? { redeem_by: Math.floor(input.expiresAt.getTime() / 1000) } : {}),
  });

  const [campaign] = await db
    .insert(launchPromoCampaignTable)
    .values({
      name: input.name,
      stripeCouponId: coupon.id,
      discountPercent: input.discountPercent,
      expiresAt: input.expiresAt ?? null,
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
      ...(input.expiresAt ? { expires_at: Math.floor(input.expiresAt.getTime() / 1000) } : {}),
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

export async function createStandalonePromoCode(input: { email: string; discountPercent: number; expiresAt?: Date }) {
  const stripe = getStripeClient();

  const coupon = await stripe.coupons.create({
    percent_off: input.discountPercent,
    duration: "once",
    name: `Admin discount for ${input.email}`,
    ...(input.expiresAt ? { redeem_by: Math.floor(input.expiresAt.getTime() / 1000) } : {}),
  });

  const code = makeCode(input.email);
  await stripe.promotionCodes.create({
    coupon: coupon.id,
    code,
    max_redemptions: 1,
    ...(input.expiresAt ? { expires_at: Math.floor(input.expiresAt.getTime() / 1000) } : {}),
  });

  return { code, discountPercent: input.discountPercent };
}

export async function markPromoCodeRedeemed(stripePromoCodeId: string) {
  await db
    .update(launchPromoCodeTable)
    .set({ redeemedAt: new Date() })
    .where(
      and(eq(launchPromoCodeTable.stripePromoCodeId, stripePromoCodeId), isNull(launchPromoCodeTable.redeemedAt)),
    );
}
