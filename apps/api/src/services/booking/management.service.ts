import { and, count, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  bookingTable,
  serviceTypeTable,
} from "../../db/schema";
import {
  ProgramTier,
  ServiceTypeKind,
  ServiceTypeRecord,
  WeeklyEntry,
  SlotDefinition,
  serviceAllowsTier,
  normalizeEligiblePlans,
} from "./slot.service";
import {
  resolveGeneratedWindow,
  countActiveBookingsForOccurrence,
  countActiveBookingsForService,
} from "./availability.service";
import { notifyBookingRequested } from "./notification.service";

let cachedSupportsServiceEligiblePlans: boolean | null = null;

function errorMentionsMissingColumn(error: unknown, columnName: string) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return message.toLowerCase().includes(`column`) && message.includes(columnName);
}

export async function listServiceTypes(options?: { includeInactive?: boolean; viewerProgramTier?: ProgramTier | null }) {
  const shouldTryEligiblePlans = cachedSupportsServiceEligiblePlans !== false;

  const selectAll = async () =>
    options?.includeInactive
      ? db.select().from(serviceTypeTable)
      : db.select().from(serviceTypeTable).where(eq(serviceTypeTable.isActive, true));

  const selectWithoutEligiblePlans = async () => {
    const rows = options?.includeInactive
      ? await db
          .select({
            id: serviceTypeTable.id,
            name: serviceTypeTable.name,
            type: serviceTypeTable.type,
            durationMinutes: serviceTypeTable.durationMinutes,
            capacity: serviceTypeTable.capacity,
            fixedStartTime: serviceTypeTable.fixedStartTime,
            attendeeVisibility: serviceTypeTable.attendeeVisibility,
            defaultLocation: serviceTypeTable.defaultLocation,
            defaultMeetingLink: serviceTypeTable.defaultMeetingLink,
            programTier: serviceTypeTable.programTier,
            schedulePattern: serviceTypeTable.schedulePattern,
            recurrenceEndMode: serviceTypeTable.recurrenceEndMode,
            recurrenceCount: serviceTypeTable.recurrenceCount,
            weeklyEntries: serviceTypeTable.weeklyEntries,
            oneTimeDate: serviceTypeTable.oneTimeDate,
            oneTimeTime: serviceTypeTable.oneTimeTime,
            slotMode: serviceTypeTable.slotMode,
            slotIntervalMinutes: serviceTypeTable.slotIntervalMinutes,
            slotDefinitions: serviceTypeTable.slotDefinitions,
            isActive: serviceTypeTable.isActive,
            createdBy: serviceTypeTable.createdBy,
            createdAt: serviceTypeTable.createdAt,
            updatedAt: serviceTypeTable.updatedAt,
          })
          .from(serviceTypeTable)
      : await db
          .select({
            id: serviceTypeTable.id,
            name: serviceTypeTable.name,
            type: serviceTypeTable.type,
            durationMinutes: serviceTypeTable.durationMinutes,
            capacity: serviceTypeTable.capacity,
            fixedStartTime: serviceTypeTable.fixedStartTime,
            attendeeVisibility: serviceTypeTable.attendeeVisibility,
            defaultLocation: serviceTypeTable.defaultLocation,
            defaultMeetingLink: serviceTypeTable.defaultMeetingLink,
            programTier: serviceTypeTable.programTier,
            schedulePattern: serviceTypeTable.schedulePattern,
            recurrenceEndMode: serviceTypeTable.recurrenceEndMode,
            recurrenceCount: serviceTypeTable.recurrenceCount,
            weeklyEntries: serviceTypeTable.weeklyEntries,
            oneTimeDate: serviceTypeTable.oneTimeDate,
            oneTimeTime: serviceTypeTable.oneTimeTime,
            slotMode: serviceTypeTable.slotMode,
            slotIntervalMinutes: serviceTypeTable.slotIntervalMinutes,
            slotDefinitions: serviceTypeTable.slotDefinitions,
            isActive: serviceTypeTable.isActive,
            createdBy: serviceTypeTable.createdBy,
            createdAt: serviceTypeTable.createdAt,
            updatedAt: serviceTypeTable.updatedAt,
          })
          .from(serviceTypeTable)
          .where(eq(serviceTypeTable.isActive, true));

    return rows.map((row) => ({ ...row, eligiblePlans: null })) as ServiceTypeRecord[];
  };

  let rows: ServiceTypeRecord[];
  try {
    rows = shouldTryEligiblePlans
      ? ((await selectAll()) as ServiceTypeRecord[])
      : await selectWithoutEligiblePlans();
    if (shouldTryEligiblePlans) cachedSupportsServiceEligiblePlans = true;
  } catch (error) {
    if (shouldTryEligiblePlans && errorMentionsMissingColumn(error, "eligiblePlans")) {
      cachedSupportsServiceEligiblePlans = false;
      rows = await selectWithoutEligiblePlans();
    } else {
      throw error;
    }
  }

  if (options?.includeInactive) return rows;
  return rows.filter((service) => serviceAllowsTier(service, options?.viewerProgramTier));
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
  const programTier = input.programTier ?? null;

  const eligiblePlans = input.eligiblePlans?.length ? input.eligiblePlans : programTier ? [programTier] : [];

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
  const programTier = input.programTier ?? existing[0].programTier ?? null;
  const eligiblePlans = input.eligiblePlans ??
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

  const [deleted] = await db.delete(serviceTypeTable).where(eq(serviceTypeTable.id, id)).returning();
  if (!deleted) {
    throw new Error("Service type not found");
  }
  return deleted;
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

  if (!input.bypassAvailability && (occurrenceKey || slotKey)) {
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

  if (!input.bypassAvailability && startsAt.getTime() < Date.now()) {
    throw new Error("Service type not available");
  }

  if (!input.bypassAvailability) {
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

  if (result[0]) {
    await notifyBookingRequested({
      bookingId: result[0].id,
      serviceName: serviceType[0].name,
      startsAt,
      guardianId: input.guardianId,
      athleteId: input.athleteId,
      location: input.location ?? serviceType[0].defaultLocation,
      meetingLink: input.meetingLink ?? serviceType[0].defaultMeetingLink,
    });
  }

  return result[0];
}

export async function listBookingsForUser(guardianId: number) {
  return db.select().from(bookingTable).where(eq(bookingTable.guardianId, guardianId));
}
