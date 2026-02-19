import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { db } from "../db";
import { userLocationTable, userTable } from "../db/schema";

const ALLOWED_LOCATION_ROLES = ["guardian", "athlete", "coach", "admin", "superAdmin"] as const;

const getDateKey = (value: Date) => value.toISOString().slice(0, 10);

export async function recordUserLocation(input: {
  userId: number;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}) {
  const now = new Date();
  const latest = await db
    .select()
    .from(userLocationTable)
    .where(eq(userLocationTable.userId, input.userId))
    .orderBy(desc(userLocationTable.recordedAt))
    .limit(1);

  const latestRow = latest[0];
  if (latestRow && getDateKey(latestRow.recordedAt) === getDateKey(now)) {
    const updated = await db
      .update(userLocationTable)
      .set({
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy ?? null,
        recordedAt: now,
      })
      .where(eq(userLocationTable.id, latestRow.id))
      .returning();
    return updated[0];
  }

  const inserted = await db
    .insert(userLocationTable)
    .values({
      userId: input.userId,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy ?? null,
      recordedAt: now,
    })
    .returning();

  return inserted[0];
}

export async function listLatestUserLocations() {
  const latestSubquery = db
    .select({
      userId: userLocationTable.userId,
      latestAt: sql<Date>`max(${userLocationTable.recordedAt})`.as("latestAt"),
    })
    .from(userLocationTable)
    .groupBy(userLocationTable.userId)
    .as("latest_locations");

  return db
    .select({
      userId: userTable.id,
      name: userTable.name,
      role: userTable.role,
      latitude: userLocationTable.latitude,
      longitude: userLocationTable.longitude,
      accuracy: userLocationTable.accuracy,
      recordedAt: userLocationTable.recordedAt,
    })
    .from(userLocationTable)
    .innerJoin(
      latestSubquery,
      and(
        eq(userLocationTable.userId, latestSubquery.userId),
        eq(userLocationTable.recordedAt, latestSubquery.latestAt)
      )
    )
    .innerJoin(userTable, eq(userTable.id, userLocationTable.userId))
    .where(
      and(
        eq(userTable.isDeleted, false),
        inArray(userTable.role, [...ALLOWED_LOCATION_ROLES])
      )
    )
    .orderBy(userTable.name);
}

export async function listUserLocationHistory(days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return db
    .select({
      userId: userTable.id,
      name: userTable.name,
      role: userTable.role,
      latitude: userLocationTable.latitude,
      longitude: userLocationTable.longitude,
      accuracy: userLocationTable.accuracy,
      recordedAt: userLocationTable.recordedAt,
    })
    .from(userLocationTable)
    .innerJoin(userTable, eq(userTable.id, userLocationTable.userId))
    .where(
      and(
        eq(userTable.isDeleted, false),
        inArray(userTable.role, [...ALLOWED_LOCATION_ROLES]),
        gte(userLocationTable.recordedAt, since)
      )
    )
    .orderBy(desc(userLocationTable.recordedAt));
}
