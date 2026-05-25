import { and, eq, gt, inArray, isNotNull, isNull, lt, lte, or } from "drizzle-orm";

import { db } from "../db";
import { athleteTable, guardianTable, notificationTable, teamTable, userTable } from "../db/schema";
import { sendPlanExpiredEmail, sendPlanExpiringSoonEmail } from "../lib/mailer";
import { createPushIntent } from "./outbox.service";

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
  // Pull athletes whose own plan window has lapsed. We then have to *exclude*
  // athletes on a team whose team subscription is still active — otherwise the
  // cron silently nukes every team athlete one cycle after team approval
  // (athlete.planExpiresAt is set at team approval, but the renewal webhook
  // only extends teamTable.planExpiresAt, never the athlete row).
  const candidates = await db
    .select()
    .from(athleteTable)
    .where(
      and(
        isNotNull(athleteTable.planExpiresAt),
        lt(athleteTable.planExpiresAt, now),
        inArray(athleteTable.currentProgramTier, [...PAID_TIERS]),
      ),
    );

  // Look up the active-team set in one query and filter in memory — keeps
  // this cron resilient to schema changes on teamTable.
  const teamIds = Array.from(new Set(candidates.map((a) => a.teamId).filter((id): id is number => id != null)));
  const activeTeamIds = new Set<number>();
  if (teamIds.length > 0) {
    const activeTeams = await db
      .select({ id: teamTable.id })
      .from(teamTable)
      .where(
        and(
          inArray(teamTable.id, teamIds),
          or(eq(teamTable.subscriptionStatus, "active"), gt(teamTable.planExpiresAt, now)),
        ),
      );
    for (const t of activeTeams) activeTeamIds.add(t.id);
  }

  const expired = candidates.filter((a) => !(a.teamId != null && activeTeamIds.has(a.teamId)));

  // Batch-load all guardians and users to avoid N+1 queries
  const guardianIds = expired.map((a) => a.guardianId).filter((id): id is number => id != null);
  const guardianMap = new Map<number, { userId: number | null }>();
  if (guardianIds.length > 0) {
    const guardianRows = await db
      .select({ id: guardianTable.id, userId: guardianTable.userId })
      .from(guardianTable)
      .where(inArray(guardianTable.id, guardianIds));
    for (const g of guardianRows) guardianMap.set(g.id, { userId: g.userId });
  }

  const userIds = expired
    .map((a) => {
      const g = a.guardianId ? guardianMap.get(a.guardianId) : undefined;
      return g?.userId ?? a.userId;
    })
    .filter((id): id is number => id != null);
  const userMap = new Map<number, typeof userTable.$inferSelect>();
  if (userIds.length > 0) {
    const userRows = await db.select().from(userTable).where(inArray(userTable.id, userIds));
    for (const u of userRows) userMap.set(u.id, u);
  }

  const expiredAthleteIds: number[] = [];
  const expiredGuardianIds: number[] = [];
  const expiredNotifications: Array<typeof notificationTable.$inferInsert> = [];

  for (const athlete of expired) {
    const guardianUserId = athlete.guardianId ? guardianMap.get(athlete.guardianId)?.userId : undefined;
    const payerUserId = guardianUserId ?? athlete.userId;
    const payer = payerUserId != null ? userMap.get(payerUserId) : undefined;

    expiredAthleteIds.push(athlete.id);
    if (athlete.guardianId) expiredGuardianIds.push(athlete.guardianId);

    if (payerUserId == null || !payer || payer.isDeleted) continue;

    expiredNotifications.push({
      userId: payerUserId,
      type: "plan_expired",
      content: "Your plan period ended. Renew to restore full access.",
      link: "/plans",
      read: false,
    });
    void createPushIntent({
      userId: payerUserId,
      title: "Plan ended",
      body: "Your paid plan period has ended. Renew to keep messaging and bookings.",
      data: { url: "/plans", type: "plan_expired" },
    });
    void sendPlanExpiredEmail({
      to: payer.email,
      name: payer.name,
      athleteName: athlete.name,
    });
  }

  if (expiredAthleteIds.length > 0) {
    await db
      .update(athleteTable)
      .set({
        currentProgramTier: null,
        currentPlanId: null,
        planExpiresAt: null,
        planRenewalReminderSentAt: null,
        updatedAt: new Date(),
      })
      .where(inArray(athleteTable.id, expiredAthleteIds));
  }
  if (expiredGuardianIds.length > 0) {
    await db
      .update(guardianTable)
      .set({ currentProgramTier: null, currentPlanId: null, updatedAt: new Date() })
      .where(inArray(guardianTable.id, expiredGuardianIds));
  }
  if (expiredNotifications.length > 0) {
    await db.insert(notificationTable).values(expiredNotifications);
  }
}

