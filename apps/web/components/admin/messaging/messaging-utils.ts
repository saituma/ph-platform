import type { ChatGroupItem, ChatMessage, ChatReaction, MessagingUser } from "./types";

export type { ChatGroupItem, ChatMessage, ChatReaction, MessagingUser };

export type ThreadListItem = {
  userId: number;
  name: string;
  preview: string;
  unread: number;
  updatedAt: string;
  isPremium: boolean;
  tierLabel: string | null;
  online: boolean;
  lastSeenAt: string | null;
};

export type AdminTeamItem = {
  team: string;
  memberCount: number;
  youthCount: number;
  adultCount: number;
  createdAt: string;
  updatedAt: string;
};

export type GifResult = { id: string; url: string; previewUrl: string };

export type DirectLiveHandlers = {
  onDirectMessage: (message: ChatMessage) => void;
  onDirectReaction: (messageId: number, reactions: ChatReaction[]) => void;
  getActiveThreadUserId: () => number | null;
  scheduleDirectRefetch: (delayMs?: number) => void;
};

export type GroupLiveHandlers = {
  onGroupMessage: (message: ChatMessage, incomingGroupId: number) => void;
  onGroupReaction: (incomingGroupId: number, messageId: number, reactions: ChatReaction[]) => void;
  getActiveGroupId: () => number | null;
  scheduleGroupRefetch: (delayMs?: number) => void;
};

/** @deprecated Use DirectLiveHandlers + GroupLiveHandlers separately */
export type LiveHandlers = DirectLiveHandlers & GroupLiveHandlers;

export function formatTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatSchedule(startsAt?: string | null, endsAt?: string | null): string {
  if (!startsAt && !endsAt) return "Permanent";
  if (startsAt && endsAt) return `Active ${formatTime(startsAt)} → ${formatTime(endsAt)}`;
  if (startsAt) return `Starts ${formatTime(startsAt)}`;
  return `Ends ${formatTime(endsAt)}`;
}

export function getGroupActivityTimestamp(group: ChatGroupItem): string | null {
  return group.lastMessage?.createdAt ?? group.createdAt ?? null;
}

export function formatGroupLastMessagePreview(group: ChatGroupItem): string {
  const message = group.lastMessage;
  if (!message) return "No messages yet";
  const sender = (message.senderName ?? "").trim();
  const content = (message.content ?? "").trim();
  const type = (message.contentType ?? "text").toString();
  const label =
    type === "image" ? "Photo" : type === "video" ? "Video" : content || "Message";
  if (!sender) return label;
  return `${sender}: ${label}`;
}

export function getGroupLastSender(group: ChatGroupItem): string | null {
  return String(group.lastMessage?.senderName ?? "").trim() || null;
}

export function formatUnreadCount(unread: number): string | null {
  if (!Number.isFinite(unread) || unread <= 0) return null;
  return unread > 99 ? "99+" : String(unread);
}

export function isValidDateTimeValue(value?: string): boolean {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export function toLocalInputValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function getTierFromUser(user: MessagingUser): string | null {
  return user.programTier ?? user.currentProgramTier ?? user.desiredProgramType ?? null;
}

export function isPremiumTier(tier: string | null): boolean {
  if (!tier) return false;
  return tier.toLowerCase().includes("premium");
}

export function resolveGroupCategory(
  group: Pick<ChatGroupItem, "category" | "name">,
): "announcement" | "coach_group" | "team" {
  if (
    group.category === "announcement" ||
    group.category === "coach_group" ||
    group.category === "team"
  ) {
    return group.category;
  }
  const normalized = String(group.name ?? "").trim().toLowerCase();
  if (/(announce|announcement|broadcast)/i.test(normalized)) return "announcement";
  if (/(team|squad|club)/i.test(normalized)) return "team";
  return "coach_group";
}

export function categoryLabel(
  category: "announcement" | "coach_group" | "team",
): string {
  if (category === "announcement") return "Coach announcements";
  if (category === "team") return "Team inbox";
  return "Coach groups";
}

export function normalizeTeamKey(value?: string | null): string {
  return String(value ?? "").trim().toLowerCase();
}

export function canonicalTeamMatchKey(value?: string | null): string {
  const normalized = normalizeTeamKey(value);
  const stripped = normalized
    .replace(/\b(team|inbox|group|chat)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped || normalized;
}
