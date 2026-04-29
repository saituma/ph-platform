import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Modal,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import {
  AdminBadge,
  AdminEmptyState,
  AdminInput,
  AdminListRow,
} from "@/components/admin/AdminUI";
import {
  formatWhen,
  stripPreview,
  safeNumber,
} from "@/lib/admin-messages-utils";
import { useAdminDms } from "@/hooks/admin/useAdminDms";
import { useMediaUpload } from "@/hooks/messages/useMediaUpload";
import {
  DirectMessage,
  PendingAttachment,
} from "@/types/admin-messages";
import { useSocket } from "@/context/SocketContext";
import { ComposerActionsModal } from "@/components/messages/ComposerActionsModal";
import { EmojiPickerModal } from "@/components/messages/EmojiPickerModal";
import { GifPickerModal } from "@/components/messages/GifPickerModal";
import * as ImagePicker from "expo-image-picker";
import { VIDEO_PICK_PRESERVE_NATIVE_RESOLUTION } from "@/lib/media/videoPickerNativeResolution";
import { ThreadHeader } from "@/components/messages/ThreadHeader";
import { ThreadChatBody } from "@/components/messages/ThreadChatBody";
import { ReactionPickerModal } from "@/components/messages/ReactionPickerModal";
import type { MessageThread, TypingStatus } from "@/types/messages";
import type { ChatMessage } from "@/constants/messages";
import { useAppSelector } from "@/store/hooks";
import { MessageCircle, Search } from "lucide-react-native";
import {
  appendCachedAdminDmMessage,
  prefetchAdminDmThreadMessages,
} from "@/lib/admin/adminMessageCache";

interface Props {
  token: string | null;
  canLoad: boolean;
  myUserId: number | null;
  initialUserId?: number | null;
}

