import type { Request, Response } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";

import {
  buildAvailabilitySlots,
  cancelBookingForUser,
  createAvailabilityBlock,
  createBooking,
  createServiceType,
  getServiceTypeById,
  listGeneratedAvailability,
  listAvailabilityBlocks,
  listBookingsForServiceInRange,
  listBookingsForUser,
  listBookingsForAthlete,
  listServiceTypes,
  updateServiceType,
  deleteServiceType,
} from "../services/booking.service";
import { assertUserCanCreateBooking } from "../services/booking-eligibility.service";
import {
  ensureGuardianForUser,
  getAthleteForUser,
  getGuardianAndAthlete,
  resolveDefaultBookingPartyForTrainingStaff,
} from "../services/user.service";
import { ProgramType } from "../db/schema";
import { cache, cacheKeys } from "../lib/cache";
import { verifyBookingActionToken } from "../lib/booking-actions";
import { db } from "../db";
import { athleteTable, bookingTable, serviceTypeTable } from "../db/schema";
import { eq } from "drizzle-orm";
import { updateBookingDetailsAdmin, updateBookingStatusAdmin } from "../services/admin/booking.service";
import { isTrainingStaff } from "../lib/user-roles";

const planEnum = z.enum(ProgramType.enumValues);
const weeklyEntrySchema = z.object({
  weekday: z.number().int().min(1).max(7),
  time: z.string().min(4),
});
const slotDefinitionSchema = z.object({
  time: z.string().min(4),
  capacity: z
    .preprocess((val) => (val === "" || val === null ? undefined : Number(val)), z.number().int().min(1))
    .optional(),
});

const serviceTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().max(2000).optional().nullable(),
  type: z.enum(["one_to_one", "semi_private", "in_person"]).optional().nullable(),
  durationMinutes: z.preprocess(
    (val) => (val === "" || val === null ? undefined : Number(val)),
    z.number().int().min(1),
  ),
  capacity: z
    .preprocess((val) => {
      if (val === "") return undefined;
      if (val === null) return null;
      return Number(val);
    }, z.number().int().min(1).nullable())
    .optional(),
  totalSlots: z
    .preprocess((val) => {
      if (val === "") return undefined;
      if (val === null) return null;
      return Number(val);
    }, z.number().int().min(1).nullable())
    .optional(),
  attendeeVisibility: z.boolean().optional(),
  defaultLocation: z.string().optional().nullable(),
  defaultMeetingLink: z.string().optional().nullable(),
  programTier: planEnum.optional().nullable(),
  eligiblePlans: z.array(planEnum).optional(),
  eligibleTargets: z.array(z.string()).optional(),
  schedulePattern: z.enum(["one_time", "weekly_recurring"]).optional(),
  recurrenceEndMode: z.enum(["weeks", "months", "forever"]).optional().nullable(),
  recurrenceCount: z
    .preprocess((val) => (val === "" || val === null ? undefined : Number(val)), z.number().int().min(1))
    .optional()
    .nullable(),
  weeklyEntries: z.array(weeklyEntrySchema).optional(),
  oneTimeDate: z.string().optional().nullable(),
  oneTimeTime: z.string().optional().nullable(),
  slotMode: z.enum(["shared_capacity", "exact_sub_slots", "both"]).optional(),
  slotIntervalMinutes: z
    .preprocess((val) => (val === "" || val === null ? undefined : Number(val)), z.number().int().min(1))
    .optional()
    .nullable(),
  slotDefinitions: z.array(slotDefinitionSchema).optional(),
  isActive: z.boolean().optional(),
  isBookable: z.boolean().optional(),
});

const serviceTypeUpdateSchema = serviceTypeSchema.partial().extend({
  isActive: z.boolean().optional(),
  isBookable: z.boolean().optional(),
});

const availabilitySchema = z.object({
  serviceTypeId: z.number().int().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

const bookingSchema = z
  .object({
    serviceTypeId: z.number().int().min(1),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    occurrenceKey: z.string().datetime().optional(),
    slotKey: z.string().datetime().optional(),
    location: z.string().optional(),
    meetingLink: z.string().optional(),
    notes: z.string().max(2000).optional(),
    timezoneOffsetMinutes: z.number().int().optional(),
  })
  .refine((input) => Boolean(input.occurrenceKey || (input.startsAt && input.endsAt)), {
    message: "Either occurrenceKey or startsAt/endsAt is required",
  });

const availabilityQuerySchema = z.object({
  serviceTypeId: z.coerce.number().int().min(1),
  from: z.string().datetime(),
  to: z.string().datetime(),
});

const generatedAvailabilityQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  serviceTypeId: z.coerce.number().int().min(1).optional(),
});

