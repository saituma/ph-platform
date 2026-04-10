import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Pressable, TextInput, Modal, Platform, ActivityIndicator } from "react-native";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { formatWhen, stripPreview, safeNumber } from "@/lib/admin-messages-utils";
import { SmallAction } from "../AdminShared";
import { useAdminDms } from "@/hooks/admin/useAdminDms";
import { useMediaUpload } from "@/hooks/messages/useMediaUpload";
import { DirectMessage, PendingAttachment, AdminDmThread } from "@/types/admin-messages";
import { Ionicons } from "@expo/vector-icons";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSocket } from "@/context/SocketContext";
import { ComposerActionsModal } from "@/components/messages/ComposerActionsModal";
import { EmojiPickerModal } from "@/components/messages/EmojiPickerModal";
import { GifPickerModal } from "@/components/messages/GifPickerModal";
import * as ImagePicker from "expo-image-picker";
import { Image as ExpoImage } from "expo-image";

interface Props {
  token: string | null;
  canLoad: boolean;
  myUserId: number | null;
  initialUserId?: number | null;
}

export function AdminDmSection({ token, canLoad, myUserId, initialUserId }: Props) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { socket } = useSocket();
  const dms = useAdminDms(token, canLoad);
  const { uploadAttachment } = useMediaUpload(token);

  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);

  const queryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (!socket || !dms.activeDmUserId) return;

    const handleNewMessage = (msg: DirectMessage) => {
      if (
        (msg.senderId === dms.activeDmUserId && msg.receiverId === myUserId) ||
        (msg.senderId === myUserId && msg.receiverId === dms.activeDmUserId)
      ) {
        dms.setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on("direct_message", handleNewMessage);
    return () => {
      socket.off("direct_message", handleNewMessage);
    };
  }, [socket, dms.activeDmUserId, myUserId]);

  const handleSend = async () => {
    if (!dms.activeDmUserId || (!draft.trim() && !pendingAttachment)) return;
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

      await dms.sendDm({
        receiverId: dms.activeDmUserId,
        content: draft.trim(),
        mediaUrl,
        contentType,
      });

      setDraft("");
      setPendingAttachment(null);
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  return (
    <View className="gap-4">
      <View
        className="rounded-2xl border px-4 py-3"
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
        }}
      >
        <TextInput
          className="text-[14px] font-outfit text-app"
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name..."
          placeholderTextColor={colors.placeholder}
        />
      </View>

      {dms.threadsLoading && dms.threads.length === 0 ? (
        <View className="gap-2">
          <Skeleton width="100%" height={60} />
          <Skeleton width="100%" height={60} />
          <Skeleton width="100%" height={60} />
        </View>
      ) : (
        <View className="gap-3">
          {dms.threads.map((t) => (
            <Pressable
              key={t.userId}
              onPress={() => {
                dms.setActiveDmUserId(t.userId);
                dms.setActiveDmName(t.name ?? `User ${t.userId}`);
                dms.loadMessages(t.userId, true);
              }}
              style={({ pressed }) => [
                {
                  borderRadius: 18,
                  borderWidth: 1,
                  padding: 14,
                  backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                  borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1 mr-2">
                  <Text className="text-[14px] font-clash font-bold text-app" numberOfLines={1}>
                    {t.name ?? `User ${t.userId}`}
                  </Text>
                  <Text className="text-[12px] font-outfit text-secondary" numberOfLines={1}>
                    {stripPreview(t.preview)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[10px] font-outfit text-secondary">
                    {formatWhen(t.time)}
                  </Text>
                  {safeNumber(t.unread) > 0 && (
                    <View className="bg-accent rounded-full px-1.5 py-0.5 mt-1">
                      <Text className="text-[10px] font-outfit-bold text-white">
                        {t.unread}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* DM THREAD MODAL */}
      <Modal
        visible={dms.activeDmUserId != null}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
        onRequestClose={() => dms.setActiveDmUserId(null)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
          <View className="px-4 pb-3 flex-row items-center justify-between border-b" style={{ borderColor: colors.border }}>
            <View className="flex-1">
              <Text className="text-[18px] font-clash font-bold text-app" numberOfLines={1}>
                {dms.activeDmName}
              </Text>
            </View>
            <SmallAction label="Close" tone="neutral" onPress={() => dms.setActiveDmUserId(null)} />
          </View>

          <ThemedScrollView className="flex-1 p-4">
            {dms.messagesLoading && dms.messages.length === 0 ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <View className="gap-4 pb-10">
                {dms.messages.map((m, idx) => {
                  const isMe = m.senderId === myUserId;
                  return (
                    <View
                      key={m.id ?? idx}
                      className={`max-w-[85%] rounded-2xl p-3 ${isMe ? "self-end bg-accent" : "self-start bg-card"}`}
                      style={isMe ? {} : { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}
                    >
                      {m.mediaUrl && (
                        <ExpoImage
                          source={{ uri: m.mediaUrl }}
                          style={{ width: 200, height: 200, borderRadius: 12, marginBottom: 4 }}
                          contentFit="cover"
                        />
                      )}
                      <Text className={`text-[14px] font-outfit ${isMe ? "text-white" : "text-app"}`}>
                        {m.content}
                      </Text>
                      <Text className={`text-[10px] font-outfit mt-1 opacity-60 ${isMe ? "text-white" : "text-secondary"}`}>
                        {formatWhen(m.createdAt)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </ThemedScrollView>

          <View className="p-4 border-t" style={{ borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }}>
            {pendingAttachment && (
              <View className="flex-row items-center gap-2 mb-2 bg-card p-2 rounded-xl">
                <ExpoImage source={{ uri: pendingAttachment.uri }} style={{ width: 40, height: 40, borderRadius: 8 }} />
                <Text className="flex-1 text-[12px] text-secondary" numberOfLines={1}>{pendingAttachment.fileName}</Text>
                <Pressable onPress={() => setPendingAttachment(null)}>
                  <Ionicons name="close-circle" size={20} color={colors.danger} />
                </Pressable>
              </View>
            )}
            <View className="flex-row items-center gap-2">
              <Pressable onPress={() => setComposerMenuOpen(true)}>
                <Ionicons name="add-circle-outline" size={28} color={colors.accent} />
              </Pressable>
              <View className="flex-1 bg-card rounded-2xl px-4 py-2" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Type a message..."
                  placeholderTextColor={colors.placeholder}
                  multiline
                  className="text-[14px] font-outfit text-app max-h-32"
                />
              </View>
              <Pressable onPress={handleSend} disabled={isSending || isUploading}>
                {isSending || isUploading ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Ionicons name="send" size={24} color={colors.accent} />
                )}
              </Pressable>
            </View>
          </View>
        </View>

        <ComposerActionsModal
          visible={composerMenuOpen}
          onClose={() => setComposerMenuOpen(false)}
          onPickImage={pickImage}
          onOpenEmoji={() => setEmojiPickerOpen(true)}
          onOpenGif={() => setGifPickerOpen(true)}
        />
        <EmojiPickerModal
          visible={emojiPickerOpen}
          onClose={() => setEmojiPickerOpen(false)}
          onSelect={(emoji) => setDraft((prev) => prev + emoji)}
        />
        <GifPickerModal
          visible={gifPickerOpen}
          onClose={() => setGifPickerOpen(false)}
          onSelect={(gif) => {
            setDraft((prev) => prev + ` ${gif.url}`);
            setGifPickerOpen(false);
          }}
        />
      </Modal>
    </View>
  );
}
