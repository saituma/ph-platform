import { and, eq, gte, lte, inArray } from "drizzle-orm";
import { db } from "../../db";
import { availabilityBlockTable, bookingTable } from "../../db/schema";
import {
  startOfUtcDay,
  endOfUtcDay,
  buildGeneratedOccurrencesInRange,
  ServiceTypeRecord,
  ProgramTier,
} from "./slot.service";
import { listServiceTypes } from "./management.service";

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
      occurrenceKey: bookingTable.occurrenceKey,
      slotKey: bookingTable.slotKey,
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

export async function listGeneratedAvailability(input: {
  from: Date;
  to: Date;
  viewerProgramTier?: ProgramTier | null;
  serviceTypeId?: number;
  athlete?: { currentProgramTier?: string | null; athleteType?: string | null; teamId?: number | null } | null;
}) {
  const services = await listServiceTypes({
    includeInactive: false,
    viewerProgramTier: input.viewerProgramTier,
    athlete: input.athlete,
  });
  const filteredServices = input.serviceTypeId
    ? services.filter((service: ServiceTypeRecord) => service.id === input.serviceTypeId)
    : services;
  return buildGeneratedOccurrencesInRange(filteredServices, input.from, input.to);
}

export async function resolveGeneratedWindow(input: {
  serviceType: ServiceTypeRecord;
  occurrenceKey?: string | null;
  slotKey?: string | null;
}) {
  const requestedKey = input.slotKey ?? input.occurrenceKey;
  if (!requestedKey) return null;
  const requestedDate = new Date(requestedKey);
  if (Number.isNaN(requestedDate.getTime())) return null;
  const items = await listGeneratedAvailability({
    from: startOfUtcDay(requestedDate),
    to: endOfUtcDay(requestedDate),
    serviceTypeId: input.serviceType.id,
  });
  const occurrence = items.find((item) => item.occurrenceKey === input.occurrenceKey);
  if (!occurrence) return null;
  if (input.slotKey) {
    const slot = occurrence.slots.find((item) => item.slotKey === input.slotKey);
    if (!slot) return null;
    return {
      startsAt: new Date(slot.startsAt),
      endsAt: new Date(slot.endsAt),
      capacity: slot.capacity,
      occurrenceKey: occurrence.occurrenceKey,
      slotKey: slot.slotKey,
    };
  }
  return {
    startsAt: new Date(occurrence.startsAt),
    endsAt: new Date(occurrence.endsAt),
    capacity: occurrence.capacity,
    occurrenceKey: occurrence.occurrenceKey,
    slotKey: null,
  };
}

export async function countActiveBookingsForService(serviceTypeId: number) {
  const rows = await db
    .select({ id: bookingTable.id })
    .from(bookingTable)
    .where(and(eq(bookingTable.serviceTypeId, serviceTypeId), inArray(bookingTable.status, ["pending", "confirmed"])));
  return rows.length;
}

export async function countActiveBookingsForOccurrence(
  serviceTypeId: number,
  occurrenceKey: string,
  slotKey?: string | null,
) {
  const baseFilters = [
    eq(bookingTable.serviceTypeId, serviceTypeId),
    eq(bookingTable.occurrenceKey, occurrenceKey),
    inArray(bookingTable.status, ["pending", "confirmed"] as const),
  ];
  const rows = await db
    .select({ id: bookingTable.id })
    .from(bookingTable)
    .where(and(...baseFilters, ...(slotKey ? [eq(bookingTable.slotKey, slotKey)] : [])));
  return rows.length;
}
