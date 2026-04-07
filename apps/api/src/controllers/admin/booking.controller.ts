import type { Request, Response } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  listBookingsAdmin,
  getBookingByIdAdmin,
  updateBookingStatusAdmin,
  listAvailabilityAdmin,
} from "../../services/admin/booking.service";
import { createBooking } from "../../services/booking.service";
import { getGuardianAndAthlete } from "../../services/user.service";
import { db } from "../../db";
import { serviceTypeTable } from "../../db/schema";

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
  status: z.enum(["pending", "confirmed", "declined", "cancelled"]).optional(),
});

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
    bypassAvailability: true,
  });

  if (input.status && input.status !== "pending") {
    const updated = await updateBookingStatusAdmin({ bookingId: booking.id, status: input.status });
    return res.status(201).json({ booking: updated ?? booking });
  }

  return res.status(201).json({ booking });
}

export async function updateBookingStatus(req: Request, res: Response) {
  const bookingId = z.coerce.number().int().min(1).parse(req.params.bookingId);
  const body = z
    .object({
      status: z.enum(["pending", "confirmed", "declined", "cancelled"]),
    })
    .parse(req.body);
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
