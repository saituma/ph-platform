export function formatWhen(value: unknown) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export function safeNumber(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function stripPreview(value: unknown) {
  const text =
    typeof value === "string" ? value : value == null ? "" : String(value);
  return text.replace(/^\[reply:[^\]]+\]\s*/i, "").trim();
}

export function categoryLabel(category: string | null | undefined) {
  switch ((category ?? "").toLowerCase()) {
    case "announcement":
      return "Announcement";
    case "team":
      return "Team";
    case "coach_group":
      return "Coach Group";
    default:
      return "Group";
  }
}
