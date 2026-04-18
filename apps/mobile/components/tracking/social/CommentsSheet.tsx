import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Share,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";

import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows, radius } from "@/constants/theme";
import {
  clearCommentReaction,
  deleteComment,
  editComment,
  fetchRunComments,
  listCommentReactions,
  postRunComment,
  reportComment,
  setCommentReaction,
  type SocialCommentItem,
  type SocialCommentReactionUser,
} from "@/services/tracking/socialService";

const REACTION_EMOJIS = ["👍", "❤️", "🔥", "👏", "😂", "😮", "😢", "😡"] as const;

type ReplyState = { parentCommentId: number; name: string } | null;
type EditState = { commentId: number } | null;

export function CommentsSheet({
  open,
  onClose,
  token,
  runLogId,
  runOwnerName,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  runLogId: number;
  runOwnerName?: string | null;
}) {
  const { colors, isDark } = useAppTheme();
  const [items, setItems] = useState<SocialCommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [text, setText] = useState("");

  const [replyTo, setReplyTo] = useState<ReplyState>(null);
  const [editing, setEditing] = useState<EditState>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set());

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuComment, setMenuComment] = useState<SocialCommentItem | null>(null);

  const [reactorsOpen, setReactorsOpen] = useState(false);
  const [reactorsLoading, setReactorsLoading] = useState(false);
  const [reactors, setReactors] = useState<SocialCommentReactionUser[]>([]);

  const cardStyle = useMemo(
    () => ({
      backgroundColor: colors.cardElevated,
      borderColor: colors.border,
      ...(isDark ? Shadows.none : Shadows.md),
    }),
    [colors, isDark],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchRunComments(token, runLogId);
      setItems(res.items ?? []);
    } catch (e: any) {
      Alert.alert("Couldn't load comments", String(e?.message ?? "Error"));
    } finally {
      setLoading(false);
    }
  }, [runLogId, token]);

  useEffect(() => {
    if (!open) return;
    setReplyTo(null);
    setEditing(null);
    setText("");
    setCollapsed(new Set());
    void load();
  }, [load, open]);

  const thread = useMemo(() => {
    const byId = new Map<number, SocialCommentItem>();
    for (const c of items) byId.set(c.commentId, c);

    const childrenByParent = new Map<number, SocialCommentItem[]>();
    const roots: SocialCommentItem[] = [];

    for (const c of items) {
      const pid = c.parentId;
      if (pid == null || !byId.has(pid)) {
        roots.push(c);
        continue;
      }
      if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
      childrenByParent.get(pid)!.push(c);
    }

    const sortByTimeAsc = (a: SocialCommentItem, b: SocialCommentItem) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

    roots.sort(sortByTimeAsc);
    for (const [pid, arr] of childrenByParent.entries()) {
      arr.sort(sortByTimeAsc);
      childrenByParent.set(pid, arr);
    }

    const descCount = new Map<number, number>();
    const visiting = new Set<number>();
    const dfsCount = (id: number): number => {
      if (descCount.has(id)) return descCount.get(id)!;
      if (visiting.has(id)) return 0;
      visiting.add(id);
      const kids = childrenByParent.get(id) ?? [];
      let total = 0;
      for (const k of kids) total += 1 + dfsCount(k.commentId);
      visiting.delete(id);
      descCount.set(id, total);
      return total;
    };
    for (const c of items) dfsCount(c.commentId);

    return { roots, childrenByParent, descCount };
  }, [items]);

  const openMenu = useCallback((comment: SocialCommentItem) => {
    setMenuComment(comment);
    setMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setMenuComment(null);
  }, []);

  const openReactors = useCallback(async (commentId: number) => {
    setReactorsOpen(true);
    setReactorsLoading(true);
    try {
      const res = await listCommentReactions(token, commentId);
      setReactors(res.items ?? []);
    } catch (e: any) {
      Alert.alert("Couldn't load reactions", String(e?.message ?? "Error"));
      setReactors([]);
    } finally {
      setReactorsLoading(false);
    }
  }, [token]);

  const onSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (posting) return;
    setPosting(true);
    try {
      if (editing) {
        await editComment(token, editing.commentId, trimmed);
        setEditing(null);
        setText("");
        await load();
        return;
      }
      await postRunComment(token, runLogId, trimmed, { parentId: replyTo?.parentCommentId ?? null });
      setReplyTo(null);
      setText("");
      await load();
    } catch (e: any) {
      Alert.alert("Couldn't send", String(e?.message ?? "Error"));
    } finally {
      setPosting(false);
    }
  }, [editing, load, posting, replyTo, runLogId, text, token]);

  const onDelete = useCallback((comment: SocialCommentItem) => {
    Alert.alert("Delete comment?", "This will remove the comment.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteComment(token, comment.commentId);
            closeMenu();
            await load();
          } catch (e: any) {
            Alert.alert("Couldn't delete", String(e?.message ?? "Error"));
          }
        },
      },
    ]);
  }, [closeMenu, load, token]);

  const onReport = useCallback((comment: SocialCommentItem) => {
    Alert.alert(
      "Report comment?",
      "We'll review this report. Thanks for helping keep the community safe.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report",
          style: "destructive",
          onPress: async () => {
            try {
              await reportComment(token, comment.commentId);
              closeMenu();
              Alert.alert("Reported", "Thanks. We'll review it.");
            } catch (e: any) {
              Alert.alert("Couldn't report", String(e?.message ?? "Error"));
            }
          },
        },
      ],
    );
  }, [closeMenu, token]);

  const onShare = useCallback(async (comment: SocialCommentItem) => {
    const who = comment.name || "Someone";
    const owner = runOwnerName?.trim() ? ` on ${runOwnerName}'s run` : "";
    const msg = `${who} commented${owner}:\n\n${comment.content}`;
    await Share.share({ message: msg }).catch(() => {});
    closeMenu();
  }, [closeMenu, runOwnerName]);

  const onReply = useCallback((comment: SocialCommentItem) => {
    setReplyTo({ parentCommentId: comment.commentId, name: comment.name });
    setEditing(null);
    setText("");
    closeMenu();
  }, [closeMenu]);

  const toggleCollapsed = useCallback((commentId: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }, []);

  const onEdit = useCallback((comment: SocialCommentItem) => {
    setEditing({ commentId: comment.commentId });
    setReplyTo(null);
    setText(comment.content);
    closeMenu();
  }, [closeMenu]);

  const onToggleReaction = useCallback(async (comment: SocialCommentItem, emoji: string) => {
    try {
      if (comment.myReaction === emoji) {
        await clearCommentReaction(token, comment.commentId);
      } else {
        await setCommentReaction(token, comment.commentId, emoji);
      }
      await load();
    } catch (e: any) {
      Alert.alert("Couldn't react", String(e?.message ?? "Error"));
    }
  }, [load, token]);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="rounded-t-[28px] border px-5 pt-5 pb-4"
          style={cardStyle}
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-clash" style={{ color: colors.text }}>
              Comments
            </Text>
            <Pressable
              onPress={onClose}
              className="h-9 w-9 rounded-2xl items-center justify-center border"
              style={{ borderColor: colors.border }}
            >
              <Feather name="x" size={18} color={colors.icon} />
            </Pressable>
          </View>

          {replyTo ? (
            <View className="mb-3 rounded-2xl border px-4 py-3" style={{ borderColor: colors.border }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-outfit font-semibold" style={{ color: colors.textSecondary }}>
                  Replying to {replyTo.name}
                </Text>
                <Pressable onPress={() => setReplyTo(null)}>
                  <Text className="text-xs font-outfit font-semibold" style={{ color: colors.textSecondary }}>
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {editing ? (
            <View className="mb-3 rounded-2xl border px-4 py-3" style={{ borderColor: colors.border }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-outfit font-semibold" style={{ color: colors.textSecondary }}>
                  Editing comment
                </Text>
                <Pressable
                  onPress={() => {
                    setEditing(null);
                    setText("");
                  }}
                >
                  <Text className="text-xs font-outfit font-semibold" style={{ color: colors.textSecondary }}>
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {loading ? (
            <View className="py-8 items-center">
              <ActivityIndicator />
            </View>
          ) : (
            <ScrollView
              style={{ maxHeight: 360 }}
              contentContainerStyle={{ gap: 10, paddingRight: 2 }}
              showsVerticalScrollIndicator={false}
            >
              {thread.roots.length === 0 ? (
                <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>
                  No comments yet.
                </Text>
              ) : null}

              {thread.roots.map((c) => (
                <CommentThreadNode
                  key={c.commentId}
                  comment={c}
                  depth={0}
                  childrenByParent={thread.childrenByParent}
                  descCount={thread.descCount}
                  collapsed={collapsed}
                  toggleCollapsed={toggleCollapsed}
                  colors={colors}
                  openMenu={openMenu}
                />
              ))}
            </ScrollView>
          )}

          <View className="flex-row items-center gap-3 mt-4">
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={replyTo ? "Write a reply" : "Write a comment"}
              placeholderTextColor={colors.placeholder}
              editable={!posting}
              className="flex-1 rounded-2xl border px-4 py-3 font-outfit text-base"
              style={{ borderColor: colors.border, color: colors.text, backgroundColor: colors.background }}
            />
            <Pressable
              onPress={onSubmit}
              disabled={posting || !text.trim().length}
              className="h-12 w-12 rounded-2xl items-center justify-center"
              style={{
                backgroundColor:
                  posting || !text.trim().length ? `${colors.accent}55` : colors.accent,
              }}
            >
              {posting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Feather name="send" size={18} color="#fff" />
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>

      <CommentMenu
        open={menuOpen}
        onClose={closeMenu}
        comment={menuComment}
        colors={colors}
        isDark={isDark}
        onToggleReaction={onToggleReaction}
        onViewReactions={() => (menuComment ? void openReactors(menuComment.commentId) : null)}
        onReply={onReply}
        onEdit={onEdit}
        onDelete={onDelete}
        onShare={onShare}
        onReport={onReport}
      />

      <ReactorsModal
        open={reactorsOpen}
        onClose={() => setReactorsOpen(false)}
        colors={colors}
        isDark={isDark}
        loading={reactorsLoading}
        items={reactors}
      />
    </Modal>
  );
}

function CommentThreadNode({
  comment,
  depth,
  childrenByParent,
  descCount,
  collapsed,
  toggleCollapsed,
  colors,
  openMenu,
}: {
  comment: SocialCommentItem;
  depth: number;
  childrenByParent: Map<number, SocialCommentItem[]>;
  descCount: Map<number, number>;
  collapsed: Set<number>;
  toggleCollapsed: (commentId: number) => void;
  colors: Record<string, string>;
  openMenu: (comment: SocialCommentItem) => void;
}) {
  const kids = childrenByParent.get(comment.commentId) ?? [];
  const hasKids = kids.length > 0;
  const isCollapsed = collapsed.has(comment.commentId);
  const indent = Math.min(6, depth) * 14;
  const compact = depth > 0;
  const totalReplies = descCount.get(comment.commentId) ?? kids.length;

  return (
    <View>
      <View style={{ marginLeft: indent }}>
        <CommentCard comment={comment} colors={colors} onLongPress={() => openMenu(comment)} compact={compact} />
      </View>

      {hasKids ? (
        <View style={{ marginLeft: indent + 6, marginTop: 6 }}>
          <Pressable
            onPress={() => toggleCollapsed(comment.commentId)}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, alignSelf: "flex-start" })}
          >
            <Text className="text-xs font-outfit font-semibold" style={{ color: colors.textSecondary }}>
              {isCollapsed ? `View replies (${totalReplies})` : "Hide replies"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {!isCollapsed
        ? kids.map((k) => (
            <View key={k.commentId} style={{ marginTop: 8 }}>
              <CommentThreadNode
                comment={k}
                depth={depth + 1}
                childrenByParent={childrenByParent}
                descCount={descCount}
                collapsed={collapsed}
                toggleCollapsed={toggleCollapsed}
                colors={colors}
                openMenu={openMenu}
              />
            </View>
          ))
        : null}
    </View>
  );
}

function CommentCard({
  comment,
  colors,
  onLongPress,
  compact = false,
}: {
  comment: SocialCommentItem;
  colors: Record<string, string>;
  onLongPress: () => void;
  compact?: boolean;
}) {
  const hasReactions = comment.reactionCounts && Object.keys(comment.reactionCounts).length > 0;
  return (
    <Pressable
      delayLongPress={220}
      onLongPress={onLongPress}
      className="rounded-2xl border px-4 py-3"
      style={{
        borderColor: colors.border,
        backgroundColor: "transparent",
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-outfit font-semibold" style={{ color: colors.text }}>
          {comment.name}
        </Text>
        <Text className="text-[11px] font-outfit" style={{ color: colors.textSecondary }}>
          {new Date(comment.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text
        className="text-sm font-outfit mt-1"
        style={{ color: colors.textSecondary, lineHeight: compact ? 18 : 20 }}
      >
        {comment.content}
      </Text>
      {hasReactions ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {Object.entries(comment.reactionCounts).map(([emoji, count]) => (
            <View
              key={emoji}
              style={{
                paddingHorizontal: 10,
                height: 26,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 14 }}>{emoji}</Text>
              <Text className="text-xs font-outfit font-semibold" style={{ color: colors.textSecondary }}>
                {count}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

function CommentMenu({
  open,
  onClose,
  comment,
  colors,
  isDark,
  onToggleReaction,
  onViewReactions,
  onReply,
  onEdit,
  onDelete,
  onShare,
  onReport,
}: {
  open: boolean;
  onClose: () => void;
  comment: SocialCommentItem | null;
  colors: Record<string, string>;
  isDark: boolean;
  onToggleReaction: (comment: SocialCommentItem, emoji: string) => void;
  onViewReactions: () => void;
  onReply: (comment: SocialCommentItem) => void;
  onEdit: (comment: SocialCommentItem) => void;
  onDelete: (comment: SocialCommentItem) => void;
  onShare: (comment: SocialCommentItem) => void;
  onReport: (comment: SocialCommentItem) => void;
}) {
  if (!open || !comment) return null;
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose}>
        <BlurView intensity={22} tint={isDark ? "dark" : "light"} style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ padding: 16, paddingBottom: 28 }}>
            <View
              style={{
                borderRadius: 22,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.cardElevated,
                overflow: "hidden",
                ...(isDark ? Shadows.none : Shadows.md),
              }}
            >
              <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text className="text-sm font-outfit font-semibold" style={{ color: colors.text }}>
                  {comment.name}
                </Text>
                <Text className="text-sm font-outfit mt-1" style={{ color: colors.textSecondary }}>
                  {comment.content}
                </Text>
              </View>

              <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {REACTION_EMOJIS.map((emoji) => {
                    const active = comment.myReaction === emoji;
                    const count = comment.reactionCounts?.[emoji] ?? 0;
                    return (
                      <Pressable
                        key={emoji}
                        onPress={() => onToggleReaction(comment, emoji)}
                        style={({ pressed }) => ({
                          paddingHorizontal: 10,
                          height: 34,
                          borderRadius: radius.pill,
                          borderWidth: 1,
                          borderColor: active ? `${colors.accent}aa` : colors.border,
                          backgroundColor: active ? `${colors.accent}22` : "transparent",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          opacity: pressed ? 0.85 : 1,
                        })}
                      >
                        <Text style={{ fontSize: 16 }}>{emoji}</Text>
                        {count > 0 ? (
                          <Text className="text-xs font-outfit font-semibold" style={{ color: colors.textSecondary }}>
                            {count}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <MenuRow label="View reactions" icon="users" onPress={onViewReactions} colors={colors} />
              <MenuRow label="Reply" icon="corner-up-left" onPress={() => onReply(comment)} colors={colors} />
              {comment.isMine ? (
                <MenuRow label="Edit" icon="edit-3" onPress={() => onEdit(comment)} colors={colors} />
              ) : null}
              {comment.canDelete ? (
                <MenuRow
                  label="Delete"
                  icon="trash-2"
                  danger
                  onPress={() => onDelete(comment)}
                  colors={colors}
                />
              ) : null}
              <MenuRow label="Share" icon="share-2" onPress={() => onShare(comment)} colors={colors} />
              <MenuRow label="Report" icon="flag" danger onPress={() => onReport(comment)} colors={colors} />
            </View>
          </Pressable>
        </BlurView>
      </Pressable>
    </Modal>
  );
}

function MenuRow({
  label,
  icon,
  onPress,
  colors,
  danger,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  colors: Record<string, string>;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        height: 48,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Feather name={icon as any} size={18} color={danger ? colors.danger : colors.icon} />
      <Text className="text-sm font-outfit font-semibold" style={{ color: danger ? colors.danger : colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

function ReactorsModal({
  open,
  onClose,
  colors,
  isDark,
  loading,
  items,
}: {
  open: boolean;
  onClose: () => void;
  colors: Record<string, string>;
  isDark: boolean;
  loading: boolean;
  items: SocialCommentReactionUser[];
}) {
  if (!open) return null;
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose}>
        <BlurView intensity={18} tint={isDark ? "dark" : "light"} style={{ flex: 1, justifyContent: "center", padding: 18 }}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                borderRadius: 22,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.cardElevated,
                padding: 14,
                ...(isDark ? Shadows.none : Shadows.md),
              }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-lg font-clash" style={{ color: colors.text }}>
                  Reactions
                </Text>
                <Pressable onPress={onClose} className="h-9 w-9 rounded-2xl items-center justify-center border" style={{ borderColor: colors.border }}>
                  <Feather name="x" size={18} color={colors.icon} />
                </Pressable>
              </View>
              {loading ? (
                <View className="py-8 items-center">
                  <ActivityIndicator />
                </View>
              ) : (
                <View style={{ gap: 10, maxHeight: 360 }}>
                  {items.length === 0 ? (
                    <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>
                      No reactions yet.
                    </Text>
                  ) : null}
                  {items.map((r) => (
                    <View key={`${r.userId}-${r.emoji}`} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>
                        {r.name}
                      </Text>
                      <Text style={{ fontSize: 16 }}>{r.emoji}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Pressable>
        </BlurView>
      </Pressable>
    </Modal>
  );
}
