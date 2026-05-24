import { and, desc, eq, ilike, isNotNull, or, sql } from "drizzle-orm";

import { db } from "../db";
import { athleteTable, physioRefferalsTable, physioReferralBroadcastsTable } from "../db/schema";

export async function getPhysioReferralForAthlete(athleteId: number) {
  const rows = await db
    .select()
    .from(physioRefferalsTable)
    .where(eq(physioRefferalsTable.athleteId, athleteId))
    .orderBy(desc(physioRefferalsTable.createdAt))
    .limit(1);
  if (rows[0]) return rows[0];

  // Fall back to first matching broadcast referral
  const athlete = await db
    .select({ athleteType: athleteTable.athleteType, team: athleteTable.team })
    .from(athleteTable)
    .where(eq(athleteTable.id, athleteId))
    .limit(1);
  if (!athlete[0]) return null;

  const broadcasts = await db
    .select()
    .from(physioReferralBroadcastsTable)
    .orderBy(desc(physioReferralBroadcastsTable.createdAt));
  const match = broadcasts.find((b) => broadcastMatchesAthlete(b.targetMode, athlete[0]));
  return match ? { ...match, athleteId, isBroadcast: true } : null;
}

export async function getPhysioReferralsForAthlete(athleteId: number) {
  const individual = await db
    .select()
    .from(physioRefferalsTable)
    .where(eq(physioRefferalsTable.athleteId, athleteId))
    .orderBy(desc(physioRefferalsTable.createdAt));

  const athlete = await db
    .select({ athleteType: athleteTable.athleteType, team: athleteTable.team })
    .from(athleteTable)
    .where(eq(athleteTable.id, athleteId))
    .limit(1);
  if (!athlete[0]) return individual;

  const broadcasts = await db
    .select()
    .from(physioReferralBroadcastsTable)
    .orderBy(desc(physioReferralBroadcastsTable.createdAt));
  const matchingBroadcasts = broadcasts
    .filter((b) => broadcastMatchesAthlete(b.targetMode, athlete[0]))
    .map((b) => ({ ...b, athleteId, isBroadcast: true }));

  return [...individual, ...matchingBroadcasts];
}

function broadcastMatchesAthlete(targetMode: string, athlete: { athleteType: string | null; team: string | null }) {
  if (targetMode === "all") return true;
  if (targetMode === "all_youth") return athlete.athleteType === "youth";
  if (targetMode === "all_adult") return athlete.athleteType === "adult";
  if (targetMode === "all_teams") return !!athlete.team;
  return false;
}

export async function listPhysioReferrals(options?: { q?: string; limit?: number }) {
  const q = options?.q?.trim() ?? "";
  const requestedLimit = options?.limit;
  const limit =
    typeof requestedLimit === "number" && Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(100, Math.floor(requestedLimit)))
      : 50;

  const conditions = [];
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        ilike(athleteTable.name, pattern),
        ilike(physioRefferalsTable.referalLink, pattern),
        sql`${physioRefferalsTable.programTier}::text ILIKE ${pattern}`,
        sql`${physioRefferalsTable.id}::text ILIKE ${pattern}`,
      ),
    );
  }

  const individual = await db
    .select({
      id: physioRefferalsTable.id,
      athleteId: physioRefferalsTable.athleteId,
      programTier: physioRefferalsTable.programTier,
      referalLink: physioRefferalsTable.referalLink,
      discountPercent: physioRefferalsTable.discountPercent,
      metadata: physioRefferalsTable.metadata,
      createdAt: physioRefferalsTable.createdAt,
      athleteName: athleteTable.name,
      isBroadcast: sql<boolean>`false`,
    })
    .from(physioRefferalsTable)
    .leftJoin(athleteTable, eq(physioRefferalsTable.athleteId, athleteTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(physioRefferalsTable.createdAt))
    .limit(limit);

  // Include broadcasts at the top when not filtering (they have no specific athlete)
  if (!q) {
    const broadcasts = await db
      .select({
        id: physioReferralBroadcastsTable.id,
        athleteId: sql<number>`null`,
        programTier: sql<null>`null`,
        referalLink: physioReferralBroadcastsTable.referalLink,
        discountPercent: physioReferralBroadcastsTable.discountPercent,
        metadata: physioReferralBroadcastsTable.metadata,
        createdAt: physioReferralBroadcastsTable.createdAt,
        athleteName: sql<null>`null`,
        isBroadcast: sql<boolean>`true`,
      })
      .from(physioReferralBroadcastsTable)
      .orderBy(desc(physioReferralBroadcastsTable.createdAt));
    return [...broadcasts, ...individual];
  }

  return individual;
}

