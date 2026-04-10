import React, { useState, useEffect, useRef } from "react";
import { View, Pressable, TextInput, Modal, Platform, ActivityIndicator } from "react-native";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { formatWhen, stripPreview, safeNumber, categoryLabel } from "@/lib/admin-messages-utils";
import { SmallAction } from "../AdminShared";
import { useAdminGroups } from "@/hooks/admin/useAdminGroups";
import { useMediaUpload } from "@/hooks/messages/useMediaUpload";
import { GroupMessage, PendingAttachment, ChatGroup, AdminUserResult, GroupMember } from "@/types/admin-messages";
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
  category: "announcement" | "team";
}

export function AdminGroupSection({ token, canLoad, myUserId, category }: Props) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { socket } = useSocket();
  const groupsHook = useAdminGroups(token, canLoad);
  const { uploadAttachment } = useMediaUpload(token);

  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);

  // Group Management Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateGroupName] = useState("");
  const [createMemberIds, setCreateMemberIds] = useState<number[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const [membersOpen, setMembersOpen] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<AdminUserResult[]>([]);
  const [userLoading, setUserLoading] = useState(false);

  const queryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (canLoad) {
      if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
      queryDebounceRef.current = setTimeout(() => {
        groupsHook.loadGroups(query, false);
      }, 250);
    }
    return () => {
      if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
    };
  }, [canLoad, query]);

  const filteredGroups = groupsHook.groups.filter((g) => {
    const cat = (g.category ?? "").toLowerCase();
    if (category === "announcement") return cat === "announcement";
    return cat === "team" || cat === "coach_group";
  });

  useEffect(() => {
    if (!socket || !groupsHook.activeGroupId) return;

    const handleNewMessage = (msg: GroupMessage) => {
      if (msg.groupId === groupsHook.activeGroupId) {
        groupsHook.setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on("group_message", handleNewMessage);
    return () => {
      socket.off("group_message", handleNewMessage);
    };
  }, [socket, groupsHook.activeGroupId]);

  const handleSend = async () => {
    if (!groupsHook.activeGroupId || (!draft.trim() && !pendingAttachment)) return;
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

      await groupsHook.sendGroupMessage({
        groupId: groupsHook.activeGroupId,
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

  const handleCreateGroup = async () => {
    if (!createName.trim()) return;
    setIsCreating(true);
    try {
      await groupsHook.createGroup({
        name: createName.trim(),
        category: category === "announcement" ? "announcement" : "team",
        memberIds: createMemberIds,
      });
      setCreateOpen(false);
      setCreateGroupName("");
      setCreateMemberIds([]);
      groupsHook.loadGroups(query, true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  const openMembers = async () => {
    if (!groupsHook.activeGroupId) return;
    setMembersOpen(true);
    setMembersLoading(true);
    try {
      const res = await groupsHook.loadGroupMembers(groupsHook.activeGroupId);
      setMembers(res);
    } finally {
      setMembersLoading(false);
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
      <View className="flex-row gap-2">
        <View
          className="flex-1 rounded-2xl border px-4 py-3"
          style={{
            backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
          }}
        >
          <TextInput
            className="text-[14px] font-outfit text-app"
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${category}s...`}
            placeholderTextColor={colors.placeholder}
          />
        </View>
        <SmallAction label="New" tone="success" onPress={() => setCreateOpen(true)} />
      </View>

      {groupsHook.groupsLoading && filteredGroups.length === 0 ? (
        <View className="gap-2">
          <Skeleton width="100%" height={60} />
          <Skeleton width="100%" height={60} />
        </View>
      ) : (
        <View className="gap-3">
          {filteredGroups.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => {
                groupsHook.setActiveGroupId(g.id);
                groupsHook.setActiveGroupName(g.name ?? `Group ${g.id}`);
                groupsHook.loadMessages(g.id, true);
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
                    {g.name ?? `Group ${g.id}`}
                  </Text>
                  <Text className="text-[12px] font-outfit text-secondary" numberOfLines={1}>
                    {stripPreview(g.lastMessage?.content)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[10px] font-outfit text-secondary">
                    {formatWhen(g.lastMessage?.createdAt)}
                  </Text>
                  {safeNumber(g.unreadCount) > 0 && (
                    <View className="bg-accent rounded-full px-1.5 py-0.5 mt-1">
                      <Text className="text-[10px] font-outfit-bold text-white">
                        {g.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* GROUP THREAD MODAL */}
      <Modal
        visible={groupsHook.activeGroupId != null}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
        onRequestClose={() => groupsHook.setActiveGroupId(null)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
          <View className="px-4 pb-3 flex-row items-center justify-between border-b" style={{ borderColor: colors.border }}>
            <View className="flex-1">
              <Text className="text-[18px] font-clash font-bold text-app" numberOfLines={1}>
                {groupsHook.activeGroupName}
              </Text>
              <Pressable onPress={openMembers}>
                <Text className="text-[12px] font-outfit text-accent">Manage members</Text>
              </Pressable>
            </View>
            <SmallAction label="Close" tone="neutral" onPress={() => groupsHook.setActiveGroupId(null)} />
          </View>

          <ThemedScrollView className="flex-1 p-4">
            {groupsHook.messagesLoading && groupsHook.messages.length === 0 ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <View className="gap-4 pb-10">
                {groupsHook.messages.map((m, idx) => {
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

      {/* CREATE GROUP MODAL (Simplified for brevity) */}
      <Modal visible={createOpen} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 }}>
          <View className="bg-card rounded-3xl p-6" style={{ backgroundColor: colors.cardElevated }}>
            <Text className="text-[18px] font-clash font-bold text-app mb-4">New {categoryLabel(category)}</Text>
            <TextInput
              value={createName}
              onChangeText={setCreateGroupName}
              placeholder="Name..."
              placeholderTextColor={colors.placeholder}
              className="bg-background rounded-2xl px-4 py-3 mb-4 text-app"
            />
            <View className="flex-row gap-2 justify-end">
              <SmallAction label="Cancel" tone="neutral" onPress={() => setCreateOpen(false)} />
              <SmallAction label="Create" tone="success" onPress={handleCreateGroup} disabled={isCreating} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
