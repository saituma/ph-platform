import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { logger } from "../../lib/logger";
import { getSocketServer } from "../../socket-hub";
import {
  athleteTable,
  bookingTable,
  guardianTable,
  notificationTable,
  serviceTypeTable,
  userTable,
  availabilityBlockTable,
} from "../../db/schema";
import { env } from "../../config/env";
import { sendBookingApprovedEmail, sendBookingDeclinedEmail } from "../../lib/mailer";
import { pushQueue } from "../../jobs";

export async function listBookingsAdmin(options?: { q?: string; limit?: number }) {
  const q = options?.q?.trim() ?? "";
  const requestedLimit = options?.limit;
  const limit =
    typeof requestedLimit === "number" && Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(100, Math.floor(requestedLimit)))
      : 50;
  const filters = [];
  if (q) {
    const pattern = `%${q}%`;
    filters.push(
      or(
        ilike(serviceTypeTable.name, pattern),
        ilike(athleteTable.name, pattern),
        sql`${bookingTable.type}::text ILIKE ${pattern}`,
        sql`${bookingTable.status}::text ILIKE ${pattern}`,
        sql`${bookingTable.id}::text ILIKE ${pattern}`,
      ),
    );
  }

  const rows = await db
    .select({
      id: bookingTable.id,
      serviceTypeId: bookingTable.serviceTypeId,
      startsAt: bookingTable.startsAt,
      endTime: bookingTable.endTime,
      type: bookingTable.type,
      status: bookingTable.status,
      location: bookingTable.location,
      meetingLink: bookingTable.meetingLink,
      notes: bookingTable.notes,
      serviceName: serviceTypeTable.name,
      athleteName: athleteTable.name,
    })
    .from(bookingTable)
    .leftJoin(serviceTypeTable, eq(bookingTable.serviceTypeId, serviceTypeTable.id))
    .leftJoin(athleteTable, eq(bookingTable.athleteId, athleteTable.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(bookingTable.startsAt))
    .limit(limit);

  return rows;
}

export async function getBookingByIdAdmin(bookingId: number) {
  const [row] = await db
    .select({
      id: bookingTable.id,
      startsAt: bookingTable.startsAt,
      endTime: bookingTable.endTime,
      type: bookingTable.type,
      status: bookingTable.status,
      location: bookingTable.location,
      meetingLink: bookingTable.meetingLink,
      notes: bookingTable.notes,
      serviceTypeId: bookingTable.serviceTypeId,
      serviceName: serviceTypeTable.name,
      serviceCapacity: serviceTypeTable.capacity,
      athleteName: athleteTable.name,
      guardianName: userTable.name,
      guardianEmail: userTable.email,
      createdAt: bookingTable.createdAt,
    })
    .from(bookingTable)
    .leftJoin(serviceTypeTable, eq(bookingTable.serviceTypeId, serviceTypeTable.id))
    .leftJoin(athleteTable, eq(bookingTable.athleteId, athleteTable.id))
    .leftJoin(guardianTable, eq(bookingTable.guardianId, guardianTable.id))
    .leftJoin(userTable, eq(guardianTable.userId, userTable.id))
    .where(eq(bookingTable.id, bookingId))
    .limit(1);

  if (!row) return null;

  let slotsUsed = 0;
  if (row.serviceCapacity && row.serviceTypeId && row.startsAt) {
    const booked = await db
      .select({ id: bookingTable.id })
      .from(bookingTable)
      .where(
        and(
          eq(bookingTable.serviceTypeId, row.serviceTypeId),
          eq(bookingTable.startsAt, row.startsAt),
          inArray(bookingTable.status, ["pending", "confirmed"]),
        ),
      );
    slotsUsed = booked.length;
  }

  return {
    ...row,
    slotsUsed,
    slotsTotal: row.serviceCapacity ?? null,
  };
}

export async function updateBookingDetailsAdmin(input: {
  bookingId: number;
  startsAt?: Date;
  endTime?: Date | null;
  location?: string | null;
  meetingLink?: string | null;
}) {
  const patch: Record<string, any> = { updatedAt: new Date() };
  if (input.startsAt !== undefined) patch.startsAt = input.startsAt;
  if (input.endTime !== undefined) patch.endTime = input.endTime;
  if (input.location !== undefined) patch.location = input.location;
  if (input.meetingLink !== undefined) patch.meetingLink = input.meetingLink;

  const updated = await db.update(bookingTable).set(patch).where(eq(bookingTable.id, input.bookingId)).returning();

  return updated[0] ?? null;
}

