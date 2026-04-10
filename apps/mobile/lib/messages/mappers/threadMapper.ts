import { parseReplyPrefix } from "@/lib/messages/reply";
import { MessageThread } from "@/types/messages";

export type GroupThreadCategory = "announcement" | "team" | "coach_group";

export function classifyGroupThread(group: any): GroupThreadCategory {
  const category = String(group?.category ?? "")
    .trim()
    .toLowerCase();
  if (category === "announcement") return "announcement";
  if (category === "team") return "team";
  return "coach_group";
}

export function mapGroupToThread(group: any): MessageThread {
  const channelType = classifyGroupThread(group);
  const last = group?.lastMessage ?? null;
  const updatedAt = last?.createdAt
    ? new Date(last.createdAt)
    : group?.createdAt
      ? new Date(group.createdAt)
      : null;
  const updatedAtMs = updatedAt ? updatedAt.getTime() : 0;
  const time = updatedAt
    ? updatedAt.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const lastContentType = String(last?.contentType ?? "")
    .trim()
    .toLowerCase();
  const parsedLast =
    last && typeof last.content === "string"
      ? parseReplyPrefix(last.content)
      : null;
  const previewText =
    parsedLast?.text?.trim() || String(last?.content ?? "").trim();
  const preview =
    lastContentType === "image"
      ? "Photo"
      : lastContentType === "video"
        ? "Video"
        : previewText ||
          (channelType === "team" ? "Team chat" : "Group chat");

  return {
    id: `group:${group.id}`,
    name: group.name,
    role: channelType === "team" ? "Team" : "Group",
    channelType,
    preview,
    time,
    pinned: false,
    premium: false,
    unread: Number(group?.unreadCount ?? 0) || 0,
    lastSeen: "Active",
    responseTime: "Group updates",
    updatedAtMs,
  };
}

export function mapCoachToThread(
  coach: any,
  messages: any[],
  isPremium: boolean,
): MessageThread {
  const lastMsg = (messages ?? [])
    .filter(
      (m: any) =>
        String(m.senderId) === String(coach.id) ||
        String(m.receiverId) === String(coach.id),
    )
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];

  return {
    id: String(coach.id),
    name: coach.name,
    role: coach.role ?? "Coach",
    channelType: "direct" as const,
    preview: lastMsg ? lastMsg.content : "Start the conversation",
    time: lastMsg?.createdAt
      ? new Date(lastMsg.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    updatedAtMs: lastMsg?.createdAt ? new Date(lastMsg.createdAt).getTime() : 0,
    pinned: false,
    premium: isPremium,
    unread:
      (messages ?? []).filter(
        (msg: any) => !msg.read && String(msg.senderId) === String(coach.id),
      ).length ?? 0,
    lastSeen: "Active",
    responseTime: isPremium
      ? "Priority response window"
      : "Standard response window",
    avatarUrl: coach.profilePicture ?? null,
    isAi: false,
  };
}
