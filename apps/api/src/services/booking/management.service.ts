import { and, count, desc, eq, lt } from "drizzle-orm";
import { db } from "../../db";
import { bookingTable, serviceTypeTable } from "../../db/schema";
import {
  ProgramTier,
  ServiceTypeKind,
  ServiceTypeRecord,
  WeeklyEntry,
  SlotDefinition,
  serviceAllowsTier,
  serviceAllowsAthlete,
  normalizeEligiblePlans,
  buildGeneratedOccurrencesInRange,
  type GeneratedOccurrence,
} from "./slot.service";
import {
  resolveGeneratedWindow,
  countActiveBookingsForOccurrence,
  countActiveBookingsForService,
} from "./availability.service";
import { notifyBookingCancelled, notifyBookingRequested } from "./notification.service";

let cachedSupportsServiceEligiblePlans: boolean | null = null;

function errorMentionsMissingColumn(error: unknown, columnName: string) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return message.toLowerCase().includes(`column`) && message.includes(columnName);
}

function occurrenceHasOpenBookings(occ: GeneratedOccurrence): boolean {
  if (occ.slots?.length) {
    return occ.slots.some((s) => s.remainingCapacity == null || s.remainingCapacity > 0);
  }
  return occ.remainingCapacity == null || occ.remainingCapacity > 0;
}

function serviceHasBookableSlot(
  service: ServiceTypeRecord & {
    isLocked?: boolean;
    remainingCapacity?: number | null;
    remainingTotalSlots?: number | null;
  },
  allOccurrences: GeneratedOccurrence[],
): boolean {
  if (service.isLocked) return true;
  if (service.remainingTotalSlots != null) {
    return service.remainingTotalSlots > 0;
  }
  if (service.remainingCapacity != null && service.remainingCapacity > 0) return true;
  if (service.remainingCapacity != null && service.remainingCapacity <= 0) return false;
  const mine = allOccurrences.filter((o) => o.serviceTypeId === service.id);
  return mine.some(occurrenceHasOpenBookings);
}

export async function listServiceTypes(options?: {
  includeInactive?: boolean;
  includeLocked?: boolean;
  omitWithoutBookableSlots?: boolean;
  viewerProgramTier?: ProgramTier | null;
  athlete?: { currentProgramTier?: string | null; athleteType?: string | null; teamId?: number | null } | null;
}) {
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
            description: serviceTypeTable.description,
            type: serviceTypeTable.type,
            durationMinutes: serviceTypeTable.durationMinutes,
            capacity: serviceTypeTable.capacity,
            totalSlots: serviceTypeTable.totalSlots,
            fixedStartTime: serviceTypeTable.fixedStartTime,
            attendeeVisibility: serviceTypeTable.attendeeVisibility,
            defaultLocation: serviceTypeTable.defaultLocation,
            defaultMeetingLink: serviceTypeTable.defaultMeetingLink,
            programTier: serviceTypeTable.programTier,
            eligibleTargets: serviceTypeTable.eligibleTargets,
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
            description: serviceTypeTable.description,
            type: serviceTypeTable.type,
            durationMinutes: serviceTypeTable.durationMinutes,
            capacity: serviceTypeTable.capacity,
            totalSlots: serviceTypeTable.totalSlots,
            fixedStartTime: serviceTypeTable.fixedStartTime,
            attendeeVisibility: serviceTypeTable.attendeeVisibility,
            defaultLocation: serviceTypeTable.defaultLocation,
            defaultMeetingLink: serviceTypeTable.defaultMeetingLink,
            programTier: serviceTypeTable.programTier,
            eligibleTargets: serviceTypeTable.eligibleTargets,
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
    rows = shouldTryEligiblePlans ? ((await selectAll()) as ServiceTypeRecord[]) : await selectWithoutEligiblePlans();
    if (shouldTryEligiblePlans) cachedSupportsServiceEligiblePlans = true;
  } catch (error) {
    if (shouldTryEligiblePlans && errorMentionsMissingColumn(error, "eligiblePlans")) {
      cachedSupportsServiceEligiblePlans = false;
      rows = await selectWithoutEligiblePlans();
    } else {
      throw error;
    }
  }

  if (options?.includeInactive) {
    return Promise.all(
      rows.map(async (service) => {
        const activeCount = await countActiveBookingsForService(service.id);
        const remainingTotalSlots = service.totalSlots != null ? Math.max(0, service.totalSlots - activeCount) : null;
        return {
          ...service,
          remainingCapacity: null as number | null,
          remainingTotalSlots,
        };
      }),
    );
  }

  const rowsWithCapacity = await Promise.all(
    rows.map(async (service) => {
      const activeCount = await countActiveBookingsForService(service.id);
      // Match slot.service: null pattern + no fixed start → treat as one_time (legacy rows).
      const pattern = service.schedulePattern ?? (service.fixedStartTime ? "weekly_recurring" : "one_time");
      const isOneTime = pattern === "one_time";
      const remainingCapacity =
        isOneTime && service.capacity != null ? Math.max(0, service.capacity - activeCount) : null;
      const remainingTotalSlots = service.totalSlots != null ? Math.max(0, service.totalSlots - activeCount) : null;

      return {
        ...service,
        remainingCapacity,
        remainingTotalSlots,
      };
    }),
  );

  const omitEmpty = async (
    list: (ServiceTypeRecord & {
      isLocked?: boolean;
      lockReason?: string | null;
      remainingCapacity?: number | null;
      remainingTotalSlots?: number | null;
    })[],
  ) => {
    if (!options?.omitWithoutBookableSlots || !list.length) return list;
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 21);
    const occs = await buildGeneratedOccurrencesInRange(list as ServiceTypeRecord[], from, to);
    return list.filter((s) => serviceHasBookableSlot(s, occs));
  };

  if (options?.includeLocked) {
    const mapped = rowsWithCapacity.map((service) => {
      const eligiblePlans = normalizeEligiblePlans(service);
      const allowed = options?.athlete
        ? serviceAllowsAthlete(service, options.athlete)
        : serviceAllowsTier(service, options?.viewerProgramTier);
      const isLocked = eligiblePlans.length > 0 && !allowed;
      return {
        ...service,
        isLocked,
        lockReason: isLocked ? `Requires one of: ${eligiblePlans.join(", ")}` : null,
      };
    });
    return omitEmpty(mapped);
  }

  const tierFiltered = rowsWithCapacity.filter((service) =>
    options?.athlete
      ? serviceAllowsAthlete(service, options.athlete)
      : serviceAllowsTier(service, options?.viewerProgramTier),
  );
  return omitEmpty(tierFiltered);
}

