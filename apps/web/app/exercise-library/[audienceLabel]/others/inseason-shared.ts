export const INSEASON_WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export function formatWeeklySchedule(day: string, time: string) {
  if (!day || !time) return "";
  const [hoursRaw, minutesRaw] = time.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return `${day} ${time}`;
  }
  const period = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 === 0 ? 12 : hours % 12;
  const normalizedMinutes = String(minutes).padStart(2, "0");
  return `${day} ${normalizedHours}:${normalizedMinutes} ${period}`;
}

export function parseWeeklySchedule(
  scheduleNote: string | null | undefined,
  metadata?: Record<string, unknown> | null,
) {
  const metadataDay = typeof metadata?.scheduleDay === "string" ? metadata.scheduleDay : "";
  const metadataTime = typeof metadata?.scheduleTime === "string" ? metadata.scheduleTime : "";
  if (metadataDay && metadataTime) {
    return { day: metadataDay, time: metadataTime };
  }

  const value = String(scheduleNote ?? "").trim();
  const match = value.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i);
  if (!match) {
    return { day: "Monday", time: "17:00" };
  }

  const day = match[1];
  const hours12 = Number(match[2]);
  const minutes = match[3];
  const period = match[4].toUpperCase();
  let hours24 = hours12 % 12;
  if (period === "PM") hours24 += 12;
  return { day, time: `${String(hours24).padStart(2, "0")}:${minutes}` };
}
