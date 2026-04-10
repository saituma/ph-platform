import type { Request, Response } from "express";
import { z } from "zod";

import {
  buildAvailabilitySlots,
  createAvailabilityBlock,
  createBooking,
  createServiceType,
  getServiceTypeById,
  listGeneratedAvailability,
  listAvailabilityBlocks,
  listBookingsForServiceInRange,
  listBookingsForUser,
  listServiceTypes,
  updateServiceType,
  deleteServiceType,
} from "../services/booking.service";
import { assertUserCanCreateBooking } from "../services/booking-eligibility.service";
import { getAthleteForUser, getGuardianAndAthlete } from "../services/user.service";
import { ProgramType } from "../db/schema";
import { verifyBookingActionToken } from "../lib/booking-actions";
import { updateBookingStatusAdmin } from "../services/admin/booking.service";

const planEnum = z.enum(ProgramType.enumValues);
const weeklyEntrySchema = z.object({
  weekday: z.number().int().min(1).max(7),
  time: z.string().min(4),
});
const slotDefinitionSchema = z.object({
  time: z.string().min(4),
  capacity: z.preprocess((val) => (val === "" || val === null ? undefined : Number(val)), z.number().int().min(1)).optional(),
});

const serviceTypeSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["one_to_one", "semi_private", "in_person"]),
  durationMinutes: z.preprocess((val) => (val === "" || val === null ? undefined : Number(val)), z.number().int().min(1)),
  capacity: z.preprocess((val) => (val === "" || val === null ? undefined : Number(val)), z.number().int().min(1)).optional(),
  attendeeVisibility: z.boolean().optional(),
  defaultLocation: z.string().optional().nullable(),
  defaultMeetingLink: z.string().optional().nullable(),
  programTier: planEnum.optional().nullable(),
  eligiblePlans: z.array(planEnum).optional(),
  schedulePattern: z.enum(["one_time", "weekly_recurring"]).optional(),
  recurrenceEndMode: z.enum(["weeks", "months", "forever"]).optional().nullable(),
  recurrenceCount: z.preprocess((val) => (val === "" || val === null ? undefined : Number(val)), z.number().int().min(1)).optional().nullable(),
  weeklyEntries: z.array(weeklyEntrySchema).optional(),
  oneTimeDate: z.string().optional().nullable(),
  oneTimeTime: z.string().optional().nullable(),
  slotMode: z.enum(["shared_capacity", "exact_sub_slots", "both"]).optional(),
  slotIntervalMinutes: z.preprocess((val) => (val === "" || val === null ? undefined : Number(val)), z.number().int().min(1)).optional().nullable(),
  slotDefinitions: z.array(slotDefinitionSchema).optional(),
  isActive: z.boolean().optional(),
});

const serviceTypeUpdateSchema = serviceTypeSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const availabilitySchema = z.object({
  serviceTypeId: z.number().int().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

const bookingSchema = z.object({
  serviceTypeId: z.number().int().min(1),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  occurrenceKey: z.string().datetime().optional(),
  slotKey: z.string().datetime().optional(),
  location: z.string().optional(),
  meetingLink: z.string().optional(),
  timezoneOffsetMinutes: z.number().int().optional(),
}).refine((input) => Boolean(input.occurrenceKey || (input.startsAt && input.endsAt)), {
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
  const includeInactive =
    req.query.includeInactive === "true" &&
    ["coach", "admin", "superAdmin"].includes(req.user?.role ?? "");
  const athlete = req.user ? await getAthleteForUser(req.user.id) : null;
  const items = await listServiceTypes({ includeInactive, viewerProgramTier: athlete?.currentProgramTier as any });
  if (includeInactive || ["coach", "admin", "superAdmin"].includes(req.user?.role ?? "")) {
    return res.status(200).json({ items });
  }
  return res.status(200).json({ items });
}

export async function createService(req: Request, res: Response) {
  console.log("Creating service:", JSON.stringify(req.body, null, 2));
  const input = serviceTypeSchema.parse(req.body);
  const item = await createServiceType({
    name: input.name,
    type: input.type,
    durationMinutes: input.durationMinutes,
    capacity: input.capacity,
    attendeeVisibility: input.attendeeVisibility,
    defaultLocation: input.defaultLocation,
    defaultMeetingLink: input.defaultMeetingLink,
    programTier: input.programTier,
    eligiblePlans: input.eligiblePlans,
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
    console.error(err);
    return res.status(500).json({ error: "Failed to delete service" });
  }
}

export async function updateService(req: Request, res: Response) {
  const serviceId = Number(req.params.id);
  if (!serviceId) {
    return res.status(400).json({ error: "Invalid service id" });
  }
  console.log("Updating service:", serviceId, JSON.stringify(req.body, null, 2));
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
  });
  return res.status(200).json({ items });
}

export async function createBookingForUser(req: Request, res: Response) {
  const input = bookingSchema.parse(req.body);
  const { guardian, athlete } = await getGuardianAndAthlete(req.user!.id);
  if (!guardian || !athlete) {
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
      viewerProgramTier: athlete.currentProgramTier as any,
      location: input.location,
      meetingLink: input.meetingLink,
      timezoneOffsetMinutes: input.timezoneOffsetMinutes,
    });

    return res.status(201).json({ booking });
  } catch (error: any) {
    if (error?.message === "BOOKING_REQUIRES_ACTIVE_PLAN") {
      return res.status(403).json({
        error: "An approved paid plan is required to book sessions.",
      });
    }
    const knownErrors = [
      "Capacity reached",
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
  const { guardian } = await getGuardianAndAthlete(req.user!.id);
  if (!guardian) {
    return res.status(200).json({ items: [] });
  }
  const items = await listBookingsForUser(guardian.id);
  return res.status(200).json({ items });
}

export async function bookingAction(req: Request, res: Response) {
  const parsed = z.string().min(1).safeParse(req.query.token);
  if (!parsed.success) {
    return res.status(400).send("Missing booking action token.");
  }
  const token = parsed.data;
  const verified = verifyBookingActionToken(token);
  if (!verified) {
    return res.status(400).send("Invalid or expired booking action.");
  }
  const status = verified.action === "approve" ? "confirmed" : "declined";
  const updated = await updateBookingStatusAdmin({ bookingId: verified.bookingId, status });
  if (!updated) {
    return res.status(404).send("Booking not found.");
  }
  return res.status(200).send(`Booking ${status}.`);
}