export async function listServices(req: Request, res: Response) {
  const includeInactive = req.query.includeInactive === "true" && isTrainingStaff(req.user?.role);
  const includeLocked = req.query.includeLocked === "true";
  const omitWithoutBookableSlots = req.query.omitWithoutBookableSlots === "true";
  const athlete = req.user ? await getAthleteForUser(req.user.id) : null;

  const isAdmin = isTrainingStaff(req.user?.role);
  const items = isAdmin
    ? await listServiceTypes({ includeInactive, includeLocked, omitWithoutBookableSlots, viewerProgramTier: athlete?.currentProgramTier as any, athlete })
    : await cache.getOrSet(
        cacheKeys.userServices(req.user?.id ?? 0),
        300,
        () => listServiceTypes({ includeInactive, includeLocked, omitWithoutBookableSlots, viewerProgramTier: athlete?.currentProgramTier as any, athlete }),
      );

  return res.status(200).json({ items });
}

export async function createService(req: Request, res: Response) {
  logger.info({ body: req.body }, "Creating service");
  const input = serviceTypeSchema.parse(req.body);
  const item = await createServiceType({
    name: input.name,
    description: input.description ?? null,
    type: input.type ?? null,
    durationMinutes: input.durationMinutes,
    capacity: input.capacity,
    totalSlots: input.totalSlots,
    attendeeVisibility: input.attendeeVisibility,
    defaultLocation: input.defaultLocation,
    defaultMeetingLink: input.defaultMeetingLink,
    programTier: input.programTier,
    eligiblePlans: input.eligiblePlans,
    eligibleTargets: input.eligibleTargets,
    schedulePattern: input.schedulePattern,
    recurrenceEndMode: input.recurrenceEndMode,
    recurrenceCount: input.recurrenceCount,
    weeklyEntries: input.weeklyEntries,
    oneTimeDate: input.oneTimeDate,
    oneTimeTime: input.oneTimeTime,
    slotMode: input.slotMode,
    slotIntervalMinutes: input.slotIntervalMinutes,
    slotDefinitions: input.slotDefinitions,
    isActive: input.isActive,
    isBookable: input.isBookable,
    createdBy: req.user!.id,
  });
  return res.status(201).json({ item });
}

