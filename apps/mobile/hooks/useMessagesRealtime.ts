import { ChatMessage } from "@/constants/messages";
import { MessageThread, TypingStatus } from "@/types/messages";

function formatLastSeen(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Last seen just now";
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Last seen yesterday";
  return `Last seen ${days}d ago`;
}
import { parseReplyPrefix } from "@/lib/messages/reply";
import { resolveMediaType } from "@/lib/messages/mediaType";
import { useEffect, useRef } from "react";
import { useSocket } from "@/context/SocketContext";
import {
  SocketMessageNewPayload,
  SocketGroupMessagePayload,
  SocketTypingUpdatePayload,
  SocketMessageReactionPayload,
  SocketMessageDeletedPayload,
  SocketMessageReadPayload,
  SocketGroupReadPayload,
} from "@/types/socket-api";

type UseMessagesRealtimeParams = {
  token: string | null | undefined;
  role: string;
  profileId: number;
  draft: string;
  currentThread: MessageThread | null;
  groupMembers: Record<number, Record<number, { name: string; avatar?: string | null }>>;
  loadMessages: (options?: { silent?: boolean }) => void;
  /** Called on socket reconnect to invalidate the TanStack Query thread cache. */
  invalidateThreads?: () => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setThreads: React.Dispatch<React.SetStateAction<MessageThread[]>>;
  setTypingStatus: React.Dispatch<React.SetStateAction<TypingStatus>>;
};

