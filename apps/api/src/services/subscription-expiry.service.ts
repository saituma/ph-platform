import { and, eq, gt, inArray, isNotNull, isNull, lt, lte } from "drizzle-orm";

import { db } from "../db";
import { athleteTable, guardianTable, notificationTable, userTable } from "../db/schema";
import { sendPlanExpiredEmail, sendPlanExpiringSoonEmail } from "../lib/mailer";
import { sendPushNotification } from "./push.service";

const PAID_TIERS = ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"] as const;

const REMINDER_DAYS = 7;

/**
 * Run daily (e.g. cron) to remind before expiry and downgrade unpaid lapsed plans.
 */
export async function runSubscriptionExpirySweep() {
  const now = new Date();
  const horizon = new Date(now.getTime() + REMINDER_DAYS * 86400000);
  await processExpiredPlans(now);
  await processExpiringReminders(now, horizon);
}

async function processExpiredPlans(now: Date) {
  const expired = await db
    .select()
    .from(athleteTable)
    .where(
      and(
        isNotNull(athleteTable.planExpiresAt),
        lt(athleteTable.planExpiresAt, now),
        inArray(athleteTable.currentProgramTier, [...PAID_TIERS])
      )
    );

  for (const athlete of expired) {
    const guardianRows = athlete.guardianId
      ? await db
          .select({ userId: guardianTable.userId })
          .from(guardianTable)
          .where(eq(guardianTable.id, athlete.guardianId))
          .limit(1)
      : [];
    const payerUserId = guardianRows[0]?.userId ?? athlete.userId;
    const userRows = payerUserId
      ? await db.select().from(userTable).where(eq(userTable.id, payerUserId)).limit(1)
      : [];
    const payer = userRows[0];

    await db
      .update(athleteTable)
      .set({
        currentProgramTier: null,
        planExpiresAt: null,
        planRenewalReminderSentAt: null,
        updatedAt: new Date(),
      })
      .where(eq(athleteTable.id, athlete.id));

    if (!payerUserId || !payer || payer.isDeleted) continue;

    await db.insert(notificationTable).values({
      userId: payerUserId,
      type: "plan_expired",
      content: "Your plan period ended. Renew to restore full access.",
      link: "/plans",
      read: false,
    });
    void sendPushNotification(
      payerUserId,
      "Plan ended",
      "Your paid plan period has ended. Renew to keep messaging and bookings.",
      { url: "/plans", type: "plan_expired" }
    );
    void sendPlanExpiredEmail({
      to: payer.email,
      name: payer.name,
      athleteName: athlete.name,
    });
  }
}

async function processExpiringReminders(now: Date, horizon: Date) {
  const rows = await db
    .select()
    .from(athleteTable)
    .where(
      and(
        isNotNull(athleteTable.planExpiresAt),
        gt(athleteTable.planExpiresAt, now),
        lte(athleteTable.planExpiresAt, horizon),
        inArray(athleteTable.currentProgramTier, [...PAID_TIERS]),
        isNull(athleteTable.planRenewalReminderSentAt)
      )
    );

  for (const athlete of rows) {
    const guardianRows = athlete.guardianId
      ? await db
          .select({ userId: guardianTable.userId })
          .from(guardianTable)
          .where(eq(guardianTable.id, athlete.guardianId))
          .limit(1)
      : [];
    const payerUserId = guardianRows[0]?.userId ?? athlete.userId;
    const userRows = payerUserId
      ? await db.select().from(userTable).where(eq(userTable.id, payerUserId)).limit(1)
      : [];
    const payer = userRows[0];
    if (!payerUserId || !payer || payer.isDeleted) continue;

    const expires = athlete.planExpiresAt!;
    void sendPlanExpiringSoonEmail({
      to: payer.email,
      name: payer.name,
      athleteName: athlete.name,
      expiresAt: expires,
    });
    void sendPushNotification(
      payerUserId,
      "Plan renewing soon",
      `Your plan access ends ${expires.toLocaleDateString()}. Renew to avoid losing perks.`,
      { url: "/plans", type: "plan_expiring" }
    );
    await db.insert(notificationTable).values({
      userId: payerUserId,
      type: "plan_expiring",
      content: `Your plan period ends ${expires.toLocaleDateString()}.`,
      link: "/plans",
      read: false,
    });
    await db
      .update(athleteTable)
      .set({ planRenewalReminderSentAt: now, updatedAt: new Date() })
      .where(eq(athleteTable.id, athlete.id));
  }
}
