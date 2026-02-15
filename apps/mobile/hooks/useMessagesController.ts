import { ChatMessage } from "@/constants/messages";
import { apiRequest } from "@/lib/api";
import { useRole } from "@/context/RoleContext";
import { useAppSelector } from "@/store/hooks";
import { MessageThread, TypingStatus } from "@/types/messages";
import { useMessagesRealtime } from "@/hooks/useMessagesRealtime";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getNotifications } from "@/lib/notifications";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BackHandler, Platform } from "react-native";

export function useMessagesController() {
  const reactionOptions = ["👍", "🔥", "💪", "👏", "❤️"];
  const quickReplyOptions = [
    "Great work. Keep this pace for the next session.",
    "Received. I will review and get back to you shortly.",
    "Can you share an update after your next workout?",
    "Nice progress. Let's keep this consistent this week.",
  ];

  const router = useRouter();
  const { thread: threadId } = useLocalSearchParams<{ thread?: string }>();
  const { token, profile, athleteUserId } = useAppSelector((state) => state.user);
  const { role } = useRole();

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [groupMembers, setGroupMembers] = useState<Record<number, Record<number, string>>>({});
  const [typingStatus, setTypingStatus] = useState<TypingStatus>({});
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [draft, setDraft] = useState("");
  const [reactionTarget, setReactionTarget] = useState<ChatMessage | null>(null);
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);
  const [openingThreadId, setOpeningThreadId] = useState<string | null>(null);

  const sortedThreads = useMemo(() => {
    return [...threads].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (a.premium && !b.premium) return -1;
      if (!a.premium && b.premium) return 1;
      return 0;
    });
  }, [threads]);

  const activeThread = useMemo(() => {
    return threads.find((item) => item.id === threadId);
  }, [threadId, threads]);

  const currentThread = activeThread ?? selectedThread;

  const localMessages = useMemo(() => {
    if (!currentThread) return [];
    return messages.filter((msg) => msg.threadId === currentThread.id);
  }, [currentThread, messages]);

  const loadMessages = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const actingHeaders = role === "Athlete" && athleteUserId ? { "X-Acting-User-Id": String(athleteUserId) } : undefined;
      const [data, groupsData] = await Promise.all([
        apiRequest<{ messages: any[]; coach?: { id: number; name: string; role?: string } }>("/messages", {
          token,
          headers: actingHeaders,
        }),
        apiRequest<{ groups: any[] }>("/chat/groups", { token }),
      ]);

      const groupThreads = (groupsData.groups ?? []).map((group) => ({
        id: `group:${group.id}`,
        name: group.name,
        role: "Group",
        preview: "Group chat",
        time: "",
        pinned: false,
        premium: false,
        unread: 0,
        lastSeen: "Active",
        responseTime: "Group updates",
      }));

      if (!data.coach) {
        setThreads(groupThreads);
        setMessages([]);
        return;
      }

      const coach = data.coach;
      const thread = {
        id: String(coach.id),
        name: coach.name,
        role: coach.role ?? "Coach",
        preview: data.messages?.[data.messages.length - 1]?.content ?? "Start the conversation",
        time: data.messages?.[data.messages.length - 1]?.createdAt
          ? new Date(data.messages[data.messages.length - 1].createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
        pinned: false,
        premium: false,
        unread: data.messages?.filter((msg: any) => !msg.read && msg.senderId === coach.id).length ?? 0,
        lastSeen: "Active",
        responseTime: "Coach replies fast",
      };

      const mappedMessages = (data.messages ?? []).map((msg: any) => ({
        id: String(msg.id),
        threadId: String(coach.id),
        from: msg.senderId === Number(profile.id) ? "user" : "coach",
        text: msg.content,
        time: msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        status: msg.read ? "read" : "sent",
        reactions: msg.reactions ?? [],
      })) as ChatMessage[];

      setThreads([thread, ...groupThreads]);
      setMessages(mappedMessages);
    } catch (error) {
      console.warn("Failed to load messages", error);
    } finally {
      setIsLoading(false);
    }
  }, [athleteUserId, profile.id, role, token]);

  const loadGroupMessages = useCallback(
    async (groupId: number) => {
      if (!token) return;
      setIsThreadLoading(true);
      try {
        const [data, membersData] = await Promise.all([
          apiRequest<{ messages: any[] }>(`/chat/groups/${groupId}/messages`, { token }),
          apiRequest<{ members: any[] }>(`/chat/groups/${groupId}/members`, { token }),
        ]);
        const memberMap = membersData.members.reduce<Record<number, string>>((acc, member) => {
          acc[member.userId] = member.name || member.email;
          return acc;
        }, {});
        setGroupMembers((prev) => ({ ...prev, [groupId]: memberMap }));

        const mappedMessages = (data.messages ?? []).map((msg: any) => ({
          id: `group-${msg.id}`,
          threadId: `group:${groupId}`,
          from: msg.senderId === Number(profile.id) ? "user" : "coach",
          text: msg.content,
          time: msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
          status: "sent",
          authorName: memberMap[msg.senderId],
          reactions: msg.reactions ?? [],
        })) as ChatMessage[];

        setMessages((prev) => {
          const remaining = prev.filter((msg) => msg.threadId !== `group:${groupId}`);
          return [...remaining, ...mappedMessages];
        });
      } catch (error) {
        console.warn("Failed to load group messages", error);
      } finally {
        setIsThreadLoading(false);
      }
    },
    [profile.id, token]
  );

  const sendReplyToThread = useCallback(
    async (threadId: string, text: string) => {
      if (!token || !text.trim()) return;
      if (threadId.startsWith("group:")) {
        const groupId = Number(threadId.replace("group:", ""));
        if (!Number.isFinite(groupId)) return;
        await apiRequest(`/chat/groups/${groupId}/messages`, {
          method: "POST",
          token,
          body: { content: text.trim() },
        });
        await loadGroupMessages(groupId);
      } else {
        await apiRequest("/messages", {
          method: "POST",
          token,
          headers: role === "Athlete" && athleteUserId ? { "X-Acting-User-Id": String(athleteUserId) } : undefined,
          body: { content: text.trim() },
        });
        await loadMessages();
      }
    },
    [athleteUserId, loadGroupMessages, loadMessages, role, token]
  );

  const clearThread = useCallback(() => {
    router.setParams({ thread: undefined });
    setSelectedThread(null);
  }, [router]);

  const openThread = useCallback(
    (thread: MessageThread) => {
      if (openingThreadId === thread.id) return;
      setOpeningThreadId(thread.id);
      setSelectedThread(thread);
      router.setParams({ thread: thread.id });
    },
    [openingThreadId, router]
  );

  const markDirectThreadRead = useCallback(async () => {
    if (!token || !currentThread) return;
    if (currentThread.id.startsWith("group:")) return;
    try {
      await apiRequest("/messages/read", {
        method: "POST",
        token,
        headers: role === "Athlete" && athleteUserId ? { "X-Acting-User-Id": String(athleteUserId) } : undefined,
      });
      setThreads((prev) =>
        prev.map((thread) => (thread.id === currentThread.id ? { ...thread, unread: 0 } : thread))
      );
      setMessages((prev) =>
        prev.map((msg) =>
          msg.threadId === currentThread.id && msg.from === "coach" ? { ...msg, status: "read" } : msg
        )
      );
    } catch (error) {
      console.warn("Failed to mark messages read", error);
    }
  }, [athleteUserId, currentThread, role, token]);

  const markDirectThreadReadById = useCallback(
    async (threadId: string) => {
      if (!token) return;
      if (threadId.startsWith("group:")) return;
      try {
        await apiRequest("/messages/read", {
          method: "POST",
          token,
          headers: role === "Athlete" && athleteUserId ? { "X-Acting-User-Id": String(athleteUserId) } : undefined,
        });
        setThreads((prev) =>
          prev.map((thread) => (thread.id === threadId ? { ...thread, unread: 0 } : thread))
        );
        setMessages((prev) =>
          prev.map((msg) =>
            msg.threadId === threadId && msg.from === "coach" ? { ...msg, status: "read" } : msg
          )
        );
      } catch (error) {
        console.warn("Failed to mark messages read", error);
      }
    },
    [athleteUserId, role, token]
  );

  useEffect(() => {
    if (!currentThread) return;
    if ((currentThread.unread ?? 0) === 0) return;
    markDirectThreadRead();
  }, [currentThread, markDirectThreadRead]);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    getNotifications().then((Notifications) => {
      if (!Notifications || typeof Notifications.addNotificationResponseReceivedListener !== "function") return;
      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const actionId = response.actionIdentifier;
        const data = response.notification.request.content.data as { threadId?: string } | undefined;
        const threadId = data?.threadId;
        if (!threadId) return;
        if (actionId === "mark-read") {
          markDirectThreadReadById(threadId);
          return;
        }
        if (actionId === "reply") {
          const replyText = response.userText ?? "";
          if (replyText.trim()) {
            sendReplyToThread(threadId, replyText);
            markDirectThreadReadById(threadId);
            return;
          }
        }
        const thread = threads.find((item) => item.id === threadId);
        if (thread) openThread(thread);
      });
    });

    return () => {
      subscription?.remove();
    };
  }, [markDirectThreadReadById, openThread, sendReplyToThread, threads]);

  const appendToDraft = useCallback((text: string) => {
    setDraft((prev) => (prev.trim() ? `${prev}\n${text}` : text));
  }, []);

  const handleToggleReaction = useCallback(
    async (message: ChatMessage, emoji: string) => {
      if (!token) return;
      try {
        if (message.threadId.startsWith("group:")) {
          const groupId = Number(message.threadId.replace("group:", ""));
          const messageId = Number(message.id.replace("group-", ""));
          if (!Number.isFinite(groupId) || !Number.isFinite(messageId)) return;
          await apiRequest(`/chat/groups/${groupId}/messages/${messageId}/reactions`, {
            method: "PUT",
            token,
            body: { emoji },
          });
        } else {
          const messageId = Number(message.id);
          if (!Number.isFinite(messageId)) return;
          await apiRequest(`/messages/${messageId}/reactions`, {
            method: "PUT",
            token,
            headers: role === "Athlete" && athleteUserId ? { "X-Acting-User-Id": String(athleteUserId) } : undefined,
            body: { emoji },
          });
        }
      } catch (error) {
        console.warn("Failed to react to message", error);
      } finally {
        setReactionTarget(null);
      }
    },
    [athleteUserId, role, token]
  );

  const handleSend = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed || !currentThread || !token) return;
    const socket = socketRef.current;

    if (socket) {
      if (currentThread.id.startsWith("group:")) {
        const groupId = Number(currentThread.id.replace("group:", ""));
        socket.emit("typing:stop", { groupId });
      } else {
        socket.emit("typing:stop", { toUserId: Number(currentThread.id) });
      }
    }

    if (currentThread.id.startsWith("group:")) {
      const groupId = Number(currentThread.id.replace("group:", ""));
      const clientId = `client-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: clientId,
          threadId: `group:${groupId}`,
          from: "user",
          text: trimmed,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: "sent",
          authorName: profile.name,
          clientId,
        },
      ]);

      if (socket) {
        socket.emit("group:send", {
          groupId,
          content: trimmed,
          actingUserId: role === "Athlete" ? athleteUserId : undefined,
          clientId,
        });
        setDraft("");
      } else {
        apiRequest(`/chat/groups/${groupId}/messages`, { method: "POST", token, body: { content: trimmed } })
          .then(() => {
            setDraft("");
            loadGroupMessages(groupId);
          })
          .catch((error) => console.warn("Failed to send group message", error));
      }
      return;
    }

    const toUserId = Number(currentThread.id);
    const clientId = `client-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: clientId,
        threadId: String(toUserId),
        from: "user",
        text: trimmed,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: "sent",
        clientId,
      },
    ]);

    if (socket) {
      socket.emit("message:send", {
        toUserId,
        content: trimmed,
        actingUserId: role === "Athlete" ? athleteUserId : undefined,
        clientId,
      });
      setDraft("");
    } else {
      apiRequest("/messages", {
        method: "POST",
        token,
        headers: role === "Athlete" && athleteUserId ? { "X-Acting-User-Id": String(athleteUserId) } : undefined,
        body: { content: trimmed, contentType: "text" },
      })
        .then(() => {
          setDraft("");
          loadMessages();
        })
        .catch((error) => console.warn("Failed to send message", error));
    }
  }, [athleteUserId, currentThread, draft, loadGroupMessages, loadMessages, profile.name, role, socketRef, token]);

  const socketRef = useMessagesRealtime({
    token,
    role,
    athleteUserId,
    profileId: Number(profile.id),
    draft,
    currentThread,
    groupMembers,
    loadMessages,
    setMessages,
    setThreads,
    setTypingStatus,
  });

  useEffect(() => {
    if (activeThread) {
      setSelectedThread(activeThread);
      setOpeningThreadId(null);
    } else if (!threadId) {
      setSelectedThread(null);
      setOpeningThreadId(null);
    }
  }, [activeThread, threadId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!currentThread || !currentThread.id.startsWith("group:")) return;
    const groupId = Number(currentThread.id.replace("group:", ""));
    if (Number.isFinite(groupId)) {
      loadGroupMessages(groupId);
    }
  }, [currentThread, loadGroupMessages]);

  useEffect(() => {
    if (Platform.OS !== "android" || !currentThread) return;
    const handler = () => {
      clearThread();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", handler);
    return () => sub.remove();
  }, [clearThread, currentThread]);

  return {
    reactionOptions,
    quickReplyOptions,
    currentThread,
    sortedThreads,
    localMessages,
    typingStatus,
    isLoading,
    isThreadLoading,
    draft,
    reactionTarget,
    composerMenuOpen,
    openingThreadId,
    setDraft,
    setReactionTarget,
    setComposerMenuOpen,
    openThread,
    clearThread,
    handleSend,
    handleToggleReaction,
    appendToDraft,
    loadMessages,
  };
}