export function useMessagesRealtime({
  profileId,
  draft,
  currentThread,
  groupMembers,
  invalidateThreads,
  setMessages,
  setThreads,
  setTypingStatus,
}: UseMessagesRealtimeParams) {
  const { socket } = useSocket();
  const typingRef = useRef<{ active: boolean; timer?: ReturnType<typeof setTimeout> | null }>({ active: false, timer: null });
  const prevOnlineKeyRef = useRef<string>("");

  // --- Stable refs so socket handlers always see latest values ---
  const profileIdRef = useRef(profileId);
  const currentThreadIdRef = useRef<string | null>(currentThread?.id ?? null);
  const groupMembersRef = useRef(groupMembers);
  const setMessagesRef = useRef(setMessages);
  const setThreadsRef = useRef(setThreads);
  const setTypingStatusRef = useRef(setTypingStatus);
  const invalidateThreadsRef = useRef(invalidateThreads);

  // Keep refs in sync
  useEffect(() => { profileIdRef.current = profileId; }, [profileId]);
  useEffect(() => { currentThreadIdRef.current = currentThread?.id ?? null; }, [currentThread?.id]);
  useEffect(() => { groupMembersRef.current = groupMembers; }, [groupMembers]);
  useEffect(() => { setMessagesRef.current = setMessages; }, [setMessages]);
  useEffect(() => { setThreadsRef.current = setThreads; }, [setThreads]);
  useEffect(() => { setTypingStatusRef.current = setTypingStatus; }, [setTypingStatus]);
  useEffect(() => { invalidateThreadsRef.current = invalidateThreads; }, [invalidateThreads]);

  useEffect(() => {
    if (!socket) return;

    const bumpThreadToTop = (threads: MessageThread[], nextThread: MessageThread) => {
      return [nextThread, ...threads.filter((thread) => thread.id !== nextThread.id)];
    };

    const handleMessageNew = async (payload: SocketMessageNewPayload) => {
      if (!payload?.id) return;
      const senderId = Number(payload.senderId);
      const receiverId = Number(payload.receiverId);
      const currentProfileId = profileIdRef.current;
      const selfId = String(currentProfileId ?? "");
      const threadIdFromMessage = String(String(senderId) === selfId ? receiverId : senderId);
      const currentThreadId = currentThreadIdRef.current;
      const parsed = parseReplyPrefix(payload.content);
      const normalizedDirectText = String(parsed.text ?? "").trim();
      const directText =
        payload.mediaUrl && normalizedDirectText.toLowerCase() === "attachment"
          ? ""
          : parsed.text;
      const message: ChatMessage = {
        id: String(payload.id),
        threadId: threadIdFromMessage,
        from: String(senderId) === selfId ? "user" : "coach",
        senderId,
        receiverId,
        text: directText,
        replyToMessageId: payload.videoUploadId ? undefined : parsed.replyToMessageId ?? undefined,
        replyPreview: parsed.replyPreview || undefined,
        contentType: resolveMediaType({
          contentType: payload.contentType,
          mediaUrl: payload.mediaUrl,
        }),
        mediaUrl: payload.mediaUrl ?? undefined,
        videoUploadId: payload.videoUploadId ?? undefined,
        time: payload.createdAt
          ? new Date(payload.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
        status: payload.read ? "read" : "sent",
        clientId: payload.clientId,
        reactions: payload.reactions ?? [],
      };

      setMessagesRef.current((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        if (message.clientId) {
          const withoutTemp = prev.filter((m) => m.clientId !== message.clientId);
          return [...withoutTemp, message];
        }
        return [...prev, message];
      });

      setThreadsRef.current((prev) => {
        const isIncoming = String(senderId) !== selfId;
        const isActiveThread = currentThreadId === threadIdFromMessage;
        const updatedAtMs = payload.createdAt ? new Date(payload.createdAt).getTime() : Date.now();
        const existing = prev.find((thread) => thread.id === threadIdFromMessage);
        if (existing) {
          const nextThread = {
            ...existing,
            preview: message.text,
            time: message.time,
            updatedAtMs,
            unread: isIncoming && !isActiveThread ? (existing.unread ?? 0) + 1 : existing.unread ?? 0,
          };
          return bumpThreadToTop(prev, nextThread);
        }

        const fallbackName =
          String(senderId) === selfId
            ? payload.receiverName ?? "Coach"
            : payload.senderName ?? "Coach";
        const createdThread: MessageThread = {
          id: threadIdFromMessage,
          name: fallbackName,
          role: payload.senderRole ?? "Coach",
          channelType: "direct",
          groupLabel: "Direct message",
          preview: message.text,
          time: message.time,
          pinned: false,
          premium: false,
          unread: isIncoming && !isActiveThread ? 1 : 0,
          updatedAtMs,
          lastSeen: "Active",
          responseTime: "Replies soon",
          avatarUrl: payload.senderAvatar ?? null,
        };
        return [createdThread, ...prev];
      });
    };

    const handleGroupMessage = async (payload: SocketGroupMessagePayload) => {
      if (!payload?.id || !payload?.groupId) return;
      const groupId = Number(payload.groupId);
      const currentProfileId = profileIdRef.current;
      const currentGroupMembers = groupMembersRef.current;
      const currentThreadId = currentThreadIdRef.current;
      const selfId = String(currentProfileId ?? "");
      const parsed = parseReplyPrefix(payload.content);
      const normalizedGroupText = String(parsed.text ?? "").trim();
      const groupText =
        payload.mediaUrl && normalizedGroupText.toLowerCase() === "attachment"
          ? ""
          : parsed.text;
      const message: ChatMessage = {
        id: `group-${payload.id}`,
        threadId: `group:${groupId}`,
        from: String(payload.senderId) === selfId ? "user" : "coach",
        senderId: Number(payload.senderId),
        text: groupText,
        replyToMessageId: parsed.replyToMessageId ?? undefined,
        replyPreview: parsed.replyPreview || undefined,
        contentType: resolveMediaType({
          contentType: payload.contentType,
          mediaUrl: payload.mediaUrl,
        }),
        mediaUrl: payload.mediaUrl ?? undefined,
        time: payload.createdAt
          ? new Date(payload.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
        status: "sent",
        authorName:
          payload.senderName?.trim() ||
          currentGroupMembers[groupId]?.[payload.senderId]?.name,
        authorAvatar:
          payload.senderProfilePicture ??
          currentGroupMembers[groupId]?.[payload.senderId]?.avatar ??
          null,
        clientId: payload.clientId,
        reactions: payload.reactions ?? [],
      };
      const senderDisplayName = String(message.authorName ?? "").trim();
      const groupPreview = senderDisplayName
        ? `${senderDisplayName}: ${message.text || (payload.contentType === "image" ? "Photo" : payload.contentType === "video" ? "Video" : payload.mediaUrl ? "File" : "")}`
        : message.text || (payload.contentType === "image" ? "Photo" : payload.contentType === "video" ? "Video" : payload.mediaUrl ? "File" : "");

      setMessagesRef.current((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        if (message.clientId) {
          const withoutTemp = prev.filter((m) => m.clientId !== message.clientId);
          return [...withoutTemp, message];
        }
        return [...prev, message];
      });

      setThreadsRef.current((prev) => {
        const groupThreadId = `group:${groupId}`;
        const updatedAtMs = payload.createdAt ? new Date(payload.createdAt).getTime() : Date.now();
        const existing = prev.find((thread) => thread.id === groupThreadId);
        const isIncoming = String(payload.senderId) !== selfId;
        const isActive = currentThreadId === groupThreadId;

        if (existing) {
          const nextThread = {
            ...existing,
            preview: groupPreview,
            time: message.time,
            updatedAtMs,
            senderName: senderDisplayName || existing.senderName,
            unread: isIncoming && !isActive ? (existing.unread ?? 0) + 1 : existing.unread ?? 0,
          };
          return bumpThreadToTop(prev, nextThread);
        }

        const createdThread: MessageThread = {
          id: groupThreadId,
          name: payload.groupName ?? "Group Chat",
          role: "Group",
          channelType: "coach_group",
          groupLabel: "Group chat",
          senderName: senderDisplayName || undefined,
          preview: groupPreview,
          time: message.time,
          pinned: false,
          premium: false,
          unread: isIncoming && !isActive ? 1 : 0,
          updatedAtMs,
          lastSeen: "Active",
          responseTime: "Group updates",
        };
        return [createdThread, ...prev];
      });
    };

    const handleTypingUpdate = (payload: SocketTypingUpdatePayload) => {
      const key =
        payload.scope === "group" && payload.groupId
          ? `group:${payload.groupId}`
          : payload.fromUserId
          ? `user:${payload.fromUserId}`
          : "direct";
      setTypingStatusRef.current((prev) => ({
        ...prev,
        [key]: { name: payload.name, isTyping: payload.isTyping },
      }));
    };

    const handleMessageReaction = (payload: SocketMessageReactionPayload) => {
      const id = String(payload.messageId);
      setMessagesRef.current((prev) =>
        prev.map((message) => (message.id === id ? { ...message, reactions: payload.reactions ?? [] } : message))
      );
    };

    const handleGroupReaction = (payload: SocketMessageReactionPayload) => {
      const id = `group-${payload.messageId}`;
      setMessagesRef.current((prev) =>
        prev.map((message) => (message.id === id ? { ...message, reactions: payload.reactions ?? [] } : message))
      );
    };

    const handleMessageDeleted = (payload: SocketMessageDeletedPayload) => {
      const id = String(payload.messageId);
      setMessagesRef.current((prev) => prev.filter((message) => message.id !== id));
    };

    const handleGroupMessageDeleted = (payload: SocketMessageDeletedPayload) => {
      const id = `group-${payload.messageId}`;
      setMessagesRef.current((prev) => prev.filter((message) => message.id !== id));
    };

    const handleMessageRead = (payload: SocketMessageReadPayload) => {
      const readerUserId = Number(payload?.readerUserId);
      if (!Number.isFinite(readerUserId)) return;

      const currentProfileId = Number(profileIdRef.current ?? NaN);
      const peerUserIds = Array.isArray(payload?.peerUserIds)
        ? payload.peerUserIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
        : [];

      setMessagesRef.current((prev) =>
        prev.map((message) => {
          if (String(message.threadId).startsWith("group:")) return message;
          const senderId = Number(message.senderId ?? NaN);
          const receiverId = Number(message.receiverId ?? NaN);
          const sentByMeToReader =
            Number.isFinite(currentProfileId) &&
            Number.isFinite(senderId) &&
            Number.isFinite(receiverId) &&
            senderId === currentProfileId &&
            receiverId === readerUserId;
          if (!sentByMeToReader || message.status === "read") return message;
          return { ...message, status: "read" };
        }),
      );

      if (Number.isFinite(currentProfileId) && readerUserId === currentProfileId && peerUserIds.length > 0) {
        setThreadsRef.current((prev) =>
          prev.map((thread) => {
            const threadPeerId = Number(thread.id);
            if (!Number.isFinite(threadPeerId) || !peerUserIds.includes(threadPeerId)) return thread;
            return { ...thread, unread: 0 };
          }),
        );
      }
    };

    const handleGroupRead = (payload: SocketGroupReadPayload) => {
      const groupId = Number(payload?.groupId);
      const readerUserId = Number(payload?.readerUserId);
      const currentProfileId = Number(profileIdRef.current ?? NaN);
      if (!Number.isFinite(groupId) || !Number.isFinite(readerUserId) || !Number.isFinite(currentProfileId)) {
        return;
      }
      if (readerUserId !== currentProfileId) return;
      const threadId = `group:${groupId}`;
      setThreadsRef.current((prev) =>
        prev.map((thread) => (thread.id === threadId ? { ...thread, unread: 0 } : thread)),
      );
    };

    const handlePresenceUpdate = (onlineUserIds: number[]) => {
      const key = [...onlineUserIds].sort((a, b) => a - b).join(",");
      if (key === prevOnlineKeyRef.current) return;
      prevOnlineKeyRef.current = key;
      const onlineSet = new Set(onlineUserIds.map(Number));
      setThreadsRef.current((prev) =>
        prev.map((thread) => {
          if (thread.channelType !== "direct") return thread;
          const peerId = Number(thread.id);
          if (!Number.isFinite(peerId) || peerId <= 0) return thread;
          const isOnline = onlineSet.has(peerId);
          if (isOnline) return { ...thread, lastSeen: "Online" };
          if (thread.lastSeen === "Online") {
            return { ...thread, lastSeen: thread.lastSeenAt ? formatLastSeen(thread.lastSeenAt) : "Recently active" };
          }
          return thread;
        }),
      );
    };

    // Invalidate the TQ thread cache whenever the socket (re)connects so we
    // immediately get fresh data after a disconnect/reconnect cycle.
    const handleConnect = () => { invalidateThreadsRef.current?.(); };

    socket.on("connect", handleConnect);
    socket.on("message:new", handleMessageNew);
    socket.on("group:message", handleGroupMessage);
    socket.on("typing:update", handleTypingUpdate);
    socket.on("message:reaction", handleMessageReaction);
    socket.on("group:reaction", handleGroupReaction);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("group:message:deleted", handleGroupMessageDeleted);
    socket.on("message:read", handleMessageRead);
    socket.on("group:read", handleGroupRead);
    socket.on("presence:update", handlePresenceUpdate);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("message:new", handleMessageNew);
      socket.off("group:message", handleGroupMessage);
      socket.off("typing:update", handleTypingUpdate);
      socket.off("message:reaction", handleMessageReaction);
      socket.off("group:reaction", handleGroupReaction);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("group:message:deleted", handleGroupMessageDeleted);
      socket.off("message:read", handleMessageRead);
      socket.off("group:read", handleGroupRead);
      socket.off("presence:update", handlePresenceUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !currentThread) return;

    const stopTypingOnThread = (threadId: string) => {
      if (threadId.startsWith("group:")) {
        socket.emit("typing:stop", { groupId: Number(threadId.replace("group:", "")) });
      } else {
        socket.emit("typing:stop", { toUserId: Number(threadId) });
      }
    };

    if (draft.trim().length > 0) {
      if (!typingRef.current.active) {
        typingRef.current.active = true;
        if (currentThread.id.startsWith("group:")) {
          const groupId = Number(currentThread.id.replace("group:", ""));
          socket.emit("typing:start", { groupId });
        } else {
          socket.emit("typing:start", { toUserId: Number(currentThread.id) });
        }
      }
      if (typingRef.current.timer) clearTimeout(typingRef.current.timer);
      typingRef.current.timer = setTimeout(() => {
        typingRef.current.active = false;
        stopTypingOnThread(currentThread.id);
      }, 1200);
      // Cleanup: if thread changes while timer is pending, stop on this thread
      return () => {
        if (typingRef.current.timer) {
          clearTimeout(typingRef.current.timer);
          typingRef.current.timer = null;
        }
        if (typingRef.current.active) {
          typingRef.current.active = false;
          stopTypingOnThread(currentThread.id);
        }
      };
    }

    if (typingRef.current.active) {
      typingRef.current.active = false;
      stopTypingOnThread(currentThread.id);
    }
  }, [currentThread, draft, socket]);

  return socket;
}
