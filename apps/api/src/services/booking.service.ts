import { and, eq, gte, lte } from "drizzle-orm";

import { db } from "../db";
import {
  availabilityBlockTable,
  bookingTable,
  guardianTable,
  notificationTable,
  serviceTypeTable,
  userTable,
} from "../db/schema";
import { env } from "../config/env";
import { sendBookingConfirmationEmail } from "../lib/mailer";

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

export async function createServiceType(input: {
  name: string;
  type: ServiceTypeKind;
  durationMinutes: number;
  capacity?: number | null;
  fixedStartTime?: string | null;
  attendeeVisibility?: boolean | null;
  defaultLocation?: string | null;
  defaultMeetingLink?: string | null;
  programTier?: "PHP" | "PHP_Plus" | "PHP_Premium" | null;
  createdBy: number;
}) {
  const fixedStartTime =
    input.type === "role_model"
      ? input.fixedStartTime && input.fixedStartTime !== "13:00"
        ? (() => {
            throw new Error("Role model calls must be fixed at 13:00");
          })()
        : "13:00"
      : input.fixedStartTime ?? null;

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
      fixedStartTime,
      attendeeVisibility: input.attendeeVisibility ?? true,
      defaultLocation: input.defaultLocation ?? null,
      defaultMeetingLink: input.defaultMeetingLink ?? null,
      programTier,
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
    fixedStartTime?: string | null;
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

  const fixedStartTime =
    nextType === "role_model"
      ? input.fixedStartTime && input.fixedStartTime !== "13:00"
        ? (() => {
            throw new Error("Role model calls must be fixed at 13:00");
          })()
        : "13:00"
      : input.fixedStartTime ?? existing[0].fixedStartTime ?? null;

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
      fixedStartTime,
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
    .where(and(eq(availabilityBlockTable.serviceTypeId, serviceTypeId), gte(availabilityBlockTable.startsAt, from), lte(availabilityBlockTable.endsAt, to)));
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
}) {
  const serviceType = await db.select().from(serviceTypeTable).where(eq(serviceTypeTable.id, input.serviceTypeId)).limit(1);
  if (!serviceType[0]) {
    throw new Error("Service type not found");
  }

  const startTimeUtc = input.startsAt.toISOString().substring(11, 16);
  const startTimeLocal = `${String(input.startsAt.getHours()).padStart(2, "0")}:${String(
    input.startsAt.getMinutes()
  ).padStart(2, "0")}`;
  const matchesFixed = (fixed: string) => fixed === startTimeUtc || fixed === startTimeLocal;
  if (serviceType[0].fixedStartTime) {
    if (!matchesFixed(serviceType[0].fixedStartTime)) {
      throw new Error("Invalid start time");
    }
  } else if (serviceType[0].type === "role_model" && !matchesFixed("13:00")) {
    throw new Error("Role model calls must be fixed at 13:00");
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

  const result = await db
    .insert(bookingTable)
    .values({
      athleteId: input.athleteId,
      guardianId: input.guardianId,
      type: serviceType[0].type,
      status: "confirmed",
      startsAt: input.startsAt,
      endTime: input.endsAt,
      location: input.location ?? serviceType[0].defaultLocation ?? null,
      meetingLink: input.meetingLink ?? serviceType[0].defaultMeetingLink ?? null,
      serviceTypeId: input.serviceTypeId,
      createdBy: input.createdBy,
    })
    .returning();

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

    await db.insert(notificationTable).values({
      userId: guardian[0].userId,
      type: "booking_confirmed",
      content: `Booking confirmed for ${serviceType[0].name} at ${input.startsAt.toISOString()}`,
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
            title: "Booking confirmed",
            body: `${serviceType[0].name} at ${input.startsAt.toISOString()}`,
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
