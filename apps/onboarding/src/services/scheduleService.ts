import { env } from "@/env";

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
      } as ScheduleEvent;
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export async function fetchBookings(token: string): Promise<ScheduleEvent[]> {
  const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
  
  const response = await fetch(`${baseUrl}/api/bookings`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch bookings: ${response.status}`);
  }

  const data = await response.json();
  return mapBookingsToEvents(data.items ?? []);
}

export async function fetchBookingServices(token: string) {
  const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
  
  const response = await fetch(
    `${baseUrl}/api/bookings/services?includeLocked=true&omitWithoutBookableSlots=true`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
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
  token: string,
  params: { from: Date; to: Date; serviceTypeId: number },
) {
  const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
  const qs = new URLSearchParams({
    from: params.from.toISOString(),
    to: params.to.toISOString(),
    serviceTypeId: String(params.serviceTypeId),
  });
  const response = await fetch(`${baseUrl}/api/bookings/generated-availability?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
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

export async function createBooking(token: string, body: any) {
  const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
  
  const response = await fetch(`${baseUrl}/api/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to create booking");
  }

  return response.json();
}
