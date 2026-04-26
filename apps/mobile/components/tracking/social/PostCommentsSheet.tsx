import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { radius, spacing } from "@/constants/theme";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import {
  deletePostComment,
  fetchPostComments,
  postSocialPostComment,
  type SocialPostCommentItem,
} from "@/services/tracking/socialService";

type ReplyState = { parentCommentId: number; name: string } | null;

export function PostCommentsSheet({
  open,
  onClose,
  token,
  postId,
  postOwnerName,
  useTeamFeed = false,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  postId: number;
  postOwnerName?: string | null;
  useTeamFeed?: boolean;
  onChanged?: () => void | Promise<void>;
}) {
  const { colors } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const [items, setItems] = useState<SocialPostCommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ReplyState>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPostComments(token, postId, { useTeamFeed });
      setItems(res.items ?? []);
    } catch (e: any) {
      Alert.alert("Couldn't load comments", String(e?.message ?? "Error"));
    } finally {
      setLoading(false);
    }
  }, [postId, token, useTeamFeed]);

  useEffect(() => {
    if (!open) return;
    setReplyTo(null);
    setText("");
    void load();
  }, [load, open]);

  const thread = useMemo(() => {
    const byId = new Map<number, SocialPostCommentItem>();
    for (const comment of items) byId.set(comment.commentId, comment);

    const childrenByParent = new Map<number, SocialPostCommentItem[]>();
    const roots: SocialPostCommentItem[] = [];

    for (const comment of items) {
      if (comment.parentId == null || !byId.has(comment.parentId)) {
        roots.push(comment);
        continue;
      }
      if (!childrenByParent.has(comment.parentId)) {
        childrenByParent.set(comment.parentId, []);
      }
      childrenByParent.get(comment.parentId)?.push(comment);
    }

    const sortAsc = (a: SocialPostCommentItem, b: SocialPostCommentItem) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

    roots.sort(sortAsc);
    for (const [key, value] of childrenByParent.entries()) {
      childrenByParent.set(key, [...value].sort(sortAsc));
    }

    return { roots, childrenByParent };
  }, [items]);

  const notifyChanged = useCallback(async () => {
    if (!onChanged) return;
    await onChanged();
  }, [onChanged]);

  const onSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || posting) return;

    setPosting(true);
    try {
      await postSocialPostComment(token, postId, trimmed, {
        parentId: replyTo?.parentCommentId ?? null,
        useTeamFeed,
      });
      setReplyTo(null);
      setText("");
      await Promise.all([load(), notifyChanged()]);
    } catch (e: any) {
      Alert.alert("Couldn't send", String(e?.message ?? "Error"));
    } finally {
      setPosting(false);
    }
  }, [load, notifyChanged, postId, posting, replyTo, text, token, useTeamFeed]);

  const onDelete = useCallback(
    (comment: SocialPostCommentItem) => {
      Alert.alert("Delete comment?", "This will remove the comment.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePostComment(token, comment.commentId, { useTeamFeed });
              await Promise.all([load(), notifyChanged()]);
            } catch (e: any) {
              Alert.alert("Couldn't delete", String(e?.message ?? "Error"));
            }
          },
        },
      ]);
    },
    [load, notifyChanged, token, useTeamFeed],
  );

  const onShare = useCallback(
    async (comment: SocialPostCommentItem) => {
      const who = comment.name || "Someone";
      const owner = postOwnerName?.trim() ? ` on ${postOwnerName}'s post` : "";
      const msg = `${who} commented${owner}:\n\n${comment.content}`;
      await Share.share({ message: msg }).catch(() => {});
    },
    [postOwnerName],
  );

  const commentCount = items.length;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.42)" }}
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
              maxHeight: "86%",
            }}
          >
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

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: spacing.md,
              }}
            >
              <View>
                <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "700" }}>
                  Comments
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {commentCount} {commentCount === 1 ? "comment" : "comments"}
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
                  opacity: pressed ? 0.78 : 1,
                })}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            {replyTo ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  marginBottom: spacing.md,
                  borderRadius: radius.lg,
                  backgroundColor: colors.surfaceHigh,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  Replying to {replyTo.name}
                </Text>
                <Pressable onPress={() => setReplyTo(null)}>
                  <Text style={{ color: colors.accent, fontSize: 13, fontWeight: "600" }}>Cancel</Text>
                </Pressable>
              </View>
            ) : null}

            {loading ? (
              <View style={{ paddingVertical: spacing.xxxl, alignItems: "center" }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : (
              <ScrollView
                style={{ maxHeight: 430 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.md }}
              >
                {thread.roots.length === 0 ? (
                  <View
                    style={{
                      paddingVertical: spacing.xxxl,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>No comments yet</Text>
                  </View>
                ) : null}

                {thread.roots.map((comment) => (
                  <PostCommentThreadNode
                    key={comment.commentId}
                    comment={comment}
                    depth={0}
                    childrenByParent={thread.childrenByParent}
                    colors={colors}
                    onReply={(item) => {
                      setReplyTo({ parentCommentId: item.commentId, name: item.name });
                      setText("");
                    }}
                    onDelete={onDelete}
                    onShare={onShare}
                  />
                ))}
              </ScrollView>
            )}

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
                  placeholder={replyTo ? "Write a reply" : "Add a comment"}
                  placeholderTextColor={colors.placeholder}
                  editable={!posting}
                  multiline
                  style={{
                    color: colors.textPrimary,
                    fontSize: 15,
                    lineHeight: 20,
                    textAlignVertical: "center",
                    minHeight: 28,
                  }}
                />
              </View>
              <Pressable
                onPress={() => void onSubmit()}
                disabled={posting || !text.trim().length}
                style={({ pressed }) => ({
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor:
                    posting || !text.trim().length ? colors.surfaceHigh : colors.accent,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                {posting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name="arrow-up"
                    size={22}
                    color={posting || !text.trim().length ? colors.textSecondary : "#FFFFFF"}
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

function PostCommentThreadNode({
  comment,
  depth,
  childrenByParent,
  colors,
  onReply,
  onDelete,
  onShare,
}: {
  comment: SocialPostCommentItem;
  depth: number;
  childrenByParent: Map<number, SocialPostCommentItem[]>;
  colors: Record<string, string>;
  onReply: (comment: SocialPostCommentItem) => void;
  onDelete: (comment: SocialPostCommentItem) => void;
  onShare: (comment: SocialPostCommentItem) => void;
}) {
  const children = childrenByParent.get(comment.commentId) ?? [];
  const indent = Math.min(4, depth) * 22;
  const dateLabel = new Date(comment.createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <View style={{ marginLeft: indent }}>
      <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" }}>
        <CommentAvatar name={comment.name} colors={colors} />
        <View style={{ flex: 1, gap: 8 }}>
          <View
            style={{
              borderRadius: radius.xl,
              backgroundColor: colors.surfaceHigh,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "700", flex: 1 }}>
                {comment.name}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{dateLabel}</Text>
            </View>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 14,
                lineHeight: 20,
                marginTop: 6,
              }}
            >
              {comment.content}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingLeft: 4 }}>
            <Pressable onPress={() => onReply(comment)} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "600" }}>Reply</Text>
            </Pressable>
            <Pressable onPress={() => void onShare(comment)} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "600" }}>Share</Text>
            </Pressable>
            {comment.canDelete ? (
              <Pressable onPress={() => onDelete(comment)} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}>
                <Text style={{ color: colors.danger, fontSize: 12, fontWeight: "600" }}>Delete</Text>
              </Pressable>
            ) : null}
          </View>

          {children.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              {children.map((child) => (
                <PostCommentThreadNode
                  key={child.commentId}
                  comment={child}
                  depth={depth + 1}
                  childrenByParent={childrenByParent}
                  colors={colors}
                  onReply={onReply}
                  onDelete={onDelete}
                  onShare={onShare}
                />
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function CommentAvatar({
  name,
  colors,
}: {
  name: string;
  colors: Record<string, string>;
}) {
  const initial = name.slice(0, 1).toUpperCase() || "?";
  return (
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.accentLight,
      }}
    >
      <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "700" }}>{initial}</Text>
    </View>
  );
}
