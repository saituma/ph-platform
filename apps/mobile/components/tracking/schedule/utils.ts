import { ScheduleEvent, ServiceType } from "./types";
import { EVENT_TITLE_BY_TYPE } from "./constants";

export const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

export const startOfLocalDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

export const endOfLocalDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

export function normalizeBookingCalendarDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

export function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

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
        title: EVENT_TITLE_BY_TYPE[item.type] ?? "Session",
        timeStart: startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
        timeEnd: endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
        location: item.location || "TBD",
        meetingLink: item.meetingLink ?? null,
        type: item.type?.includes("call") ? "call" : "training",
        status: item.status ?? undefined,
        tag: "Parent",
        athlete: item.athleteName ?? "Athlete",
        coach: "Coach",
        notes: item.notes ?? "",
      } as ScheduleEvent;
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export function mapScheduledSessionsToEvents(items: any[]): ScheduleEvent[] {
  return (items ?? [])
    .map((item) => {
      const startsAt = new Date(item.startsAt);
      const endsAt = item.endsAt ? new Date(item.endsAt) : new Date(startsAt.getTime() + 60 * 60000);
      const dayIndex = startsAt.getDay();
      const dayId = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][dayIndex] ?? "mon";
      const dateKey = formatDateKey(startsAt);
      const status = String(item.status ?? "Upcoming").toLowerCase();
      const normalizedStatus = status === "declined" || status === "cancelled" ? "declined" : "confirmed";
      return {
        id: String(item.sessionId),
        dayId,
        dateKey,
        startsAt: startsAt.toISOString(),
        title: item.name ?? "Session",
        timeStart: startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
        timeEnd: endsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
        location: item.location || "TBD",
        meetingLink: item.meetingLink ?? null,
        type: item.type === "one_to_one" ? "call" : "training",
        status: normalizedStatus,
        tag: "Scheduled",
        athlete: "Athlete",
        coach: "Coach",
        notes: item.attendanceStatus === "missed" ? "Missed" : item.attendanceStatus === "attended" ? "Completed" : "",
        attendanceStatus: item.attendanceStatus ?? null,
      } as ScheduleEvent;
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}
