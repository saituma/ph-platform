import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@/components/ui/theme-icons";
import { ChatMessage } from "@/constants/messages";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { useRole } from "@/context/RoleContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { io, Socket } from "socket.io-client";

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0]?.[0] ?? "";
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function MessagesScreen() {
  const reactionOptions = ["👍", "🔥", "💪", "👏", "❤️"];
  const quickReplyOptions = [
    "Great work. Keep this pace for the next session.",
    "Received. I will review and get back to you shortly.",
    "Can you share an update after your next workout?",
    "Nice progress. Let's keep this consistent this week.",
  ];
  const { colors } = useAppTheme();
  const router = useRouter();
  const { thread: threadId } = useLocalSearchParams<{ thread?: string }>();
  const { token, profile, athleteUserId } = useAppSelector((state) => state.user);
  const { role } = useRole();
  const [threads, setThreads] = useState<any[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [groupMembers, setGroupMembers] = useState<Record<number, Record<number, string>>>({});
  const [typingStatus, setTypingStatus] = useState<Record<string, { name: string; isTyping: boolean }>>({});
  const socketRef = useRef<Socket | null>(null);
  const typingRef = useRef<{ active: boolean; timer?: NodeJS.Timeout | null }>({ active: false, timer: null });
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
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

  const threadMessages = useMemo(() => {
    if (!currentThread) return [];
    return messages.filter((msg) => msg.threadId === currentThread.id);
  }, [currentThread, messages]);

  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [reactionTarget, setReactionTarget] = useState<ChatMessage | null>(null);
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);
  const [openingThreadId, setOpeningThreadId] = useState<string | null>(null);

  useEffect(() => {
    setLocalMessages(threadMessages);
  }, [threadMessages]);

  const loadMessages = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const actingHeaders =
        role === "Athlete" && athleteUserId
          ? { "X-Acting-User-Id": String(athleteUserId) }
          : undefined;
      const [data, groupsData] = await Promise.all([
        apiRequest<{
          messages: any[];
          coach?: { id: number; name: string; role?: string };
        }>("/messages", { token, headers: actingHeaders }),
        apiRequest<{ groups: any[] }>("/chat/groups", { token }),
      ]);
      const coach = data.coach;
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
      if (!coach) {
        setThreads(groupThreads);
        setMessages([]);
        return;
      }
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

  const openThread = useCallback(
    (thread: any) => {
      if (openingThreadId === thread.id) return;
      setOpeningThreadId(thread.id);
      setSelectedThread(thread);
      router.setParams({ thread: thread.id });
    },
    [openingThreadId, router]
  );

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

  useEffect(() => {
    if (!currentThread) return;
    if (currentThread.id.startsWith("group:")) {
      const groupId = Number(currentThread.id.replace("group:", ""));
      if (Number.isFinite(groupId)) {
        loadGroupMessages(groupId);
      }
    }
  }, [currentThread, loadGroupMessages]);

  useEffect(() => {
    if (!token) return;
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
    const socketUrl = baseUrl ? baseUrl.replace(/\/api\/?$/, "") : "";
    if (!socketUrl) return;
    const socket: Socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;
    if (role === "Athlete" && athleteUserId) {
      socket.emit("acting:join", { actingUserId: athleteUserId });
    }
    socket.on("message:new", (payload: any) => {
      if (!payload?.id) return;
      const senderId = Number(payload.senderId);
      const receiverId = Number(payload.receiverId);
      const effectiveUserId =
        role === "Athlete" && athleteUserId ? Number(athleteUserId) : Number(profile.id);
      const threadId = String(senderId === effectiveUserId ? receiverId : senderId);
      const message: ChatMessage = {
        id: String(payload.id),
        threadId,
        from: senderId === effectiveUserId ? "user" : "coach",
        text: payload.content,
        time: payload.createdAt
          ? new Date(payload.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
        status: payload.read ? "read" : "sent",
        clientId: payload.clientId,
        reactions: payload.reactions ?? [],
      };
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        if (message.clientId) {
          const withoutTemp = prev.filter((m) => m.clientId !== message.clientId);
          return [...withoutTemp, message];
        }
        return [...prev, message];
      });
      setThreads((prev) => {
        const existing = prev.find((t) => t.id === threadId);
        if (!existing) {
          loadMessages();
          return prev;
        }
        return prev.map((t) =>
          t.id === threadId
            ? {
                ...t,
                preview: message.text,
                time: message.time,
              }
            : t
        );
      });
    });
    socket.on("group:message", (payload: any) => {
      if (!payload?.id || !payload?.groupId) return;
      const groupId = Number(payload.groupId);
      const message: ChatMessage = {
        id: `group-${payload.id}`,
        threadId: `group:${groupId}`,
        from:
          payload.senderId ===
          (role === "Athlete" && athleteUserId ? Number(athleteUserId) : Number(profile.id))
            ? "user"
            : "coach",
        text: payload.content,
        time: payload.createdAt
          ? new Date(payload.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
        status: "sent",
        authorName: groupMembers[groupId]?.[payload.senderId],
        clientId: payload.clientId,
        reactions: payload.reactions ?? [],
      };
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        if (message.clientId) {
          const withoutTemp = prev.filter((m) => m.clientId !== message.clientId);
          return [...withoutTemp, message];
        }
        return [...prev, message];
      });
      setThreads((prev) =>
        prev.map((t) =>
          t.id === `group:${groupId}`
            ? { ...t, preview: message.text, time: message.time }
            : t
        )
      );
    });
    socket.on("typing:update", (payload: { name: string; isTyping: boolean; scope: string; groupId?: number; fromUserId?: number }) => {
      const key =
        payload.scope === "group" && payload.groupId
          ? `group:${payload.groupId}`
          : payload.fromUserId
          ? `user:${payload.fromUserId}`
          : "direct";
      setTypingStatus((prev) => ({
        ...prev,
        [key]: { name: payload.name, isTyping: payload.isTyping },
      }));
    });
    socket.on("message:reaction", (payload: { messageId: number; reactions: ChatMessage["reactions"] }) => {
      const id = String(payload.messageId);
      setMessages((prev) =>
        prev.map((message) => (message.id === id ? { ...message, reactions: payload.reactions ?? [] } : message))
      );
    });
    socket.on("group:reaction", (payload: { messageId: number; reactions: ChatMessage["reactions"] }) => {
      const id = `group-${payload.messageId}`;
      setMessages((prev) =>
        prev.map((message) => (message.id === id ? { ...message, reactions: payload.reactions ?? [] } : message))
      );
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeThread?.id, athleteUserId, loadGroupMessages, loadMessages, role, token]);

  const clearThread = () => {
    router.setParams({ thread: undefined });
    setSelectedThread(null);
  };

  useEffect(() => {
    if (Platform.OS !== "android") return;
    if (!currentThread) return;
    const handler = () => {
      clearThread();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", handler);
    return () => sub.remove();
  }, [currentThread]);

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed || !currentThread) return;
    if (!token) return;
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
        apiRequest(`/chat/groups/${groupId}/messages`, {
          method: "POST",
          token,
          body: { content: trimmed },
        })
          .then(() => {
            setDraft("");
            loadGroupMessages(groupId);
          })
          .catch((error) => {
            console.warn("Failed to send group message", error);
          });
      }
    } else {
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
          headers:
            role === "Athlete" && athleteUserId
              ? { "X-Acting-User-Id": String(athleteUserId) }
              : undefined,
          body: { content: trimmed, contentType: "text" },
        })
          .then(() => {
            setDraft("");
            loadMessages();
          })
          .catch((error) => {
            console.warn("Failed to send message", error);
          });
      }
    }
  };

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
            headers:
              role === "Athlete" && athleteUserId
                ? { "X-Acting-User-Id": String(athleteUserId) }
                : undefined,
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
      if (typingRef.current.timer) {
        clearTimeout(typingRef.current.timer);
      }
      typingRef.current.timer = setTimeout(() => {
        typingRef.current.active = false;
        if (currentThread.id.startsWith("group:")) {
          const groupId = Number(currentThread.id.replace("group:", ""));
          socket.emit("typing:stop", { groupId });
        } else {
          socket.emit("typing:stop", { toUserId: Number(currentThread.id) });
        }
      }, 1200);
    } else if (typingRef.current.active) {
      typingRef.current.active = false;
      if (currentThread.id.startsWith("group:")) {
        const groupId = Number(currentThread.id.replace("group:", ""));
        socket.emit("typing:stop", { groupId });
      } else {
        socket.emit("typing:stop", { toUserId: Number(currentThread.id) });
      }
    }
  }, [draft, currentThread]);

  if (currentThread) {
    return (
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <View className="px-6 pt-4 pb-4 border-b border-app/10 bg-app">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={clearThread}
              className="h-11 w-11 rounded-2xl items-center justify-center border border-app/10 bg-secondary/10"
            >
              <Feather name="chevron-left" size={20} className="text-secondary" />
            </Pressable>

            <View className="flex-1 mx-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-clash text-lg text-app">
                    {currentThread.name}
                  </Text>
                  <Text className="text-xs font-outfit text-secondary mt-0.5">
                    {currentThread.role} ·{" "}
                    {currentThread.lastSeen ?? "Active recently"}
                  </Text>
                </View>
                {currentThread.premium ? (
                  <View className="flex-row items-center px-2 py-1 rounded-full bg-secondary/10 border border-app/10">
                    <Feather name="star" size={12} className="text-accent" />
                    <Text className="ml-1 text-[10px] font-outfit text-secondary uppercase tracking-[1.2px]">
                      Premium
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <Pressable className="h-11 w-11 rounded-2xl items-center justify-center border border-app/10 bg-secondary/10">
              <Feather
                name="more-vertical"
                size={18}
                className="text-secondary"
              />
            </Pressable>
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="h-2 w-2 rounded-full bg-success" />
              <Text className="text-xs font-outfit text-secondary">
                {currentThread.responseTime ?? "Coach replies fast"}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Feather name="shield" size={12} className="text-secondary" />
              <Text className="text-xs font-outfit text-secondary">
                Secure 1:1 thread
              </Text>
            </View>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <FlatList
            className="flex-1"
            data={localMessages}
            keyExtractor={(message) => String(message.id)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 16,
              rowGap: 16,
            }}
            showsVerticalScrollIndicator={false}
            initialNumToRender={16}
            windowSize={7}
            maxToRenderPerBatch={12}
            removeClippedSubviews
          ListHeaderComponent={
            <>
              {isThreadLoading || isLoading ? (
                <View className="mb-4 rounded-2xl border border-app/10 bg-secondary/10 px-4 py-3 flex-row items-center">
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                  <Text className="text-xs font-outfit text-secondary ml-2">
                    Loading messages...
                  </Text>
                </View>
              ) : null}
                <View className="items-center mb-6">
                  <View className="px-3 py-1 rounded-full bg-secondary/10 border border-app/10">
                    <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1.2px]">
                      Today
                    </Text>
                  </View>
                </View>
              </>
            }
            ListEmptyComponent={
              isThreadLoading || isLoading ? (
                <View className="gap-3">
                  {[1, 2, 3].map((item) => (
                    <View key={item} className="rounded-3xl border border-app/10 bg-input px-4 py-3">
                      <View className="h-3 w-24 rounded-full bg-secondary/20" />
                      <View className="h-3 w-full rounded-full bg-secondary/20 mt-2" />
                      <View className="h-3 w-2/3 rounded-full bg-secondary/20 mt-2" />
                    </View>
                  ))}
                </View>
              ) : (
                <View className="rounded-3xl border border-dashed border-app/20 p-4">
                  <Text className="text-sm font-outfit text-secondary">
                    No messages yet.
                  </Text>
                </View>
              )
            }
            renderItem={({ item: message }) => {
              const isUser = message.from === "user";
              const isGroup = currentThread?.id?.startsWith("group:");
              return (
                <View
                  className={`flex-row ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isUser ? (
                    <View
                      className="h-9 w-9 rounded-2xl items-center justify-center mr-3 border"
                      style={{
                        backgroundColor: colors.accentLight,
                        borderColor: colors.border,
                      }}
                    >
                      <Text className="font-clash text-app text-sm">
                        {getInitials(message.authorName || currentThread.name)}
                      </Text>
                    </View>
                  ) : null}

                  <Pressable
                    onLongPress={() => {
                      const isGroup = message.threadId.startsWith("group:");
                      const parsedId = isGroup
                        ? Number(message.id.replace("group-", ""))
                        : Number(message.id);
                      if (!Number.isFinite(parsedId)) return;
                      setReactionTarget(message);
                    }}
                    delayLongPress={260}
                    className={`max-w-[75%] rounded-3xl px-4 py-3 border ${
                      isUser ? "bg-accent" : "bg-input"
                    }`}
                    style={{
                      borderColor: colors.border,
                    }}
                  >
                    {!isUser && isGroup && message.authorName ? (
                      <Text className="text-[10px] font-outfit text-secondary mb-1">
                        {message.authorName}
                      </Text>
                    ) : null}
                    <Text
                      className={`text-sm font-outfit ${
                        isUser ? "text-white" : "text-app"
                      }`}
                    >
                      {message.text}
                    </Text>
                    {message.reactions?.length ? (
                      <View className="flex-row flex-wrap gap-2 mt-2">
                        {message.reactions.map((reaction) => (
                          <Pressable
                            key={`${message.id}-${reaction.emoji}`}
                            className="rounded-full border border-app/10 px-2 py-1"
                            onPress={() => handleToggleReaction(message, reaction.emoji)}
                          >
                            <Text
                              className={`text-[10px] font-outfit ${
                                isUser ? "text-white/80" : "text-secondary"
                              }`}
                            >
                              {reaction.emoji} {reaction.count}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                    <View className="flex-row items-center justify-end mt-2">
                      <Text
                        className={`text-[10px] font-outfit ${
                          isUser ? "text-white/70" : "text-secondary"
                        }`}
                      >
                        {message.time}
                      </Text>
                      {isUser ? (
                        <Feather
                          name="check"
                          size={12}
                          className="text-white/70 ml-2"
                        />
                      ) : null}
                    </View>
                  </Pressable>
                </View>
              );
            }}
          />

          {(() => {
            const key = currentThread?.id?.startsWith("group:")
              ? currentThread.id
              : currentThread?.id
              ? `user:${currentThread.id}`
              : null;
            const typing = key ? typingStatus[key] : null;
            if (!typing?.isTyping) return null;
            return (
              <View className="px-6 pb-3">
                <Text className="text-xs font-outfit text-secondary">
                  {typing.name} is typing...
                </Text>
              </View>
            );
          })()}

          <View className="px-6 pt-3 border-t border-app/10 bg-app pb-4">
            <View
              className="flex-row items-center rounded-3xl border px-4 py-3"
              style={{
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              }}
            >
              <Pressable
                onPress={() => setComposerMenuOpen(true)}
                className="h-9 w-9 rounded-2xl items-center justify-center bg-secondary/10 border border-app/10"
              >
                <Feather name="plus" size={16} className="text-secondary" />
              </Pressable>
              <TextInput
                className="flex-1 mx-3 text-sm font-outfit text-app"
                placeholder="Type your message..."
                placeholderTextColor={colors.textSecondary}
                value={draft}
                onChangeText={setDraft}
                multiline
              />
              <Pressable
                onPress={handleSend}
                className="h-9 w-9 rounded-2xl items-center justify-center bg-accent"
                style={{ opacity: draft.trim() ? 1 : 0.6 }}
              >
                <Feather name="send" size={16} className="text-white" />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
        <Modal
          visible={Boolean(reactionTarget)}
          transparent
          animationType="fade"
          onRequestClose={() => setReactionTarget(null)}
        >
          <Pressable className="flex-1 bg-black/20 justify-end" onPress={() => setReactionTarget(null)}>
            <View className="px-5 pb-8">
              <View className="rounded-3xl border border-app/10 bg-app px-4 py-4">
                <Text className="text-xs font-outfit text-secondary mb-3">React to message</Text>
                <View className="flex-row items-center justify-between">
                  {reactionOptions.map((emoji) => (
                    <Pressable
                      key={emoji}
                      onPress={() => reactionTarget && handleToggleReaction(reactionTarget, emoji)}
                      className="h-11 w-11 items-center justify-center rounded-2xl border border-app/10 bg-input"
                    >
                      <Text className="text-xl">{emoji}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </Pressable>
        </Modal>
        <Modal
          visible={composerMenuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setComposerMenuOpen(false)}
        >
          <Pressable className="flex-1 bg-black/20 justify-end" onPress={() => setComposerMenuOpen(false)}>
            <View className="px-5 pb-8">
              <View className="rounded-3xl border border-app/10 bg-app px-4 py-4">
                <Text className="text-xs font-outfit text-secondary mb-3">Quick actions</Text>
                <View className="gap-2">
                  <Pressable
                    className="rounded-2xl border border-app/10 bg-input px-4 py-3"
                    onPress={() => {
                      appendToDraft(`File attached: document-${Date.now()}.pdf`);
                      setComposerMenuOpen(false);
                    }}
                  >
                    <Text className="text-sm font-outfit text-app">Attach file</Text>
                  </Pressable>
                  <Pressable
                    className="rounded-2xl border border-app/10 bg-input px-4 py-3"
                    onPress={() => {
                      appendToDraft(`Image attached: image-${Date.now()}.jpg`);
                      setComposerMenuOpen(false);
                    }}
                  >
                    <Text className="text-sm font-outfit text-app">Attach image</Text>
                  </Pressable>
                  {quickReplyOptions.map((reply) => (
                    <Pressable
                      key={reply}
                      className="rounded-2xl border border-app/10 bg-input px-4 py-3"
                      onPress={() => {
                        appendToDraft(reply);
                        setComposerMenuOpen(false);
                      }}
                    >
                      <Text className="text-sm font-outfit text-app">{reply}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView
        onRefresh={async () => {
          await loadMessages();
        }}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View className="px-6 pt-6 pb-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-3xl font-clash text-app">Messages</Text>
              <Text className="text-secondary font-outfit text-sm mt-1">
                Direct coach support and updates
              </Text>
            </View>
            <View className="h-11 w-11 rounded-2xl bg-secondary/10 items-center justify-center border border-app/10">
              <Feather name="bell" size={18} className="text-secondary" />
            </View>
          </View>

          <View className="mt-6">
            <View
              className="flex-row items-center rounded-2xl border px-4 h-12"
              style={{
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              }}
            >
              <Feather name="search" size={18} className="text-secondary" />
              <Text className="ml-3 text-secondary font-outfit text-sm">
                Search messages
              </Text>
            </View>
          </View>
        </View>

        <View className="px-6 pb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-clash text-app">Inbox</Text>
            <View className="flex-row items-center gap-2">
              <View className="px-3 py-1 rounded-full bg-secondary/10 border border-app/10">
                <Text className="text-[11px] font-outfit text-secondary uppercase tracking-[1.5px]">
                  Priority
                </Text>
              </View>
            </View>
          </View>

          <View className="gap-3">
            {isLoading
              ? [1, 2, 3, 4].map((item) => (
                  <View
                    key={`skeleton-${item}`}
                    className="rounded-3xl border p-4"
                    style={{
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.border,
                    }}
                  >
                    <View className="flex-row items-center">
                      <View className="h-12 w-12 rounded-2xl bg-secondary/20" />
                      <View className="flex-1 ml-4">
                        <View className="h-4 w-40 rounded-full bg-secondary/20" />
                        <View className="h-3 w-20 rounded-full bg-secondary/20 mt-2" />
                        <View className="h-3 w-full rounded-full bg-secondary/20 mt-3" />
                      </View>
                    </View>
                  </View>
                ))
              : sortedThreads.map((thread) => {
                  const typingKey = thread.id.startsWith("group:")
                    ? thread.id
                    : `user:${thread.id}`;
                  const typing = typingStatus[typingKey];
                  return (
                    <Pressable
                      key={thread.id}
                      className="rounded-3xl border p-4"
                      style={{
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: colors.border,
                      }}
                      onPress={() => openThread(thread)}
                    >
                      <View className="flex-row items-center">
                        <View
                          className="h-12 w-12 rounded-2xl items-center justify-center"
                          style={{
                            backgroundColor: thread.premium
                              ? colors.accentLight
                              : colors.accentLight,
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          <Text className="font-clash text-app text-base">
                            {getInitials(thread.name)}
                          </Text>
                        </View>

                        <View className="flex-1 ml-4">
                          <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-2">
                              <Text className="font-clash text-app text-base">
                                {thread.name}
                              </Text>
                              {thread.premium ? (
                                <View className="flex-row items-center px-2 py-0.5 rounded-full border border-app/10 bg-secondary/10">
                                  <Feather
                                    name="star"
                                    size={12}
                                    className="text-accent"
                                  />
                                  <Text className="ml-1 text-[10px] font-outfit text-secondary uppercase tracking-[1.2px]">
                                    Premium
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                            <View className="flex-row items-center gap-2">
                              {openingThreadId === thread.id ? (
                                <ActivityIndicator size="small" color={colors.textSecondary} />
                              ) : null}
                              <Text className="text-[11px] font-outfit text-secondary">
                                {thread.time}
                              </Text>
                            </View>
                          </View>
                          <Text className="text-[12px] font-outfit text-secondary mt-0.5">
                            {thread.role}
                          </Text>
                          <Text
                            className="text-sm font-outfit text-app mt-2"
                            numberOfLines={2}
                          >
                            {typing?.isTyping ? `${typing.name} is typing...` : thread.preview}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center justify-between mt-4">
                        <View className="flex-row items-center gap-2">
                          {thread.pinned ? (
                            <View className="flex-row items-center px-2 py-1 rounded-full bg-secondary/10 border border-app/10">
                              <Feather
                                name="bookmark"
                                size={12}
                                className="text-secondary"
                              />
                              <Text className="ml-1 text-[10px] font-outfit text-secondary uppercase tracking-[1.2px]">
                                Pinned
                              </Text>
                            </View>
                          ) : null}
                          {thread.premium ? (
                            <View className="flex-row items-center px-2 py-1 rounded-full bg-secondary/10 border border-app/10">
                              <Feather
                                name="zap"
                                size={12}
                                className="text-secondary"
                              />
                              <Text className="ml-1 text-[10px] font-outfit text-secondary uppercase tracking-[1.2px]">
                                Priority
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {thread.unread ? (
                          <View className="px-2.5 py-1 rounded-full bg-accent">
                            <Text className="text-[11px] font-outfit text-white">
                              {thread.unread} new
                            </Text>
                          </View>
                        ) : (
                          <View className="flex-row items-center gap-1">
                            <Feather
                              name="check-circle"
                              size={14}
                              className="text-secondary"
                            />
                            <Text className="text-[11px] font-outfit text-secondary">
                              Up to date
                            </Text>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
            {!sortedThreads.length && !isLoading ? (
              <View className="rounded-3xl border border-dashed border-app/20 p-4">
                <Text className="text-sm font-outfit text-secondary">
                  No conversations yet.
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View className="px-6 pb-10">
          <View className="rounded-3xl border p-5 bg-input">
            <Text className="text-base font-clash text-app">
              Need something urgent?
            </Text>
            <Text className="text-sm font-outfit text-secondary mt-2">
              Premium members get priority response times from your coach.
            </Text>
            <View className="mt-4 flex-row items-center gap-2">
              <View className="h-9 w-9 rounded-2xl bg-secondary/10 items-center justify-center border border-app/10">
                <Feather name="phone" size={16} className="text-secondary" />
              </View>
              <Text className="text-sm font-outfit text-app">
                Book a 1:1 call in Schedule
              </Text>
            </View>
          </View>
        </View>
      </ThemedScrollView>
    </SafeAreaView>
  );
}
