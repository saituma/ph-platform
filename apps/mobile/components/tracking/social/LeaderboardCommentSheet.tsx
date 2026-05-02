import React, { useState, useMemo, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  Image,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { fonts, radius, spacing } from "@/constants/theme";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import {
  createSocialPost,
  type SocialLeaderboardItem,
  type SocialPostItem,
} from "@/services/tracking/socialService";

// Hidden prefix stored in post content so comments are associated with an athlete.
// Stripped before display in both this sheet and the feed.
export const lbTag = (userId: number) => `[lb:${userId}] `;
export const stripLbTag = (content: string) => content.replace(/^\[lb:\d+\]\s*/, "");
export const isLbComment = (content: string) => /^\[lb:\d+\]/.test(content);
export const lbUserId = (content: string): number | null => {
  const m = content.match(/^\[lb:(\d+)\]/);
  return m ? Number(m[1]) : null;
};

interface LeaderboardCommentSheetProps {
  open: boolean;
  onClose: () => void;
  item: SocialLeaderboardItem;
  token: string;
  useTeamFeed: boolean;
  /** All team posts — parent passes this; we filter client-side. */
  postFeed: SocialPostItem[];
  /** Called when a new comment post is created so the parent can update state. */
  onPosted: (post: SocialPostItem) => void;
}

const RANK_COLOR: Record<number, string> = {
  1: "#FFB020",
  2: "#B0BEC5",
  3: "#CD7F32",
};

export function LeaderboardCommentSheet({
  open,
  onClose,
  item,
  token,
  useTeamFeed,
  postFeed,
  onPosted,
}: LeaderboardCommentSheetProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  // Filter posts tagged for this athlete, newest-first
  const comments = useMemo(
    () =>
      postFeed
        .filter((p) => p.content.startsWith(lbTag(item.userId)))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [postFeed, item.userId],
  );

  const rankColor = RANK_COLOR[item.rank] ?? colors.textSecondary;

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || posting) return;
    setPosting(true);
    try {
      const res = await createSocialPost(
        token,
        { content: `${lbTag(item.userId)}${trimmed}` },
        { useTeamFeed },
      );
      onPosted(res.item);
      setText("");
    } catch (e: any) {
      Alert.alert("Couldn't post", String(e?.message ?? "Error"));
    } finally {
      setPosting(false);
    }
  }, [text, posting, token, item.userId, useTeamFeed, onPosted]);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.44)" }}
          onPress={onClose}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              borderTopLeftRadius: radius.xxl,
              borderTopRightRadius: radius.xxl,
              backgroundColor: colors.background,
              paddingTop: spacing.md,
              paddingHorizontal: spacing.lg,
              paddingBottom: Math.max(insets.bottom, spacing.md),
              maxHeight: "88%",
            }}
          >
            {/* Handle */}
            <View
              style={{
                alignSelf: "center",
                width: 36,
                height: 5,
                borderRadius: radius.pill,
                backgroundColor: colors.border,
                marginBottom: spacing.md,
              }}
            />

            {/* Header row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: spacing.md,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: fonts.heading2, fontSize: 17, color: colors.textPrimary }}>
                  Comments
                </Text>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary }}>
                  {comments.length} {comments.length === 1 ? "comment" : "comments"}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => ({
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.surfaceHigh,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Athlete mini-card */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)",
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
                borderRadius: 12,
                padding: 12,
                marginBottom: spacing.md,
              }}
            >
              {/* Rank badge */}
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: `${rankColor}18`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: rankColor }}>
                  #{item.rank}
                </Text>
              </View>

              {/* Avatar */}
              <InitialAvatar name={item.name} avatarUrl={item.avatarUrl} size={36} colors={colors} />

              {/* Name + stats */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary }}>
                  {item.name}
                </Text>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary }}>
                  {item.kmTotal.toFixed(1)} km · {item.durationMinutesTotal} min
                </Text>
              </View>

              {/* Primary stat */}
              <Text style={{ fontFamily: fonts.accentBold ?? fonts.bodyBold, fontSize: 16, color: rankColor }}>
                {item.kmTotal.toFixed(1)}
                <Text style={{ fontSize: 11, color: colors.textSecondary }}> km</Text>
              </Text>
            </View>

            {/* Comment list */}
            <ScrollView
              style={{ maxHeight: 380 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}
            >
              {comments.length === 0 ? (
                <View style={{ paddingVertical: 32, alignItems: "center" }}>
                  <Ionicons name="chatbubble-outline" size={28} color={colors.textSecondary} style={{ marginBottom: 8 }} />
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary }}>
                    Be the first to leave a comment
                  </Text>
                </View>
              ) : (
                comments.map((post) => (
                  <CommentRow key={post.id} post={post} colors={colors} />
                ))
              )}
            </ScrollView>

            {/* Input row */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingTop: spacing.md,
                marginTop: spacing.xs,
                flexDirection: "row",
                alignItems: "flex-end",
                gap: spacing.sm,
              }}
            >
              <View
                style={{
                  flex: 1,
                  minHeight: 48,
                  maxHeight: 120,
                  borderRadius: radius.xl,
                  backgroundColor: colors.surfaceHigh,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  justifyContent: "center",
                }}
              >
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder={`Cheer on ${item.name}…`}
                  placeholderTextColor={colors.placeholder}
                  editable={!posting}
                  multiline
                  style={{
                    color: colors.textPrimary,
                    fontSize: 15,
                    fontFamily: fonts.bodyMedium,
                    lineHeight: 20,
                    textAlignVertical: "center",
                    minHeight: 28,
                  }}
                />
              </View>
              <Pressable
                onPress={() => void handleSubmit()}
                disabled={posting || !text.trim()}
                style={({ pressed }) => ({
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor:
                    posting || !text.trim() ? colors.surfaceHigh : colors.accent,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                {posting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons
                    name="arrow-up"
                    size={22}
                    color={!text.trim() ? colors.textSecondary : "#fff"}
                  />
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CommentRow({
  post,
  colors,
}: {
  post: SocialPostItem;
  colors: any;
}) {
  const displayContent = stripLbTag(post.content);
  const dateLabel = new Date(post.date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" }}>
      <InitialAvatar name={post.name} avatarUrl={post.avatarUrl} size={34} colors={colors} />
      <View style={{ flex: 1 }}>
        <View
          style={{
            borderRadius: radius.xl,
            backgroundColor: colors.surfaceHigh,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary, flex: 1 }} numberOfLines={1}>
              {post.name}
            </Text>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary }}>
              {dateLabel}
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary, lineHeight: 20 }}>
            {displayContent}
          </Text>
        </View>
      </View>
    </View>
  );
}

function InitialAvatar({
  name,
  avatarUrl,
  size,
  colors,
}: {
  name: string;
  avatarUrl: string | null;
  size: number;
  colors: any;
}) {
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  const initial = name.slice(0, 1).toUpperCase() || "?";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.accentLight,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: size * 0.38, color: colors.textPrimary }}>
        {initial}
      </Text>
    </View>
  );
}