export async function getServiceTypeById(id: number) {
  const rows = await db.select().from(serviceTypeTable).where(eq(serviceTypeTable.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createServiceType(input: {
  name: string;
  description?: string | null;
  type?: ServiceTypeKind | null;
  durationMinutes: number;
  capacity?: number | null;
  totalSlots?: number | null;
  attendeeVisibility?: boolean | null;
  defaultLocation?: string | null;
  defaultMeetingLink?: string | null;
  programTier?: ProgramTier | null;
  eligiblePlans?: ProgramTier[] | null;
  eligibleTargets?: string[] | null;
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
  isBookable?: boolean | null;
  createdBy: number;
}) {
  const programTier = input.programTier ?? null;

  const eligiblePlans = input.eligiblePlans?.length ? input.eligiblePlans : programTier ? [programTier] : [];

  const result = await db
    .insert(serviceTypeTable)
    .values({
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      durationMinutes: input.durationMinutes,
      capacity: input.capacity ?? null,
      totalSlots: input.totalSlots ?? null,
      fixedStartTime: null,
      attendeeVisibility: input.attendeeVisibility ?? true,
      defaultLocation: input.defaultLocation ?? null,
      defaultMeetingLink: input.defaultMeetingLink ?? null,
      programTier,
      eligiblePlans,
      eligibleTargets: input.eligibleTargets ?? [],
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
      isBookable: input.isBookable ?? true,
      createdBy: input.createdBy,
    })
    .returning();

  return result[0];
}

export async function updateServiceType(
  id: number,
  input: {
    name?: string | null;
    description?: string | null;
    type?: ServiceTypeKind | null;
    durationMinutes?: number | null;
    capacity?: number | null;
    totalSlots?: number | null;
    attendeeVisibility?: boolean | null;
    defaultLocation?: string | null;
    defaultMeetingLink?: string | null;
    programTier?: ProgramTier | null;
    eligiblePlans?: ProgramTier[] | null;
    eligibleTargets?: string[] | null;
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
    isBookable?: boolean | null;
  },
) {
  const existing = await db.select().from(serviceTypeTable).where(eq(serviceTypeTable.id, id)).limit(1);
  if (!existing[0]) {
    throw new Error("Service type not found");
  }

  const nextType = input.type ?? existing[0].type;
  const programTier = input.programTier ?? existing[0].programTier ?? null;
  const eligiblePlans =
    input.eligiblePlans ??
    normalizeEligiblePlans({
      eligiblePlans: existing[0].eligiblePlans,
      programTier: programTier ?? existing[0].programTier ?? null,
      type: nextType,
    });

  const [updated] = await db
    .update(serviceTypeTable)
    .set({
      name: input.name ?? existing[0].name,
      description: input.description !== undefined ? input.description : (existing[0].description ?? null),
      type: nextType,
      durationMinutes: input.durationMinutes ?? existing[0].durationMinutes,
      capacity: input.capacity !== undefined ? input.capacity : (existing[0].capacity ?? null),
      totalSlots: input.totalSlots !== undefined ? input.totalSlots : (existing[0].totalSlots ?? null),
      fixedStartTime: null,
      attendeeVisibility: input.attendeeVisibility ?? existing[0].attendeeVisibility ?? true,
      defaultLocation:
        input.defaultLocation !== undefined ? input.defaultLocation : (existing[0].defaultLocation ?? null),
      defaultMeetingLink:
        input.defaultMeetingLink !== undefined ? input.defaultMeetingLink : (existing[0].defaultMeetingLink ?? null),
      programTier,
      eligiblePlans,
      eligibleTargets: input.eligibleTargets ?? existing[0].eligibleTargets ?? [],
      schedulePattern: input.schedulePattern ?? existing[0].schedulePattern ?? "one_time",
      recurrenceEndMode: input.recurrenceEndMode ?? existing[0].recurrenceEndMode ?? null,
      recurrenceCount: input.recurrenceCount ?? existing[0].recurrenceCount ?? null,
      weeklyEntries: input.weeklyEntries ?? existing[0].weeklyEntries ?? [],
      oneTimeDate: input.oneTimeDate !== undefined ? input.oneTimeDate : (existing[0].oneTimeDate ?? null),
      oneTimeTime: input.oneTimeTime !== undefined ? input.oneTimeTime : (existing[0].oneTimeTime ?? null),
      slotMode: input.slotMode ?? existing[0].slotMode ?? "shared_capacity",
      slotIntervalMinutes:
        input.slotIntervalMinutes !== undefined ? input.slotIntervalMinutes : (existing[0].slotIntervalMinutes ?? null),
      slotDefinitions: input.slotDefinitions ?? existing[0].slotDefinitions ?? [],
      isActive: input.isActive ?? existing[0].isActive ?? true,
      isBookable:
        input.isBookable !== undefined ? (input.isBookable ?? true) : ((existing[0] as any).isBookable ?? true),
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

  const [bookingAgg] = await db.select({ n: count() }).from(bookingTable).where(eq(bookingTable.serviceTypeId, id));
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
  viewerAthlete?: { currentProgramTier?: string | null; athleteType?: string | null; teamId?: number | null } | null;
  location?: string | null;
  meetingLink?: string | null;
  notes?: string | null;
  timezoneOffsetMinutes?: number;
  bypassAvailability?: boolean;
}) {
  const serviceType = await db
    .select()
    .from(serviceTypeTable)
    .where(eq(serviceTypeTable.id, input.serviceTypeId))
    .limit(1);
  if (!serviceType[0]) {
    throw new Error("Service type not found");
  }

  if (serviceType[0].isActive === false) {
    throw new Error("Service type not available");
  }

  if ((serviceType[0] as any).isBookable === false) {
    throw new Error("This service is not open for booking");
  }

  if (!serviceAllowsAthlete(serviceType[0], input.viewerAthlete ?? null)) {
    throw new Error("Service type not available");
  }

  if (!input.bypassAvailability && serviceType[0].totalSlots != null) {
    const totalBooked = await countActiveBookingsForService(input.serviceTypeId);
    if (totalBooked >= serviceType[0].totalSlots) {
      throw new Error("Service limit reached");
    }
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
      notes: input.notes ?? null,
      serviceTypeId: input.serviceTypeId,
      occurrenceKey,
      slotKey,
      timezoneOffsetMinutes: input.timezoneOffsetMinutes ?? null,
      createdBy: input.createdBy,
    })
    .returning();

  if (result[0]) {
    if (serviceType[0].totalSlots != null) {
      const totalBookedNow = await countActiveBookingsForService(input.serviceTypeId);
      if (totalBookedNow >= serviceType[0].totalSlots) {
        await db
          .update(serviceTypeTable)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(serviceTypeTable.id, input.serviceTypeId));
      }
    }
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

export async function listBookingsForUser(guardianId: number, limit = 100) {
  return db
    .select()
    .from(bookingTable)
    .where(eq(bookingTable.guardianId, guardianId))
    .orderBy(desc(bookingTable.startsAt))
    .limit(Math.max(1, Math.min(200, limit)));
}

export async function listBookingsForAthlete(athleteId: number, limit = 100) {
  return db
    .select()
    .from(bookingTable)
    .where(eq(bookingTable.athleteId, athleteId))
    .orderBy(desc(bookingTable.startsAt))
    .limit(Math.max(1, Math.min(200, limit)));
}

export async function cancelBookingForUser(bookingId: number, guardianId: number) {
  const [booking] = await db.select().from(bookingTable).where(eq(bookingTable.id, bookingId)).limit(1);
  if (!booking) throw new Error("NOT_FOUND");
  if (booking.guardianId !== guardianId) throw new Error("FORBIDDEN");
  if (booking.status === "cancelled" || booking.status === "declined") throw new Error("ALREADY_CLOSED");

  const [updated] = await db
    .update(bookingTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(bookingTable.id, bookingId))
    .returning();

  void notifyBookingCancelled(bookingId);

  return updated;
}

export async function expireStaleBookings() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return db
    .update(bookingTable)
    .set({ status: "declined", updatedAt: new Date() })
    .where(and(eq(bookingTable.status, "pending"), lt(bookingTable.createdAt, cutoff)));
}
