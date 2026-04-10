import { ChatMessage } from "@/constants/messages";
import { MessageThread, TypingStatus } from "@/types/messages";
import { parseReplyPrefix } from "@/lib/messages/reply";
import { useEffect, useRef } from "react";
import { useSocket } from "@/context/SocketContext";
import {
  SocketMessageNewPayload,
  SocketGroupMessagePayload,
  SocketTypingUpdatePayload,
  SocketMessageReactionPayload,
  SocketMessageDeletedPayload,
} from "@/types/socket-api";

type UseMessagesRealtimeParams = {
  token: string | null | undefined;
  role: string;
  profileId: number;
  draft: string;
  currentThread: MessageThread | null;
  groupMembers: Record<number, Record<number, { name: string; avatar?: string | null }>>;
  loadMessages: (options?: { silent?: boolean }) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setThreads: React.Dispatch<React.SetStateAction<MessageThread[]>>;
  setTypingStatus: React.Dispatch<React.SetStateAction<TypingStatus>>;
};

export function useMessagesRealtime({
  profileId,
  draft,
  currentThread,
  groupMembers,
  loadMessages,
  setMessages,
  setThreads,
  setTypingStatus,
}: UseMessagesRealtimeParams) {
  const { socket } = useSocket();
  const typingRef = useRef<{ active: boolean; timer?: ReturnType<typeof setTimeout> | null }>({ active: false, timer: null });

  // --- Stable refs so socket handlers always see latest values ---
  const profileIdRef = useRef(profileId);
  const currentThreadIdRef = useRef<string | null>(currentThread?.id ?? null);
  const groupMembersRef = useRef(groupMembers);
  const loadMessagesRef = useRef(loadMessages);
  const setMessagesRef = useRef(setMessages);
  const setThreadsRef = useRef(setThreads);
  const setTypingStatusRef = useRef(setTypingStatus);

  // Keep refs in sync
  useEffect(() => { profileIdRef.current = profileId; }, [profileId]);
  useEffect(() => { currentThreadIdRef.current = currentThread?.id ?? null; }, [currentThread?.id]);
  useEffect(() => { groupMembersRef.current = groupMembers; }, [groupMembers]);
  useEffect(() => { loadMessagesRef.current = loadMessages; }, [loadMessages]);
  useEffect(() => { setMessagesRef.current = setMessages; }, [setMessages]);
  useEffect(() => { setThreadsRef.current = setThreads; }, [setThreads]);
  useEffect(() => { setTypingStatusRef.current = setTypingStatus; }, [setTypingStatus]);

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
      const message: ChatMessage = {
        id: String(payload.id),
        threadId: threadIdFromMessage,
        from: String(senderId) === selfId ? "user" : "coach",
        text: parsed.text,
        replyToMessageId: payload.videoUploadId ? undefined : parsed.replyToMessageId ?? undefined,
        replyPreview: parsed.replyPreview || undefined,
        contentType: payload.contentType ?? "text",
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
      const message: ChatMessage = {
        id: `group-${payload.id}`,
        threadId: `group:${groupId}`,
        from: String(payload.senderId) === selfId ? "user" : "coach",
        text: parsed.text,
        replyToMessageId: parsed.replyToMessageId ?? undefined,
        replyPreview: parsed.replyPreview || undefined,
        contentType: payload.contentType ?? "text",
        mediaUrl: payload.mediaUrl ?? undefined,
        time: payload.createdAt
          ? new Date(payload.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
        status: "sent",
        authorName: currentGroupMembers[groupId]?.[payload.senderId]?.name,
        authorAvatar: currentGroupMembers[groupId]?.[payload.senderId]?.avatar ?? null,
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
        const groupThreadId = `group:${groupId}`;
        const updatedAtMs = payload.createdAt ? new Date(payload.createdAt).getTime() : Date.now();
        const existing = prev.find((thread) => thread.id === groupThreadId);
        const isIncoming = String(payload.senderId) !== selfId;
        const isActive = currentThreadId === groupThreadId;

        if (existing) {
          const nextThread = {
            ...existing,
            preview: message.text,
            time: message.time,
            updatedAtMs,
            unread: isIncoming && !isActive ? (existing.unread ?? 0) + 1 : existing.unread ?? 0,
          };
          return bumpThreadToTop(prev, nextThread);
        }

        const createdThread: MessageThread = {
          id: groupThreadId,
          name: payload.groupName ?? "Group Chat",
          role: "Group",
          preview: message.text,
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
      loadMessagesRef.current({ silent: true });
    };

    const handleGroupMessageDeleted = (payload: SocketMessageDeletedPayload) => {
      const id = `group-${payload.messageId}`;
      setMessagesRef.current((prev) => prev.filter((message) => message.id !== id));
    };

    socket.on("message:new", handleMessageNew);
    socket.on("group:message", handleGroupMessage);
    socket.on("typing:update", handleTypingUpdate);
    socket.on("message:reaction", handleMessageReaction);
    socket.on("group:reaction", handleGroupReaction);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("group:message:deleted", handleGroupMessageDeleted);

    return () => {
      socket.off("message:new", handleMessageNew);
      socket.off("group:message", handleGroupMessage);
      socket.off("typing:update", handleTypingUpdate);
      socket.off("message:reaction", handleMessageReaction);
      socket.off("group:reaction", handleGroupReaction);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("group:message:deleted", handleGroupMessageDeleted);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !currentThread) return;

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
        if (currentThread.id.startsWith("group:")) {
          const groupId = Number(currentThread.id.replace("group:", ""));
          socket.emit("typing:stop", { groupId });
        } else {
          socket.emit("typing:stop", { toUserId: Number(currentThread.id) });
        }
      }, 1200);
      return;
    }

    if (typingRef.current.active) {
      typingRef.current.active = false;
      if (currentThread.id.startsWith("group:")) {
        const groupId = Number(currentThread.id.replace("group:", ""));
        socket.emit("typing:stop", { groupId });
      } else {
        socket.emit("typing:stop", { toUserId: Number(currentThread.id) });
      }
    }
  }, [currentThread, draft, socket]);

  return socket;
}
