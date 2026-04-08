function formatMonthDay(d: Date) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(d);
}

export function getLastNDaysLabel(days: number) {
  if (!Number.isFinite(days) || days <= 1) return "Today";
  return `Last ${Math.floor(days)} days`;
}

export function getLastNDaysRangeLabel(days: number, now: Date = new Date()) {
  const daysSafe = Math.max(1, Math.floor(days));
  if (daysSafe <= 1) return formatMonthDay(now);

  const start = new Date(now);
  start.setDate(start.getDate() - (daysSafe - 1));
  return `${formatMonthDay(start)} – ${formatMonthDay(now)}`;
}