async function processExpiringReminders(now: Date, horizon: Date) {
  const candidates = await db
    .select()
    .from(athleteTable)
    .where(
      and(
        isNotNull(athleteTable.planExpiresAt),
        gt(athleteTable.planExpiresAt, now),
        lte(athleteTable.planExpiresAt, horizon),
        inArray(athleteTable.currentProgramTier, [...PAID_TIERS]),
        isNull(athleteTable.planRenewalReminderSentAt),
      ),
    );

  // Don't spam team athletes with personal "plan expiring" emails when their
  // team subscription is still active — the athlete row's planExpiresAt is
  // a stale snapshot from team approval; renewals only update teamTable.
  const teamIds = Array.from(new Set(candidates.map((a) => a.teamId).filter((id): id is number => id != null)));
  const activeTeamIds = new Set<number>();
  if (teamIds.length > 0) {
    const activeTeams = await db
      .select({ id: teamTable.id })
      .from(teamTable)
      .where(
        and(
          inArray(teamTable.id, teamIds),
          or(eq(teamTable.subscriptionStatus, "active"), gt(teamTable.planExpiresAt, now)),
        ),
      );
    for (const t of activeTeams) activeTeamIds.add(t.id);
  }
  const rows = candidates.filter((a) => !(a.teamId != null && activeTeamIds.has(a.teamId)));

  // Batch-load all guardians and users to avoid N+1 queries
  const reminderGuardianIds = rows.map((a) => a.guardianId).filter((id): id is number => id != null);
  const reminderGuardianMap = new Map<number, { userId: number | null }>();
  if (reminderGuardianIds.length > 0) {
    const reminderGuardianRows = await db
      .select({ id: guardianTable.id, userId: guardianTable.userId })
      .from(guardianTable)
      .where(inArray(guardianTable.id, reminderGuardianIds));
    for (const g of reminderGuardianRows) reminderGuardianMap.set(g.id, { userId: g.userId });
  }

  const reminderUserIds = rows
    .map((a) => {
      const g = a.guardianId ? reminderGuardianMap.get(a.guardianId) : undefined;
      return g?.userId ?? a.userId;
    })
    .filter((id): id is number => id != null);
  const reminderUserMap = new Map<number, typeof userTable.$inferSelect>();
  if (reminderUserIds.length > 0) {
    const reminderUserRows = await db.select().from(userTable).where(inArray(userTable.id, reminderUserIds));
    for (const u of reminderUserRows) reminderUserMap.set(u.id, u);
  }

  const notificationRows: Array<typeof notificationTable.$inferInsert> = [];
  const reminderAthleteIds: number[] = [];

  for (const athlete of rows) {
    const reminderGuardianUserId = athlete.guardianId ? reminderGuardianMap.get(athlete.guardianId)?.userId : undefined;
    const payerUserId = reminderGuardianUserId ?? athlete.userId;
    const payer = payerUserId != null ? reminderUserMap.get(payerUserId) : undefined;
    if (payerUserId == null || !payer || payer.isDeleted) continue;

    const expires = athlete.planExpiresAt!;
    void sendPlanExpiringSoonEmail({
      to: payer.email,
      name: payer.name,
      athleteName: athlete.name,
      expiresAt: expires,
    });
    void createPushIntent({
      userId: payerUserId,
      title: "Plan renewing soon",
      body: `Your plan access ends ${expires.toLocaleDateString()}. Renew to avoid losing perks.`,
      data: { url: "/plans", type: "plan_expiring" },
    });
    notificationRows.push({
      userId: payerUserId,
      type: "plan_expiring",
      content: `Your plan period ends ${expires.toLocaleDateString()}.`,
      link: "/plans",
      read: false,
    });
    reminderAthleteIds.push(athlete.id);
  }

  if (notificationRows.length > 0) {
    await db.insert(notificationTable).values(notificationRows);
  }
  if (reminderAthleteIds.length > 0) {
    await db
      .update(athleteTable)
      .set({ planRenewalReminderSentAt: now, updatedAt: new Date() })
      .where(inArray(athleteTable.id, reminderAthleteIds));
  }
}
