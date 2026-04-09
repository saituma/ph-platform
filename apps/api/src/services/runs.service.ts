import { and, desc, eq, gt } from "drizzle-orm";

import { db } from "../db";
import { runLogTable } from "../db/schema";

interface RunPayload {
  clientId: string;
  date: string;
  distanceMeters: number;
  durationSeconds: number;
  avgPace?: number | null;
  avgSpeed?: number | null;
  calories?: number | null;
  coordinates?: unknown | null;
  effortLevel?: number | null;
  feelTags?: unknown | null;
  notes?: string | null;
}

export async function upsertRuns(userId: number, runs: RunPayload[]) {
  if (!runs.length) return [];

  const syncedIds: string[] = [];

  for (const run of runs) {
    const values = {
      clientId: run.clientId,
      userId,
      date: new Date(run.date),
      distanceMeters: run.distanceMeters,
      durationSeconds: run.durationSeconds,
      avgPace: run.avgPace ?? null,
      avgSpeed: run.avgSpeed ?? null,
      calories: run.calories ?? null,
      coordinates: run.coordinates ?? null,
      effortLevel: run.effortLevel ?? null,
      feelTags: run.feelTags ?? null,
      notes: run.notes ?? null,
    };

    await db
      .insert(runLogTable)
      .values(values)
      .onConflictDoUpdate({
        target: [runLogTable.clientId, runLogTable.userId],
        set: {
          date: values.date,
          distanceMeters: values.distanceMeters,
          durationSeconds: values.durationSeconds,
          avgPace: values.avgPace,
          avgSpeed: values.avgSpeed,
          calories: values.calories,
          coordinates: values.coordinates,
          effortLevel: values.effortLevel,
          feelTags: values.feelTags,
          notes: values.notes,
          updatedAt: new Date(),
        },
      });

    syncedIds.push(run.clientId);
  }

  return syncedIds;
}

export async function listRuns(userId: number, opts?: { after?: string; limit?: number }) {
  const filters = [eq(runLogTable.userId, userId)];

  if (opts?.after) {
    const afterDate = new Date(opts.after);
    if (!isNaN(afterDate.getTime())) {
      filters.push(gt(runLogTable.updatedAt, afterDate));
    }
  }

  const limit =
    typeof opts?.limit === "number" && Number.isFinite(opts.limit)
      ? Math.max(1, Math.min(200, Math.floor(opts.limit)))
      : 100;

  return db
    .select()
    .from(runLogTable)
    .where(and(...filters))
    .orderBy(desc(runLogTable.date))
    .limit(limit);
}

export async function deleteRun(userId: number, clientId: string) {
  const deleted = await db
    .delete(runLogTable)
    .where(and(eq(runLogTable.userId, userId), eq(runLogTable.clientId, clientId)))
    .returning({ id: runLogTable.id });

  return deleted.length > 0;
}
