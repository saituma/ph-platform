import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useCallback, useMemo } from "react";
import {
  Pressable,
  type StyleProp,
  type ViewStyle,
  useWindowDimensions,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Transition } from "@/components/navigation/TransitionStack";
import { Text } from "@/components/ScaledText";
import { INBOX_LIST_INSET } from "@/components/messages/inbox/inbox-constants";
import { ListRow } from "@/components/ui/list-row";
import type { MessageThread, TypingStatus } from "@/types/messages";

// ── Helpers (shared with InboxScreen) ─────────────────────────────

function getInitials(name?: string | null) {
  if (!name || typeof name !== "string") return "";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0]?.[0] ?? "";
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function getTypingKey(threadId: string) {
  return threadId.startsWith("group:") ? threadId : `user:${threadId}`;
}

function formatUnreadBadge(unread: number) {
  if (!Number.isFinite(unread) || unread <= 0) return null;
  return unread > 99 ? "99+" : String(unread);
}

function getPreviewText(thread: MessageThread) {
  const preview = thread.preview?.trim() || "No messages yet";
  if (thread.channelType === "direct") return preview;
  const sender = thread.senderName?.trim();
  if (!sender) return preview;
  return `${sender}: ${preview}`;
}

function getInboxA11yLabel(thread: MessageThread, unreadBadge: string | null) {
  const unreadLabel = unreadBadge ? `, ${unreadBadge} unread` : "";
  return `Open conversation with ${thread.name}${unreadLabel}`;
}

// ── Props ───────────────────────────────────────────────────────

export type ThreadListItemProps = {
  thread: MessageThread;
  typingStatus: TypingStatus;
  openingThreadId: string | null;
  onOpenThread: (
    thread: MessageThread,
    sharedBoundTag?: string,
    avatarTag?: string,
  ) => void;
  index: number;
};

// ── Row ─────────────────────────────────────────────────────────

