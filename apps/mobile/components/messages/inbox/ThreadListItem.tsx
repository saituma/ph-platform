import { Image } from "expo-image";
import React, { useCallback } from "react";
import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Users } from "lucide-react-native";

import { useAdminPastel } from "@/components/admin/AdminUI";
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
  const p = useAdminPastel();

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

  const handlePress = useCallback(
    () => onOpenThread(thread, sharedBoundTag, sharedAvatarTag),
    [onOpenThread, thread, sharedBoundTag, sharedAvatarTag],
  );

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Open conversation with ${thread.name}${unreadBadge ? `, ${unreadBadge} unread` : ""}`}
      android_ripple={{ color: "rgba(45,159,63,0.08)" }}
      style={({ pressed }) => ({
        opacity: isOpening ? 0.55 : 1,
        backgroundColor: pressed && !isOpening
          ? p.accentSoft
          : "transparent",
      })}
    >
      <View style={[styles.row, { borderBottomColor: p.divider }]}>
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
                { backgroundColor: p.cardMint },
              ]}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontFamily: "Outfit-Bold",
                  color: p.accent,
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
                  backgroundColor: p.cardSage,
                  borderColor: p.pageBg,
                },
              ]}
            >
              <Users size={9} color={p.accent} strokeWidth={2.5} />
            </View>
          ) : isOnline ? (
            <View
              style={[
                styles.onlineDot,
                { borderColor: p.pageBg },
              ]}
            />
          ) : null}
        </View>

        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text
              style={[
                styles.name,
                {
                  fontFamily: isUnread ? "Outfit-Bold" : "Outfit-Regular",
                  color: p.textPrimary,
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
                  color: isUnread ? p.accent : p.textMuted,
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
                  fontFamily: isUnread ? "Outfit-Bold" : "Outfit-Regular",
                  color: typing?.isTyping
                    ? p.accent
                    : isUnread
                      ? p.textSecondary
                      : p.textMuted,
                },
              ]}
              numberOfLines={1}
            >
              {typing?.isTyping ? `${typing.name} is typing...` : previewLabel}
            </Text>

            {isUnread && (
              <View style={[styles.badge, { backgroundColor: p.accent }]}>
                <Text
                  style={{
                    fontFamily: "Outfit-Bold",
                    fontSize: 11,
                    color: p.buttonPrimaryText,
                  }}
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
    gap: 4,
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
});
