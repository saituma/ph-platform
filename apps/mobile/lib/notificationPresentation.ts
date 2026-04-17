import { Ionicons } from "@expo/vector-icons";

export type NotificationCategory =
  | "message"
  | "schedule"
  | "account"
  | "progress"
  | "system"
  | "general";

export type NotificationMeta = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  colorType: "accent" | "warning" | "danger" | "success" | "tint" | "system";
};

const CATEGORY_META: Record<NotificationCategory, NotificationMeta> = {
  message: { label: "Messages", icon: "chatbubble-ellipses", colorType: "accent" },
  schedule: { label: "Schedule", icon: "calendar", colorType: "warning" },
  account: { label: "Account", icon: "person-circle", colorType: "tint" },
  progress: { label: "Progress", icon: "trending-up", colorType: "success" },
  system: { label: "System", icon: "alert-circle", colorType: "system" },
  general: { label: "Updates", icon: "notifications", colorType: "accent" },
};

const TITLE_CASE_BREAK = /[_-]+/g;

export function humanizeType(type?: string | null) {
  if (!type) return null;
  const cleaned = type.replace(TITLE_CASE_BREAK, " ").trim();
  if (!cleaned) return null;
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function inferNotificationCategory(
  type?: string | null,
  content?: string | null,
) : NotificationCategory {
  const haystack = `${type ?? ""} ${content ?? ""}`.toLowerCase();
  if (/(message|chat|dm|inbox)/.test(haystack)) return "message";
  if (/(schedule|booking|session|calendar|reschedule)/.test(haystack)) return "schedule";
  if (/(account|profile|password|login|security|invoice|payment|billing|card|receipt|stripe)/.test(haystack)) return "account";
  if (/(progress|goal|workout|program|plan|assessment|video_reviewed|feedback)/.test(haystack)) return "progress";
  if (/(alert|warning|system|maintenance|update)/.test(haystack)) return "system";
  return "general";
}

const TYPE_SPECIFIC_META: Record<string, Partial<NotificationMeta>> = {
  message: { icon: "chatbubble-ellipses" },
  "group-message": { icon: "people" },
  booking_requested: { icon: "time", colorType: "warning" },
  booking_confirmed: { icon: "checkmark-circle", colorType: "success" },
  booking_declined: { icon: "close-circle", colorType: "danger" },
  program: { icon: "fitness", colorType: "accent" },
  video_reviewed: { icon: "videocam", colorType: "success" },
  "physio-referral": { icon: "medical", colorType: "tint" },
  security_alert: { icon: "shield-half", colorType: "danger" },
};

export function getNotificationMeta(category: NotificationCategory, type?: string | null) {
  const base = CATEGORY_META[category] ?? CATEGORY_META.general;
  const specific = type ? TYPE_SPECIFIC_META[type] : null;
  return { ...base, ...specific };
}

export function getNotificationTitle(
  type?: string | null,
  category?: NotificationCategory,
) {
  return humanizeType(type) ?? getNotificationMeta(category ?? "general").label;
}

export function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export function formatSectionHeading(date: Date, now = new Date()) {
  const todayKey = getDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = getDateKey(yesterday);
  const dateKey = getDateKey(date);
  if (dateKey === todayKey) return "Today";
  if (dateKey === yesterdayKey) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatRelativeTime(
  input?: string | number | Date | null,
  now = new Date(),
) {
  if (!input) return "";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.max(0, Math.round(diffMs / 1000));
  if (diffSeconds < 45) return "Just now";
  if (diffSeconds < 90) return "1m";
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
