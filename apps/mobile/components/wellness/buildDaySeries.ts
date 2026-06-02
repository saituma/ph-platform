import type { TrendPoint } from "./WellnessBarTrend";

const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];

function dateKeyNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Build a fixed last-`days` series (oldest → newest) from date-keyed logs,
 * leaving gaps as `null` so missing days read as missing. Labels are weekday
 * initials for week windows, otherwise day-of-month.
 */
export function buildDaySeries<T extends { dateKey?: string | null }>(
  logs: T[],
  days: number,
  getValue: (log: T) => number | null,
): TrendPoint[] {
  const byKey = new Map<string, T>();
  for (const log of logs) {
    if (log.dateKey) byKey.set(log.dateKey, log);
  }
  const out: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = dateKeyNDaysAgo(i);
    const log = byKey.get(key);
    const d = new Date(`${key}T00:00:00`);
    const label = days <= 7 ? WEEKDAY[d.getDay()] : String(d.getDate());
    out.push({ label, value: log ? getValue(log) : null });
  }
  return out;
}

/** Average of the present (non-null) values, or null if none. */
export function seriesAverage(points: TrendPoint[]): number | null {
  const vals = points.map((p) => p.value).filter((v): v is number => v != null && Number.isFinite(v));
  if (!vals.length) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}