export async function deleteService(req: Request, res: Response) {
  const serviceId = Number(req.params.id);
  if (!serviceId) {
    return res.status(400).json({ error: "Invalid service id" });
  }
  try {
    const deleted = await deleteServiceType(serviceId);
    return res.status(200).json({ deleted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete";
    if (msg === "Service type not found") {
      return res.status(404).json({ error: msg });
    }
    if (msg.startsWith("Cannot delete")) {
      return res.status(409).json({ error: msg });
    }
    logger.error({ err }, "Failed to delete service");
    return res.status(500).json({ error: "Failed to delete service" });
  }
}

export async function updateService(req: Request, res: Response) {
  const serviceId = Number(req.params.id);
  if (!serviceId) {
    return res.status(400).json({ error: "Invalid service id" });
  }
  logger.info({ serviceId, body: req.body }, "Updating service");
  const input = serviceTypeUpdateSchema.parse(req.body);
  if (Object.keys(input).length === 0) {
    return res.status(400).json({ error: "No updates provided" });
  }
  const item = await updateServiceType(serviceId, input);
  return res.status(200).json({ item });
}

export async function createAvailability(req: Request, res: Response) {
  const input = availabilitySchema.parse(req.body);
  const item = await createAvailabilityBlock({
    serviceTypeId: input.serviceTypeId,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    createdBy: req.user!.id,
  });
  return res.status(201).json({ item });
}

export async function listAvailability(req: Request, res: Response) {
  const query = availabilityQuerySchema.parse(req.query);
  const from = new Date(query.from);
  const to = new Date(query.to);
  const service = await getServiceTypeById(query.serviceTypeId);
  const items = await listAvailabilityBlocks(query.serviceTypeId, from, to);
  const bookings = await listBookingsForServiceInRange(query.serviceTypeId, from, to);
  const slots =
    service?.durationMinutes && Number.isFinite(service.durationMinutes)
      ? buildAvailabilitySlots({
          blocks: items,
          durationMinutes: service.durationMinutes,
          from,
          to,
        })
      : [];
  return res.status(200).json({ items, bookings, slots });
}

export async function listGeneratedAvailabilityForUser(req: Request, res: Response) {
  const query = generatedAvailabilityQuerySchema.parse(req.query);
  const athlete = req.user ? await getAthleteForUser(req.user.id) : null;
  const items = await listGeneratedAvailability({
    from: new Date(query.from),
    to: new Date(query.to),
    serviceTypeId: query.serviceTypeId,
    viewerProgramTier: athlete?.currentProgramTier as any,
    athlete,
  });
  return res.status(200).json({ items });
}

export async function createBookingForUser(req: Request, res: Response) {
  const input = bookingSchema.parse(req.body);
  let athlete = await getAthleteForUser(req.user!.id);
  let guardian = (await getGuardianAndAthlete(req.user!.id)).guardian;

  if (!athlete && isTrainingStaff(req.user!.role)) {
    const party = await resolveDefaultBookingPartyForTrainingStaff(req.user!.id);
    if (party) {
      athlete = party.athlete;
      guardian = party.guardian;
    }
  }

  if (!athlete) {
    return res.status(400).json({
      error: isTrainingStaff(req.user!.role)
        ? "Add at least one athlete to your team roster before requesting bookings."
        : "Onboarding incomplete",
    });
  }

  if (!guardian) {
    guardian = await ensureGuardianForUser(athlete.userId);
  }
  if (!guardian) {
    return res.status(400).json({ error: "Onboarding incomplete" });
  }

  try {
    await assertUserCanCreateBooking(req.user!.id);
    const booking = await createBooking({
      athleteId: athlete.id,
      guardianId: guardian.id,
      serviceTypeId: input.serviceTypeId,
      startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
      endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
      occurrenceKey: input.occurrenceKey ?? null,
      slotKey: input.slotKey ?? null,
      createdBy: req.user!.id,
      viewerAthlete: athlete,
      notes: input.notes ?? null,
      timezoneOffsetMinutes: input.timezoneOffsetMinutes,
    });

    void cache.del(cacheKeys.userBookings(req.user!.id));
    return res.status(201).json({ booking });
  } catch (error: any) {
    if (error?.message === "BOOKING_REQUIRES_ACTIVE_PLAN") {
      return res.status(403).json({
        error: "An approved paid plan is required to book sessions.",
      });
    }
    if (error?.message === "BOOKING_TEAM_ATHLETE_SELF_SERVE_DISABLED") {
      return res.status(403).json({
        error: "Team roster athletes cannot book sessions themselves. Your coach will add sessions to your schedule.",
      });
    }
    const knownErrors = [
      "Capacity reached",
      "Service limit reached",
      "Service type not found",
      "Service type not available",
    ];
    if (knownErrors.includes(error?.message)) {
      return res.status(400).json({ error: error.message });
    }
    throw error;
  }
}

export async function listBookings(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const items = await cache.getOrSet(cacheKeys.userBookings(userId), 30, async () => {
      const { guardian } = await getGuardianAndAthlete(userId);
      if (guardian) return listBookingsForUser(guardian.id);
      const athlete = await getAthleteForUser(userId);
      if (athlete) return listBookingsForAthlete(athlete.id);
      return [];
    });
    return res.status(200).json({ items });
  } catch (error) {
    logger.error({ err: error }, "listBookings error");
    return res.status(200).json({ items: [] });
  }
}

export async function cancelBooking(req: Request, res: Response) {
  const bookingId = Number(req.params.id);
  if (!Number.isFinite(bookingId)) return res.status(400).json({ error: "Invalid booking ID" });

  const { guardian } = await getGuardianAndAthlete(req.user!.id);
  if (!guardian) return res.status(403).json({ error: "Forbidden" });

  try {
    const booking = await cancelBookingForUser(bookingId, guardian.id);
    void cache.del(cacheKeys.userBookings(req.user!.id));
    return res.status(200).json({ booking });
  } catch (error: any) {
    if (error?.message === "NOT_FOUND") return res.status(404).json({ error: "Booking not found" });
    if (error?.message === "FORBIDDEN") return res.status(403).json({ error: "Forbidden" });
    if (error?.message === "ALREADY_CLOSED") return res.status(409).json({ error: "Booking already closed" });
    throw error;
  }
}

export async function bookingAction(req: Request, res: Response) {
  const parsed = z.string().min(1).safeParse(req.query.token);
  if (!parsed.success) return res.status(400).send("Missing booking action token.");

  const token = parsed.data;
  const verified = verifyBookingActionToken(token);
  if (!verified) return res.status(400).send("Invalid or expired booking action.");

  const [row] = await db
    .select({
      id: bookingTable.id,
      status: bookingTable.status,
      startsAt: bookingTable.startsAt,
      endTime: bookingTable.endTime,
      location: bookingTable.location,
      meetingLink: bookingTable.meetingLink,
      serviceName: serviceTypeTable.name,
      athleteName: athleteTable.name,
    })
    .from(bookingTable)
    .leftJoin(serviceTypeTable, eq(bookingTable.serviceTypeId, serviceTypeTable.id))
    .leftJoin(athleteTable, eq(bookingTable.athleteId, athleteTable.id))
    .where(eq(bookingTable.id, verified.bookingId))
    .limit(1);

  if (!row) return res.status(404).send("Booking not found.");

  if (row.status !== "pending") {
    if (verified.action === "review") {
      return res.status(409).json({
        ok: false,
        error: `Booking already processed (${row.status}).`,
        booking: { id: row.id, status: row.status },
      });
    }
    return res.status(409).send(`Booking already processed (${row.status}).`);
  }

  if (verified.action === "review") {
    return res.status(200).json({
      ok: true,
      booking: {
        id: row.id,
        status: row.status,
        serviceName: row.serviceName ?? "Session",
        athleteName: row.athleteName ?? "",
        startsAt: row.startsAt?.toISOString?.() ?? null,
        endTime: row.endTime?.toISOString?.() ?? null,
        location: row.location ?? null,
        meetingLink: row.meetingLink ?? null,
      },
    });
  }

  const status = verified.action === "approve" ? "confirmed" : "declined";
  const updated = await updateBookingStatusAdmin({ bookingId: verified.bookingId, status });
  if (!updated) return res.status(404).send("Booking not found.");
  return res.status(200).send(`Booking ${status}.`);
}

const bookingActionPostSchema = z.object({
  token: z.string().min(1),
  action: z.enum(["approve", "decline"]),
  updates: z
    .object({
      startsAt: z.string().datetime().optional(),
      endTime: z.union([z.string().datetime(), z.null()]).optional(),
      location: z.union([z.string(), z.null()]).optional(),
      meetingLink: z.union([z.string(), z.null()]).optional(),
    })
    .optional(),
});

function normalizeOptionalString(input: unknown, maxLen: number) {
  if (input === null) return null;
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
}

export async function bookingActionPost(req: Request, res: Response) {
  const body = bookingActionPostSchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ ok: false, error: "Invalid request body." });
  }

  const verified = verifyBookingActionToken(body.data.token);
  if (!verified) {
    return res.status(400).json({ ok: false, error: "Invalid or expired booking action." });
  }
  if (verified.action !== "review") {
    return res.status(400).json({ ok: false, error: "This token cannot be used for review actions." });
  }

  const [existing] = await db
    .select({
      id: bookingTable.id,
      status: bookingTable.status,
      startsAt: bookingTable.startsAt,
      endTime: bookingTable.endTime,
    })
    .from(bookingTable)
    .where(eq(bookingTable.id, verified.bookingId))
    .limit(1);

  if (!existing) return res.status(404).json({ ok: false, error: "Booking not found." });

  if (existing.status !== "pending") {
    return res.status(409).json({ ok: false, error: `Booking already processed (${existing.status}).` });
  }

  if (body.data.action === "decline") {
    await updateBookingStatusAdmin({ bookingId: verified.bookingId, status: "declined" });
    return res.status(200).json({ ok: true, message: "Booking declined." });
  }

  const updates = body.data.updates ?? {};
  const nextStartsAt = updates.startsAt ? new Date(updates.startsAt) : existing.startsAt;
  const nextEndTime =
    updates.endTime === undefined ? existing.endTime : updates.endTime === null ? null : new Date(updates.endTime);

  if (!nextStartsAt || !Number.isFinite(nextStartsAt.getTime())) {
    return res.status(400).json({ ok: false, error: "startsAt must be a valid timestamp." });
  }
  if (nextStartsAt.getTime() <= Date.now()) {
    return res.status(400).json({ ok: false, error: "startsAt must be in the future." });
  }
  if (nextEndTime && nextEndTime.getTime() <= nextStartsAt.getTime()) {
    return res.status(400).json({ ok: false, error: "endTime must be after startsAt." });
  }

  const location = normalizeOptionalString(updates.location, 500);
  const meetingLink = normalizeOptionalString(updates.meetingLink, 500);

  await updateBookingDetailsAdmin({
    bookingId: verified.bookingId,
    startsAt: updates.startsAt ? nextStartsAt : undefined,
    endTime: updates.endTime === undefined ? undefined : nextEndTime,
    location,
    meetingLink,
  });

  await updateBookingStatusAdmin({ bookingId: verified.bookingId, status: "confirmed" });
  return res.status(200).json({ ok: true, message: "Booking confirmed." });
}
