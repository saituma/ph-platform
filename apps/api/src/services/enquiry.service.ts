import { and, count, desc, eq, gte, ilike, lte, or } from "drizzle-orm";

import { db } from "../db";
import { enquiryTable } from "../db/schema";

export type EnquiryInsert = typeof enquiryTable.$inferInsert;
export type Enquiry = typeof enquiryTable.$inferSelect;

export async function createEnquiry(data: EnquiryInsert): Promise<Enquiry> {
  const [row] = await db.insert(enquiryTable).values(data).returning();
  return row;
}

export interface ListEnquiriesParams {
  status?: string;
  service?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest";
}

export async function listEnquiries(params: ListEnquiriesParams) {
  const { status, service, search, page = 1, limit = 50, sort = "newest" } = params;
  const conditions = [];

  if (status && status !== "all") {
    conditions.push(eq(enquiryTable.status, status as any));
  }
  if (service && service !== "all") {
    conditions.push(eq(enquiryTable.interestedIn, service as any));
  }
  if (search) {
    conditions.push(
      or(
        ilike(enquiryTable.athleteName, `%${search}%`),
        ilike(enquiryTable.email, `%${search}%`),
        ilike(enquiryTable.phone, `%${search}%`),
        ilike(enquiryTable.teamName, `%${search}%`),
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const orderBy = sort === "oldest" ? enquiryTable.createdAt : desc(enquiryTable.createdAt);
  const offset = (page - 1) * limit;

  const [items, [{ total }]] = await Promise.all([
    db.select().from(enquiryTable).where(where).orderBy(orderBy).limit(limit).offset(offset),
    db.select({ total: count() }).from(enquiryTable).where(where),
  ]);

  return { items, total, page, limit };
}

export async function getEnquiryById(id: number): Promise<Enquiry | null> {
  const [row] = await db.select().from(enquiryTable).where(eq(enquiryTable.id, id)).limit(1);
  return row ?? null;
}

export async function updateEnquiryStatus(id: number, status: string, notes?: string): Promise<Enquiry> {
  const updates: Partial<EnquiryInsert> = {
    status: status as any,
    updatedAt: new Date(),
  };
  if (notes !== undefined) {
    updates.notes = notes;
  }
  const [row] = await db.update(enquiryTable).set(updates).where(eq(enquiryTable.id, id)).returning();
  if (!row) throw { status: 404, message: "Enquiry not found." };
  return row;
}

export async function deleteEnquiry(id: number): Promise<void> {
  const result = await db.delete(enquiryTable).where(eq(enquiryTable.id, id));
  if (result.rowCount === 0) throw { status: 404, message: "Enquiry not found." };
}

export async function getEnquiryStats(period?: { from: Date; to: Date }) {
  const conditions = period
    ? and(gte(enquiryTable.createdAt, period.from), lte(enquiryTable.createdAt, period.to))
    : undefined;

  const [totalResult, byStatus, byService] = await Promise.all([
    db.select({ total: count() }).from(enquiryTable).where(conditions),
    db
      .select({ status: enquiryTable.status, count: count() })
      .from(enquiryTable)
      .where(conditions)
      .groupBy(enquiryTable.status),
    db
      .select({ service: enquiryTable.interestedIn, count: count() })
      .from(enquiryTable)
      .where(conditions)
      .groupBy(enquiryTable.interestedIn),
  ]);

  return {
    total: totalResult[0].total,
    byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.count])),
    byService: Object.fromEntries(byService.map((r) => [r.service, r.count])),
  };
}
