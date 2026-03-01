import { ChatMessage } from "@/constants/messages";
import { apiRequest } from "@/lib/api";
import { useRole } from "@/context/RoleContext";
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

export function useMessagesController() {
  const reactionOptions = ["👍", "🔥", "💪", "👏", "❤️"];

  const router = useRouter();
  const { thread, id } = useLocalSearchParams<{ thread?: string; id?: string }>();
  const threadId = thread || id;
  const { token, profile, programTier, athleteUserId } = useAppSelector((state) => state.user);
  const { role } = useRole();
  const effectiveProfileId = useMemo(() => {
    if (role === "Athlete" && athleteUserId) return Number(athleteUserId);
    return Number(profile.id ?? 0);
  }, [athleteUserId, profile.id, role]);
  const actingHeaders = useMemo(() => {
    if (role === "Athlete" && athleteUserId) {
      return { "X-Acting-User-Id": String(athleteUserId) };
    }
    return undefined;
  }, [role, athleteUserId]);

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [groupMembers, setGroupMembers] = useState<
    Record<number, Record<number, { name: string; avatar?: string | null }>>
  >({});
  const [typingStatus, setTypingStatus] = useState<TypingStatus>({});
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [draft, setDraft] = useState("");
  const draftRef = useRef("");
  const [reactionTarget, setReactionTarget] = useState<ChatMessage | null>(null);
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);
  const [openingThreadId, setOpeningThreadId] = useState<string | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);

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

  const localMessages = useMemo(() => {
    if (!currentThread) return [];
    return messages.filter((msg) => msg.threadId === currentThread.id);
  }, [currentThread, messages]);

  const loadMessages = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [data, groupsData] = await Promise.all([
        apiRequest<{
          messages: any[];
          coach?: { id: number; name: string; role?: string; profilePicture?: string | null };
          coaches?: { id: number; name: string; role: string; profilePicture?: string | null; isAi?: boolean }[];
        }>("/messages", {
          token,
          headers: actingHeaders,
          skipCache: true,
        }),
        apiRequest<{ groups: any[] }>("/chat/groups", { 
          token, 
          headers: actingHeaders,
          skipCache: true 
        }),
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
        updatedAtMs: 0,
      }));

      const selfId = String(effectiveProfileId ?? "");
      const isPremium = programTier === "PHP_Premium";

      const coachThreads = (data.coaches ?? (data.coach ? [data.coach] : []))
        .filter((c: any) => !c.isAi)
        .map((c: any) => {
        const lastMsg = (data.messages ?? [])
          .filter((m: any) => String(m.senderId) === String(c.id) || String(m.receiverId) === String(c.id))
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        return {
          id: String(c.id),
          name: c.name,
          role: c.role ?? "Coach",
          preview: lastMsg ? lastMsg.content : "Start the conversation",
          time: lastMsg?.createdAt
            ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "",
          updatedAtMs: lastMsg?.createdAt ? new Date(lastMsg.createdAt).getTime() : 0,
          pinned: false,
          premium: isPremium,
          unread: (data.messages ?? []).filter((msg: any) => !msg.read && String(msg.senderId) === String(c.id)).length ?? 0,
          lastSeen: "Active",
          responseTime: isPremium ? "Priority response window" : "Standard response window",
          avatarUrl: c.profilePicture ?? null,
          isAi: false,
        };
      });

      const mappedMessages = (data.messages ?? []).map((msg: any) => {
        const otherId = String(msg.senderId) === selfId ? String(msg.receiverId) : String(msg.senderId);
        const otherCoach = (data.coaches ?? (data.coach ? [data.coach] : [])).find((c: any) => String(c.id) === otherId);

        return {
          id: String(msg.id),
          threadId: otherId,
          from: String(msg.senderId) === selfId ? "user" : "coach",
          text: msg.content,
          contentType: msg.contentType ?? "text",
          mediaUrl: msg.mediaUrl ?? undefined,
          videoUploadId: msg.videoUploadId ?? undefined,
          time: msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
          status: msg.read ? "read" : "sent",
          reactions: msg.reactions ?? [],
          authorAvatar: String(msg.senderId) === selfId ? null : (otherCoach?.profilePicture ?? null),
        };
      }) as ChatMessage[];

      const sortedThreads = [...coachThreads, ...groupThreads].sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      setThreads(sortedThreads);
      setMessages(mappedMessages);
    } catch (error) {
      console.warn("Failed to load messages", error);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveProfileId, programTier, token, actingHeaders]);

  const loadGroupMessages = useCallback(
    async (groupId: number) => {
      if (!token) return;
      setIsThreadLoading(true);
      try {
        const [data, membersData] = await Promise.all([
          apiRequest<{ messages: any[] }>(`/chat/groups/${groupId}/messages`, { 
            token,
            headers: actingHeaders 
          }),
          apiRequest<{ members: any[] }>(`/chat/groups/${groupId}/members`, { 
            token,
            headers: actingHeaders 
          }),
        ]);
        const memberMap = membersData.members.reduce<Record<number, { name: string; avatar?: string | null }>>(
          (acc, member) => {
            acc[member.userId] = {
              name: member.name || member.email,
              avatar: member.profilePicture ?? null,
            };
          return acc;
          },
          {}
        );
        setGroupMembers((prev) => ({ ...prev, [groupId]: memberMap }));

        const selfId = String(effectiveProfileId ?? "");
        const mappedMessages = (data.messages ?? []).map((msg: any) => ({
          id: `group-${msg.id}`,
          threadId: `group:${groupId}`,
          from:
            String(msg.senderId) === selfId
              ? "user"
              : "coach",
          text: msg.content,
          contentType: msg.contentType ?? "text",
          mediaUrl: msg.mediaUrl ?? undefined,
          time: msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
          status: "sent",
          authorName: memberMap[msg.senderId]?.name,
          authorAvatar: memberMap[msg.senderId]?.avatar ?? null,
          reactions: msg.reactions ?? [],
        })) as ChatMessage[];

        setMessages((prev) => {
          const remaining = prev.filter((msg) => msg.threadId !== `group:${groupId}`);
          return [...remaining, ...mappedMessages];
        });
        
        if (mappedMessages.length > 0) {
          const lastMsg = mappedMessages[mappedMessages.length - 1];
          setThreads((prev) => 
            prev.map(t => 
              t.id === `group:${groupId}` 
                ? { 
                    ...t, 
                    preview: lastMsg.text, 
                    time: lastMsg.time, 
                    updatedAtMs: Date.now() 
                  } 
                : t
            )
          );
        }
      } catch (error) {
        console.warn("Failed to load group messages", error);
      } finally {
        setIsThreadLoading(false);
      }
    },
    [effectiveProfileId, token]
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
        await loadGroupMessages(groupId);
      } else {
        await apiRequest("/messages", {
          method: "POST",
          token,
          headers: actingHeaders,
          body: { 
            content: text.trim(),
            receiverId: isNaN(Number(threadId)) ? undefined : Number(threadId)
          },
        });
        await loadMessages();
      }
    },
    [loadGroupMessages, loadMessages, token]
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
    (thread: MessageThread) => {
      // Allow re-opening from inbox even if the opening flag stuck previously.
      if (openingThreadId === thread.id && threadId === thread.id) return;
      setOpeningThreadId(thread.id);
      setSelectedThread(thread);
      router.push(`/messages/${thread.id}`);
    },
    [openingThreadId, router, threadId]
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
    [token]
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
        if (thread) {
          openThread(thread);
          return;
        }
        router.push(`/messages/${threadId}`);
      });
    });

    return () => {
      subscription?.remove();
    };
  }, [markDirectThreadReadById, openThread, router, sendReplyToThread, threads]);

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
      const presign = await apiRequest<{ uploadUrl: string; publicUrl: string; key: string }>("/media/presign", {
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

      const contentType: "text" | "image" | "video" = input.mimeType.startsWith("image/")
        ? "image"
        : input.mimeType.startsWith("video/")
        ? "video"
        : "text";
      return { mediaUrl: presign.publicUrl, contentType };
    },
    [token]
  );

  const sendMessagePayload = useCallback(
    async (payload: { text?: string; mediaUrl?: string; contentType?: "text" | "image" | "video" }) => {
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
            contentType: payload.contentType ?? "text",
            mediaUrl: payload.mediaUrl,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            status: "sent",
            authorName: profile.name ?? undefined,
            clientId,
          },
        ]);

        setThreads((prev) =>
          prev.map((t) =>
            t.id === `group:${groupId}`
              ? {
                  ...t,
                  preview: trimmed || "Attachment",
                  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  updatedAtMs: Date.now(),
                }
              : t
          )
        );

        if (socket?.connected) {
          socket.emit("group:send", {
            groupId,
            content: trimmed || "Attachment",
            contentType: payload.contentType ?? "text",
            mediaUrl: payload.mediaUrl,
            clientId,
            actingUserId: actingHeaders ? actingHeaders["X-Acting-User-Id"] : undefined,
          });
        } else {
          await apiRequest(`/chat/groups/${groupId}/messages`, {
            method: "POST",
            token,
            headers: actingHeaders,
            body: {
              content: trimmed || "Attachment",
              contentType: payload.contentType ?? "text",
              mediaUrl: payload.mediaUrl,
            },
          });
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
          contentType: payload.contentType ?? "text",
          mediaUrl: payload.mediaUrl,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                updatedAtMs: Date.now(),
              }
            : t
        )
      );

      if (socket?.connected) {
        socket.emit("message:send", {
          toUserId,
          content: trimmed || "Attachment",
          contentType: payload.contentType ?? "text",
          mediaUrl: payload.mediaUrl,
          clientId,
          actingUserId: actingHeaders ? actingHeaders["X-Acting-User-Id"] : undefined,
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
            clientId,
          },
        });
      }
    },
    [currentThread, profile.name, token]
  );

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
    [token]
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
    [token]
  );

  const setDraftValue = useCallback((value: string) => {
    draftRef.current = value;
    setDraft(value);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = draftRef.current.trim();
    if (!trimmed && !pendingAttachment) return;
    try {
      let upload: { mediaUrl: string; contentType: "text" | "image" | "video" } | null = null;
      if (pendingAttachment) {
        setIsUploadingAttachment(true);
        upload = await uploadAttachment(pendingAttachment);
      }
      await sendMessagePayload({
        text: trimmed || (pendingAttachment ? pendingAttachment.fileName : ""),
        contentType: upload?.contentType ?? "text",
        mediaUrl: upload?.mediaUrl,
      });
      setDraftValue("");
      setPendingAttachment(null);
    } catch (error) {
      console.warn("Failed to send message", error);
    } finally {
      setIsUploadingAttachment(false);
    }
  }, [pendingAttachment, sendMessagePayload, uploadAttachment, setDraftValue]);

  const handleAttachImage = useCallback(async () => {
    if (!currentThread || !token || isUploadingAttachment) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
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
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
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

  const { socket, setActiveThreadId } = useSocket();
  useMessagesRealtime({
    token,
    role,
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
    if (!currentThread) return;
    const interval = setInterval(() => {
      if (socket?.connected) return;
      if (currentThread.id.startsWith("group:")) {
        const groupId = Number(currentThread.id.replace("group:", ""));
        if (Number.isFinite(groupId)) {
          loadGroupMessages(groupId);
        }
      } else {
        loadMessages();
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [currentThread, loadGroupMessages, loadMessages]);

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
    handleAttachFile,
    handleAttachImage,
    handleAttachVideo,
    handleTakePhoto,
    handleRecordVideo,
    handleToggleReaction,
    handleDeleteMessage,
    loadMessages,
  };
}