export const ThreadListItem = React.memo(function ThreadListItem({
  thread,
  typingStatus,
  openingThreadId,
  onOpenThread,
  index,
}: ThreadListItemProps) {
  const { width: winW } = useWindowDimensions();
  const { colors, isDark } = useAppTheme();

  const frameWidth = useMemo(
    () => Math.max(0, Math.floor(winW - INBOX_LIST_INSET * 2)),
    [winW],
  );

  const typingKey = getTypingKey(thread.id);
  const typing = typingStatus[typingKey];
  const sharedBoundTag = `thread-card-${thread.id}`;
  const sharedAvatarTag = `thread-avatar-${thread.id}`;
  const unreadBadge = formatUnreadBadge(thread.unread);
  const isUnread = !!unreadBadge;
  const isOnline = thread.channelType === "direct" && thread.lastSeen === "Online";
  const previewLabel = getPreviewText(thread);
  const isOpening = openingThreadId === thread.id;
  const isTeamThread =
    thread.channelType === "team" || thread.channelType === "coach_group";

  const rowBorder = isDark ? colors.borderStrong : colors.borderMid;
  const rowSurface = isDark
    ? colors.surfaceHigher ?? "#181B18"
    : "#FFFFFF";
  const rowPressed = isDark
    ? "rgba(255, 255, 255, 0.05)"
    : "rgba(0, 0, 0, 0.03)";
  const unreadBg = isDark
    ? "rgba(52, 199, 89, 0.08)"
    : "rgba(52, 199, 89, 0.07)";

  const cardShadow: StyleProp<ViewStyle> = useMemo(
    () => ({
      shadowColor: isDark ? "#000" : "rgba(0,0,0,0.1)",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.07,
      shadowRadius: isDark ? 8 : 5,
      elevation: isDark ? 2 : 1,
    }),
    [isDark],
  );

  const handlePress = useCallback(
    () => onOpenThread(thread, sharedBoundTag, sharedAvatarTag),
    [onOpenThread, thread, sharedBoundTag, sharedAvatarTag],
  );

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 12) * 28).springify().damping(16)}
      style={[
        { width: frameWidth, maxWidth: frameWidth, alignSelf: "center" as const },
        cardShadow,
      ]}
    >
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={getInboxA11yLabel(thread, unreadBadge)}
        android_ripple={{ color: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}
        style={{ width: frameWidth, maxWidth: frameWidth, opacity: isOpening ? 0.55 : 1 }}
      >
        {({ pressed }) => (
          <ListRow.Frame
            frameWidth={frameWidth}
            backgroundColor={(() => {
              if (pressed) {
                if (isUnread) {
                  return isDark
                    ? "rgba(52, 199, 89, 0.14)"
                    : "rgba(52, 199, 89, 0.12)";
                }
                return rowPressed;
              }
              if (isUnread) return unreadBg;
              return rowSurface;
            })()}
            borderColor={rowBorder}
            borderWidth={1}
            borderLeftWidth={isUnread ? 3 : 1}
            borderLeftColor={isUnread ? colors.accent : rowBorder}
          >
            <ListRow.Main>
              <ListRow.Media>
                <Transition.View sharedBoundTag={sharedAvatarTag}>
                  <View style={styles.avatarStack}>
                    <View
                      style={[
                        styles.avatarRing,
                        {
                          borderColor: isDark
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(0, 0, 0, 0.07)",
                          borderWidth: 1,
                        },
                      ]}
                    >
                      {thread.avatarUrl ? (
                        <Image
                          source={{ uri: thread.avatarUrl }}
                          style={styles.avatar}
                          cachePolicy="memory-disk"
                          placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
                        />
                      ) : (
                        <View
                          style={[
                            styles.avatar,
                            styles.avatarPlaceholder,
                            {
                              backgroundColor: isDark
                                ? "rgba(255, 255, 255, 0.07)"
                                : "rgba(0, 0, 0, 0.05)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.initialsText,
                              { fontFamily: "Outfit-Bold", color: colors.textPrimary },
                            ]}
                          >
                            {getInitials(thread.name)}
                          </Text>
                        </View>
                      )}
                    </View>
                    {isTeamThread ? (
                      <View
                        style={[
                          styles.teamAvatarBadge,
                          {
                            backgroundColor: isDark ? colors.surfaceHigher : "#F4F5F4",
                            borderColor: isUnread ? unreadBg : rowSurface,
                          },
                        ]}
                      >
                        <Ionicons name="people" size={10} color={colors.accent} />
                      </View>
                    ) : isOnline ? (
                      <View
                        style={[
                          styles.onlineDot,
                          { borderColor: isUnread ? (isDark ? "rgba(52,199,89,0.08)" : "rgba(52,199,89,0.07)") : rowSurface },
                        ]}
                      />
                    ) : null}
                  </View>
                </Transition.View>
              </ListRow.Media>

              <ListRow.Body>
                <ListRow.Header>
                  <View style={styles.nameRow}>
                    {isTeamThread && (
                      <View
                        style={[
                          styles.teamChip,
                          { backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.teamChipText,
                            { color: colors.textDim, fontFamily: "Outfit-SemiBold" },
                          ]}
                          numberOfLines={1}
                        >
                          Team
                        </Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.title,
                        {
                          fontFamily: isUnread ? "Outfit-Bold" : "Outfit-SemiBold",
                          color: colors.textPrimary,
                          flex: 1,
                          minWidth: 0,
                        },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {thread.name}
                    </Text>
                  </View>

                  <View style={styles.timeColumn}>
                    <Text
                      style={[
                        styles.time,
                        {
                          fontFamily: "Outfit-Medium",
                          color: isUnread ? colors.accent : colors.textDim,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {thread.time}
                    </Text>
                  </View>
                </ListRow.Header>

                <ListRow.Footer>
                  <View style={styles.previewWrap}>
                    {typing?.isTyping ? (
                      <Animated.View
                        entering={FadeIn}
                        style={[styles.typingDot, { backgroundColor: colors.accent }]}
                      />
                    ) : null}
                    <Text
                      style={[
                        styles.preview,
                        {
                          fontFamily: isUnread ? "Outfit-Medium" : "Outfit-Regular",
                          color: typing?.isTyping
                            ? colors.accent
                            : isUnread
                              ? colors.textSecondary
                              : colors.textDim,
                          flex: 1,
                          minWidth: 0,
                        },
                      ]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {typing?.isTyping ? `${typing.name} is typing...` : previewLabel}
                    </Text>
                  </View>

                  <ListRow.Meta>
                    {isUnread && (
                      <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                        <Text
                          style={[
                            styles.badgeText,
                            {
                              fontFamily: "Outfit-Bold",
                              color: isDark ? colors.textInverse : "#0A0B0A",
                            },
                          ]}
                        >
                          {unreadBadge}
                        </Text>
                      </View>
                    )}
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textDim}
                      style={styles.chevron}
                    />
                  </ListRow.Meta>
                </ListRow.Footer>
              </ListRow.Body>
            </ListRow.Main>
          </ListRow.Frame>
        )}
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  avatarStack: {
    position: "relative",
  },
  avatarRing: {
    borderRadius: 999,
    overflow: "hidden",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  teamAvatarBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  onlineDot: {
    position: "absolute",
    right: 1,
    bottom: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#22c55e",
    borderWidth: 2,
  },
  initialsText: {
    fontSize: 18,
    letterSpacing: 0.5,
  },
  nameRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  teamChipText: {
    fontSize: 11,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  timeColumn: {
    maxWidth: 88,
    flexShrink: 0,
  },
  title: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
  time: {
    fontSize: 12,
    textAlign: "right",
  },
  previewWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: 5,
  },
  preview: {
    fontSize: 14,
    lineHeight: 19,
  },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 12,
  },
  chevron: {
    opacity: 0.4,
  },
});