export function AdminDmSection({
  token,
  canLoad,
  myUserId,
  initialUserId,
}: Props) {
  const { colors } = useAppTheme();
  const { socket } = useSocket();
  const dms = useAdminDms(token, canLoad);
  const { uploadAttachment } = useMediaUpload(token);
  const myName = useAppSelector((state) => state.user.profile?.name) ?? "Coach";

  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingAttachment | null>(null);
  const [replyTarget, setReplyTarget] = useState<{
    messageId: number;
    preview: string;
    authorName?: string;
  } | null>(null);
  const [reactionTarget, setReactionTarget] = useState<ChatMessage | null>(null);
  const [reactionEmojiTarget, setReactionEmojiTarget] = useState<ChatMessage | null>(null);
  const reactionOptions = useMemo(() => ["👍", "🔥", "💪", "👏", "❤️"], []);
  const [reactionsByMessageId, setReactionsByMessageId] = useState<
    Record<string, { emoji: string; count: number; userIds: number[] }[]>
  >({});

  const queryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getInitials = useCallback((name?: string | null) => {
    const trimmed = String(name ?? "").trim();
    if (!trimmed) return "";
    const parts = trimmed.split(" ").filter(Boolean);
    if (parts.length === 1) return (parts[0][0] ?? "").toUpperCase();
    const first = parts[0][0] ?? "";
    const last = parts[parts.length - 1][0] ?? "";
    return `${first}${last}`.toUpperCase();
  }, []);

  useEffect(() => {
    if (canLoad) {
      if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
      queryDebounceRef.current = setTimeout(() => {
        dms.loadThreads(query, false);
      }, 250);
    }
    return () => {
      if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
    };
  }, [canLoad, query]);

  useEffect(() => {
    if (initialUserId) {
      dms.setActiveDmUserId(initialUserId);
      dms.loadMessages(initialUserId, false);
    }
  }, [initialUserId]);

  useEffect(() => {
    if (!token || !canLoad || dms.threads.length === 0) return;
    const timeout = setTimeout(() => {
      prefetchAdminDmThreadMessages(token, dms.threads);
    }, 150);
    return () => clearTimeout(timeout);
  }, [canLoad, dms.threads, token]);

  useEffect(() => {
    if (!socket || !dms.activeDmUserId) return;

    const handleNewMessage = (msg: DirectMessage) => {
      if (
        (msg.senderId === dms.activeDmUserId && msg.receiverId === myUserId) ||
        (msg.senderId === myUserId && msg.receiverId === dms.activeDmUserId)
      ) {
        dms.setMessages((prev) => [...prev, msg]);
      }
      const threadUserId = msg.senderId === myUserId ? msg.receiverId : msg.senderId;
      if (typeof threadUserId === "number") {
        appendCachedAdminDmMessage(threadUserId, msg);
      }
    };

    socket.on("direct_message", handleNewMessage);
    return () => {
      socket.off("direct_message", handleNewMessage);
    };
  }, [socket, dms.activeDmUserId, myUserId]);

  const handleSend = async () => {
    if (!dms.activeDmUserId || (!draft.trim() && !pendingAttachment)) return;
    const receiverId = dms.activeDmUserId;
    setIsSending(true);
    try {
      let mediaUrl: string | undefined;
      let contentType: string | undefined;

      if (pendingAttachment) {
        setIsUploading(true);
        const res = await uploadAttachment(pendingAttachment);
        mediaUrl = res.mediaUrl;
        contentType = res.contentType;
        setIsUploading(false);
      }

      const sent = await dms.sendDm({
        receiverId,
        content: draft.trim(),
        mediaUrl,
        contentType,
        replyToMessageId: replyTarget?.messageId,
        replyPreview: replyTarget?.preview,
      });

      setDraft("");
      setPendingAttachment(null);
      setReplyTarget(null);
      if (sent) {
        dms.setMessages((prev) => [...prev, sent]);
        appendCachedAdminDmMessage(receiverId, sent);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  const pickImage = async () => {
    setComposerMenuOpen(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPendingAttachment({
        uri: asset.uri,
        fileName: asset.fileName ?? "image.jpg",
        mimeType: asset.mimeType ?? "image/jpeg",
        sizeBytes: asset.fileSize ?? 0,
        isImage: true,
      });
    }
  };

  const pickVideo = async () => {
    setComposerMenuOpen(false);
    const result = await ImagePicker.launchImageLibraryAsync(
      VIDEO_PICK_PRESERVE_NATIVE_RESOLUTION,
    );
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPendingAttachment({
        uri: asset.uri,
        fileName: asset.fileName ?? "video.mp4",
        mimeType: asset.mimeType ?? "video/mp4",
        sizeBytes: asset.fileSize ?? 0,
        isImage: false,
      });
    }
  };

  const takePhoto = async () => {
    setComposerMenuOpen(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPendingAttachment({
        uri: asset.uri,
        fileName: asset.fileName ?? "photo.jpg",
        mimeType: asset.mimeType ?? "image/jpeg",
        sizeBytes: asset.fileSize ?? 0,
        isImage: true,
      });
    }
  };

  const recordVideo = async () => {
    setComposerMenuOpen(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      ...VIDEO_PICK_PRESERVE_NATIVE_RESOLUTION,
      cameraType: ImagePicker.CameraType.front,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPendingAttachment({
        uri: asset.uri,
        fileName: asset.fileName ?? "recording.mp4",
        mimeType: asset.mimeType ?? "video/mp4",
        sizeBytes: asset.fileSize ?? 0,
        isImage: false,
      });
    }
  };

  const currentThread = useMemo<MessageThread | null>(() => {
    if (dms.activeDmUserId == null) return null;
    const thread = dms.threads.find((t) => t.userId === dms.activeDmUserId) ?? null;
    const name = (thread?.name ?? dms.activeDmName ?? `User ${dms.activeDmUserId}`).trim();
    const preview = stripPreview(thread?.preview) || "Direct messages";

    return {
      id: String(dms.activeDmUserId),
      name,
      role: thread?.programTier ? thread.programTier.replaceAll("_", " ") : "Athlete",
      channelType: "direct",
      preview,
      time: formatWhen(thread?.time),
      pinned: false,
      premium: Boolean(thread?.premium),
      unread: safeNumber(thread?.unread, 0),
      lastSeen: "Active",
      responseTime: thread?.premium ? "Priority thread" : "Direct thread",
      updatedAtMs: Date.now(),
    };
  }, [dms.activeDmName, dms.activeDmUserId, dms.threads]);

  const typingStatus = useMemo<TypingStatus>(() => ({}), []);

  const mappedMessages = useMemo<ChatMessage[]>(() => {
    if (!currentThread) return [];

    const resolveContentType = (raw?: string | null) => {
      const t = String(raw ?? "text").toLowerCase();
      if (t === "image" || t.startsWith("image/")) return "image";
      if (t === "video" || t.startsWith("video/")) return "video";
      return "text";
    };

    return dms.messages
      .map((m, idx) => {
        const id =
          typeof m.id === "number"
            ? String(m.id)
            : typeof m.clientId === "string" && m.clientId
              ? m.clientId
              : `fallback-${idx}`;
        const from =
          myUserId != null && m.senderId === myUserId ? "user" : "coach";
        const authorName = from === "user" ? myName : currentThread.name;
        const createdAt =
          m.createdAt instanceof Date
            ? m.createdAt
            : m.createdAt
              ? new Date(m.createdAt)
              : null;
        const time = createdAt && !Number.isNaN(createdAt.getTime())
          ? createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "";
        const text = (m.content ?? "").trim() || (m.mediaUrl ? "Attachment" : "");

        return {
          id,
          threadId: currentThread.id,
          from,
          text,
          contentType: resolveContentType(m.contentType),
          mediaUrl: m.mediaUrl ?? undefined,
          videoUploadId: typeof m.videoUploadId === "number" ? m.videoUploadId : undefined,
          time,
          status: from === "user" ? (m.read ? "read" : "delivered") : undefined,
          authorName,
          reactions: reactionsByMessageId[id] ?? undefined,
        } satisfies ChatMessage;
      })
      .filter((m) => Boolean(m.id));
  }, [currentThread, dms.messages, myName, myUserId, reactionsByMessageId]);

  const setReplyTargetFromMessage = useCallback((message: ChatMessage) => {
    const numericId = Number(message.id);
    if (!Number.isFinite(numericId)) return;
    const preview = (message.text || (message.mediaUrl ? "Media message" : "Message")).slice(0, 160);
    setReplyTarget({
      messageId: numericId,
      preview,
      authorName: message.authorName ?? undefined,
    });
  }, []);

  const handleToggleReaction = useCallback((message: ChatMessage, emoji: string) => {
    setReactionsByMessageId((prev) => {
      const key = String(message.id);
      const list = prev[key] ?? [];
      const me = myUserId ?? -1;
      const existing = list.find((r) => r.emoji === emoji);
      const hasMine = existing?.userIds?.includes(me) ?? false;

      const nextList = (() => {
        if (!existing) {
          return [...list, { emoji, count: 1, userIds: me > 0 ? [me] : [] }];
        }
        if (hasMine) {
          const nextUserIds = (existing.userIds ?? []).filter((id) => id !== me);
          const nextCount = Math.max(0, (existing.count ?? 1) - 1);
          return nextCount === 0
            ? list.filter((r) => r.emoji !== emoji)
            : list.map((r) =>
                r.emoji === emoji ? { ...r, count: nextCount, userIds: nextUserIds } : r,
              );
        }
        return list.map((r) =>
          r.emoji === emoji
            ? {
                ...r,
                count: (r.count ?? 0) + 1,
                userIds: [...(r.userIds ?? []), ...(me > 0 ? [me] : [])],
              }
            : r,
        );
      })();

      return { ...prev, [key]: nextList };
    });
  }, [myUserId]);

  const handleRemovePendingAttachment = useCallback(() => {
    setPendingAttachment(null);
  }, []);

  return (
    <View style={{ flex: 1, gap: 12, paddingHorizontal: 16 }}>
      <AdminInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search people"
        leftIcon={Search}
        onClear={() => setQuery("")}
      />

      {dms.threadsLoading && dms.threads.length === 0 ? (
        <View style={{ gap: 10 }}>
          <Skeleton width="100%" height={74} />
          <Skeleton width="100%" height={74} />
          <Skeleton width="100%" height={74} />
        </View>
      ) : dms.threads.length === 0 ? (
        <AdminEmptyState
          icon={MessageCircle}
          title={query ? "No matching threads" : "No direct messages yet"}
          description={
            query
              ? "Try a different name or clear the search."
              : "New coach and athlete conversations will appear here."
          }
          tone="info"
        />
      ) : (
        <View style={{ gap: 10 }}>
          {dms.threads.map((t) => (
            <AdminListRow
              key={t.userId}
              title={t.name ?? `User ${t.userId}`}
              subtitle={stripPreview(t.preview) || "No messages yet"}
              meta={formatWhen(t.time)}
              unreadCount={safeNumber(t.unread)}
              tone="info"
              leading={
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 15,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(48,176,199,0.14)",
                    borderWidth: 1,
                    borderColor: "rgba(48,176,199,0.24)",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Outfit-Bold",
                      fontSize: 13,
                      color: "#30B0C7",
                    }}
                  >
                    {getInitials(t.name) || "?"}
                  </Text>
                </View>
              }
              trailing={
                t.premium ? (
                  <AdminBadge tone="accent">Priority</AdminBadge>
                ) : undefined
              }
              onPress={() => {
                dms.setActiveDmUserId(t.userId);
                dms.setActiveDmName(t.name ?? `User ${t.userId}`);
                dms.loadMessages(t.userId, true);
              }}
            />
          ))}
        </View>
      )}

      {/* DM THREAD MODAL */}
      <Modal
        visible={dms.activeDmUserId != null}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
        onRequestClose={() => {
          dms.setActiveDmUserId(null);
          setReplyTarget(null);
          setReactionTarget(null);
        }}
      >
        <View className="flex-1 bg-app" style={{ backgroundColor: colors.background }}>
          {currentThread ? (
            <>
              <ThreadHeader
                thread={currentThread}
                onBack={() => {
                  dms.setActiveDmUserId(null);
                  setReplyTarget(null);
                  setReactionTarget(null);
                }}
              />
              <ThreadChatBody
                thread={currentThread}
                messages={mappedMessages}
                effectiveProfileId={myUserId ?? 0}
                effectiveProfileName={myName}
                groupMembers={{}}
                token={token}
                draft={draft}
                replyTarget={replyTarget}
                onClearReplyTarget={() => setReplyTarget(null)}
                onReplyMessage={setReplyTargetFromMessage}
                isLoading={dms.threadsLoading}
                isThreadLoading={dms.messagesLoading}
                typingStatus={typingStatus}
                textSecondaryColor={colors.textSecondary}
                onDraftChange={setDraft}
                onSend={handleSend}
                onOpenComposerMenu={() => setComposerMenuOpen(true)}
                onLongPressMessage={(message) => setReactionTarget(message)}
                onReactionPress={handleToggleReaction}
                onOpenReactionPicker={(message) => setReactionTarget(message)}
                pendingAttachment={pendingAttachment}
                onRemovePendingAttachment={handleRemovePendingAttachment}
                isUploadingAttachment={isSending || isUploading}
              />
              <ReactionPickerModal
                reactionTarget={reactionTarget}
                options={reactionOptions}
                onClose={() => setReactionTarget(null)}
                onSelect={(message, emoji) => {
                  handleToggleReaction(message, emoji);
                  setReactionTarget(null);
                }}
                onOpenEmojiPicker={(message) => {
                  setReactionTarget(null);
                  setReactionEmojiTarget(message);
                  setEmojiPickerOpen(true);
                }}
              />
            </>
          ) : (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          )}

        <ComposerActionsModal
          open={composerMenuOpen}
          onClose={() => setComposerMenuOpen(false)}
          onAttachFile={() => setComposerMenuOpen(false)}
          onAttachImage={pickImage}
          onAttachVideo={pickVideo}
          onTakePhoto={takePhoto}
          onRecordVideo={recordVideo}
          onOpenEmojis={() => setEmojiPickerOpen(true)}
          onOpenGifs={() => setGifPickerOpen(true)}
        />
        <EmojiPickerModal
          open={emojiPickerOpen || Boolean(reactionEmojiTarget)}
          onClose={() => {
            setEmojiPickerOpen(false);
            setReactionEmojiTarget(null);
          }}
          onSelectEmoji={(emoji: string) => {
            if (reactionEmojiTarget) {
              const target = reactionEmojiTarget;
              setReactionEmojiTarget(null);
              setEmojiPickerOpen(false);
              handleToggleReaction(target, emoji);
              return;
            }
            setDraft((prev) => prev + emoji);
          }}
        />
	        <GifPickerModal
	          open={gifPickerOpen}
	          onClose={() => setGifPickerOpen(false)}
	          token={token}
	          onSelectGif={(url: string) => {
	            setDraft((prev) => prev + ` ${url}`);
	            setGifPickerOpen(false);
	          }}
	        />
        </View>
	      </Modal>
    </View>
  );
}
