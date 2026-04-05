import { and, count, eq, gte, inArray, lte } from "drizzle-orm";

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

type ProgramTier = "PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro";
type ServiceTypeKind =
  | "call"
  | "group_call"
  | "individual_call"
  | "lift_lab_1on1"
  | "role_model"
  | "one_on_one";
type WeeklyEntry = { weekday: number; time: string };
type SlotDefinition = { time: string; capacity?: number | null };
type ServiceTypeRecord = typeof serviceTypeTable.$inferSelect;

function normalizeEligiblePlans(service: Pick<ServiceTypeRecord, "eligiblePlans" | "programTier" | "type">): ProgramTier[] {
  if (Array.isArray(service.eligiblePlans)) {
    return service.eligiblePlans.filter((value): value is ProgramTier =>
      value === "PHP" || value === "PHP_Premium" || value === "PHP_Premium_Plus" || value === "PHP_Pro",
    );
  }
  if (service.type === "role_model") return ["PHP_Premium"];
  if (service.programTier) return [service.programTier];
  return [];
}

function normalizeWeeklyEntries(service: Pick<ServiceTypeRecord, "weeklyEntries" | "fixedStartTime">): WeeklyEntry[] {
  if (Array.isArray(service.weeklyEntries)) {
    return service.weeklyEntries
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const weekday = Number((entry as { weekday?: unknown }).weekday);
        const time = String((entry as { time?: unknown }).time ?? "");
        if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !time) return null;
        return { weekday, time };
      })
      .filter((entry): entry is WeeklyEntry => Boolean(entry));
  }
  if (service.fixedStartTime) {
    return [
      { weekday: 1, time: service.fixedStartTime },
      { weekday: 2, time: service.fixedStartTime },
      { weekday: 3, time: service.fixedStartTime },
      { weekday: 4, time: service.fixedStartTime },
      { weekday: 5, time: service.fixedStartTime },
    ];
  }
  return [];
}

function normalizeSlotDefinitions(service: Pick<ServiceTypeRecord, "slotDefinitions">): SlotDefinition[] {
  if (!Array.isArray(service.slotDefinitions)) return [];
  const normalized: SlotDefinition[] = [];
  for (const definition of service.slotDefinitions) {
    if (!definition || typeof definition !== "object") continue;
    const time = String((definition as { time?: unknown }).time ?? "");
    const rawCapacity = (definition as { capacity?: unknown }).capacity;
    const capacity =
      rawCapacity == null || rawCapacity === "" || Number.isNaN(Number(rawCapacity)) ? null : Number(rawCapacity);
    if (!time) continue;
    normalized.push({ time, capacity });
  }
  return normalized;
}

function normalizeTimeValue(value: string) {
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value;
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  return value;
}

function toUtcDate(dateValue: string, timeValue: string) {
  return new Date(`${dateValue}T${normalizeTimeValue(timeValue)}.000Z`);
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date) {
  return new Date(`${toDateKey(date)}T00:00:00.000Z`);
}

function endOfUtcDay(date: Date) {
  return new Date(`${toDateKey(date)}T23:59:59.999Z`);
}

function serviceAllowsTier(service: Pick<ServiceTypeRecord, "eligiblePlans" | "programTier" | "type">, viewerProgramTier?: ProgramTier | null) {
  const eligiblePlans = normalizeEligiblePlans(service);
  if (!eligiblePlans.length) return true;
  if (!viewerProgramTier) return false;
  return eligiblePlans.includes(viewerProgramTier);
}

type GeneratedSlot = {
  slotKey: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  remainingCapacity: number | null;
};

type GeneratedOccurrence = {
  serviceTypeId: number;
  serviceName: string;
  type: ServiceTypeKind;
  dateKey: string;
  occurrenceKey: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  remainingCapacity: number | null;
  slotMode: string;
  location: string | null;
  meetingLink: string | null;
  eligiblePlans: ProgramTier[];
  slots: GeneratedSlot[];
};

