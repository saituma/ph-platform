import { ChatMessage } from "@/constants/messages";
import { MessageThread, TypingStatus } from "@/types/messages";
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { getNotifications } from "@/lib/notifications";

type UseMessagesRealtimeParams = {
  token: string | null | undefined;
  role: string;
  profileId: number;
  draft: string;
  currentThread: MessageThread | null;
  groupMembers: Record<number, Record<number, { name: string; avatar?: string | null }>>;
  loadMessages: () => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setThreads: React.Dispatch<React.SetStateAction<MessageThread[]>>;
  setTypingStatus: React.Dispatch<React.SetStateAction<TypingStatus>>;
};

export function useMessagesRealtime({
  token,
  role,
  profileId,
  draft,
  currentThread,
  groupMembers,
  loadMessages,
  setMessages,
  setThreads,
  setTypingStatus,
}: UseMessagesRealtimeParams) {
  const socketRef = useRef<Socket | null>(null);
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
    if (!token) return;
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
    const socketUrl = baseUrl ? baseUrl.replace(/\/api\/?$/, "") : "";
    if (!socketUrl) return;

    const socket: Socket = io(socketUrl, {
      auth: { token },
      // React Native requires websocket first, as XHR polling can timeout on the bridge
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on("message:new", async (payload: any) => {
      if (!payload?.id) return;
      const senderId = Number(payload.senderId);
      const receiverId = Number(payload.receiverId);
      const currentProfileId = profileIdRef.current;
      const selfId = String(currentProfileId ?? "");
      const threadIdFromMessage = String(String(senderId) === selfId ? receiverId : senderId);
      const currentThreadId = currentThreadIdRef.current;
      const message: ChatMessage = {
        id: String(payload.id),
        threadId: threadIdFromMessage,
        from: String(senderId) === selfId ? "user" : "coach",
        text: payload.content,
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
        const existing = prev.find((t) => t.id === threadIdFromMessage);
        if (!existing) {
          loadMessagesRef.current();
          return prev;
        }
        const isIncoming = String(senderId) !== selfId;
        const isActiveThread = currentThreadId === threadIdFromMessage;
        return prev.map((t) =>
          t.id === threadIdFromMessage
            ? {
                ...t,
                preview: message.text,
                time: message.time,
                updatedAtMs: payload.createdAt ? new Date(payload.createdAt).getTime() : Date.now(),
                unread: isIncoming && !isActiveThread ? (t.unread ?? 0) + 1 : t.unread ?? 0,
              }
            : t
        );
      });

      if (String(senderId) !== selfId) {
        const Notifications = await getNotifications();
        if (!Notifications || typeof Notifications.scheduleNotificationAsync !== "function") return;
        const isResponseVideo = payload.contentType === "video" && Number.isFinite(payload.videoUploadId);
        const notificationTitle = isResponseVideo ? "Coach response video" : "New message";
        const notificationBody = isResponseVideo
          ? "Your coach sent a response video."
          : payload.content ?? "You received a new message";
        Notifications.scheduleNotificationAsync({
          content: {
            title: notificationTitle,
            body: notificationBody,
            sound: "default",
            categoryIdentifier: "messages",
            data: { threadId: String(threadIdFromMessage) },
          },
          trigger: null,
        });
      }
    });

    socket.on("group:message", async (payload: any) => {
      if (!payload?.id || !payload?.groupId) return;
      const groupId = Number(payload.groupId);
      const currentProfileId = profileIdRef.current;
      const currentGroupMembers = groupMembersRef.current;
      const currentThreadId = currentThreadIdRef.current;
      const selfId = String(currentProfileId ?? "");
      const message: ChatMessage = {
        id: `group-${payload.id}`,
        threadId: `group:${groupId}`,
        from: String(payload.senderId) === selfId ? "user" : "coach",
        text: payload.content,
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

      setThreadsRef.current((prev) =>
        prev.map((t) =>
          t.id === `group:${groupId}`
            ? {
                ...t,
                preview: message.text,
                time: message.time,
                updatedAtMs: payload.createdAt ? new Date(payload.createdAt).getTime() : Date.now(),
                unread:
                  String(payload.senderId) !== selfId && currentThreadId !== `group:${groupId}`
                    ? (t.unread ?? 0) + 1
                    : t.unread ?? 0,
              }
            : t
        )
      );

      if (String(payload.senderId) !== selfId) {
        const Notifications = await getNotifications();
        if (!Notifications) return;
        Notifications.scheduleNotificationAsync({
          content: {
            title: "New group message",
            body: payload.content ?? "You received a new group message",
            sound: "default",
            categoryIdentifier: "messages",
            data: { threadId: `group:${groupId}` },
          },
          trigger: null,
        });
      }
    });

    socket.on(
      "typing:update",
      (payload: { name: string; isTyping: boolean; scope: string; groupId?: number; fromUserId?: number }) => {
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
      }
    );

    socket.on("message:reaction", (payload: { messageId: number; reactions: ChatMessage["reactions"] }) => {
      const id = String(payload.messageId);
      setMessagesRef.current((prev) =>
        prev.map((message) => (message.id === id ? { ...message, reactions: payload.reactions ?? [] } : message))
      );
    });

    socket.on("group:reaction", (payload: { messageId: number; reactions: ChatMessage["reactions"] }) => {
      const id = `group-${payload.messageId}`;
      setMessagesRef.current((prev) =>
        prev.map((message) => (message.id === id ? { ...message, reactions: payload.reactions ?? [] } : message))
      );
    });

    socket.on("message:deleted", (payload: { messageId: number }) => {
      const id = String(payload.messageId);
      setMessagesRef.current((prev) => prev.filter((message) => message.id !== id));
      setThreadsRef.current((prev) => {
        const currentThreadId = currentThreadIdRef.current;
        return prev.map((thread) =>
          thread.id === currentThreadId ? { ...thread, preview: thread.preview, time: thread.time } : thread
        );
      });
      loadMessagesRef.current();
    });

    socket.on("group:message:deleted", (payload: { messageId: number }) => {
      const id = `group-${payload.messageId}`;
      setMessagesRef.current((prev) => prev.filter((message) => message.id !== id));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const socket = socketRef.current;
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
  }, [currentThread, draft]);

  return socketRef;
}
