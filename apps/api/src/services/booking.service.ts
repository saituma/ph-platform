import { and, count, eq, gte, lte, inArray } from "drizzle-orm";

import { db } from "../db";
import {
  athleteTable,
  availabilityBlockTable,
  bookingTable,
  guardianTable,
  notificationTable,
  serviceTypeTable,
  userTable,
} from "../db/schema";
import { env } from "../config/env";
import { sendBookingConfirmationEmail, sendBookingRequestAdminEmail } from "../lib/mailer";
import { createBookingActionToken } from "../lib/booking-actions";

type ServiceTypeKind =
  | "call"
  | "group_call"
  | "individual_call"
  | "lift_lab_1on1"
  | "role_model"
  | "one_on_one";

export async function listServiceTypes(options?: { includeInactive?: boolean }) {
  if (options?.includeInactive) {
    return db.select().from(serviceTypeTable);
  }
  return db.select().from(serviceTypeTable).where(eq(serviceTypeTable.isActive, true));
}

export async function getServiceTypeById(id: number) {
  const rows = await db.select().from(serviceTypeTable).where(eq(serviceTypeTable.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createServiceType(input: {
  name: string;
  type: ServiceTypeKind;
  durationMinutes: number;
  capacity?: number | null;
  attendeeVisibility?: boolean | null;
  defaultLocation?: string | null;
  defaultMeetingLink?: string | null;
  programTier?: "PHP" | "PHP_Plus" | "PHP_Premium" | null;
  isActive?: boolean | null;
  createdBy: number;
}) {
  const programTier =
    input.type === "role_model"
      ? input.programTier && input.programTier !== "PHP_Premium"
        ? (() => {
            throw new Error("Role model calls must be Premium tier");
          })()
        : "PHP_Premium"
      : input.programTier ?? null;

  const result = await db
    .insert(serviceTypeTable)
    .values({
      name: input.name,
      type: input.type,
      durationMinutes: input.durationMinutes,
      capacity: input.capacity ?? null,
      fixedStartTime: null,
      attendeeVisibility: input.attendeeVisibility ?? true,
      defaultLocation: input.defaultLocation ?? null,
      defaultMeetingLink: input.defaultMeetingLink ?? null,
      programTier,
      isActive: input.isActive ?? true,
      createdBy: input.createdBy,
    })
    .returning();

  return result[0];
}

export async function updateServiceType(
  id: number,
  input: {
    name?: string | null;
    type?: ServiceTypeKind | null;
    durationMinutes?: number | null;
    capacity?: number | null;
    attendeeVisibility?: boolean | null;
    defaultLocation?: string | null;
    defaultMeetingLink?: string | null;
    programTier?: "PHP" | "PHP_Plus" | "PHP_Premium" | null;
    isActive?: boolean | null;
  }
) {
  const existing = await db.select().from(serviceTypeTable).where(eq(serviceTypeTable.id, id)).limit(1);
  if (!existing[0]) {
    throw new Error("Service type not found");
  }

  const nextType = input.type ?? existing[0].type;

  const programTier =
    nextType === "role_model"
      ? input.programTier && input.programTier !== "PHP_Premium"
        ? (() => {
            throw new Error("Role model calls must be Premium tier");
          })()
        : "PHP_Premium"
      : input.programTier ?? existing[0].programTier ?? null;

  const [updated] = await db
    .update(serviceTypeTable)
    .set({
      name: input.name ?? existing[0].name,
      type: nextType,
      durationMinutes: input.durationMinutes ?? existing[0].durationMinutes,
      capacity: input.capacity ?? existing[0].capacity ?? null,
      fixedStartTime: null,
      attendeeVisibility: input.attendeeVisibility ?? existing[0].attendeeVisibility ?? true,
      defaultLocation: input.defaultLocation ?? existing[0].defaultLocation ?? null,
      defaultMeetingLink: input.defaultMeetingLink ?? existing[0].defaultMeetingLink ?? null,
      programTier,
      isActive: input.isActive ?? existing[0].isActive ?? true,
      updatedAt: new Date(),
    })
    .where(eq(serviceTypeTable.id, id))
    .returning();

  return updated;
}

export async function deleteServiceType(id: number) {
  const existing = await db.select().from(serviceTypeTable).where(eq(serviceTypeTable.id, id)).limit(1);
  if (!existing[0]) {
    throw new Error("Service type not found");
  }

  const [bookingAgg] = await db
    .select({ n: count() })
    .from(bookingTable)
    .where(eq(bookingTable.serviceTypeId, id));
  const bookingCount = Number(bookingAgg?.n ?? 0);
  if (bookingCount > 0) {
    throw new Error(
      "Cannot delete this service because it has bookings. Deactivate it instead, or remove or reassign those bookings first.",
    );
  }

  await db.delete(availabilityBlockTable).where(eq(availabilityBlockTable.serviceTypeId, id));
  const [deleted] = await db.delete(serviceTypeTable).where(eq(serviceTypeTable.id, id)).returning();
  if (!deleted) {
    throw new Error("Service type not found");
  }
  return deleted;
}

export async function createAvailabilityBlock(input: {
  serviceTypeId: number;
  startsAt: Date;
  endsAt: Date;
  createdBy: number;
}) {
  const result = await db
    .insert(availabilityBlockTable)
    .values({
      serviceTypeId: input.serviceTypeId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      createdBy: input.createdBy,
    })
    .returning();

  return result[0];
}

export async function listAvailabilityBlocks(serviceTypeId: number, from: Date, to: Date) {
  return db
    .select()
    .from(availabilityBlockTable)
    .where(
      and(
        eq(availabilityBlockTable.serviceTypeId, serviceTypeId),
        lte(availabilityBlockTable.startsAt, to),
        gte(availabilityBlockTable.endsAt, from),
      ),
    );
}

export function buildAvailabilitySlots(input: {
  blocks: { startsAt: Date; endsAt: Date }[];
  durationMinutes: number;
  from: Date;
  to: Date;
}) {
  const durationMs = Math.max(1, input.durationMinutes) * 60 * 1000;
  const slotMap = new Map<string, string>();

  for (const block of input.blocks) {
    const start = new Date(block.startsAt);
    const end = new Date(block.endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

    for (
      let cursor = new Date(start.getTime());
      cursor.getTime() + durationMs <= end.getTime();
      cursor = new Date(cursor.getTime() + durationMs)
    ) {
      if (cursor.getTime() < input.from.getTime() || cursor.getTime() > input.to.getTime()) continue;
      slotMap.set(cursor.toISOString(), cursor.toISOString());
    }
  }

  return Array.from(slotMap.values()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
}

export async function listBookingsForServiceInRange(serviceTypeId: number, from: Date, to: Date) {
  return db
    .select({
      id: bookingTable.id,
      startsAt: bookingTable.startsAt,
      status: bookingTable.status,
    })
    .from(bookingTable)
    .where(
      and(
        eq(bookingTable.serviceTypeId, serviceTypeId),
        gte(bookingTable.startsAt, from),
        lte(bookingTable.startsAt, to),
        inArray(bookingTable.status, ["pending", "confirmed"]),
      ),
    );
}

export async function createBooking(input: {
  athleteId: number;
  guardianId: number;
  serviceTypeId: number;
  startsAt: Date;
  endsAt: Date;
  createdBy: number;
  location?: string | null;
  meetingLink?: string | null;
  timezoneOffsetMinutes?: number;
  bypassAvailability?: boolean;
}) {
  const serviceType = await db.select().from(serviceTypeTable).where(eq(serviceTypeTable.id, input.serviceTypeId)).limit(1);
  if (!serviceType[0]) {
    throw new Error("Service type not found");
  }

  if (serviceType[0].capacity) {
    const existing = await db
      .select()
      .from(bookingTable)
      .where(and(eq(bookingTable.serviceTypeId, input.serviceTypeId), eq(bookingTable.startsAt, input.startsAt)));

    if (existing.length >= serviceType[0].capacity) {
      throw new Error("Capacity reached");
    }
  }

  if (!input.bypassAvailability) {
    const blocks = await db
      .select()
      .from(availabilityBlockTable)
      .where(
        and(
          eq(availabilityBlockTable.serviceTypeId, input.serviceTypeId),
          lte(availabilityBlockTable.startsAt, input.startsAt),
          gte(availabilityBlockTable.endsAt, input.endsAt),
        ),
      )
      .limit(1);
    if (!blocks[0]) {
      if (!serviceType[0].capacity) {
        throw new Error("Selected time is not available");
      }
    }
  }

  const result = await db
    .insert(bookingTable)
    .values({
      athleteId: input.athleteId,
      guardianId: input.guardianId,
      type: serviceType[0].type,
      status: "pending",
      startsAt: input.startsAt,
      endTime: input.endsAt,
      location: input.location ?? serviceType[0].defaultLocation ?? null,
      meetingLink: input.meetingLink ?? serviceType[0].defaultMeetingLink ?? null,
      serviceTypeId: input.serviceTypeId,
      createdBy: input.createdBy,
    })
    .returning();

  const bookingId = result[0]?.id;
  const publicApiBase = env.publicApiBaseUrl ? env.publicApiBaseUrl.replace(/\/$/, "") : "";
  const adminWebBase = env.adminWebUrl ? env.adminWebUrl.replace(/\/$/, "") : "";
  const approveToken = bookingId ? createBookingActionToken({ bookingId, action: "approve" }) : null;
  const declineToken = bookingId ? createBookingActionToken({ bookingId, action: "decline" }) : null;
  const approveUrl = publicApiBase && approveToken ? `${publicApiBase}/api/public/booking-action?token=${approveToken}` : undefined;
  const declineUrl = publicApiBase && declineToken ? `${publicApiBase}/api/public/booking-action?token=${declineToken}` : undefined;
  const adminUrl = adminWebBase && bookingId ? `${adminWebBase}/bookings/${bookingId}` : undefined;

  const guardian = await db
    .select({ userId: guardianTable.userId })
    .from(guardianTable)
    .where(eq(guardianTable.id, input.guardianId))
    .limit(1);

  if (guardian[0]) {
    const user = await db
      .select({ email: userTable.email, name: userTable.name })
      .from(userTable)
      .where(eq(userTable.id, guardian[0].userId))
      .limit(1);

    const athlete = await db
      .select({ name: athleteTable.name })
      .from(athleteTable)
      .where(eq(athleteTable.id, input.athleteId))
      .limit(1);

    const adminUsers = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(inArray(userTable.role, ["coach", "admin", "superAdmin"]));

    for (const admin of adminUsers) {
      if (!admin.email) continue;
      try {
        await sendBookingRequestAdminEmail({
          to: admin.email,
          bookingId: bookingId ?? 0,
          serviceName: serviceType[0].name,
          startsAt: input.startsAt,
          guardianName: user[0]?.name ?? undefined,
          guardianEmail: user[0]?.email ?? undefined,
          athleteName: athlete[0]?.name ?? undefined,
          location: input.location ?? serviceType[0].defaultLocation ?? undefined,
          meetingLink: input.meetingLink ?? serviceType[0].defaultMeetingLink ?? undefined,
          approveUrl,
          declineUrl,
          adminUrl,
        });
      } catch (error) {
        console.error("Failed to send booking request admin email", error);
      }
    }

    await db.insert(notificationTable).values({
      userId: guardian[0].userId,
      type: "booking_confirmed",
      content: `Booking requested for ${serviceType[0].name} at ${input.startsAt.toISOString()}`,
      link: "/schedule",
    });

    if (user[0]?.email) {
      try {
        await sendBookingConfirmationEmail({
          to: user[0].email,
          name: user[0].name ?? "there",
          serviceName: serviceType[0].name,
          startsAt: input.startsAt,
          location: input.location ?? serviceType[0].defaultLocation ?? undefined,
          meetingLink: input.meetingLink ?? serviceType[0].defaultMeetingLink ?? undefined,
        });
      } catch (error) {
        console.error("Failed to send booking confirmation email", error);
      }
    }

    if (env.pushWebhookUrl) {
      try {
        await fetch(env.pushWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: guardian[0].userId,
            title: "Booking requested",
            body: `${serviceType[0].name} request submitted`,
            link: "/schedule",
          }),
        });
      } catch (error) {
        console.error("Failed to send push notification", error);
      }
    }
  }

  return result[0];
}

export async function listBookingsForUser(guardianId: number) {
  return db.select().from(bookingTable).where(eq(bookingTable.guardianId, guardianId));
}
