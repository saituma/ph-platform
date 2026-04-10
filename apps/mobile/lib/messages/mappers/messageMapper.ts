import { parseReplyPrefix } from "@/lib/messages/reply";
import { ChatMessage } from "@/constants/messages";
import { ApiChatMessage, ApiCoach } from "@/types/chat-api";

export function mapApiDirectMessageToChatMessage(
  msg: ApiChatMessage,
  selfId: string,
  coaches: ApiCoach[],
  profileName?: string | null,
): ChatMessage {
  const otherId =
    String(msg.senderId) === selfId
      ? String(msg.receiverId)
      : String(msg.senderId);
  const otherCoach = (coaches ?? []).find((c: ApiCoach) => String(c.id) === otherId);
  const parsed = parseReplyPrefix(msg.content);
  const isOutgoing = String(msg.senderId) === selfId;

  return {
    id: String(msg.id),
    threadId: otherId,
    from: isOutgoing ? "user" : "coach",
    text: parsed.text,
    replyToMessageId: parsed.replyToMessageId ?? undefined,
    replyPreview: parsed.replyPreview || undefined,
    contentType: msg.contentType ?? "text",
    mediaUrl: msg.mediaUrl ?? undefined,
    videoUploadId: msg.videoUploadId ?? undefined,
    time: msg.createdAt
      ? new Date(msg.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    status: msg.read ? "read" : "sent",
    reactions: msg.reactions ?? [],
    authorName: isOutgoing
      ? (profileName ?? undefined)
      : (otherCoach?.name ?? undefined),
    authorAvatar: isOutgoing ? null : (otherCoach?.profilePicture ?? null),
  };
}

export function mapApiGroupMessageToChatMessage(
  msg: ApiChatMessage,
  groupId: number,
  selfId: string,
  memberMap: Record<number, { name: string; avatar?: string | null }>,
): ChatMessage {
  const parsed = parseReplyPrefix(msg.content);
  return {
    id: `group-${msg.id}`,
    threadId: `group:${groupId}`,
    from: String(msg.senderId) === selfId ? "user" : "coach",
    text: parsed.text,
    replyToMessageId: parsed.replyToMessageId ?? undefined,
    replyPreview: parsed.replyPreview || undefined,
    contentType: msg.contentType ?? "text",
    mediaUrl: msg.mediaUrl ?? undefined,
    time: msg.createdAt
      ? new Date(msg.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    status: "sent",
    authorName: memberMap[msg.senderId]?.name,
    authorAvatar: memberMap[msg.senderId]?.avatar ?? null,
    reactions: msg.reactions ?? [],
  } as ChatMessage;
}
