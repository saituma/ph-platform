import { ChatMessage } from "@/constants/messages";
import { apiRequest } from "@/lib/api";
import { parseReplyPrefix } from "@/lib/messages/reply";

import { useAppSelector } from "@/store/hooks";
import { MessageThread, TypingStatus } from "@/types/messages";
import { useMessagesRealtime } from "@/hooks/useMessagesRealtime";
import { useSocket } from "@/context/SocketContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getNotifications } from "@/lib/notifications";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Platform } from "react-native";

type PendingAttachment = {
  uri: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  isImage: boolean;
};

type MessagesControllerCache = {
  threads: MessageThread[];
  messages: ChatMessage[];
  groupMembers: Record<number, Record<number, { name: string; avatar?: string | null }>>;
  typingStatus: TypingStatus;
  selectedThread: MessageThread | null;
  draft: string;
  updatedAtMs: number;
};

const MESSAGES_CACHE_TTL_MS = 1000 * 60 * 15;
const messagesControllerCacheByProfileId = new Map<number, MessagesControllerCache>();

export function useMessagesController() {
  const reactionOptions = ["👍", "🔥", "💪", "👏", "❤️"];

  const router = useRouter();
  const {
    thread,
    id,
    draft: draftQuery,
  } = useLocalSearchParams<{
    thread?: string;
    id?: string;
    draft?: string;
  }>();
  const threadId = thread || id;
  const { token, profile, programTier, athleteUserId } = useAppSelector(
    (state) => state.user,
  );
  const managedAthletes = useAppSelector((state) => state.user.managedAthletes);
  const actingUserId = useMemo(() => {
    const actingId = athleteUserId ? Number(athleteUserId) : NaN;
    return Number.isFinite(actingId) && actingId > 0 ? actingId : null;
  }, [athleteUserId]);
  const actingHeaders = useMemo(() => {
    if (!actingUserId) return undefined;
    return { "X-Acting-User-Id": String(actingUserId) };
  }, [actingUserId]);
  const effectiveProfileId = useMemo(() => {
    const actingId = athleteUserId ? Number(athleteUserId) : NaN;
    if (Number.isFinite(actingId) && actingId > 0) return actingId;
    const id = profile.id ? Number(profile.id) : 0;
    return Number.isFinite(id) ? id : 0;
  }, [athleteUserId, profile.id]);
  const effectiveProfileName = useMemo(() => {
    const actingId = athleteUserId ? Number(athleteUserId) : NaN;
    if (Number.isFinite(actingId) && actingId > 0 && Array.isArray(managedAthletes)) {
      const found =
        managedAthletes.find(
          (athlete: any) => athlete?.userId === actingId || athlete?.id === actingId,
        ) ?? null;
      const name = found?.name ? String(found.name).trim() : "";
      if (name) return name;
    }
    const fallback = profile?.name ? String(profile.name).trim() : "";
    return fallback || "You";
  }, [athleteUserId, managedAthletes, profile?.name]);

  const { socket, setActiveThreadId } = useSocket();

  const initialCache = useMemo(() => {
    const cached = messagesControllerCacheByProfileId.get(effectiveProfileId);
    if (!cached) return null;
    if (Date.now() - cached.updatedAtMs > MESSAGES_CACHE_TTL_MS) return null;
    return cached;
  }, [effectiveProfileId]);

  const [threads, setThreads] = useState<MessageThread[]>(
    () => initialCache?.threads ?? [],
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => initialCache?.messages ?? [],
  );
  const [isLoading, setIsLoading] = useState(initialCache ? false : true);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [groupMembers, setGroupMembers] = useState<
    Record<number, Record<number, { name: string; avatar?: string | null }>>
  >(() => initialCache?.groupMembers ?? {});
  const [typingStatus, setTypingStatus] = useState<TypingStatus>(
    () => initialCache?.typingStatus ?? {},
  );
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(
    initialCache?.selectedThread ?? null,
  );
  const [draft, setDraft] = useState(() => initialCache?.draft ?? "");
  const draftRef = useRef(initialCache?.draft ?? "");
  const [reactionTarget, setReactionTarget] = useState<ChatMessage | null>(
    null,
  );
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);
  const [openingThreadId, setOpeningThreadId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<{
    messageId: number;
    preview: string;
    authorName?: string;
  } | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingAttachment | null>(null);
  const draftConsumedRef = useRef<string | null>(null);
  const loadMessagesInFlightRef = useRef(false);
  const cacheKeyRef = useRef<number>(effectiveProfileId);

  useEffect(() => {
    const cached = messagesControllerCacheByProfileId.get(effectiveProfileId);
    const next =
      cached && Date.now() - cached.updatedAtMs <= MESSAGES_CACHE_TTL_MS
        ? cached
        : null;

    if (cacheKeyRef.current === effectiveProfileId) return;
    cacheKeyRef.current = effectiveProfileId;
    setThreads(next?.threads ?? []);
    setMessages(next?.messages ?? []);
    setGroupMembers(next?.groupMembers ?? {});
    setTypingStatus(next?.typingStatus ?? {});
    setSelectedThread(next?.selectedThread ?? null);
    setDraft(next?.draft ?? "");
    draftRef.current = next?.draft ?? "";
  }, [effectiveProfileId]);

  useEffect(() => {
    const key = cacheKeyRef.current;
    if (!Number.isFinite(key) || key <= 0) return;
    messagesControllerCacheByProfileId.set(key, {
      threads,
      messages,
      groupMembers,
      typingStatus,
      selectedThread,
      draft: draftRef.current,
      updatedAtMs: Date.now(),
    });
  }, [draft, groupMembers, messages, selectedThread, threads, typingStatus]);

  const sortedThreads = useMemo(() => {
    return [...threads].sort((a, b) => {
      // 1. Pinned items first
      if (!!a.pinned && !b.pinned) return -1;
      if (!a.pinned && !!b.pinned) return 1;

      // 3. Premium threads
      if (!!a.premium && !b.premium) return -1;
      if (!a.premium && !!b.premium) return 1;

      // 4. Most recent message
      const tA = a.updatedAtMs ?? 0;
      const tB = b.updatedAtMs ?? 0;
      return tB - tA;
    });
  }, [threads]);

  const activeThread = useMemo(() => {
    return threads.find((item) => item.id === threadId);
  }, [threadId, threads]);

  const currentThread = activeThread ?? selectedThread;

  useEffect(() => {
    setReplyTarget(null);
  }, [currentThread?.id]);

  useEffect(() => {
    if (!draftQuery || !threadId) return;
    if (!currentThread || currentThread.id !== threadId) return;
    const key = `${threadId}::${String(draftQuery)}`;
    if (draftConsumedRef.current === key) return;
    try {
      const text = decodeURIComponent(String(draftQuery));
      setDraft(text);
      draftRef.current = text;
      draftConsumedRef.current = key;
    } catch {
      setDraft(String(draftQuery));
      draftRef.current = String(draftQuery);
      draftConsumedRef.current = key;
    }
  }, [draftQuery, threadId, currentThread]);

  const localMessages = useMemo(() => {
    if (!currentThread) return [];
    return messages.filter((msg) => msg.threadId === currentThread.id);
  }, [currentThread, messages]);

  const loadMessages = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      if (loadMessagesInFlightRef.current) return;
      loadMessagesInFlightRef.current = true;
      const silent = options?.silent ?? false;

      if (!silent) {
        setIsLoading(true);
      }
      try {
        const [data, groupsData] = await Promise.all([
          apiRequest<{
            messages: any[];
            coach?: {
              id: number;
              name: string;
              role?: string;
              profilePicture?: string | null;
            };
            coaches?: {
              id: number;
              name: string;
              role: string;
              profilePicture?: string | null;
              isAi?: boolean;
            }[];
          }>("/messages", {
            token,
            skipCache: true,
            headers: actingHeaders,
          }),
          apiRequest<{ groups: any[] }>("/chat/groups", {
            token,
            skipCache: true,
            headers: actingHeaders,
          }),
        ]);

        const classifyGroupThread = (group: any) => {
          const category = String(group?.category ?? "")
            .trim()
            .toLowerCase();
          if (category === "announcement") return "announcement" as const;
          if (category === "team") return "team" as const;
          return "coach_group" as const;
        };

        const groupThreads = (groupsData.groups ?? [])
          .filter((group) => classifyGroupThread(group) !== "announcement")
          .map((group) => {
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
          });

        const selfId = String(effectiveProfileId ?? "");
        const isPremium = programTier === "PHP_Premium";

        const coachThreads = (data.coaches ?? (data.coach ? [data.coach] : []))
          .filter((c: any) => !c.isAi)
          .map((c: any) => {
            const lastMsg = (data.messages ?? [])
              .filter(
                (m: any) =>
                  String(m.senderId) === String(c.id) ||
                  String(m.receiverId) === String(c.id),
              )
              .sort(
                (a: any, b: any) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )[0];

            return {
              id: String(c.id),
              name: c.name,
              role: c.role ?? "Coach",
              channelType: "direct" as const,
              preview: lastMsg ? lastMsg.content : "Start the conversation",
              time: lastMsg?.createdAt
                ? new Date(lastMsg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "",
              updatedAtMs: lastMsg?.createdAt
                ? new Date(lastMsg.createdAt).getTime()
                : 0,
              pinned: false,
              premium: isPremium,
              unread:
                (data.messages ?? []).filter(
                  (msg: any) =>
                    !msg.read && String(msg.senderId) === String(c.id),
                ).length ?? 0,
              lastSeen: "Active",
              responseTime: isPremium
                ? "Priority response window"
                : "Standard response window",
              avatarUrl: c.profilePicture ?? null,
              isAi: false,
            };
          });

        const mappedMessages = (data.messages ?? []).map((msg: any) => {
          const otherId =
            String(msg.senderId) === selfId
              ? String(msg.receiverId)
              : String(msg.senderId);
          const otherCoach = (
            data.coaches ?? (data.coach ? [data.coach] : [])
          ).find((c: any) => String(c.id) === otherId);
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
              ? (profile.name ?? undefined)
              : (otherCoach?.name ?? undefined),
            authorAvatar: isOutgoing
              ? null
              : (otherCoach?.profilePicture ?? null),
          };
        }) as ChatMessage[];

        const sortedThreads = [...coachThreads, ...groupThreads].sort(
          (a, b) => b.updatedAtMs - a.updatedAtMs,
        );
        setThreads(sortedThreads);
        setMessages((prev) => {
          const groupMessages = prev.filter((m) =>
            String(m.threadId ?? "").startsWith("group:"),
          );
          const seen = new Set<string>();
          const next: ChatMessage[] = [];
          for (const msg of [...groupMessages, ...mappedMessages]) {
            if (!msg?.id) continue;
            if (seen.has(msg.id)) continue;
            seen.add(msg.id);
            next.push(msg);
          }
          return next;
        });
      } catch (error) {
        console.warn("Failed to load messages", error);
      } finally {
        loadMessagesInFlightRef.current = false;
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [actingHeaders, effectiveProfileId, programTier, token],
  );

  const loadGroupMessages = useCallback(
    async (groupId: number, options?: { silent?: boolean }) => {
      if (!token) return;
      const silent = options?.silent ?? false;
      if (!silent) {
        setIsThreadLoading(true);
      }
      try {
        const [data, membersData] = await Promise.all([
          apiRequest<{ messages: any[] }>(`/chat/groups/${groupId}/messages`, {
            token,
            headers: actingHeaders,
          }),
          apiRequest<{ members: any[] }>(`/chat/groups/${groupId}/members`, {
            token,
            headers: actingHeaders,
          }),
        ]);
        const memberMap = membersData.members.reduce<
          Record<number, { name: string; avatar?: string | null }>
        >((acc, member) => {
          acc[member.userId] = {
            name: member.name || member.email,
            avatar: member.profilePicture ?? null,
          };
          return acc;
        }, {});
        setGroupMembers((prev) => ({ ...prev, [groupId]: memberMap }));

        const selfId = String(effectiveProfileId ?? "");
        const mappedMessages = (data.messages ?? []).map((msg: any) => {
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
        });

        setMessages((prev) => {
          const threadKey = `group:${groupId}`;
          const remaining = prev.filter((msg) => msg.threadId !== threadKey);

          // Preserve optimistic client messages (e.g. offline / before socket echo)
          // so they don't "disappear" on refresh.
          const optimistic = prev.filter(
            (msg) =>
              msg.threadId === threadKey &&
              typeof msg.id === "string" &&
              msg.id.startsWith("client-"),
          );

          const seen = new Set<string>();
          const next: ChatMessage[] = [];
          for (const msg of [...remaining, ...optimistic, ...mappedMessages]) {
            if (seen.has(msg.id)) continue;
            seen.add(msg.id);
            next.push(msg);
          }
          return next;
        });

        if (mappedMessages.length > 0) {
          const lastMsg = mappedMessages[mappedMessages.length - 1];
          setThreads((prev) =>
            prev.map((t) =>
              t.id === `group:${groupId}`
                ? {
                    ...t,
                    preview: lastMsg.text,
                    time: lastMsg.time,
                    updatedAtMs: Date.now(),
                  }
                : t,
            ),
          );
        }
      } catch (error) {
        console.warn("Failed to load group messages", error);
      } finally {
        if (!silent) {
          setIsThreadLoading(false);
        }
      }
    },
    [actingHeaders, effectiveProfileId, token],
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
          headers: actingHeaders,
          body: { content: text.trim() },
        });
        await loadGroupMessages(groupId, { silent: true });
      } else {
        await apiRequest("/messages", {
          method: "POST",
          token,
          headers: actingHeaders,
          body: {
            content: text.trim(),
            receiverId: isNaN(Number(threadId)) ? undefined : Number(threadId),
          },
        });
        await loadMessages({ silent: true });
      }
    },
    [actingHeaders, loadGroupMessages, loadMessages, token],
  );

  const clearThread = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/messages");
    }
    setSelectedThread(null);
    setOpeningThreadId(null);
    setPendingAttachment(null);
  }, [router]);

  const openThread = useCallback(
    (
      thread: MessageThread,
      sharedBoundTag?: string,
      sharedAvatarTag?: string,
    ) => {
      // Allow re-opening from inbox even if the opening flag stuck previously.
      if (openingThreadId === thread.id && threadId === thread.id) return;
      setOpeningThreadId(thread.id);
      setSelectedThread(thread);
      router.push({
        pathname: "/messages/[id]",
        params: {
          id: thread.id,
          sharedBoundTag,
          sharedAvatarTag,
        },
      } as any);
    },
    [openingThreadId, router, threadId],
  );

  const resetOpeningThread = useCallback(() => {
    setOpeningThreadId(null);
  }, []);

  const markDirectThreadRead = useCallback(async () => {
    if (!token || !currentThread) return;
    if (currentThread.id.startsWith("group:")) return;
    try {
      await apiRequest("/messages/read", {
        method: "POST",
        token,
        headers: actingHeaders,
      });
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === currentThread.id ? { ...thread, unread: 0 } : thread,
        ),
      );
      setMessages((prev) =>
        prev.map((msg) =>
          msg.threadId === currentThread.id && msg.from === "coach"
            ? { ...msg, status: "read" }
            : msg,
        ),
      );
    } catch (error) {
      console.warn("Failed to mark messages read", error);
    }
  }, [currentThread, token]);

  const markDirectThreadReadById = useCallback(
    async (threadId: string) => {
      if (!token) return;
      if (threadId.startsWith("group:")) return;
      try {
        await apiRequest("/messages/read", {
          method: "POST",
          token,
          headers: actingHeaders,
        });
        setThreads((prev) =>
          prev.map((thread) =>
            thread.id === threadId ? { ...thread, unread: 0 } : thread,
          ),
        );
        setMessages((prev) =>
          prev.map((msg) =>
            msg.threadId === threadId && msg.from === "coach"
              ? { ...msg, status: "read" }
              : msg,
          ),
        );
      } catch (error) {
        console.warn("Failed to mark messages read", error);
      }
    },
    [actingHeaders, token],
  );

  const markGroupThreadRead = useCallback(async () => {
    if (!token || !currentThread) return;
    if (!currentThread.id.startsWith("group:")) return;
    const raw = currentThread.id.replace(/^group:/, "");
    const groupId = Number(raw);
    if (!Number.isFinite(groupId)) return;
    try {
      await apiRequest(`/chat/groups/${groupId}/read`, {
        method: "POST",
        token,
        headers: actingHeaders,
      });
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === currentThread.id ? { ...thread, unread: 0 } : thread,
        ),
      );
    } catch (error) {
      console.warn("Failed to mark group read", error);
    }
  }, [currentThread, token]);

  useEffect(() => {
    if (!currentThread) return;
    if ((currentThread.unread ?? 0) === 0) return;
    if (currentThread.id.startsWith("group:")) {
      markGroupThreadRead();
      return;
    }
    markDirectThreadRead();
  }, [currentThread, markDirectThreadRead, markGroupThreadRead]);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    getNotifications().then((Notifications) => {
      if (
        !Notifications ||
        typeof Notifications.addNotificationResponseReceivedListener !==
          "function"
      )
        return;
      subscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const actionId = response.actionIdentifier;
          const data = response.notification.request.content.data as
            | { threadId?: string }
            | undefined;
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
          if (thread) {
            openThread(thread);
            return;
          }
          router.push(`/messages/${threadId}`);
        },
      );
    });

    return () => {
      subscription?.remove();
    };
  }, [
    markDirectThreadReadById,
    openThread,
    router,
    sendReplyToThread,
    threads,
  ]);

  const uploadAttachment = useCallback(
    async (input: {
      uri: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      isImage: boolean;
    }) => {
      if (!token) {
        throw new Error("Authentication required");
      }
      const folder = input.isImage ? "messages/images" : "messages/files";
      const presign = await apiRequest<{
        uploadUrl: string;
        publicUrl: string;
        key: string;
      }>("/media/presign", {
        method: "POST",
        token,
        headers: actingHeaders,
        body: {
          folder,
          fileName: input.fileName,
          contentType: input.mimeType,
          sizeBytes: input.sizeBytes,
        },
      });

      const fileResponse = await fetch(input.uri);
      const blob = await fileResponse.blob();
      const uploadResponse = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": input.mimeType,
        },
        body: blob,
      });
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload attachment");
      }

      const contentType: "text" | "image" | "video" = input.mimeType.startsWith(
        "image/",
      )
        ? "image"
        : input.mimeType.startsWith("video/")
          ? "video"
          : "text";
      return { mediaUrl: presign.publicUrl, contentType };
    },
    [actingHeaders, token],
  );

  const sendMessagePayload = useCallback(
    async (payload: {
      text?: string;
      mediaUrl?: string;
      contentType?: "text" | "image" | "video";
    }) => {
      const trimmed = payload.text?.trim() ?? "";
      if ((!trimmed && !payload.mediaUrl) || !currentThread || !token) return;

      if (currentThread.id.startsWith("group:")) {
        const groupId = Number(currentThread.id.replace("group:", ""));
        const clientId = `client-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: clientId,
            threadId: `group:${groupId}`,
            from: "user",
            text: trimmed || "Attachment",
            replyToMessageId: replyTarget?.messageId,
            replyPreview: replyTarget?.preview,
            contentType: payload.contentType ?? "text",
            mediaUrl: payload.mediaUrl,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            status: "sent",
            authorName: effectiveProfileName,
            clientId,
          },
        ]);

        setThreads((prev) =>
          prev.map((t) =>
            t.id === `group:${groupId}`
              ? {
                  ...t,
                  preview: trimmed || "Attachment",
                  time: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  updatedAtMs: Date.now(),
                }
              : t,
          ),
        );

        if (socket?.connected) {
          socket.emit("group:send", {
            groupId,
            content: trimmed || "Attachment",
            contentType: payload.contentType ?? "text",
            mediaUrl: payload.mediaUrl,
            replyToMessageId: replyTarget?.messageId,
            replyPreview: replyTarget?.preview,
            clientId,
            actingUserId: actingUserId ?? undefined,
          });
        } else {
          const created = await apiRequest<{ message?: any }>(
            `/chat/groups/${groupId}/messages`,
            {
              method: "POST",
              token,
              headers: actingHeaders,
              body: {
                content: trimmed || "Attachment",
                contentType: payload.contentType ?? "text",
                mediaUrl: payload.mediaUrl,
                replyToMessageId: replyTarget?.messageId,
                replyPreview: replyTarget?.preview,
              },
            },
          );
          const serverMsg = created?.message;
          if (serverMsg?.id) {
            const parsed = parseReplyPrefix(serverMsg.content);
            const mapped: ChatMessage = {
              id: `group-${serverMsg.id}`,
              threadId: `group:${groupId}`,
              from: "user",
              text: parsed.text,
              replyToMessageId: parsed.replyToMessageId ?? undefined,
              replyPreview: parsed.replyPreview || undefined,
              contentType: serverMsg.contentType ?? payload.contentType ?? "text",
              mediaUrl: serverMsg.mediaUrl ?? payload.mediaUrl,
              time: serverMsg.createdAt
                ? new Date(serverMsg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
              status: "sent",
              authorName: effectiveProfileName,
              authorAvatar: null,
              clientId,
              reactions: serverMsg.reactions ?? [],
            };
            setMessages((prev) => {
              const withoutTemp = prev.filter((m) => m.clientId !== clientId);
              return [...withoutTemp, mapped];
            });
          }
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
          text: trimmed || "Attachment",
          replyToMessageId: replyTarget?.messageId,
          replyPreview: replyTarget?.preview,
          contentType: payload.contentType ?? "text",
          mediaUrl: payload.mediaUrl,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: "sent",
          clientId,
        },
      ]);

      setThreads((prev) =>
        prev.map((t) =>
          t.id === String(toUserId)
            ? {
                ...t,
                preview: trimmed || "Attachment",
                time: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                updatedAtMs: Date.now(),
              }
            : t,
        ),
      );

      if (socket?.connected) {
        socket.emit("message:send", {
          toUserId,
          content: trimmed || "Attachment",
          contentType: payload.contentType ?? "text",
          mediaUrl: payload.mediaUrl,
          replyToMessageId: replyTarget?.messageId,
          replyPreview: replyTarget?.preview,
          clientId,
          actingUserId: actingUserId ?? undefined,
        });
      } else {
        await apiRequest("/messages", {
          method: "POST",
          token,
          headers: actingHeaders,
          body: {
            content: trimmed || "Attachment",
            contentType: payload.contentType ?? "text",
            mediaUrl: payload.mediaUrl,
            replyToMessageId: replyTarget?.messageId,
            replyPreview: replyTarget?.preview,
            clientId,
          },
        });
      }
    },
    [
      actingHeaders,
      actingUserId,
      currentThread,
      effectiveProfileName,
      replyTarget?.messageId,
      replyTarget?.preview,
      socket,
      token,
    ],
  );

  const handleToggleReaction = useCallback(
    async (message: ChatMessage, emoji: string) => {
      if (!token) return;
      try {
        if (message.threadId.startsWith("group:")) {
          const groupId = Number(message.threadId.replace("group:", ""));
          const messageId = Number(message.id.replace("group-", ""));
          if (!Number.isFinite(groupId) || !Number.isFinite(messageId)) return;
          await apiRequest(
            `/chat/groups/${groupId}/messages/${messageId}/reactions`,
            {
              method: "PUT",
              token,
              headers: actingHeaders,
              body: { emoji },
            },
          );
        } else {
          const messageId = Number(message.id);
          if (!Number.isFinite(messageId)) return;
          await apiRequest(`/messages/${messageId}/reactions`, {
            method: "PUT",
            token,
            headers: actingHeaders,
            body: { emoji },
          });
        }
      } catch (error) {
        console.warn("Failed to react to message", error);
      } finally {
        setReactionTarget(null);
      }
    },
    [actingHeaders, token],
  );

  const handleDeleteMessage = useCallback(
    async (message: ChatMessage) => {
      if (!token) return;
      try {
        if (message.threadId.startsWith("group:")) {
          const groupId = Number(message.threadId.replace("group:", ""));
          const messageId = Number(message.id.replace("group-", ""));
          if (!Number.isFinite(groupId) || !Number.isFinite(messageId)) return;
          await apiRequest(`/chat/groups/${groupId}/messages/${messageId}`, {
            method: "DELETE",
            token,
            headers: actingHeaders,
          });
        } else {
          const messageId = Number(message.id);
          if (!Number.isFinite(messageId)) return;
          await apiRequest(`/messages/${messageId}`, {
            method: "DELETE",
            token,
            headers: actingHeaders,
          });
        }
        setMessages((prev) => prev.filter((item) => item.id !== message.id));
      } catch (error) {
        console.warn("Failed to delete message", error);
      }
    },
    [actingHeaders, token],
  );

  const setDraftValue = useCallback((value: string) => {
    draftRef.current = value;
    setDraft(value);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = draftRef.current.trim();
    const attachmentToSend = pendingAttachment;
    if (!trimmed && !attachmentToSend) return;

    // Clear the composer immediately so sending feels instant.
    setDraftValue("");
    setPendingAttachment(null);

    try {
      let upload: {
        mediaUrl: string;
        contentType: "text" | "image" | "video";
      } | null = null;
      if (attachmentToSend) {
        setIsUploadingAttachment(true);
        upload = await uploadAttachment(attachmentToSend);
      }
      await sendMessagePayload({
        text: trimmed || (attachmentToSend ? "Attachment" : ""),
        contentType: upload?.contentType ?? "text",
        mediaUrl: upload?.mediaUrl,
      });
      setReplyTarget(null);
    } catch (error) {
      setDraftValue(trimmed);
      setPendingAttachment(attachmentToSend);
      console.warn("Failed to send message", error);
    } finally {
      setIsUploadingAttachment(false);
    }
  }, [pendingAttachment, sendMessagePayload, uploadAttachment, setDraftValue]);

  const setReplyTargetFromMessage = useCallback((message: ChatMessage) => {
    const numericId = message.threadId.startsWith("group:")
      ? Number(String(message.id).replace(/^group-/, ""))
      : Number(message.id);
    if (!Number.isFinite(numericId)) return;
    const preview = (
      message.text || (message.mediaUrl ? "Media message" : "Message")
    ).slice(0, 160);
    setReplyTarget({
      messageId: numericId,
      preview,
      authorName: message.authorName ?? undefined,
    });
  }, []);

  const clearReplyTarget = useCallback(() => {
    setReplyTarget(null);
  }, []);

  const handleAttachImage = useCallback(async () => {
    if (!currentThread || !token || isUploadingAttachment) return;
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "image/jpeg";
      setPendingAttachment({
        uri: asset.uri,
        fileName: asset.fileName || `photo-${Date.now()}.jpg`,
        mimeType,
        sizeBytes: asset.fileSize ?? 512000,
        isImage: true,
      });
    } catch (error) {
      console.warn("Failed to attach image", error);
    } finally {
      setComposerMenuOpen(false);
    }
  }, [currentThread, isUploadingAttachment, token]);

  const handleAttachVideo = useCallback(async () => {
    if (!currentThread || !token || isUploadingAttachment) return;
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "video/mp4";
      setPendingAttachment({
        uri: asset.uri,
        fileName: asset.fileName || `video-${Date.now()}.mp4`,
        mimeType,
        sizeBytes: asset.fileSize ?? 2000000,
        isImage: false,
      });
    } catch (error) {
      console.warn("Failed to attach video", error);
    } finally {
      setComposerMenuOpen(false);
    }
  }, [currentThread, isUploadingAttachment, token]);

  const handleTakePhoto = useCallback(async () => {
    if (!currentThread || !token || isUploadingAttachment) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "image/jpeg";
      setPendingAttachment({
        uri: asset.uri,
        fileName: asset.fileName || `photo-${Date.now()}.jpg`,
        mimeType,
        sizeBytes: asset.fileSize ?? 512000,
        isImage: true,
      });
    } catch (error) {
      console.warn("Failed to take photo", error);
    } finally {
      setComposerMenuOpen(false);
    }
  }, [currentThread, isUploadingAttachment, token]);

  const handleRecordVideo = useCallback(async () => {
    if (!currentThread || !token || isUploadingAttachment) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["videos"],
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "video/mp4";
      setPendingAttachment({
        uri: asset.uri,
        fileName: asset.fileName || `video-${Date.now()}.mp4`,
        mimeType,
        sizeBytes: asset.fileSize ?? 2000000,
        isImage: false,
      });
    } catch (error) {
      console.warn("Failed to record video", error);
    } finally {
      setComposerMenuOpen(false);
    }
  }, [currentThread, isUploadingAttachment, token]);

  const handleAttachFile = useCallback(async () => {
    if (!currentThread || !token || isUploadingAttachment) return;
    try {
      const DocumentPicker = await import("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "application/octet-stream";
      setPendingAttachment({
        uri: asset.uri,
        fileName: asset.name || `file-${Date.now()}`,
        mimeType,
        sizeBytes: asset.size ?? 512000,
        isImage: mimeType.startsWith("image/"),
      });
    } catch (error) {
      console.warn("Failed to attach file", error);
      setComposerMenuOpen(false);
    }
  }, [currentThread, isUploadingAttachment, token]);

  const handleSendGif = useCallback(
    async (gifUrl: string) => {
      if (!gifUrl || !token || !currentThread || isUploadingAttachment) return;
      const caption = draftRef.current.trim();

      // Clear immediately so the UI feels instant.
      setDraftValue("");
      setPendingAttachment(null);

      try {
        await sendMessagePayload({
          text: caption || "GIF",
          contentType: "image",
          mediaUrl: gifUrl,
        });
        setReplyTarget(null);
      } catch (error) {
        setDraftValue(caption);
        console.warn("Failed to send GIF", error);
      }
    },
    [
      currentThread,
      isUploadingAttachment,
      sendMessagePayload,
      setDraftValue,
      token,
    ],
  );

  // Inbox list: poll when Socket.IO is not connected so threads still update without opening a thread.
  useEffect(() => {
    if (!token || threadId) return;
    const id = setInterval(() => {
      if (socket?.connected) return;
      void loadMessages({ silent: true });
    }, 20000);
    return () => clearInterval(id);
  }, [token, threadId, socket?.connected, loadMessages]);

  useMessagesRealtime({
    token,
    role: "Guardian",
    profileId: effectiveProfileId,
    draft,
    currentThread,
    groupMembers,
    loadMessages,
    setMessages,
    setThreads,
    setTypingStatus,
  });

  useEffect(() => {
    setActiveThreadId(currentThread?.id ?? null);
    return () => setActiveThreadId(null);
  }, [currentThread?.id, setActiveThreadId]);

  useEffect(() => {
    if (activeThread) {
      setSelectedThread(activeThread);
      setOpeningThreadId(null);
    } else if (!threadId) {
      setSelectedThread(null);
      setOpeningThreadId(null);
    }
  }, [activeThread, threadId]);

  // Auto-reset opening state when returning to inbox
  useEffect(() => {
    if (!threadId && openingThreadId) {
      setOpeningThreadId(null);
    }
  }, [threadId, openingThreadId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const threadIdValue = currentThread?.id ?? "";
    if (!threadIdValue.startsWith("group:")) return;
    const groupId = Number(threadIdValue.replace("group:", ""));
    if (Number.isFinite(groupId)) {
      void loadGroupMessages(groupId);
    }
  }, [currentThread?.id, loadGroupMessages]);

  useEffect(() => {
    if (!currentThread) return;
    const interval = setInterval(() => {
      if (socket?.connected) return;
      if (currentThread.id.startsWith("group:")) {
        const groupId = Number(currentThread.id.replace("group:", ""));
        if (Number.isFinite(groupId)) {
          void loadGroupMessages(groupId, { silent: true });
        }
      } else {
        void loadMessages({ silent: true });
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [currentThread, loadGroupMessages, loadMessages]);

  // Ensure this client is in the active group room so "group:message" arrives live.
  useEffect(() => {
    if (!socket?.connected) return;
    const threadIdValue = currentThread?.id ?? "";
    if (!threadIdValue.startsWith("group:")) return;
    const groupId = Number(threadIdValue.replace("group:", ""));
    if (!Number.isFinite(groupId)) return;
    socket.emit("group:join", { groupId });
    return () => {
      socket.emit("group:leave", { groupId });
    };
  }, [currentThread?.id, socket?.connected]);

  useEffect(() => {
    setPendingAttachment(null);
  }, [currentThread?.id]);

  useEffect(() => {
    setOpeningThreadId(null);
  }, []);

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
    currentThread,
    sortedThreads,
    localMessages,
    typingStatus,
    isLoading,
    isThreadLoading,
    draft,
    reactionTarget,
    composerMenuOpen,
    replyTarget,
    isUploadingAttachment,
    pendingAttachment,
    openingThreadId,
    setDraft: setDraftValue,
    setReactionTarget,
    setComposerMenuOpen,
    setPendingAttachment,
    openThread,
    resetOpeningThread,
    clearThread,
    handleSend,
    setReplyTargetFromMessage,
    clearReplyTarget,
    handleAttachFile,
    handleAttachImage,
    handleAttachVideo,
    handleSendGif,
    handleTakePhoto,
    handleRecordVideo,
    handleToggleReaction,
    handleDeleteMessage,
    loadMessages,
  };
}
