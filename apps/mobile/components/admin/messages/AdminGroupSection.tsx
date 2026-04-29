import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Pressable,
  TextInput,
  Modal,
  Platform,
  ActivityIndicator,
  Text as RNText,
} from "react-native";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import {
  AdminBadge,
  AdminEmptyState,
  AdminIconButton,
  AdminInput,
  AdminListRow,
} from "@/components/admin/AdminUI";
import {
  formatWhen,
  stripPreview,
  safeNumber,
  categoryLabel,
} from "@/lib/admin-messages-utils";
import { Card } from "@/components/ui/Card";
import { SmallAction } from "../AdminShared";
import { useAdminGroups } from "@/hooks/admin/useAdminGroups";
import { useAdminTeams } from "@/hooks/admin/useAdminTeams";
import { useMediaUpload } from "@/hooks/messages/useMediaUpload";
import {
  GroupMessage,
  PendingAttachment,
  ChatGroup,
  AdminUserResult,
  GroupMember,
} from "@/types/admin-messages";
import { Ionicons } from "@expo/vector-icons";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useSocket } from "@/context/SocketContext";
import { ComposerActionsModal } from "@/components/messages/ComposerActionsModal";
import { EmojiPickerModal } from "@/components/messages/EmojiPickerModal";
import { GifPickerModal } from "@/components/messages/GifPickerModal";
import { Plus, Search, Users } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { Image as ExpoImage } from "expo-image";
import {
  appendCachedAdminGroupMessage,
  prefetchAdminGroupThreadMessages,
} from "@/lib/admin/adminMessageCache";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  token: string | null;
  canLoad: boolean;
  myUserId: number | null;
  category: "announcement" | "team";
}