export async function createPhysioReferralBroadcast(input: {
  targetMode: string;
  referalLink: string;
  discountPercent?: number | null;
  metadata?: Record<string, unknown> | null;
  createdBy: number;
}) {
  const result = await db
    .insert(physioReferralBroadcastsTable)
    .values({
      targetMode: input.targetMode,
      referalLink: input.referalLink,
      discountPercent: input.discountPercent ?? null,
      metadata: input.metadata ?? null,
      createdBy: input.createdBy,
    })
    .returning();
  return result[0];
}

export async function deletePhysioReferralBroadcast(id: number) {
  const result = await db
    .delete(physioReferralBroadcastsTable)
    .where(eq(physioReferralBroadcastsTable.id, id))
    .returning();
  return result[0] ?? null;
}

export async function updatePhysioReferralBroadcast(input: {
  id: number;
  referalLink?: string | null;
  discountPercent?: number | null;
  metadata?: Record<string, unknown> | null;
}) {
  const setValues: Record<string, unknown> = { updatedAt: new Date() };
  if (input.referalLink !== undefined) setValues.referalLink = input.referalLink;
  if (input.discountPercent !== undefined) setValues.discountPercent = input.discountPercent;
  if (input.metadata !== undefined) setValues.metadata = input.metadata;

  const result = await db
    .update(physioReferralBroadcastsTable)
    .set(setValues)
    .where(eq(physioReferralBroadcastsTable.id, input.id))
    .returning();
  return result[0] ?? null;
}

export async function countAthletesForBroadcast(targetMode: string): Promise<number> {
  let condition;
  if (targetMode === "all_youth") {
    condition = eq(athleteTable.athleteType, "youth");
  } else if (targetMode === "all_adult") {
    condition = eq(athleteTable.athleteType, "adult");
  } else if (targetMode === "all_teams") {
    condition = isNotNull(athleteTable.team);
  }
  // "all" → no condition

  const rows = await db.select({ count: sql<number>`count(*)::int` }).from(athleteTable).where(condition);
  return rows[0]?.count ?? 0;
}

export async function createPhysioReferral(input: {
  athleteId: number;
  programTier?: (typeof athleteTable.$inferSelect)["currentProgramTier"] | null;
  referalLink: string;
  discountPercent?: number | null;
  metadata?: Record<string, unknown> | null;
  createdBy: number;
}) {
  const result = await db
    .insert(physioRefferalsTable)
    .values({
      athleteId: input.athleteId,
      programTier: input.programTier ?? null,
      referalLink: input.referalLink,
      discountPercent: input.discountPercent ?? null,
      metadata: input.metadata ?? null,
      createdBy: input.createdBy,
    })
    .returning();
  return result[0];
}

export async function updatePhysioReferral(input: {
  id: number;
  referalLink?: string | null;
  discountPercent?: number | null;
  programTier?: (typeof athleteTable.$inferSelect)["currentProgramTier"] | null;
  metadata?: Record<string, unknown> | null;
}) {
  const setValues: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (input.referalLink !== undefined) setValues.referalLink = input.referalLink;
  if (input.discountPercent !== undefined) setValues.discountPercent = input.discountPercent;
  if (input.programTier !== undefined) setValues.programTier = input.programTier;
  if (input.metadata !== undefined) setValues.metadata = input.metadata;

  const result = await db
    .update(physioRefferalsTable)
    .set(setValues)
    .where(eq(physioRefferalsTable.id, input.id))
    .returning();
  return result[0] ?? null;
}

export async function deletePhysioReferral(id: number) {
  const result = await db.delete(physioRefferalsTable).where(eq(physioRefferalsTable.id, id)).returning();
  return result[0] ?? null;
}