function buildExactSlots(
  service: ServiceTypeRecord,
  start: Date,
  occurrenceCounts: Map<string, number>,
  slotCounts: Map<string, number>,
): GeneratedSlot[] {
  const slotMode = service.slotMode ?? "shared_capacity";
  if (!["exact_sub_slots", "both"].includes(slotMode)) return [];
  const slotDefinitions = normalizeSlotDefinitions(service);
  const slots: GeneratedSlot[] = [];

  if (slotDefinitions.length) {
    for (const definition of slotDefinitions) {
      const slotStart = toUtcDate(toDateKey(start), definition.time);
      const slotEnd = new Date(slotStart.getTime() + Math.max(1, service.durationMinutes) * 60 * 1000);
      const slotKey = slotStart.toISOString();
      const capacity = definition.capacity ?? service.capacity ?? 1;
      const used = slotCounts.get(slotKey) ?? 0;
      slots.push({
        slotKey,
        startsAt: slotStart.toISOString(),
        endsAt: slotEnd.toISOString(),
        capacity,
        remainingCapacity: capacity == null ? null : Math.max(0, capacity - used),
      });
    }
    return slots;
  }

  const intervalMinutes = service.slotIntervalMinutes ?? service.durationMinutes;
  const durationMs = Math.max(1, service.durationMinutes) * 60 * 1000;
  const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
  const occurrenceEnd = new Date(start.getTime() + durationMs);

  for (
    let cursor = new Date(start.getTime());
    cursor.getTime() < occurrenceEnd.getTime();
    cursor = new Date(cursor.getTime() + intervalMs)
  ) {
    const slotEnd = new Date(cursor.getTime() + durationMs);
    if (slotEnd.getTime() > occurrenceEnd.getTime()) break;
    const slotKey = cursor.toISOString();
    const capacity = service.capacity ?? 1;
    const used = slotCounts.get(slotKey) ?? 0;
    slots.push({
      slotKey,
      startsAt: cursor.toISOString(),
      endsAt: slotEnd.toISOString(),
      capacity,
      remainingCapacity: capacity == null ? null : Math.max(0, capacity - used),
    });
  }

  if (slots.length) return slots;

  const fallbackSlotKey = start.toISOString();
  const used = occurrenceCounts.get(fallbackSlotKey) ?? 0;
  return [
    {
      slotKey: fallbackSlotKey,
      startsAt: start.toISOString(),
      endsAt: occurrenceEnd.toISOString(),
      capacity: service.capacity ?? 1,
      remainingCapacity:
        service.capacity == null ? null : Math.max(0, (service.capacity ?? 1) - used),
    },
  ];
}

function buildConfiguredOccurrences(
  service: ServiceTypeRecord,
  from: Date,
  to: Date,
  occurrenceCounts: Map<string, number>,
  slotCounts: Map<string, number>,
): GeneratedOccurrence[] {
  const eligiblePlans = normalizeEligiblePlans(service);
  const slotMode = service.slotMode ?? "shared_capacity";
  const items: GeneratedOccurrence[] = [];
  const durationMs = Math.max(1, service.durationMinutes) * 60 * 1000;
  const schedulePattern = service.schedulePattern ?? (service.fixedStartTime ? "weekly_recurring" : "one_time");

  const pushOccurrence = (start: Date) => {
    const end = new Date(start.getTime() + durationMs);
    if (start.getTime() < from.getTime() || start.getTime() > to.getTime()) return;
    const occurrenceKey = start.toISOString();
    const capacity = service.capacity ?? null;
    const used = occurrenceCounts.get(occurrenceKey) ?? 0;
    items.push({
      serviceTypeId: service.id,
      serviceName: service.name,
      type: service.type as ServiceTypeKind,
      dateKey: toDateKey(start),
      occurrenceKey,
      startsAt: occurrenceKey,
      endsAt: end.toISOString(),
      capacity,
      remainingCapacity: capacity == null ? null : Math.max(0, capacity - used),
      slotMode,
      location: service.defaultLocation ?? null,
      meetingLink: service.defaultMeetingLink ?? null,
      eligiblePlans,
      slots: buildExactSlots(service, start, occurrenceCounts, slotCounts),
    });
  };

  if (schedulePattern === "one_time" && service.oneTimeDate && service.oneTimeTime) {
    pushOccurrence(toUtcDate(service.oneTimeDate, service.oneTimeTime));
    return items;
  }

  const weeklyEntries = normalizeWeeklyEntries(service);
  if (!weeklyEntries.length) return items;

  const createdDay = startOfUtcDay(service.createdAt ?? new Date());
  let endBoundary = to;
  if (service.recurrenceEndMode === "weeks" && service.recurrenceCount) {
    endBoundary = new Date(createdDay.getTime() + service.recurrenceCount * 7 * 24 * 60 * 60 * 1000 - 1);
  } else if (service.recurrenceEndMode === "months" && service.recurrenceCount) {
    const monthBoundary = new Date(createdDay.getTime());
    monthBoundary.setUTCMonth(monthBoundary.getUTCMonth() + service.recurrenceCount);
    endBoundary = new Date(monthBoundary.getTime() - 1);
  }
  if (endBoundary.getTime() > to.getTime()) {
    endBoundary = to;
  }

  for (
    let cursor = startOfUtcDay(from.getTime() > createdDay.getTime() ? from : createdDay);
    cursor.getTime() <= endBoundary.getTime();
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const jsWeekday = cursor.getUTCDay();
    const normalizedWeekday = jsWeekday === 0 ? 7 : jsWeekday;
    for (const entry of weeklyEntries) {
      if (entry.weekday !== normalizedWeekday) continue;
      pushOccurrence(toUtcDate(toDateKey(cursor), entry.time));
    }
  }

  return items;
}