export function AdminGroupSection({
  token,
  canLoad,
  myUserId,
  category,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const { socket } = useSocket();
  const groupsHook = useAdminGroups(token, canLoad);
  const sendButtonScale = useSharedValue(1);
  const sendButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendButtonScale.value }],
  }));
  // For the "team" tab we list every team in the org (not just teams that
  // already have a chat group). Tapping a team finds its chat group by name
  // and opens it — or creates one on the fly if missing.
  const teamsHook = useAdminTeams(token, canLoad && category === "team");
  const { uploadAttachment } = useMediaUpload(token);
  // Loading the team's chat after a tap (find-or-create), so we can show a spinner.
  const [openingTeamId, setOpeningTeamId] = useState<number | null>(null);

  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingAttachment | null>(null);

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
    if (!canLoad) return;
    // Initial load (empty query) fires immediately so the user sees the list ASAP.
    // Debounce only kicks in once the user actually starts typing a search query.
    if (query.length === 0) {
      groupsHook.loadGroups("", false);
      return;
    }
    if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
    queryDebounceRef.current = setTimeout(() => {
      groupsHook.loadGroups(query, false);
    }, 250);
    return () => {
      if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
    };
  }, [canLoad, query]);

  // Load the full teams list for the "team" tab (fires once when section opens).
  useEffect(() => {
    if (!canLoad || category !== "team") return;
    void teamsHook.load(false);
  }, [canLoad, category, teamsHook.load]);

  const filteredGroups = groupsHook.groups.filter((g) => {
    const cat = (g.category ?? "").toLowerCase();
    if (category === "announcement") return cat === "announcement";
    // Team tab: strictly team-categorized chats, not coach groups.
    return cat === "team";
  });

  // For the "team" tab: build rows from /admin/teams (so EVERY team is visible),
  // then enrich each row with chat metadata (preview, unread, time) by matching
  // the team's name to a chat group with category="team".
  const teamRows = React.useMemo(() => {
    if (category !== "team") return [];
    const groupByName = new Map<string, ChatGroup>();
    for (const g of filteredGroups) {
      const name = String(g.name ?? "").trim().toLowerCase();
      if (name) groupByName.set(name, g);
    }
    const q = query.trim().toLowerCase();
    return teamsHook.teams
      .map((team) => {
        // The API field may be `team`, but fall back to any other name-ish field
        // and finally to a generated label so a team is never rendered nameless.
        const rawName =
          (team as any).team ??
          (team as any).name ??
          (team as any).teamName ??
          (team as any).slug ??
          "";
        const displayName =
          String(rawName).trim() || `Team ${team.id ?? "?"}`;
        return { team, displayName };
      })
      .filter(({ displayName }) =>
        q ? displayName.toLowerCase().includes(q) : true,
      )
      .map(({ team, displayName }) => {
        const chat =
          groupByName.get(displayName.toLowerCase()) ?? null;
        return { team, chat, displayName };
      });
  }, [category, filteredGroups, teamsHook.teams, query]);

  useEffect(() => {
    if (!token || !canLoad || groupsHook.groups.length === 0) return;
    const timeout = setTimeout(() => {
      prefetchAdminGroupThreadMessages(token, groupsHook.groups, category);
    }, 150);
    return () => clearTimeout(timeout);
  }, [canLoad, category, groupsHook.groups, token]);

  // Resolve the team's chat group (find existing or create one), then open it.
  const openTeamChat = async (
    team: { id: number; team: string },
    existing: ChatGroup | null,
  ) => {
    if (existing?.id) {
      groupsHook.setActiveGroupId(existing.id);
      groupsHook.setActiveGroupName(existing.name ?? team.team);
      groupsHook.loadMessages(existing.id, true);
      void groupsHook.markGroupRead(existing.id);
      return;
    }
    setOpeningTeamId(team.id);
    try {
      const created = await groupsHook.createGroup({
        name: team.team,
        category: "team",
        memberIds: [],
      });
      if (created?.id) {
        groupsHook.setActiveGroupId(created.id);
        groupsHook.setActiveGroupName(created.name ?? team.team);
        groupsHook.loadMessages(created.id, true);
        void groupsHook.markGroupRead(created.id);
        // Refresh the chat-groups list so the new team chat appears immediately
        // with preview/time on next render.
        void groupsHook.loadGroups("", true);
      }
    } catch (e) {
      console.warn("[AdminGroupSection] failed to create team chat", e);
    } finally {
      setOpeningTeamId(null);
    }
  };

  useEffect(() => {
    if (!socket || !groupsHook.activeGroupId) return;

    const handleNewMessage = (msg: GroupMessage) => {
      if (msg.groupId === groupsHook.activeGroupId) {
        groupsHook.setMessages((prev) => [...prev, msg]);
      }
      if (typeof msg.groupId === "number") {
        appendCachedAdminGroupMessage(msg.groupId, msg);
      }
    };

    socket.on("group_message", handleNewMessage);
    return () => {
      socket.off("group_message", handleNewMessage);
    };
  }, [socket, groupsHook.activeGroupId]);

  const handleSend = async () => {
    if (!groupsHook.activeGroupId || (!draft.trim() && !pendingAttachment))
      return;
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

      const groupId = groupsHook.activeGroupId;
      const sent = await groupsHook.sendGroupMessage({
        groupId,
        content: draft.trim(),
        mediaUrl,
        contentType,
      });
      if (sent) {
        groupsHook.setMessages((prev) => [...prev, sent]);
        appendCachedAdminGroupMessage(groupId, sent);
      }

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

  const canSendGroupMessage =
    !isSending && !isUploading && (draft.trim().length > 0 || !!pendingAttachment);

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

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          gap: 10,
          alignItems: "center",
        }}
      >
        <AdminInput
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${category === "team" ? "teams" : "announcements"}`}
          leftIcon={Search}
          onClear={() => setQuery("")}
          containerStyle={{ flex: 1 }}
        />
        <AdminIconButton
          icon={Plus}
          onPress={() => setCreateOpen(true)}
          tone={category === "team" ? "success" : "accent"}
          accessibilityLabel={`Create ${category === "team" ? "team chat" : "announcement"}`}
        />
      </View>

      {(() => {
        const accent = category === "team" ? "#34C759" : "#7B61FF";
        const avatarBg = isDark ? `${accent}33` : `${accent}1F`;

        const isLoadingFirstTime =
          category === "team"
            ? teamsHook.loading && teamsHook.teams.length === 0
            : groupsHook.groupsLoading && filteredGroups.length === 0;

        const renderRows: { key: React.Key; name: string; chat: ChatGroup | null; teamId?: number }[] =
          category === "team"
            ? teamRows.map(({ team, chat, displayName }) => ({
                key: team.id,
                name: displayName,
                chat,
                teamId: team.id,
              }))
            : filteredGroups.map((g) => ({
                key: g.id,
                name: String(g.name ?? "").trim() || `Group ${g.id}`,
                chat: g,
              }));

        if (isLoadingFirstTime) {
          return (
            <View style={{ paddingHorizontal: 16, gap: 14 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View
                  key={i}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
                >
                  <Skeleton width={52} height={52} style={{ borderRadius: 26 }} />
                  <Skeleton width="60%" height={16} />
                </View>
              ))}
            </View>
          );
        }

        if (renderRows.length === 0) {
          return (
            <AdminEmptyState
              icon={Users}
              title={
                query
                  ? "No matching results"
                  : category === "team"
                    ? "No teams yet"
                    : "No announcements yet"
              }
              description={
                query
                  ? "Clear the search or try a different name."
                  : category === "team"
                    ? "Teams will show here as soon as they exist in admin."
                    : "Create an announcement group to message a targeted audience."
              }
              tone={category === "team" ? "success" : "accent"}
            />
          );
        }

        return (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {renderRows.map((row) => {
              const unread = safeNumber(row.chat?.unreadCount);
              const initials =
                String(row.name ?? "")
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => (w[0] ?? "").toUpperCase())
                  .join("") || "T";
              const isOpening =
                row.teamId != null && openingTeamId === row.teamId;
              return (
                <AdminListRow
                  key={row.key}
                  title={String(row.name || "Unnamed")}
                  subtitle={
                    row.chat?.lastMessage?.content
                      ? stripPreview(row.chat.lastMessage.content)
                      : category === "team"
                        ? row.chat
                          ? "Team conversation ready"
                          : "Tap to create team chat"
                        : "Announcement group"
                  }
                  meta={formatWhen(row.chat?.lastMessage?.createdAt)}
                  unreadCount={unread}
                  tone={category === "team" ? "success" : "accent"}
                  leading={
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 15,
                        backgroundColor: avatarBg,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1,
                        borderColor: isDark ? `${accent}45` : `${accent}2E`,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Outfit-Bold",
                          fontSize: 14,
                          color: accent,
                        }}
                      >
                        {initials}
                      </Text>
                    </View>
                  }
                  trailing={
                    isOpening ? (
                      <ActivityIndicator size="small" color={accent} />
                    ) : row.chat ? undefined : (
                      <AdminBadge tone={category === "team" ? "success" : "accent"}>
                        New
                      </AdminBadge>
                    )
                  }
                  onPress={() => {
                    if (isOpening) return;
                    if (category === "team" && row.teamId != null) {
                      void openTeamChat(
                        { id: row.teamId, team: row.name },
                        row.chat,
                      );
                    } else if (row.chat?.id != null) {
                      groupsHook.setActiveGroupId(row.chat.id);
                      groupsHook.setActiveGroupName(row.chat.name ?? row.name);
                      groupsHook.loadMessages(row.chat.id, true);
                      void groupsHook.markGroupRead(row.chat.id);
                    }
                  }}
                />
              );
            })}
          </View>
        );
      })()}

      {/* GROUP THREAD MODAL */}
      <Modal
        visible={groupsHook.activeGroupId != null}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
        onRequestClose={() => groupsHook.setActiveGroupId(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: insets.top,
          }}
        >
          {/* HEADER */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderBottomWidth: 1,
              borderBottomColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(15,23,42,0.06)",
            }}
          >
            <Pressable
              onPress={() => groupsHook.setActiveGroupId(null)}
              hitSlop={10}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Ionicons name="chevron-back" size={26} color={colors.accent} />
            </Pressable>

            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? "#34C75933" : "#34C7591F",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RNText
                style={{ fontSize: 14, fontWeight: "700", color: "#34C759" }}
              >
                {String(groupsHook.activeGroupName ?? "")
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => (w[0] ?? "").toUpperCase())
                  .join("") || "T"}
              </RNText>
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <RNText
                numberOfLines={1}
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: isDark ? "#FFFFFF" : "#000000",
                  letterSpacing: -0.2,
                }}
              >
                {groupsHook.activeGroupName ?? "Team"}
              </RNText>
              <Pressable onPress={openMembers} hitSlop={6}>
                <Text
                  style={{
                    fontFamily: "Outfit-Medium",
                    fontSize: 12,
                    color: colors.accent,
                    marginTop: 1,
                  }}
                >
                  Manage members
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={openMembers}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(15,23,42,0.05)",
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons name="people" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* MESSAGES */}
          <ThemedScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 8 }}
          >
            {groupsHook.messagesLoading && groupsHook.messages.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : groupsHook.messages.length === 0 ? (
              <View
                style={{
                  paddingVertical: 56,
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: isDark ? "#34C75922" : "#34C75914",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="chatbubbles" size={26} color="#34C759" />
                </View>
                <Text
                  style={{
                    fontFamily: "Outfit-Medium",
                    fontSize: 13,
                    color: colors.textSecondary,
                  }}
                >
                  No messages yet — say hello
                </Text>
              </View>
            ) : (
              groupsHook.messages.map((m, idx) => {
                const isMe = m.senderId === myUserId;
                const prev = groupsHook.messages[idx - 1];
                const groupedWithPrev =
                  prev && prev.senderId === m.senderId;
                return (
                  <View
                    key={m.id ?? idx}
                    style={{
                      maxWidth: "82%",
                      alignSelf: isMe ? "flex-end" : "flex-start",
                      marginTop: groupedWithPrev ? 0 : 6,
                    }}
                  >
                    <Card
                      variant="default"
                      radius="lg"
                      shadow="sm"
                      padding={m.mediaUrl ? 6 : 12}
                      style={{
                        backgroundColor: isMe
                          ? colors.accent
                          : isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(15,23,42,0.05)",
                        borderTopLeftRadius:
                          !isMe && groupedWithPrev ? 6 : 18,
                        borderTopRightRadius:
                          isMe && groupedWithPrev ? 6 : 18,
                      }}
                    >
                      {m.mediaUrl ? (
                        <ExpoImage
                          source={{ uri: m.mediaUrl }}
                          style={{
                            width: 220,
                            height: 220,
                            borderRadius: 12,
                          }}
                          contentFit="cover"
                        />
                      ) : null}
                      {m.content ? (
                        <RNText
                          style={{
                            fontSize: 15,
                            lineHeight: 20,
                            color: isMe
                              ? "#FFFFFF"
                              : isDark
                                ? "#FFFFFF"
                                : "#000000",
                            marginTop: m.mediaUrl ? 6 : 0,
                            paddingHorizontal: m.mediaUrl ? 6 : 0,
                          }}
                        >
                          {m.content}
                        </RNText>
                      ) : null}
                      <RNText
                        style={{
                          fontSize: 10,
                          marginTop: 4,
                          paddingHorizontal: m.mediaUrl ? 6 : 0,
                          color: isMe
                            ? "rgba(255,255,255,0.75)"
                            : colors.textSecondary,
                          textAlign: "right",
                        }}
                      >
                        {formatWhen(m.createdAt)}
                      </RNText>
                    </Card>
                  </View>
                );
              })
            )}
          </ThemedScrollView>

          {/* COMPOSER */}
          <View
            style={{
              paddingHorizontal: 12,
              paddingTop: 8,
              paddingBottom: Math.max(insets.bottom, 12),
              borderTopWidth: 1,
              borderTopColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(15,23,42,0.06)",
            }}
          >
            {pendingAttachment ? (
              <Card
                variant="outline"
                radius="md"
                shadow="none"
                padding={8}
                style={{
                  marginBottom: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <ExpoImage
                  source={{ uri: pendingAttachment.uri }}
                  style={{ width: 40, height: 40, borderRadius: 8 }}
                />
                <Text
                  style={{
                    flex: 1,
                    fontFamily: "Outfit-Regular",
                    fontSize: 12,
                    color: colors.textSecondary,
                  }}
                  numberOfLines={1}
                >
                  {pendingAttachment.fileName}
                </Text>
                <Pressable
                  onPress={() => setPendingAttachment(null)}
                  hitSlop={6}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={colors.danger}
                  />
                </Pressable>
              </Card>
            ) : null}

            <View
              style={{
                width: "100%",
                flexDirection: "row",
                alignItems: "flex-end",
              }}
            >
              <Pressable
                onPress={() => setComposerMenuOpen(true)}
                hitSlop={6}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(255,255,255,0.9)",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Ionicons name="add" size={22} color={colors.accent} />
              </Pressable>

              <View
                style={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 44,
                  maxHeight: 144,
                  marginLeft: 8,
                  marginRight: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 22,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(15,23,42,0.05)",
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(15,23,42,0.08)",
                  justifyContent: "center",
                }}
              >
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Message"
                  placeholderTextColor={colors.placeholder}
                  multiline
                  style={{
                    minHeight: 28,
                    maxHeight: 120,
                    padding: 0,
                    fontFamily: "Outfit-Regular",
                    fontSize: 15,
                    color: colors.textPrimary,
                  }}
                />
              </View>

              <AnimatedPressable
                onPress={handleSend}
                disabled={!canSendGroupMessage}
                onPressIn={() => {
                  sendButtonScale.value = withSpring(0.85);
                }}
                onPressOut={() => {
                  sendButtonScale.value = withSpring(1);
                }}
                style={[
                  sendButtonStyle,
                  {
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    borderRadius: 22,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.accent,
                    opacity: canSendGroupMessage ? 1 : 0.5,
                    elevation: 2,
                    zIndex: 30,
                  },
                ]}
              >
                {isSending || isUploading ? (
                  <ActivityIndicator size="small" color="hsl(220, 5%, 98%)" />
                ) : (
                  <Ionicons
                    name="arrow-up"
                    size={20}
                    color="hsl(220, 5%, 98%)"
                  />
                )}
              </AnimatedPressable>
            </View>
          </View>
        </View>

        <ComposerActionsModal
          open={composerMenuOpen}
          onClose={() => setComposerMenuOpen(false)}
          onAttachFile={() => setComposerMenuOpen(false)}
          onAttachImage={pickImage}
          onAttachVideo={() => setComposerMenuOpen(false)}
          onTakePhoto={takePhoto}
          onRecordVideo={() => setComposerMenuOpen(false)}
          onOpenEmojis={() => setEmojiPickerOpen(true)}
          onOpenGifs={() => setGifPickerOpen(true)}
        />
        <EmojiPickerModal
          open={emojiPickerOpen}
          onClose={() => setEmojiPickerOpen(false)}
          onSelectEmoji={(emoji: string) => setDraft((prev) => prev + emoji)}
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
      </Modal>

      {/* CREATE GROUP MODAL (Simplified for brevity) */}
      <Modal visible={createOpen} animationType="fade" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            className="bg-card rounded-3xl p-6"
            style={{ backgroundColor: colors.cardElevated }}
          >
            <Text className="text-[18px] font-clash font-bold text-app mb-4">
              New {categoryLabel(category)}
            </Text>
            <TextInput
              value={createName}
              onChangeText={setCreateGroupName}
              placeholder="Name..."
              placeholderTextColor={colors.placeholder}
              className="bg-background rounded-2xl px-4 py-3 mb-4 text-app"
            />
            <View className="flex-row gap-2 justify-end">
              <SmallAction
                label="Cancel"
                tone="neutral"
                onPress={() => setCreateOpen(false)}
              />
              <SmallAction
                label="Create"
                tone="success"
                onPress={handleCreateGroup}
                disabled={isCreating}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
