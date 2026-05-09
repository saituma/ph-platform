import { desc, sql } from "drizzle-orm";
import { db } from "../db";
import { betaTesterTable } from "../db/schema";

export async function createBetaTester(input: {
  name: string;
  email: string;
  phone?: string | null;
  reason?: string | null;
}) {
  const [row] = await db
    .insert(betaTesterTable)
    .values({
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      reason: input.reason ?? null,
    })
    .returning();
  return row;
}

export async function listBetaTesters() {
  return db
    .select()
    .from(betaTesterTable)
    .orderBy(desc(betaTesterTable.createdAt));
}

export async function getBetaTesterCount() {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(betaTesterTable);
  return Number(row?.count ?? 0);
}
