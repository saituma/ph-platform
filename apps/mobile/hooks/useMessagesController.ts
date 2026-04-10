import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useSocket } from "@/context/SocketContext";
import { useMessagesRealtime } from "@/hooks/useMessagesRealtime";
import { getNotifications } from "@/lib/notifications";
import { apiRequest } from "@/lib/api";
import { parseReplyPrefix } from "@/lib/messages/reply";
import { ChatMessage } from "@/constants/messages";
import { MessageThread } from "@/types/messages";
import { ApiChatMessage } from "@/types/chat-api";

import { useChatActingUser } from "./messages/useChatActingUser";
import { useChatState } from "./messages/useChatState";
import { useChatAttachments } from "./messages/useChatAttachments";
import { useChatActions } from "./messages/useChatActions";
import {
  getMessagesRolePrefix,
  messagesTabHref,
  messagesThreadHref,
} from "@/lib/messages/roleMessageRoutes";

export function useMessagesController() {
  const reactionOptions = ["👍", "🔥", "💪", "👏", "❤️"];
  const router = useRouter();
  const { thread, id, draft: draftQuery } = useLocalSearchParams<{
    thread?: string;
    id?: string;
    draft?: string;
  }>();
  const threadId = thread || id;

  const { token, profile, programTier, appRole, apiUserRole } = useAppSelector(
    (state) => state.user,
  );
  const { socket, setActiveThreadId } = useSocket();
  const rolePrefix = useMemo(
    () => getMessagesRolePrefix({ appRole, apiUserRole }),
    [apiUserRole, appRole],
  );

  const {
    actingUserId,
    actingHeaders,
    effectiveProfileId,
    effectiveProfileName,
  } = useChatActingUser();

  const {
    threads,
    setThreads,
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    isThreadLoading,
    setIsThreadLoading,
    groupMembers,
    setGroupMembers,
    typingStatus,
    setTypingStatus,
    selectedThread,
    setSelectedThread,
    draft,
    setDraft,
    draftRef,
    replyTarget,
    setReplyTarget,
    currentThread,
    localMessages,
    activeThread,
  } = useChatState(effectiveProfileId, threadId);

  const {
    isUploadingAttachment,
    setIsUploadingAttachment,
    pendingAttachment,
    setPendingAttachment,
    composerMenuOpen,
    setComposerMenuOpen,
    uploadAttachment,
    handleAttachImage,
    handleAttachVideo,
    handleTakePhoto,
    handleRecordVideo,
    handleAttachFile,
  } = useChatAttachments(token, actingHeaders);

  const {
    loadMessages,
    loadGroupMessages,
    sendReplyToThread,
    markDirectThreadReadById,
    markGroupThreadRead,
    handleDeleteMessage,
    handleToggleReaction,
  } = useChatActions({
    token,
    actingHeaders,
    actingUserId,
    effectiveProfileId,
    effectiveProfileName,
    profileName: profile.name,
    programTier,
    socket,
    setThreads,
    setMessages,
    setIsLoading,
    setIsThreadLoading,
    setGroupMembers,
  });

  const [openingThreadId, setOpeningThreadId] = useState<string | null>(null);
  const draftConsumedRef = useRef<string | null>(null);

  const sortedThreads = useMemo(() => {
    return [...threads].sort((a, b) => {
      if (!!a.pinned && !b.pinned) return -1;
      if (!a.pinned && !!b.pinned) return 1;
      if (!!a.premium && !b.premium) return -1;
      if (!a.premium && !!b.premium) return 1;
      return (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0);
    });
  }, [threads]);

  useEffect(() => {
    setReplyTarget(null);
  }, [currentThread?.id, setReplyTarget]);

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
  }, [draftQuery, threadId, currentThread, setDraft, draftRef]);

  const clearThread = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(messagesTabHref);
    }
    setSelectedThread(null);
    setOpeningThreadId(null);
    setPendingAttachment(null);
  }, [router, setSelectedThread, setPendingAttachment]);

  const openThread = useCallback(
    (
      thread: MessageThread,
      sharedBoundTag?: string,
      sharedAvatarTag?: string,
    ) => {
      if (openingThreadId === thread.id && threadId === thread.id) return;
      setOpeningThreadId(thread.id);
      setSelectedThread(thread);
      router.push({
        pathname: `/${rolePrefix}/messages/[id]`,
        params: { id: thread.id, sharedBoundTag, sharedAvatarTag },
      } as any);
    },
    [openingThreadId, rolePrefix, router, threadId, setSelectedThread],
  );

  const resetOpeningThread = useCallback(() => {
    setOpeningThreadId(null);
  }, []);

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
          const created = await apiRequest<{ message?: ApiChatMessage }>(
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
              contentType:
                serverMsg.contentType ?? payload.contentType ?? "text",
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
      setMessages,
      setThreads,
    ],
  );

  const handleSend = useCallback(async () => {
    const trimmed = draftRef.current.trim();
    const attachmentToSend = pendingAttachment;
    if (!trimmed && !attachmentToSend) return;

    setDraft("");
    draftRef.current = "";
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
      setDraft(trimmed);
      draftRef.current = trimmed;
      setPendingAttachment(attachmentToSend);
      console.warn("Failed to send message", error);
    } finally {
      setIsUploadingAttachment(false);
    }
  }, [
    pendingAttachment,
    sendMessagePayload,
    uploadAttachment,
    setDraft,
    draftRef,
    setPendingAttachment,
    setIsUploadingAttachment,
    setReplyTarget,
  ]);

  const handleSendGif = useCallback(
    async (gifUrl: string) => {
      if (!gifUrl || !token || !currentThread || isUploadingAttachment) return;
      const caption = draftRef.current.trim();
      setDraft("");
      draftRef.current = "";
      setPendingAttachment(null);
      try {
        await sendMessagePayload({
          text: caption || "GIF",
          contentType: "image",
          mediaUrl: gifUrl,
        });
        setReplyTarget(null);
      } catch (error) {
        setDraft(caption);
        draftRef.current = caption;
        console.warn("Failed to send GIF", error);
      }
    },
    [
      currentThread,
      isUploadingAttachment,
      sendMessagePayload,
      setDraft,
      draftRef,
      setPendingAttachment,
      setReplyTarget,
      token,
    ],
  );

  const setReplyTargetFromMessage = useCallback(
    (message: ChatMessage) => {
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
    },
    [setReplyTarget],
  );

  const clearReplyTarget = useCallback(() => {
    setReplyTarget(null);
  }, [setReplyTarget]);

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
  }, [activeThread, threadId, setSelectedThread]);

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
  }, [currentThread, loadGroupMessages, loadMessages, socket?.connected]);

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
  }, [currentThread?.id, socket?.connected, socket]);

  useEffect(() => {
    if (!currentThread) return;
    if ((currentThread.unread ?? 0) === 0) return;
    if (currentThread.id.startsWith("group:")) {
      markGroupThreadRead(currentThread.id);
      return;
    }
    markDirectThreadReadById(currentThread.id);
  }, [currentThread, markDirectThreadReadById, markGroupThreadRead]);

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
          router.push(messagesThreadHref(rolePrefix, threadId));
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
    rolePrefix,
  ]);

  useEffect(() => {
    if (Platform.OS !== "android" || !currentThread) return;
    const handler = () => {
      clearThread();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", handler);
    return () => sub.remove();
  }, [clearThread, currentThread]);

  const [reactionTarget, setReactionTarget] = useState<ChatMessage | null>(
    null,
  );

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
    setDraft: (v: string) => {
      setDraft(v);
      draftRef.current = v;
    },
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
