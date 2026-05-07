import { config } from "@/lib/config";
import { getClientAuthToken } from "@/lib/client-storage";

export interface ScheduleEvent {
  id: string;
  dayId: string;
  dateKey: string;
  startsAt: string;
  title: string;
  timeStart: string;
  timeEnd: string;
  location: string;
  meetingLink: string | null;
  type: "call" | "training" | "recovery";
  status?: string;
  athlete: string;
  notes: string;
  source?: "booking" | "scheduled-session";
  scheduledSessionId?: number;
  attendanceStatus?: "unmarked" | "attended" | "missed";
  checkInAt?: string | null;
  canCheckIn?: boolean;
}

export const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const EVENT_TITLE_BY_TYPE: Record<string, string> = {
  call: "Discovery Call",
  assessment: "Assessment",
  training: "Training Session",
  recovery: "Recovery",
  semi_private: "Semi-Private Session",
};

export function mapBookingsToEvents(items: any[]): ScheduleEvent[] {
  return (items ?? [])
    .map((item) => {
      const startsAt = new Date(item.startsAt);
      const endTime = item.endTime ? new Date(item.endTime) : new Date(startsAt.getTime() + 30 * 60000);
      const dayIndex = startsAt.getDay();
      const dayId = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][dayIndex] ?? "mon";
      const dateKey = formatDateKey(startsAt);
      return {
        id: String(item.id),
        dayId,
        dateKey,
        startsAt: startsAt.toISOString(),
        title: EVENT_TITLE_BY_TYPE[item.type] || item.title || "Session",
        timeStart: startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
        timeEnd: endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
        location: item.location || "TBD",
        meetingLink: item.meetingLink ?? null,
        type: item.type?.includes("call") ? "call" : item.type === "recovery" ? "recovery" : "training",
        status: item.status ?? undefined,
        athlete: item.athleteName ?? "Athlete",
        notes: item.notes ?? "",
        source: "booking",
      } as ScheduleEvent;
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

function defaultSessionRange() {
  const from = new Date();
  from.setDate(from.getDate() - 14);
  from.setHours(0, 0, 0, 0);

  const to = new Date();
  to.setDate(to.getDate() + 120);
  to.setHours(23, 59, 59, 999);

  return { from, to };
}

function isToday(date: Date) {
  return formatDateKey(date) === formatDateKey(new Date());
}

function normalizeSessionStatus(status: unknown) {
  const value = String(status ?? "").toLowerCase();
  if (value === "completed" || value === "attended") return "completed";
  if (value === "missed") return "missed";
  return "upcoming";
}

export function mapScheduledSessionsToEvents(items: any[]): ScheduleEvent[] {
  return (items ?? [])
    .map((item) => {
      const startsAt = new Date(item.startsAt);
      const endsAt = item.endsAt ? new Date(item.endsAt) : new Date(startsAt.getTime() + 60 * 60000);
      const dayIndex = startsAt.getDay();
      const dayId = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][dayIndex] ?? "mon";
      const attendanceStatus = item.attendanceStatus ?? "unmarked";
      const type = String(item.type ?? "training");
      return {
        id: `scheduled-${item.sessionId}`,
        dayId,
        dateKey: formatDateKey(startsAt),
        startsAt: startsAt.toISOString(),
        title: item.name || EVENT_TITLE_BY_TYPE[type] || "Training Session",
        timeStart: startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
        timeEnd: endsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
        location: item.location || "TBD",
        meetingLink: item.meetingLink ?? null,
        type: type.includes("call") ? "call" : type === "recovery" ? "recovery" : "training",
        status: normalizeSessionStatus(item.status),
        athlete: "Athlete",
        notes: item.notes ?? "",
        source: "scheduled-session",
        scheduledSessionId: Number(item.sessionId),
        attendanceStatus,
        checkInAt: item.checkInAt ?? null,
        canCheckIn: isToday(startsAt) && attendanceStatus !== "attended" && attendanceStatus !== "missed",
      } as ScheduleEvent;
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export async function fetchBookings(_token?: string): Promise<ScheduleEvent[]> {
  const baseUrl = config.api.baseUrl;
  const token = getClientAuthToken();
  const { from, to } = defaultSessionRange();
  const sessionParams = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });

  const authHeaders = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const [bookingsResult, sessionsResult] = await Promise.allSettled([
    fetch(`${baseUrl}/api/bookings`, {
      credentials: "include",
      headers: authHeaders,
    }),
    fetch(`${baseUrl}/api/sessions/my?${sessionParams.toString()}`, {
      credentials: "include",
      headers: authHeaders,
    }),
  ]);

  const events: ScheduleEvent[] = [];
  const errors: string[] = [];

  if (bookingsResult.status === "fulfilled" && bookingsResult.value.ok) {
    const data = await bookingsResult.value.json();
    events.push(...mapBookingsToEvents(data.items ?? []));
  } else {
    errors.push("bookings");
  }

  if (sessionsResult.status === "fulfilled" && sessionsResult.value.ok) {
    const data = await sessionsResult.value.json();
    events.push(...mapScheduledSessionsToEvents(data.sessions ?? []));
  } else {
    errors.push("scheduled sessions");
  }

  if (errors.length === 2) {
    throw new Error("Failed to fetch schedule");
  }

  return events.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export async function checkInScheduledSession(sessionId: number) {
  const baseUrl = config.api.baseUrl;
  const token = getClientAuthToken();
  const response = await fetch(`${baseUrl}/api/sessions/${sessionId}/check-in`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "Failed to mark attendance");
  }
  return data;
}

export async function fetchBookingServices(_token?: string) {
  const baseUrl = config.api.baseUrl;
  const token = getClientAuthToken();

  const response = await fetch(
    `${baseUrl}/api/bookings/services?includeLocked=true&omitWithoutBookableSlots=true`,
    {
      credentials: "include",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch services: ${response.status}`);
  }

  const data = await response.json();
  return data.items ?? [];
}

/** Coach-published times in a range (same source as the schedule calendar). */
export async function fetchGeneratedAvailability(
  _token: string,
  params: { from: Date; to: Date; serviceTypeId: number },
) {
  const baseUrl = config.api.baseUrl;
  const qs = new URLSearchParams({
    from: params.from.toISOString(),
    to: params.to.toISOString(),
    serviceTypeId: String(params.serviceTypeId),
  });
  const token = getClientAuthToken();
  const response = await fetch(`${baseUrl}/api/bookings/generated-availability?${qs}`, {
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch availability: ${response.status}`);
  }
  const data = await response.json();
  return (data.items ?? []) as GeneratedAvailabilityItem[];
}

export type GeneratedAvailabilityItem = {
  serviceTypeId: number;
  remainingCapacity?: number | null;
  slots?: { remainingCapacity?: number | null }[];
};

/** Sum reported openings across occurrences; returns null if any piece is missing a number. */
export function sumReportedOpeningsForService(
  items: GeneratedAvailabilityItem[],
  serviceTypeId: number,
): { occurrenceCount: number; openingsSum: number | null } {
  const rows = items.filter((i) => i.serviceTypeId === serviceTypeId);
  if (!rows.length) return { occurrenceCount: 0, openingsSum: null };
  let sum = 0;
  for (const occ of rows) {
    const subs = occ.slots && occ.slots.length > 0 ? occ.slots : null;
    if (subs) {
      for (const sl of subs) {
        if (sl.remainingCapacity == null) return { occurrenceCount: rows.length, openingsSum: null };
        sum += sl.remainingCapacity;
      }
    } else {
      if (occ.remainingCapacity == null) return { occurrenceCount: rows.length, openingsSum: null };
      sum += occ.remainingCapacity;
    }
  }
  return { occurrenceCount: rows.length, openingsSum: sum };
}

export async function createBooking(_token: string, body: any) {
  const baseUrl = config.api.baseUrl;

  const token = getClientAuthToken();
  const response = await fetch(`${baseUrl}/api/bookings`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to create booking");
  }

  return response.json();
}

export type AdminScheduleCandidate = {
  userId: number;
  athleteId: number;
  name: string;
  email: string;
  role: string;
  athleteType: string | null;
};

export async function fetchAdminNonTeamUsers(params?: { q?: string; limit?: number }) {
  const baseUrl = config.api.baseUrl;
  const token = getClientAuthToken();
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.limit) qs.set("limit", String(params.limit));
  const response = await fetch(
    `${baseUrl}/api/admin/bookings/non-team-users${qs.toString() ? `?${qs.toString()}` : ""}`,
    {
      credentials: "include",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch non-team users: ${response.status}`);
  }

  const data = await response.json();
  return (data.items ?? []) as AdminScheduleCandidate[];
}

export async function createAdminCustomSession(body: {
  mode: "one_to_one" | "small_group";
  userIds: number[];
  startsAt: string;
  endsAt: string;
  isBookable: boolean;
  location?: string | null;
  meetingLink?: string | null;
  notes?: string | null;
  groupName?: string | null;
}) {
  const baseUrl = config.api.baseUrl;
  const token = getClientAuthToken();
  const response = await fetch(`${baseUrl}/api/admin/bookings/custom-sessions`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "Failed to create custom session");
  }
  return data as {
    createdCount: number;
    failedCount: number;
    created: any[];
    failures: Array<{ userId: number; reason: string }>;
  };
}

export async function fetchScheduledPrograms(): Promise<ScheduleEvent[]> {
  const baseUrl = config.api.baseUrl;
  const token = getClientAuthToken();

  const response = await fetch(`${baseUrl}/api/programs/my-assigned`, {
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) return [];

  const data = await response.json();
  const programs = (data.programs ?? []) as any[];

  return programs
    .filter((p: any) => p.scheduledDate)
    .map((p: any) => {
      const d = new Date(p.scheduledDate);
      const dateKey = formatDateKey(d);
      const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
      return {
        id: `program-${p.id}`,
        dayId: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d.getDay()] ?? "mon",
        dateKey,
        startsAt: d.toISOString(),
        title: p.name || "Program Session",
        timeStart: timeStr === "12:00 AM" ? "All day" : timeStr,
        timeEnd: "",
        location: "",
        meetingLink: null,
        type: "training" as const,
        status: "confirmed",
        athlete: "",
        notes: p.description ?? "",
        source: "scheduled-session" as const,
      } as ScheduleEvent;
    });
}
