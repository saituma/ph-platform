import { asc, inArray } from "drizzle-orm";

import { db } from "../db";
import { nutritionLogPhotosTable } from "../db/schema";

/** Batch-load meal photos for a page of nutrition logs (single query, no N+1). */
export async function attachPhotosToLogs<T extends { id: number }>(logs: T[]) {
  if (logs.length === 0) return [];
  const rows = await db
    .select()
    .from(nutritionLogPhotosTable)
    .where(
      inArray(
        nutritionLogPhotosTable.logId,
        logs.map((log) => log.id),
      ),
    )
    .orderBy(asc(nutritionLogPhotosTable.id));
  const byLog = new Map<number, typeof rows>();
  for (const row of rows) {
    const list = byLog.get(row.logId) ?? [];
    list.push(row);
    byLog.set(row.logId, list);
  }
  return logs.map((log) => ({ ...log, photos: byLog.get(log.id) ?? [] }));
}
