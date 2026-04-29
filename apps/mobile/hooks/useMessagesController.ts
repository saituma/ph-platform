import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { BackHandler, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useSocket } from "@/context/SocketContext";
import { useMessagesRealtime } from "@/hooks/useMessagesRealtime";
import { getNotifications } from "@/lib/notifications";
import { apiRequest } from "@/lib/api";
import { parseReplyPrefix } from "@/lib/messages/reply";
import { resolveMediaType } from "@/lib/messages/mediaType";
import { mapApiDirectMessageToChatMessage } from "@/lib/messages/mappers/messageMapper";
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
  const routerRef = useRef(router);
  routerRef.current = router;
  const { thread, id, draft: draftQuery } = useLocalSearchParams<{
    thread?: string;
    id?: string;
    draft?: string;
  }>();
  const threadId = thread || id;

  const token = useAppSelector((state) => state.user.token);
  const profile = useAppSelector((state) => state.user.profile);
  const programTier = useAppSelector((state) => state.user.programTier);
  const appRole = useAppSelector((state) => state.user.appRole);
  const apiUserRole = useAppSelector((state) => state.user.apiUserRole);
  const profileName = profile.name;
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
    profileName,
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
  const lastLoadedGroupThreadRef = useRef<string | null>(null);

  const sortedThreads = useMemo(() => {
    return [...threads].sort((a, b) => {
      if (!!a.pinned && !b.pinned) return -1;
      if (!a.pinned && !!b.pinned) return 1;
      if (!!a.premium && !b.premium) return -1;
      if (!a.premium && !!b.premium) return 1;
      return (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0);
    });
  }, [threads]);

  const currentThreadId = currentThread?.id;
  const currentThreadUnread = currentThread?.unread ?? 0;

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
  }, [draftQuery, threadId, currentThread?.id, setDraft, draftRef]);

  const clearThread = useCallback(() => {
    setSelectedThread(null);
    setOpeningThreadId(null);
    setPendingAttachment(null);
    if (routerRef.current.canGoBack()) {
      routerRef.current.back();
    } else {
      routerRef.current.replace(messagesTabHref);
    }
  }, [setPendingAttachment, setSelectedThread]);

  const openThread = useCallback(
    (
      thread: MessageThread,
      sharedBoundTag?: string,
      sharedAvatarTag?: string,
    ) => {
      if (openingThreadId === thread.id && threadId === thread.id) return;
      setOpeningThreadId(thread.id);
      setSelectedThread(thread);

      const threadHasLocalMessages = messages.some(
        (message) => message.threadId === thread.id,
      );
      if (!threadHasLocalMessages) {
        if (thread.id.startsWith("group:")) {
          const groupId = Number(thread.id.replace("group:", ""));
          if (Number.isFinite(groupId)) {
            void loadGroupMessages(groupId, { silent: true });
          }
        } else {
          void loadMessages({ silent: true });
        }
      }

      routerRef.current.push({
        pathname: `/${rolePrefix}/messages/[id]`,
        params: { id: thread.id, sharedBoundTag, sharedAvatarTag },
      } as any);
    },
    [
      openingThreadId,
      threadId,
      messages,
      loadGroupMessages,
      loadMessages,
      rolePrefix,
      setSelectedThread,
    ],
  );

  const resetOpeningThread = useCallback(() => {
    setOpeningThreadId(null);
  }, []);

  const getMediaPreviewLabel = useCallback(
    (contentType?: "text" | "image" | "video", hasMedia?: boolean) => {
      if (!hasMedia) return "";
      if (contentType === "image") return "Photo";
      if (contentType === "video") return "Video";
      return "File";
    },
    [],
  );

  const resolveOutgoingAttachmentType = useCallback(
    (attachment: {
      mimeType?: string;
      fileName?: string;
      uri?: string;
      isImage?: boolean;
    } | null): "text" | "image" | "video" => {
      if (!attachment) return "text";
      const mime = String(attachment.mimeType ?? "").toLowerCase().trim();
      if (mime.startsWith("image/") || mime.includes("image")) return "image";
      if (mime.startsWith("video/") || mime.includes("video")) return "video";
      if (attachment.isImage) return "image";
      const combined = `${String(attachment.fileName ?? "")} ${String(attachment.uri ?? "")}`.toLowerCase();
      if (/\.(jpg|jpeg|png|gif|webp|bmp|heic|heif|avif)\b/.test(combined)) return "image";
      if (/\.(mp4|mov|webm|m4v|avi|mkv)\b/.test(combined)) return "video";
      return "text";
    },
    [],
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
        console.log("[DEBUG-msg] group send: optimistic ADD", { clientId, groupId, text: trimmed.slice(0, 40) });
        const previewLabel =
          trimmed ||
          getMediaPreviewLabel(payload.contentType, Boolean(payload.mediaUrl));
        setMessages((prev) => [
          ...prev,
          {
            id: clientId,
            threadId: `group:${groupId}`,
            from: "user",
            senderId: effectiveProfileId,
            text: trimmed,
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
                  preview: previewLabel
                    ? `${effectiveProfileName}: ${previewLabel}`
                    : t.preview,
                  time: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  updatedAtMs: Date.now(),
                  senderName: effectiveProfileName || t.senderName,
                }
              : t,
          ),
        );

        try {
          const created = await apiRequest<{ message?: ApiChatMessage }>(
            `/chat/groups/${groupId}/messages`,
            {
              method: "POST",
              token,
              headers: actingHeaders,
              body: {
                content: trimmed,
                contentType: payload.contentType ?? "text",
                mediaUrl: payload.mediaUrl,
                replyToMessageId: replyTarget?.messageId,
                replyPreview: replyTarget?.preview,
                clientId,
              },
            },
          );
          const serverMsg = created?.message;
          if (serverMsg?.id) {
            const parsed = parseReplyPrefix(serverMsg.content);
            const serverText =
              serverMsg.mediaUrl &&
              String(parsed.text ?? "")
                .trim()
                .toLowerCase() === "attachment"
                ? ""
                : parsed.text;
            const mapped: ChatMessage = {
              id: `group-${serverMsg.id}`,
              threadId: `group:${groupId}`,
              from: "user",
              senderId: serverMsg.senderId ?? effectiveProfileId,
              text: serverText,
              replyToMessageId: parsed.replyToMessageId ?? undefined,
              replyPreview: parsed.replyPreview || undefined,
              contentType: resolveMediaType({
                contentType: serverMsg.contentType ?? payload.contentType ?? "text",
                mediaUrl: serverMsg.mediaUrl ?? payload.mediaUrl,
              }),
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
              const withoutDuplicateId = withoutTemp.filter(
                (m) => String(m.id) !== String(mapped.id),
              );
              return [...withoutDuplicateId, mapped];
            });
            if (serverMsg.mediaUrl && String(serverMsg.contentType ?? "") === "image") {
              void Image.prefetch(serverMsg.mediaUrl);
            }
          } else {
            // API returned 2xx but no `message` object in the response.
            // The message was almost certainly saved on the server — keep the
            // optimistic visible and let loadGroupMessages reconcile it with
            // the real server-side row when the server has indexed it.
            console.warn(
              "[DEBUG-msg] group send: success without message.id — keeping optimistic, reconciling via loadGroupMessages",
              { clientId, response: created },
            );
            void loadGroupMessages(groupId, { silent: true });
          }
        } catch (err) {
          console.warn(
            "[DEBUG-msg] group send: API threw — removing optimistic and restoring draft",
            { clientId, err },
          );
          setMessages((prev) => prev.filter((m) => m.clientId !== clientId));
          void loadGroupMessages(groupId, { silent: true });
          throw err;
        }
        return;
      }

      const toUserId = Number(currentThread.id);
      if (!Number.isFinite(toUserId) || toUserId <= 0) return;
      const clientId = `client-${Date.now()}`;
      console.log("[DEBUG-msg] direct send: optimistic ADD", { clientId, toUserId, text: trimmed.slice(0, 40) });
      setMessages((prev) => [
        ...prev,
        {
          id: clientId,
          threadId: String(toUserId),
          from: "user",
          senderId: effectiveProfileId,
          receiverId: toUserId,
          text: trimmed,
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
                preview:
                  trimmed ||
                  getMediaPreviewLabel(payload.contentType, Boolean(payload.mediaUrl)) ||
                  t.preview,
                time: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                updatedAtMs: Date.now(),
              }
            : t,
        ),
      );

      try {
        const created = await apiRequest<{ message?: ApiChatMessage }>("/messages", {
          method: "POST",
          token,
          headers: actingHeaders,
          body: {
            content: trimmed,
            receiverId: toUserId,
            contentType: payload.contentType ?? "text",
            mediaUrl: payload.mediaUrl,
            replyToMessageId: replyTarget?.messageId,
            replyPreview: replyTarget?.preview,
            clientId,
          },
        });
        const serverMsg = created?.message;
        if (serverMsg?.id) {
          console.log("[DEBUG-msg] direct send: API success with id =", serverMsg.id, "clientId =", clientId);
          const mapped = mapApiDirectMessageToChatMessage(
            serverMsg,
            String(effectiveProfileId),
            [],
            profileName,
          );
          setMessages((prev) => {
            const withoutTemp = prev.filter((m) => m.clientId !== clientId);
            const nextMapped = { ...mapped, clientId };
            const withoutDuplicateId = withoutTemp.filter(
              (m) => String(m.id) !== String(nextMapped.id),
            );
            return [...withoutDuplicateId, nextMapped];
          });
        } else {
          // API returned 2xx but no `message` object — server almost certainly
          // saved it. Keep the optimistic visible; loadMessages will replace it
          // with the canonical version when the server has indexed it.
          console.warn(
            "[DEBUG-msg] direct send: success without message.id — keeping optimistic, reconciling via loadMessages",
            { clientId, response: created },
          );
          void loadMessages({ silent: true });
        }
        if (payload.mediaUrl && payload.contentType === "image") {
          void Image.prefetch(payload.mediaUrl);
        } else if (
          serverMsg?.mediaUrl &&
          String(serverMsg.contentType ?? payload.contentType ?? "") === "image"
        ) {
          void Image.prefetch(serverMsg.mediaUrl);
        }
      } catch (err) {
        console.warn(
          "[DEBUG-msg] direct send: API threw — removing optimistic and restoring draft",
          { clientId, err },
        );
        setMessages((prev) => prev.filter((m) => m.clientId !== clientId));
        void loadMessages({ silent: true });
        throw err;
      }
    },
    [
      actingHeaders,
      currentThread,
      effectiveProfileId,
      effectiveProfileName,
      loadGroupMessages,
      loadMessages,
      profileName,
      replyTarget?.messageId,
      replyTarget?.preview,
      token,
      setMessages,
      setThreads,
      getMediaPreviewLabel,
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
      const attachmentType = resolveOutgoingAttachmentType(attachmentToSend);
      const resolvedContentType =
        upload?.contentType && upload.contentType !== "text"
          ? upload.contentType
          : attachmentToSend
            ? attachmentType
            : "text";
      await sendMessagePayload({
        text: trimmed,
        contentType: resolvedContentType,
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
    resolveOutgoingAttachmentType,
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
          text: caption,
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
    }, 10000);
    return () => clearInterval(id);
  }, [token, threadId, socket?.connected, loadMessages]);

  useMessagesRealtime({
    token,
    role: appRole ?? apiUserRole ?? "athlete",
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

  // ── Prefetch on tab focus (silent refresh) ─────────────────────
  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      void loadMessages({ silent: true });
    }, [token, loadMessages]),
  );

  useEffect(() => {
    void loadMessages({ silent: false });
  }, [loadMessages]);

  useEffect(() => {
    const threadIdValue = currentThread?.id ?? "";
    if (!threadIdValue.startsWith("group:")) {
      lastLoadedGroupThreadRef.current = null;
      return;
    }
    if (lastLoadedGroupThreadRef.current === threadIdValue) return;
    const groupId = Number(threadIdValue.replace("group:", ""));
    if (Number.isFinite(groupId)) {
      const hasGroupCache = messages.some(
        (message) => message.threadId === threadIdValue,
      );
      lastLoadedGroupThreadRef.current = threadIdValue;
      void loadGroupMessages(groupId, { silent: hasGroupCache });
    }
  }, [currentThread?.id, loadGroupMessages, messages]);

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
  }, [currentThread?.id, loadGroupMessages, loadMessages, socket?.connected]);

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
    if (!currentThreadId) return;
    if (currentThreadUnread === 0) return;
    if (currentThreadId.startsWith("group:")) {
      markGroupThreadRead(currentThreadId);
      return;
    }
    markDirectThreadReadById(currentThreadId);
  }, [
    currentThreadId,
    currentThreadUnread,
    markDirectThreadReadById,
    markGroupThreadRead,
  ]);

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
          if (actionId !== "expo.modules.notifications.actions.DEFAULT") {
            return;
          }
          const data = response.notification.request.content.data as
            | { threadId?: string }
            | undefined;
          const threadId = data?.threadId;
          if (!threadId) return;
          const thread = threads.find((item) => item.id === threadId);
          if (thread) {
            openThread(thread);
            return;
          }
          routerRef.current.push(messagesThreadHref(rolePrefix, threadId));
        },
      );
    });

    return () => {
      subscription?.remove();
    };
  }, [markDirectThreadReadById, openThread, threads, rolePrefix]);

  useEffect(() => {
    if (Platform.OS !== "android" || !currentThreadId) return;
    const handler = () => {
      clearThread();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", handler);
    return () => sub.remove();
  }, [clearThread, currentThreadId]);

  const [reactionTarget, setReactionTarget] = useState<ChatMessage | null>(
    null,
  );

  return {
    reactionOptions,
    effectiveProfileId,
    effectiveProfileName,
    groupMembers,
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
