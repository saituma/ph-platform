import { parseReplyPrefix } from "@/lib/messages/reply";
import { ChatMessage } from "@/constants/messages";
import { ApiChatMessage, ApiCoach } from "@/types/chat-api";
import { resolveMediaType } from "@/lib/messages/mediaType";

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
  const isAttachmentPlaceholder =
    Boolean(msg.mediaUrl) &&
    String(parsed.text ?? "")
      .trim()
      .toLowerCase() === "attachment";

  return {
    id: String(msg.id),
    threadId: otherId,
    from: isOutgoing ? "user" : "coach",
    senderId: msg.senderId,
    receiverId: msg.receiverId,
    text: isAttachmentPlaceholder ? "" : parsed.text,
    replyToMessageId: parsed.replyToMessageId ?? undefined,
    replyPreview: parsed.replyPreview || undefined,
    contentType: resolveMediaType({
      contentType: msg.contentType,
      mediaUrl: msg.mediaUrl,
    }),
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
  const isAttachmentPlaceholder =
    Boolean(msg.mediaUrl) &&
    String(parsed.text ?? "")
      .trim()
      .toLowerCase() === "attachment";
  const fallbackName =
    typeof msg.senderName === "string" && msg.senderName.trim()
      ? msg.senderName.trim()
      : memberMap[msg.senderId]?.name;
  const fallbackAvatar =
    typeof msg.senderProfilePicture === "string"
      ? msg.senderProfilePicture
      : memberMap[msg.senderId]?.avatar ?? null;
  return {
    id: `group-${msg.id}`,
    threadId: `group:${groupId}`,
    from: String(msg.senderId) === selfId ? "user" : "coach",
    senderId: msg.senderId,
    text: isAttachmentPlaceholder ? "" : parsed.text,
    replyToMessageId: parsed.replyToMessageId ?? undefined,
    replyPreview: parsed.replyPreview || undefined,
    contentType: resolveMediaType({
      contentType: msg.contentType,
      mediaUrl: msg.mediaUrl,
    }),
    mediaUrl: msg.mediaUrl ?? undefined,
    time: msg.createdAt
      ? new Date(msg.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    status: "sent",
    authorName: fallbackName,
    authorAvatar: fallbackAvatar,
    reactions: msg.reactions ?? [],
  } as ChatMessage;
}