async function listLegacyOccurrences(
  services: ServiceTypeRecord[],
  from: Date,
  to: Date,
  occurrenceCounts: Map<string, number>,
): Promise<GeneratedOccurrence[]> {
  const serviceIds = services.map((service) => service.id);
  if (!serviceIds.length) return [];
  const blocks = await db
    .select()
    .from(availabilityBlockTable)
    .where(
      and(
        inArray(availabilityBlockTable.serviceTypeId, serviceIds),
        lte(availabilityBlockTable.startsAt, to),
        gte(availabilityBlockTable.endsAt, from),
      ),
    );

  const items: GeneratedOccurrence[] = [];
  for (const block of blocks) {
    const service = services.find((candidate) => candidate.id === block.serviceTypeId);
    if (!service) continue;
    const startsAt = new Date(block.startsAt);
    const occurrenceKey = startsAt.toISOString();
    const capacity = service.capacity ?? null;
    const used = occurrenceCounts.get(occurrenceKey) ?? 0;
    items.push({
      serviceTypeId: service.id,
      serviceName: service.name,
      type: service.type as ServiceTypeKind,
      dateKey: toDateKey(startsAt),
      occurrenceKey,
      startsAt: occurrenceKey,
      endsAt: new Date(block.endsAt).toISOString(),
      capacity,
      remainingCapacity: capacity == null ? null : Math.max(0, capacity - used),
      slotMode: service.slotMode ?? "shared_capacity",
      location: service.defaultLocation ?? null,
      meetingLink: service.defaultMeetingLink ?? null,
      eligiblePlans: normalizeEligiblePlans(service),
      slots: [],
    });
  }
  return items;
}

async function loadBookingHoldMaps(serviceIds: number[], from: Date, to: Date) {
  if (!serviceIds.length) {
    return { occurrenceCounts: new Map<string, number>(), slotCounts: new Map<string, number>() };
  }
  const rows = await db
    .select({
      serviceTypeId: bookingTable.serviceTypeId,
      occurrenceKey: bookingTable.occurrenceKey,
      slotKey: bookingTable.slotKey,
      startsAt: bookingTable.startsAt,
    })
    .from(bookingTable)
    .where(
      and(
        inArray(bookingTable.serviceTypeId, serviceIds),
        gte(bookingTable.startsAt, from),
        lte(bookingTable.startsAt, to),
        inArray(bookingTable.status, ["pending", "confirmed"]),
      ),
    );

  const occurrenceCounts = new Map<string, number>();
  const slotCounts = new Map<string, number>();
  for (const row of rows) {
    const occurrenceKey = row.occurrenceKey ?? row.startsAt.toISOString();
    occurrenceCounts.set(occurrenceKey, (occurrenceCounts.get(occurrenceKey) ?? 0) + 1);
    if (row.slotKey) {
      slotCounts.set(row.slotKey, (slotCounts.get(row.slotKey) ?? 0) + 1);
    }
  }
  return { occurrenceCounts, slotCounts };
}