export async function updateBookingStatusAdmin(input: {
  bookingId: number;
  status: "pending" | "confirmed" | "declined" | "cancelled";
}) {
  const [existing] = await db
    .select({ status: bookingTable.status })
    .from(bookingTable)
    .where(eq(bookingTable.id, input.bookingId))
    .limit(1);

  const result = await db
    .update(bookingTable)
    .set({
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(bookingTable.id, input.bookingId))
    .returning();

  const updated = result[0] ?? null;
  if (!updated) return null;

  if (input.status === "confirmed" && existing?.status !== "confirmed") {
    const [detail] = await db
      .select({
        startsAt: bookingTable.startsAt,
        location: bookingTable.location,
        meetingLink: bookingTable.meetingLink,
        serviceName: serviceTypeTable.name,
        guardianUserId: guardianTable.userId,
        guardianEmail: userTable.email,
        guardianName: userTable.name,
      })
      .from(bookingTable)
      .leftJoin(serviceTypeTable, eq(bookingTable.serviceTypeId, serviceTypeTable.id))
      .leftJoin(guardianTable, eq(bookingTable.guardianId, guardianTable.id))
      .leftJoin(userTable, eq(guardianTable.userId, userTable.id))
      .where(eq(bookingTable.id, input.bookingId))
      .limit(1);

    if (detail?.guardianUserId) {
      await db.insert(notificationTable).values({
        userId: detail.guardianUserId,
        type: "booking_confirmed",
        content: `Booking confirmed for ${detail.serviceName ?? "session"} at ${detail.startsAt?.toISOString?.() ?? ""}`,
        link: "/schedule",
      });

      void pushQueue.enqueue({
        userId: detail.guardianUserId,
        title: "Booking confirmed",
        body: `${detail.serviceName ?? "Session"} confirmed`,
        data: { type: "booking", screen: "schedule", url: "/schedule" },
      });

      if (detail.guardianEmail) {
        try {
          await sendBookingApprovedEmail({
            to: detail.guardianEmail,
            name: detail.guardianName ?? "there",
            serviceName: detail.serviceName ?? "Session",
            startsAt: detail.startsAt ?? new Date(),
            location: detail.location ?? undefined,
            meetingLink: detail.meetingLink ?? undefined,
          });
        } catch (error) {
          logger.error({ err: error }, "Failed to send booking confirmation email");
        }
      }

      const io = getSocketServer();
      if (io) {
        const payload = { message: `Your booking for ${detail.serviceName ?? "Session"} is confirmed!` };
        io.to(`user:${detail.guardianUserId}`).emit("schedule:changed", payload);
        io.to("admin:all").emit("schedule:changed", payload);
      }

      if (env.pushWebhookUrl) {
        try {
          await fetch(env.pushWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: detail.guardianUserId,
              title: "Booking confirmed",
              body: `${detail.serviceName ?? "Session"} confirmed`,
              link: "/schedule",
            }),
          });
        } catch (error) {
          logger.error({ err: error }, "Failed to send booking confirmation push");
        }
      }
    }
  }

  if (input.status === "declined" && existing?.status !== "declined") {
    const [detail] = await db
      .select({
        startsAt: bookingTable.startsAt,
        location: bookingTable.location,
        meetingLink: bookingTable.meetingLink,
        serviceName: serviceTypeTable.name,
        guardianUserId: guardianTable.userId,
        guardianEmail: userTable.email,
        guardianName: userTable.name,
      })
      .from(bookingTable)
      .leftJoin(serviceTypeTable, eq(bookingTable.serviceTypeId, serviceTypeTable.id))
      .leftJoin(guardianTable, eq(bookingTable.guardianId, guardianTable.id))
      .leftJoin(userTable, eq(guardianTable.userId, userTable.id))
      .where(eq(bookingTable.id, input.bookingId))
      .limit(1);

    if (detail?.guardianUserId) {
      await db.insert(notificationTable).values({
        userId: detail.guardianUserId,
        type: "booking_declined",
        content: `Booking declined for ${detail.serviceName ?? "session"} at ${detail.startsAt?.toISOString?.() ?? ""}`,
        link: "/schedule",
      });

      void pushQueue.enqueue({
        userId: detail.guardianUserId,
        title: "Booking declined",
        body: `${detail.serviceName ?? "Session"} declined`,
        data: { type: "booking", screen: "schedule", url: "/schedule" },
      });

      if (detail.guardianEmail) {
        try {
          await sendBookingDeclinedEmail({
            to: detail.guardianEmail,
            name: detail.guardianName ?? "there",
            serviceName: detail.serviceName ?? "Session",
            startsAt: detail.startsAt ?? new Date(),
            location: detail.location ?? undefined,
            meetingLink: detail.meetingLink ?? undefined,
          });
        } catch (error) {
          logger.error({ err: error }, "Failed to send booking decline email");
        }
      }

      const io = getSocketServer();
      if (io) {
        const payload = { message: `Your booking for ${detail.serviceName ?? "Session"} was declined.` };
        io.to(`user:${detail.guardianUserId}`).emit("schedule:changed", payload);
        io.to("admin:all").emit("schedule:changed", payload);
      }

      if (env.pushWebhookUrl) {
        try {
          await fetch(env.pushWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: detail.guardianUserId,
              title: "Booking declined",
              body: `${detail.serviceName ?? "Session"} declined`,
              link: "/schedule",
            }),
          });
        } catch (error) {
          logger.error({ err: error }, "Failed to send booking declined push");
        }
      }
    }
  }

  return updated;
}

export async function listAvailabilityAdmin() {
  return db
    .select({
      id: availabilityBlockTable.id,
      startsAt: availabilityBlockTable.startsAt,
      endsAt: availabilityBlockTable.endsAt,
      createdAt: availabilityBlockTable.createdAt,
      serviceName: serviceTypeTable.name,
    })
    .from(availabilityBlockTable)
    .leftJoin(serviceTypeTable, eq(availabilityBlockTable.serviceTypeId, serviceTypeTable.id))
    .orderBy(desc(availabilityBlockTable.startsAt))
    .limit(20);
}
