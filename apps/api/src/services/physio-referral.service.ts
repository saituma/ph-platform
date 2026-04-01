import { desc, eq } from "drizzle-orm";

import { db } from "../db";
import { athleteTable, physioRefferalsTable } from "../db/schema";

export async function getPhysioReferralForAthlete(athleteId: number) {
  const rows = await db
    .select()
    .from(physioRefferalsTable)
    .where(eq(physioRefferalsTable.athleteId, athleteId))
    .orderBy(desc(physioRefferalsTable.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getPhysioReferralsForAthlete(athleteId: number) {
  return db
    .select()
    .from(physioRefferalsTable)
    .where(eq(physioRefferalsTable.athleteId, athleteId))
    .orderBy(desc(physioRefferalsTable.createdAt));
}

export async function listPhysioReferrals() {
  return db
    .select({
      id: physioRefferalsTable.id,
      athleteId: physioRefferalsTable.athleteId,
      programTier: physioRefferalsTable.programTier,
      referalLink: physioRefferalsTable.referalLink,
      discountPercent: physioRefferalsTable.discountPercent,
      metadata: physioRefferalsTable.metadata,
      createdAt: physioRefferalsTable.createdAt,
      athleteName: athleteTable.name,
    })
    .from(physioRefferalsTable)
    .leftJoin(athleteTable, eq(physioRefferalsTable.athleteId, athleteTable.id))
    .orderBy(desc(physioRefferalsTable.createdAt));
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
  const result = await db
    .delete(physioRefferalsTable)
    .where(eq(physioRefferalsTable.id, id))
    .returning();
  return result[0] ?? null;
}
