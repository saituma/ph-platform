import type { Request, Response } from "express";
import { z } from "zod";

import {
  createAvailabilityBlock,
  createBooking,
  createServiceType,
  listAvailabilityBlocks,
  listBookingsForServiceInRange,
  listBookingsForUser,
  listServiceTypes,
  updateServiceType,
} from "../services/booking.service";
import { getGuardianAndAthlete } from "../services/user.service";
import { ProgramType } from "../db/schema";

const serviceTypeSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["call", "group_call", "individual_call", "lift_lab_1on1", "role_model", "one_on_one"]),
  durationMinutes: z.preprocess((val) => (val === "" || val === null ? undefined : Number(val)), z.number().int().min(1)),
  capacity: z
    .preprocess((val) => (val === "" || val === null ? undefined : Number(val)), z.number().int().min(1))
    .optional(),
  fixedStartTime: z
    .string()
    .transform((val) => val?.trim() || "")
    .refine((val) => val === "" || /^\d{2}:\d{2}$/.test(val), {
      message: "Invalid time format (HH:MM)",
    })
    .optional()
    .nullable(),
  attendeeVisibility: z.boolean().optional(),
  defaultLocation: z.string().optional().nullable(),
  defaultMeetingLink: z.string().optional().nullable(),
  programTier: z.enum(ProgramType.enumValues).optional().nullable(),
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
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  location: z.string().optional(),
  meetingLink: z.string().optional(),
  timezoneOffsetMinutes: z.number().int().optional(),
});

const availabilityQuerySchema = z.object({
  serviceTypeId: z.coerce.number().int().min(1),
  from: z.string().datetime(),
  to: z.string().datetime(),
});

export async function listServices(req: Request, res: Response) {
  const includeInactive =
    req.query.includeInactive === "true" &&
    ["coach", "admin", "superAdmin"].includes(req.user?.role ?? "");
  const items = await listServiceTypes({ includeInactive });
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
    fixedStartTime: input.fixedStartTime,
    attendeeVisibility: input.attendeeVisibility,
    defaultLocation: input.defaultLocation,
    defaultMeetingLink: input.defaultMeetingLink,
    programTier: input.programTier,
    createdBy: req.user!.id,
  });
  return res.status(201).json({ item });
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
  const items = await listAvailabilityBlocks(query.serviceTypeId, from, to);
  const bookings = await listBookingsForServiceInRange(query.serviceTypeId, from, to);
  return res.status(200).json({ items, bookings });
}

export async function createBookingForUser(req: Request, res: Response) {
  const input = bookingSchema.parse(req.body);
  const { guardian, athlete } = await getGuardianAndAthlete(req.user!.id);
  if (!guardian || !athlete) {
    return res.status(400).json({ error: "Onboarding incomplete" });
  }

  const booking = await createBooking({
    athleteId: athlete.id,
    guardianId: guardian.id,
    serviceTypeId: input.serviceTypeId,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    createdBy: req.user!.id,
    location: input.location,
    meetingLink: input.meetingLink,
    timezoneOffsetMinutes: input.timezoneOffsetMinutes,
  });

  return res.status(201).json({ booking });
}

export async function listBookings(req: Request, res: Response) {
  const { guardian } = await getGuardianAndAthlete(req.user!.id);
  if (!guardian) {
    return res.status(200).json({ items: [] });
  }
  const items = await listBookingsForUser(guardian.id);
  return res.status(200).json({ items });
}