function uniqByOccurrence(items: GeneratedOccurrence[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.serviceTypeId}:${item.occurrenceKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function listServiceTypes(options?: { includeInactive?: boolean; viewerProgramTier?: ProgramTier | null }) {
  const rows = options?.includeInactive
    ? await db.select().from(serviceTypeTable)
    : await db.select().from(serviceTypeTable).where(eq(serviceTypeTable.isActive, true));

  if (options?.includeInactive) return rows;
  return rows.filter((service) => serviceAllowsTier(service, options?.viewerProgramTier));
}

export async function getServiceTypeById(id: number) {
  const rows = await db.select().from(serviceTypeTable).where(eq(serviceTypeTable.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listGeneratedAvailability(input: {
  from: Date;
  to: Date;
  viewerProgramTier?: ProgramTier | null;
  serviceTypeId?: number;
}) {
  const services = await listServiceTypes({ includeInactive: false, viewerProgramTier: input.viewerProgramTier });
  const filteredServices = input.serviceTypeId
    ? services.filter((service) => service.id === input.serviceTypeId)
    : services;
  const { occurrenceCounts, slotCounts } = await loadBookingHoldMaps(
    filteredServices.map((service) => service.id),
    input.from,
    input.to,
  );

  const configured = filteredServices.flatMap((service) =>
    buildConfiguredOccurrences(service, input.from, input.to, occurrenceCounts, slotCounts),
  );

  const configuredKeys = new Set(configured.map((item) => `${item.serviceTypeId}:${item.occurrenceKey}`));
  const legacyCandidates = filteredServices.filter((service) => {
    const hasConfig =
      Boolean(service.oneTimeDate && service.oneTimeTime) || normalizeWeeklyEntries(service).length > 0;
    return !hasConfig;
  });
  const legacy = await listLegacyOccurrences(legacyCandidates, input.from, input.to, occurrenceCounts);
  const combined = uniqByOccurrence([
    ...configured,
    ...legacy.filter((item) => !configuredKeys.has(`${item.serviceTypeId}:${item.occurrenceKey}`)),
  ]);

  return combined.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export async function createServiceType(input: {
  name: string;
  type: ServiceTypeKind;
  durationMinutes: number;
  capacity?: number | null;
  attendeeVisibility?: boolean | null;
  defaultLocation?: string | null;
  defaultMeetingLink?: string | null;
  programTier?: ProgramTier | null;
  eligiblePlans?: ProgramTier[] | null;
  schedulePattern?: string | null;
  recurrenceEndMode?: string | null;
  recurrenceCount?: number | null;
  weeklyEntries?: WeeklyEntry[] | null;
  oneTimeDate?: string | null;
  oneTimeTime?: string | null;
  slotMode?: string | null;
  slotIntervalMinutes?: number | null;
  slotDefinitions?: SlotDefinition[] | null;
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

  const eligiblePlans =
    input.type === "role_model"
      ? ["PHP_Premium"]
      : (input.eligiblePlans?.length ? input.eligiblePlans : programTier ? [programTier] : []);

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
      eligiblePlans,
      schedulePattern: input.schedulePattern ?? "one_time",
      recurrenceEndMode: input.recurrenceEndMode ?? null,
      recurrenceCount: input.recurrenceCount ?? null,
      weeklyEntries: input.weeklyEntries ?? [],
      oneTimeDate: input.oneTimeDate ?? null,
      oneTimeTime: input.oneTimeTime ?? null,
      slotMode: input.slotMode ?? "shared_capacity",
      slotIntervalMinutes: input.slotIntervalMinutes ?? null,
      slotDefinitions: input.slotDefinitions ?? [],
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
    programTier?: ProgramTier | null;
    eligiblePlans?: ProgramTier[] | null;
    schedulePattern?: string | null;
    recurrenceEndMode?: string | null;
    recurrenceCount?: number | null;
    weeklyEntries?: WeeklyEntry[] | null;
    oneTimeDate?: string | null;
    oneTimeTime?: string | null;
    slotMode?: string | null;
    slotIntervalMinutes?: number | null;
    slotDefinitions?: SlotDefinition[] | null;
    isActive?: boolean | null;
  },
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
  const eligiblePlans =
    nextType === "role_model"
      ? ["PHP_Premium"]
      : input.eligiblePlans ??
        normalizeEligiblePlans({
          eligiblePlans: existing[0].eligiblePlans,
          programTier: programTier ?? existing[0].programTier ?? null,
          type: nextType,
        });

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
      eligiblePlans,
      schedulePattern: input.schedulePattern ?? existing[0].schedulePattern ?? "one_time",
      recurrenceEndMode: input.recurrenceEndMode ?? existing[0].recurrenceEndMode ?? null,
      recurrenceCount: input.recurrenceCount ?? existing[0].recurrenceCount ?? null,
      weeklyEntries: input.weeklyEntries ?? existing[0].weeklyEntries ?? [],
      oneTimeDate: input.oneTimeDate ?? existing[0].oneTimeDate ?? null,
      oneTimeTime: input.oneTimeTime ?? existing[0].oneTimeTime ?? null,
      slotMode: input.slotMode ?? existing[0].slotMode ?? "shared_capacity",
      slotIntervalMinutes: input.slotIntervalMinutes ?? existing[0].slotIntervalMinutes ?? null,
      slotDefinitions: input.slotDefinitions ?? existing[0].slotDefinitions ?? [],
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

export async function countActiveBookingsForService(serviceTypeId: number) {
  const rows = await db
    .select({ id: bookingTable.id })
    .from(bookingTable)
    .where(
      and(
        eq(bookingTable.serviceTypeId, serviceTypeId),
        inArray(bookingTable.status, ["pending", "confirmed"]),
      ),
    );
  return rows.length;
}

export async function countActiveBookingsForOccurrence(serviceTypeId: number, occurrenceKey: string, slotKey?: string | null) {
  const baseFilters = [
    eq(bookingTable.serviceTypeId, serviceTypeId),
    eq(bookingTable.occurrenceKey, occurrenceKey),
    inArray(bookingTable.status, ["pending", "confirmed"] as const),
  ];
  const rows = await db
    .select({ id: bookingTable.id })
    .from(bookingTable)
    .where(
      and(
        ...baseFilters,
        ...(slotKey ? [eq(bookingTable.slotKey, slotKey)] : []),
      ),
    );
  return rows.length;
}

async function resolveGeneratedWindow(input: {
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

export async function createBooking(input: {
  athleteId: number;
  guardianId: number;
  serviceTypeId: number;
  startsAt?: Date;
  endsAt?: Date;
  occurrenceKey?: string | null;
  slotKey?: string | null;
  createdBy: number;
  viewerProgramTier?: ProgramTier | null;
  location?: string | null;
  meetingLink?: string | null;
  timezoneOffsetMinutes?: number;
  bypassAvailability?: boolean;
}) {
  const serviceType = await db.select().from(serviceTypeTable).where(eq(serviceTypeTable.id, input.serviceTypeId)).limit(1);
  if (!serviceType[0]) {
    throw new Error("Service type not found");
  }

  if (serviceType[0].isActive === false) {
    throw new Error("Service type not available");
  }

  if (!serviceAllowsTier(serviceType[0], input.viewerProgramTier)) {
    throw new Error("Service type not available");
  }

  let startsAt = input.startsAt ?? null;
  let endsAt = input.endsAt ?? null;
  let occurrenceKey = input.occurrenceKey ?? null;
  let slotKey = input.slotKey ?? null;
  let scopedCapacity = serviceType[0].capacity ?? null;

  if (occurrenceKey || slotKey) {
    const resolved = await resolveGeneratedWindow({
      serviceType: serviceType[0],
      occurrenceKey,
      slotKey,
    });
    if (!resolved) {
      throw new Error("Service type not available");
    }
    startsAt = resolved.startsAt;
    endsAt = resolved.endsAt;
    occurrenceKey = resolved.occurrenceKey;
    slotKey = resolved.slotKey;
    scopedCapacity = resolved.capacity;
  }

  if (!startsAt || !endsAt) {
    throw new Error("Service type not available");
  }

  if (startsAt.getTime() < Date.now()) {
    throw new Error("Service type not available");
  }

  if (occurrenceKey) {
    const existingCount = await countActiveBookingsForOccurrence(input.serviceTypeId, occurrenceKey, slotKey);
    if (scopedCapacity != null && existingCount >= scopedCapacity) {
      throw new Error("Capacity reached");
    }
  } else if (serviceType[0].capacity) {
    const existingCount = await countActiveBookingsForService(input.serviceTypeId);
    if (existingCount >= serviceType[0].capacity) {
      throw new Error("Capacity reached");
    }
  }

  const result = await db
    .insert(bookingTable)
    .values({
      athleteId: input.athleteId,
      guardianId: input.guardianId,
      type: serviceType[0].type,
      status: "pending",
      startsAt,
      endTime: endsAt,
      location: input.location ?? serviceType[0].defaultLocation ?? null,
      meetingLink: input.meetingLink ?? serviceType[0].defaultMeetingLink ?? null,
      serviceTypeId: input.serviceTypeId,
      occurrenceKey,
      slotKey,
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
          startsAt,
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
      content: `Booking requested for ${serviceType[0].name} at ${startsAt.toISOString()}`,
      link: "/schedule",
    });

    if (user[0]?.email) {
      try {
        await sendBookingConfirmationEmail({
          to: user[0].email,
          name: user[0].name ?? "there",
          serviceName: serviceType[0].name,
          startsAt,
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
