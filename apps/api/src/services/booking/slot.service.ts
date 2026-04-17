import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "../../db";
import {
  availabilityBlockTable,
  bookingTable,
  serviceTypeTable,
} from "../../db/schema";

export type ProgramTier = "PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro";
export type ServiceTypeKind = "one_to_one" | "semi_private" | "in_person";
export type WeeklyEntry = { weekday: number; time: string };
export type SlotDefinition = { time: string; capacity?: number | null };
export type ServiceTypeRecord = typeof serviceTypeTable.$inferSelect;

export function normalizeEligiblePlans(service: Pick<ServiceTypeRecord, "eligiblePlans" | "programTier" | "type">): ProgramTier[] {
  if (Array.isArray(service.eligiblePlans)) {
    return service.eligiblePlans.filter((value): value is ProgramTier =>
      value === "PHP" || value === "PHP_Premium" || value === "PHP_Premium_Plus" || value === "PHP_Pro",
    );
  }
  if (service.programTier) return [service.programTier as ProgramTier];
  return [];
}

export function normalizeEligibleTargets(service: Pick<ServiceTypeRecord, "eligibleTargets">): string[] {
  if (Array.isArray(service.eligibleTargets)) {
    return service.eligibleTargets.map(String);
  }
  return [];
}

export function normalizeWeeklyEntries(service: Pick<ServiceTypeRecord, "weeklyEntries" | "fixedStartTime">): WeeklyEntry[] {
  if (Array.isArray(service.weeklyEntries)) {
    return (service.weeklyEntries as any[])
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

export function normalizeSlotDefinitions(service: Pick<ServiceTypeRecord, "slotDefinitions">): SlotDefinition[] {
  if (!Array.isArray(service.slotDefinitions)) return [];
  const normalized: SlotDefinition[] = [];
  for (const definition of service.slotDefinitions as any[]) {
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

export function normalizeTimeValue(value: string) {
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value;
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  return value;
}

export function toUtcDate(dateValue: string, timeValue: string) {
  return new Date(`${dateValue}T${normalizeTimeValue(timeValue)}.000Z`);
}

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function startOfUtcDay(date: Date) {
  return new Date(`${toDateKey(date)}T00:00:00.000Z`);
}

export function endOfUtcDay(date: Date) {
  return new Date(`${toDateKey(date)}T23:59:59.999Z`);
}

export function serviceAllowsTier(service: Pick<ServiceTypeRecord, "eligiblePlans" | "programTier" | "type">, viewerProgramTier?: ProgramTier | null) {
  const eligiblePlans = normalizeEligiblePlans(service);
  if (!eligiblePlans.length) return true;
  if (!viewerProgramTier) return false;
  return eligiblePlans.includes(viewerProgramTier);
}

export function serviceAllowsAthlete(
  service: Pick<ServiceTypeRecord, "eligiblePlans" | "programTier" | "eligibleTargets" | "type">, 
  athlete: { currentProgramTier?: string | null; athleteType?: string | null; teamId?: number | null } | null
) {
  // Check tier
  if (!serviceAllowsTier(service, athlete?.currentProgramTier as ProgramTier)) {
    return false;
  }

  // Check targets
  const eligibleTargets = normalizeEligibleTargets(service);
  if (!eligibleTargets.length || eligibleTargets.includes("all")) {
    return true;
  }

  if (!athlete) return false;

  if (athlete.athleteType && eligibleTargets.includes(athlete.athleteType)) {
    return true;
  }

  if (athlete.teamId && eligibleTargets.includes(`team:${athlete.teamId}`)) {
    return true;
  }

  return false;
}

export type GeneratedSlot = {
  slotKey: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  remainingCapacity: number | null;
};

export type GeneratedOccurrence = {
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

export function buildExactSlots(
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
      const capacity = definition.capacity ?? service.capacity ?? null;
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
    const capacity = service.capacity ?? null;
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
  const capacity = service.capacity ?? null;
  return [
    {
      slotKey: fallbackSlotKey,
      startsAt: start.toISOString(),
      endsAt: occurrenceEnd.toISOString(),
      capacity,
      remainingCapacity:
        capacity == null ? null : Math.max(0, capacity - used),
    },
  ];
}

export function buildConfiguredOccurrences(
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

export async function listLegacyOccurrences(
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

export async function loadBookingHoldMaps(serviceIds: number[], from: Date, to: Date) {
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
