import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useCallback } from "react";
import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import type { MessageThread } from "@/types/messages";

function getInitials(name?: string | null) {
  if (!name || typeof name !== "string") return "";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0]?.[0] ?? "";
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
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

export type ThreadListItemProps = {
  thread: MessageThread;
  typingStatus?: { name: string; isTyping: boolean };
  openingThreadId: string | null;
  onOpenThread: (
    thread: MessageThread,
    sharedBoundTag?: string,
    avatarTag?: string,
  ) => void;
  index: number;
};

export const ThreadListItem = React.memo(function ThreadListItem({
  thread,
  typingStatus,
  openingThreadId,
  onOpenThread,
}: ThreadListItemProps) {
  const { colors, isDark } = useAppTheme();

  const typing = typingStatus;
  const sharedBoundTag = `thread-card-${thread.id}`;
  const sharedAvatarTag = `thread-avatar-${thread.id}`;
  const unreadBadge = formatUnreadBadge(thread.unread);
  const isUnread = !!unreadBadge;
  const isOnline = thread.channelType === "direct" && thread.lastSeen === "Online";
  const previewLabel = getPreviewText(thread);
  const isOpening = openingThreadId === thread.id;
  const isTeamThread =
    thread.channelType === "team" || thread.channelType === "coach_group";

  const separatorColor = isDark
    ? "rgba(255,255,255,0.06)"
    : "rgba(0,0,0,0.08)";

  const handlePress = useCallback(
    () => onOpenThread(thread, sharedBoundTag, sharedAvatarTag),
    [onOpenThread, thread, sharedBoundTag, sharedAvatarTag],
  );

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Open conversation with ${thread.name}${unreadBadge ? `, ${unreadBadge} unread` : ""}`}
      android_ripple={{ color: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}
      style={({ pressed }) => ({
        opacity: isOpening ? 0.55 : 1,
        backgroundColor: pressed && !isOpening
          ? isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"
          : "transparent",
      })}
    >
      <View style={[styles.row, { borderBottomColor: separatorColor }]}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
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
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(0,0,0,0.05)",
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontFamily: "Outfit-Bold",
                  color: colors.textPrimary,
                  letterSpacing: 0.5,
                }}
              >
                {getInitials(thread.name)}
              </Text>
            </View>
          )}

          {isTeamThread ? (
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isDark ? colors.surfaceHigher : "#F4F5F4",
                  borderColor: colors.background,
                },
              ]}
            >
              <Ionicons name="people" size={9} color={colors.accent} />
            </View>
          ) : isOnline ? (
            <View
              style={[
                styles.onlineDot,
                { borderColor: colors.background },
              ]}
            />
          ) : null}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text
              style={[
                styles.name,
                {
                  fontFamily: isUnread ? "Outfit-Bold" : "Outfit-SemiBold",
                  color: colors.textPrimary,
                },
              ]}
              numberOfLines={1}
            >
              {thread.name}
            </Text>
            <Text
              style={[
                styles.time,
                {
                  fontFamily: "Outfit-Regular",
                  color: isUnread ? colors.accent : colors.textDim,
                },
              ]}
              numberOfLines={1}
            >
              {thread.time}
            </Text>
          </View>

          <View style={styles.bottomRow}>
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
                },
              ]}
              numberOfLines={1}
            >
              {typing?.isTyping ? `${typing.name} is typing...` : previewLabel}
            </Text>

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
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  onlineDot: {
    position: "absolute",
    right: 1,
    bottom: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22c55e",
    borderWidth: 2,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  time: {
    fontSize: 13,
    flexShrink: 0,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  preview: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
  },
});
