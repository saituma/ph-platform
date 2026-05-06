import type { Request, Response } from "express";
import { z } from "zod";
import { and, eq, ilike, isNull, or } from "drizzle-orm";
import {
  listBookingsAdmin,
  getBookingByIdAdmin,
  updateBookingDetailsAdmin,
  updateBookingStatusAdmin,
  listAvailabilityAdmin,
} from "../../services/admin/booking.service";
import { createBooking } from "../../services/booking.service";
import { createServiceType } from "../../services/booking.service";
import { ensureGuardianForUser, getAthleteForUser, getGuardianAndAthlete } from "../../services/user.service";
import { db } from "../../db";
import { athleteTable, serviceTypeTable, userTable } from "../../db/schema";

const adminSearchQuerySchema = z.object({
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const adminBookingSchema = z.object({
  userId: z.number().int().min(1),
  serviceTypeId: z.number().int().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  location: z.string().optional().nullable(),
  meetingLink: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(["pending", "confirmed", "declined", "cancelled"]).optional(),
});

const adminScheduleUserQuerySchema = z.object({
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const adminCustomScheduleSchema = z
  .object({
    mode: z.enum(["one_to_one", "small_group"]),
    userIds: z.array(z.number().int().min(1)).min(1),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    location: z.string().max(500).optional().nullable(),
    meetingLink: z.string().max(1000).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    isBookable: z.boolean().default(true),
    groupName: z.string().max(120).optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.mode === "one_to_one" && val.userIds.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["userIds"],
        message: "1:1 schedule requires exactly one user.",
      });
    }
  });

function normalizeOptionalText(input: string | null | undefined) {
  const trimmed = (input ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function resolveOrCreateAdminService(input: {
  mode: "one_to_one" | "small_group";
  durationMinutes: number;
  isBookable: boolean;
  createdBy: number;
}) {
  const baseName = input.mode === "one_to_one" ? "Admin 1:1 Schedule" : "Admin Small Group Session";
  const serviceName = `${baseName} (${input.isBookable ? "Bookable" : "Fixed"})`;
  const [existing] = await db
    .select()
    .from(serviceTypeTable)
    .where(eq(serviceTypeTable.name, serviceName))
    .limit(1);
  if (existing) return existing;

  return createServiceType({
    name: serviceName,
    description: "Admin-created schedule slot",
    type: input.mode === "one_to_one" ? "one_to_one" : "semi_private",
    durationMinutes: Math.max(15, input.durationMinutes),
    capacity: input.mode === "one_to_one" ? 1 : null,
    totalSlots: null,
    attendeeVisibility: true,
    defaultLocation: null,
    defaultMeetingLink: null,
    programTier: null,
    eligiblePlans: [],
    eligibleTargets: [],
    schedulePattern: "one_time",
    recurrenceEndMode: null,
    recurrenceCount: null,
    weeklyEntries: [],
    oneTimeDate: null,
    oneTimeTime: null,
    slotMode: "shared_capacity",
    slotIntervalMinutes: null,
    slotDefinitions: [],
    isActive: true,
    isBookable: input.isBookable,
    createdBy: input.createdBy,
  });
}

export async function listBookings(req: Request, res: Response) {
  const { q, limit } = adminSearchQuerySchema.parse(req.query ?? {});
  const bookings = await listBookingsAdmin({ q, limit });
  return res.status(200).json({ bookings });
}

export async function getBooking(req: Request, res: Response) {
  const bookingId = z.coerce.number().int().min(1).parse(req.params.bookingId);
  const booking = await getBookingByIdAdmin(bookingId);
  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }
  return res.status(200).json({ booking });
}

export async function createBookingAdmin(req: Request, res: Response) {
  const input = adminBookingSchema.parse(req.body);
  const [service] = await db
    .select()
    .from(serviceTypeTable)
    .where(eq(serviceTypeTable.id, input.serviceTypeId))
    .limit(1);
  if (!service) {
    return res.status(404).json({ error: "Service type not found" });
  }
  const { guardian, athlete } = await getGuardianAndAthlete(input.userId);
  if (!guardian || !athlete) {
    return res.status(400).json({ error: "Guardian or athlete not found" });
  }
  let startsAt = new Date(input.startsAt);
  let endsAt = new Date(input.endsAt);

  const booking = await createBooking({
    athleteId: athlete.id,
    guardianId: guardian.id,
    serviceTypeId: input.serviceTypeId,
    startsAt,
    endsAt,
    createdBy: req.user!.id,
    location: input.location ?? undefined,
    meetingLink: input.meetingLink ?? undefined,
    notes: input.notes ?? null,
    bypassAvailability: true,
  });

  if (input.status && input.status !== "pending") {
    const updated = await updateBookingStatusAdmin({ bookingId: booking.id, status: input.status });
    return res.status(201).json({ booking: updated ?? booking });
  }

  return res.status(201).json({ booking });
}

export async function listNonTeamScheduleUsers(req: Request, res: Response) {
  const { q, limit } = adminScheduleUserQuerySchema.parse(req.query ?? {});
  const safeLimit = limit ?? 60;
  const pattern = q?.trim() ? `%${q.trim()}%` : null;

  const whereBase = and(
    isNull(athleteTable.teamId),
    eq(userTable.isDeleted, false),
    or(
      eq(userTable.role, "athlete"),
      eq(userTable.role, "adult_athlete"),
      eq(userTable.role, "youth_athlete"),
    ),
  );

  const rows = await db
    .select({
      userId: userTable.id,
      athleteId: athleteTable.id,
      name: athleteTable.name,
      email: userTable.email,
      role: userTable.role,
      athleteType: athleteTable.athleteType,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(athleteTable.userId, userTable.id))
    .where(
      pattern
        ? and(
            whereBase,
            or(
              ilike(athleteTable.name, pattern),
              ilike(userTable.email, pattern),
            ),
          )
        : whereBase,
    )
    .limit(safeLimit);

  return res.status(200).json({ items: rows });
}

export async function createCustomScheduleAdmin(req: Request, res: Response) {
  const input = adminCustomScheduleSchema.parse(req.body);
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (!(startsAt.getTime() < endsAt.getTime())) {
    return res.status(400).json({ error: "End time must be after start time." });
  }

  const durationMinutes = Math.max(1, Math.round((endsAt.getTime() - startsAt.getTime()) / 60000));
  const service = await resolveOrCreateAdminService({
    mode: input.mode,
    durationMinutes,
    isBookable: input.isBookable,
    createdBy: req.user!.id,
  });

  const notesBase = normalizeOptionalText(input.notes);
  const groupTag =
    input.mode === "small_group"
      ? normalizeOptionalText(input.groupName) ?? `Group ${new Date().toISOString().slice(0, 10)}`
      : null;
  const combinedNotes = [groupTag ? `[${groupTag}]` : null, notesBase].filter(Boolean).join(" ").trim() || null;

  const created: any[] = [];
  const failures: Array<{ userId: number; reason: string }> = [];

  for (const userId of input.userIds) {
    try {
      const athlete = await getAthleteForUser(userId);
      if (!athlete) {
        failures.push({ userId, reason: "Athlete profile not found." });
        continue;
      }
      if (athlete.teamId != null) {
        failures.push({ userId, reason: "Team users are not allowed in this flow." });
        continue;
      }

      let guardian = (await getGuardianAndAthlete(userId)).guardian;
      if (!guardian) {
        guardian = await ensureGuardianForUser(athlete.userId);
      }
      if (!guardian) {
        failures.push({ userId, reason: "Guardian record missing." });
        continue;
      }

      const booking = await createBooking({
        athleteId: athlete.id,
        guardianId: guardian.id,
        serviceTypeId: service.id,
        startsAt,
        endsAt,
        createdBy: req.user!.id,
        location: normalizeOptionalText(input.location),
        meetingLink: normalizeOptionalText(input.meetingLink),
        notes: combinedNotes,
        bypassAvailability: true,
        viewerAthlete: {
          currentProgramTier: athlete.currentProgramTier,
          athleteType: athlete.athleteType,
          teamId: athlete.teamId,
          userId: athlete.userId,
          guardianId: athlete.guardianId,
        },
      });

      if (!booking) {
        failures.push({ userId, reason: "Failed to create booking." });
        continue;
      }

      if (!input.isBookable) {
        await updateBookingStatusAdmin({ bookingId: booking.id, status: "confirmed" });
      }

      created.push(booking);
    } catch (error: any) {
      failures.push({ userId, reason: error?.message ?? "Unexpected error" });
    }
  }

  return res.status(201).json({
    createdCount: created.length,
    failedCount: failures.length,
    created,
    failures,
  });
}

export async function updateBookingStatus(req: Request, res: Response) {
  const bookingId = z.coerce.number().int().min(1).parse(req.params.bookingId);
  const body = z
    .object({
      status: z.enum(["pending", "confirmed", "declined", "cancelled"]),
      startsAt: z.string().datetime().optional(),
      endTime: z.string().datetime().optional().nullable(),
      location: z.string().optional().nullable(),
      meetingLink: z.string().optional().nullable(),
    })
    .parse(req.body);

  if (
    body.startsAt !== undefined ||
    body.endTime !== undefined ||
    body.location !== undefined ||
    body.meetingLink !== undefined
  ) {
    const updated = await updateBookingDetailsAdmin({
      bookingId,
      startsAt: body.startsAt !== undefined ? new Date(body.startsAt) : undefined,
      endTime: body.endTime !== undefined ? (body.endTime ? new Date(body.endTime) : null) : undefined,
      location: body.location,
      meetingLink: body.meetingLink,
    });
    if (!updated) {
      return res.status(404).json({ error: "Booking not found" });
    }
  }

  const booking = await updateBookingStatusAdmin({ bookingId, status: body.status });
  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }
  return res.status(200).json({ booking });
}

export async function listAvailability(_req: Request, res: Response) {
  const items = await listAvailabilityAdmin();
  return res.status(200).json({ items });
}
