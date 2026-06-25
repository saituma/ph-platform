import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { Heart, MessageCircle, Plus, Search, Send, Trash2, X } from "lucide-react-native";

import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { LazyVideo } from "@/components/media/LazyVideo";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import {
  createNewsPost,
  deleteNewsComment,
  deleteNewsPost,
  fetchNewsCategories,
  fetchNewsComments,
  fetchNewsFeed,
  likeNewsItem,
  postNewsComment,
  unlikeNewsItem,
  updateNewsPost,
  type NewsCommentItem,
  type NewsItem,
} from "@/services/newsService";

const QUICK_EMOJIS = ["❤️", "🙌", "🔥", "👏", "💪", "😂"];
const FOLDED_BODY_LINES = 4;
const FOLDED_BODY_CHARS = 220;

type NewsMediaItem = {
  url: string;
  type: "image" | "video";
  caption?: string | null;
  posterUrl?: string | null;
};

function parseNewsBody(raw: string | null | undefined): { text: string; media: NewsMediaItem[] } {
  const fallback = { text: raw?.trim() ?? "", media: [] };
  if (!raw?.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw) as {
      text?: unknown;
      body?: unknown;
      media?: unknown;
    };
    const media = Array.isArray(parsed.media)
      ? parsed.media
          .map((item): NewsMediaItem | null => {
            if (!item || typeof item !== "object") return null;
            const candidate = item as Partial<NewsMediaItem>;
            const url = typeof candidate.url === "string" ? candidate.url.trim() : "";
            const type = candidate.type === "video" ? "video" : "image";
            if (!url) return null;
            return {
              url,
              type,
              caption: typeof candidate.caption === "string" ? candidate.caption : null,
              posterUrl: typeof candidate.posterUrl === "string" ? candidate.posterUrl : null,
            };
          })
          .filter((item): item is NewsMediaItem => Boolean(item))
      : [];
    const text =
      typeof parsed.text === "string"
        ? parsed.text.trim()
        : typeof parsed.body === "string"
          ? parsed.body.trim()
          : fallback.text;
    return { text, media };
  } catch {
    return fallback;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}

function initials(name: string | null | undefined) {
  const parts = String(name ?? "PH")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (parts[0]?.[0] ?? "P").toUpperCase();
}

export default function NewsScreen() {
  const token = useAppSelector((state) => state.user.token);
  const apiUserRole = useAppSelector((state) => state.user.apiUserRole);
  const isAdmin = apiUserRole === "admin" || apiUserRole === "superAdmin";
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const cursorRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [commentsFor, setCommentsFor] = useState<NewsItem | null>(null);
  const [adminModal, setAdminModal] = useState<{ mode: "create" | "edit"; item?: NewsItem } | null>(null);

  const loadFresh = useCallback(
    async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetchNewsFeed(token, {
          limit: 20,
          cursor: null,
          query,
          category: activeCategory,
        });
        setItems(res.items ?? []);
        cursorRef.current = res.nextCursor ?? null;
      } catch (error) {
        Alert.alert("Couldn't load news", error instanceof Error ? error.message : "Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeCategory, query, token],
  );

  const loadMore = useCallback(
    async () => {
      if (!token || cursorRef.current == null) return;
      setLoadingMore(true);
      try {
        const res = await fetchNewsFeed(token, {
          limit: 20,
          cursor: cursorRef.current,
          query,
          category: activeCategory,
        });
        setItems((prev) => [...prev, ...(res.items ?? [])]);
        cursorRef.current = res.nextCursor ?? null;
      } catch (error) {
        Alert.alert("Couldn't load news", error instanceof Error ? error.message : "Please try again.");
      } finally {
        setLoadingMore(false);
      }
    },
    [activeCategory, query, token],
  );

  useEffect(() => {
    if (!token) return;
    void fetchNewsCategories(token)
      .then((res) => setCategories(res.items ?? []))
      .catch(() => setCategories([]));
  }, [token]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadFresh();
    }, 250);
    return () => clearTimeout(timeout);
  }, [activeCategory, query, loadFresh]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadFresh();
  }, [loadFresh]);

  const onToggleLike = useCallback(
    async (item: NewsItem) => {
      if (!token) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? {
                ...row,
                userLiked: !row.userLiked,
                likeCount: Math.max(0, row.likeCount + (row.userLiked ? -1 : 1)),
              }
            : row,
        ),
      );
      try {
        if (item.userLiked) await unlikeNewsItem(token, item.id);
        else await likeNewsItem(token, item.id);
      } catch {
        void loadFresh();
      }
    },
    [loadFresh, token],
  );

  const renderNewsItem = useCallback(
    ({ item }: { item: NewsItem }) => (
      <NewsCard
        item={item}
        p={p}
        onLike={() => void onToggleLike(item)}
        onComments={() => setCommentsFor(item)}
        onLongPress={isAdmin ? () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          Alert.alert(item.title, undefined, [
            { text: "Edit Post", onPress: () => setAdminModal({ mode: "edit", item }) },
            { text: "Cancel", style: "cancel" },
          ]);
        } : undefined}
      />
    ),
    [onToggleLike, p, isAdmin],
  );

  const handleEndReached = useCallback(() => {
    if (cursorRef.current != null && !loadingMore) void loadMore();
  }, [loadMore, loadingMore]);

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 32, color: p.textPrimary }}>
          News
        </Text>
        <Text style={{ marginTop: 4, fontFamily: "Outfit-Regular", fontSize: 14, color: p.textSecondary }}>
          Updates, stories, and notes from PH Performance.
        </Text>

        <View
          style={{
            marginTop: 16,
            minHeight: 46,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: p.border,
            backgroundColor: p.cardWhite,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            gap: 8,
          }}
        >
          <Search size={18} color={p.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search news"
            placeholderTextColor={p.textMuted}
            style={{ flex: 1, color: p.textPrimary, fontFamily: "Outfit-Regular", fontSize: 15 }}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={10}>
              <X size={18} color={p.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {categories.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12 }}>
            <CategoryChip label="All" active={activeCategory == null} onPress={() => setActiveCategory(null)} p={p} />
            {categories.map((category) => (
              <CategoryChip
                key={category}
                label={category}
                active={activeCategory === category}
                onPress={() => setActiveCategory(category)}
                p={p}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>

      {loading && !items.length ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 96, gap: 14 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={{ paddingVertical: 80, alignItems: "center" }}>
              <Text style={{ fontFamily: "Outfit-Bold", color: p.textPrimary, fontSize: 18 }}>No news yet</Text>
              <Text style={{ marginTop: 6, color: p.textSecondary, fontFamily: "Outfit-Regular" }}>
                Published updates will appear here.
              </Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null}
          renderItem={renderNewsItem}
        />
      )}

      {isAdmin ? (
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setAdminModal({ mode: "create" });
          }}
          style={{
            position: "absolute",
            bottom: insets.bottom + 20,
            right: 20,
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: p.accent,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.18,
            shadowRadius: 6,
            elevation: 6,
          }}
        >
          <Plus size={24} color="#FFFFFF" />
        </Pressable>
      ) : null}

      {commentsFor && token ? (
        <NewsCommentsModal
          item={commentsFor}
          token={token}
          p={p}
          onClose={() => setCommentsFor(null)}
          onChanged={() => void loadFresh()}
        />
      ) : null}

      {adminModal && token ? (
        <AdminPostModal
          mode={adminModal.mode}
          item={adminModal.item}
          token={token}
          p={p}
          insets={insets}
          onClose={() => setAdminModal(null)}
          onSaved={() => {
            setAdminModal(null);
            void loadFresh();
          }}
        />
      ) : null}
    </View>
  );
}

function CategoryChip({ label, active, onPress, p }: { label: string; active: boolean; onPress: () => void; p: any }) {
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={{
        borderRadius: 999,
        backgroundColor: active ? p.accent : p.cardWhite,
        borderWidth: 1,
        borderColor: active ? p.accent : p.border,
        paddingHorizontal: 14,
        paddingVertical: 8,
      }}
    >
      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: active ? "#FFFFFF" : p.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

function NewsCard({
  item,
  p,
  onLike,
  onComments,
  onLongPress,
}: {
  item: NewsItem;
  p: any;
  onLike: () => void;
  onComments: () => void;
  onLongPress?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const parsed = React.useMemo(() => parseNewsBody(item.body), [item.body]);
  const body = parsed.text || item.content;
  const shouldFold = body.length > FOLDED_BODY_CHARS;

  return (
    <Pressable
      onLongPress={onLongPress}
      style={{ borderRadius: 16, backgroundColor: p.cardWhite, borderWidth: 1, borderColor: p.border, padding: 16 }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 20, color: p.textPrimary, lineHeight: 25 }}>
            {item.title}
          </Text>
          <Text style={{ marginTop: 6, fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted }}>
            {item.authorName ?? "PH Performance"} • {formatDate(item.date)}
          </Text>
        </View>
        {item.category ? (
          <View style={{ alignSelf: "flex-start", borderRadius: 999, backgroundColor: p.accentSoft, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.accent }}>{item.category}</Text>
          </View>
        ) : null}
      </View>
      {parsed.media.length ? <NewsMediaStrip media={parsed.media} p={p} /> : null}
      <Text
        numberOfLines={!expanded && shouldFold ? FOLDED_BODY_LINES : undefined}
        style={{ marginTop: parsed.media.length ? 10 : 12, fontFamily: "Outfit-Regular", fontSize: 15, lineHeight: 22, color: p.textSecondary }}
      >
        {body}
      </Text>
      {shouldFold ? (
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
            setExpanded((value) => !value);
          }}
          hitSlop={8}
          style={{ alignSelf: "flex-start", marginTop: 6 }}
        >
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.textMuted }}>
            {expanded ? "Show less" : "See more"}
          </Text>
        </Pressable>
      ) : null}
      <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 18 }}>
        <Pressable onPress={onLike} style={{ flexDirection: "row", alignItems: "center", gap: 6 }} hitSlop={8}>
          <Heart size={19} color={item.userLiked ? "#E84A5F" : p.textMuted} fill={item.userLiked ? "#E84A5F" : "transparent"} />
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.textSecondary }}>{item.likeCount}</Text>
        </Pressable>
        <Pressable onPress={onComments} style={{ flexDirection: "row", alignItems: "center", gap: 6 }} hitSlop={8}>
          <MessageCircle size={19} color={p.textMuted} />
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.textSecondary }}>{item.commentCount}</Text>
        </Pressable>
      </View>
      {item.commentCount > 0 ? (
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
            onComments();
          }}
          hitSlop={6}
          style={{ alignSelf: "flex-start", marginTop: 10 }}
        >
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textMuted }}>
            View all {item.commentCount} {item.commentCount === 1 ? "comment" : "comments"}
          </Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function NewsMediaStrip({ media, p }: { media: NewsMediaItem[]; p: any }) {
  if (!media.length) return null;
  const single = media.length === 1;
  return (
    <ScrollView
      horizontal={!single}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 10, paddingTop: 14 }}
      scrollEnabled={!single}
    >
      {media.map((item, index) => {
        const width = single ? "100%" : 260;
        return (
          <View
            key={`${item.url}-${index}`}
            style={{
              width: width as any,
              borderRadius: 14,
              overflow: "hidden",
              backgroundColor: p.cardSage,
            }}
          >
            {item.type === "video" ? (
              <LazyVideo
                uri={item.url}
                posterUri={item.posterUrl ?? null}
                height={single ? 220 : 180}
                thumbBorderRadius={14}
                thumbLabel="Play news video"
                initialMuted
                hideTopChrome
              />
            ) : (
              <ExpoImage
                source={{ uri: item.url }}
                contentFit="cover"
                transition={180}
                style={{ width: "100%", height: single ? 220 : 180 }}
              />
            )}
            {item.caption ? (
              <Text
                numberOfLines={2}
                style={{
                  backgroundColor: p.cardWhite,
                  color: p.textSecondary,
                  fontFamily: "Outfit-Regular",
                  fontSize: 12,
                  lineHeight: 17,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                }}
              >
                {item.caption}
              </Text>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

function NewsCommentsModal({
  item,
  token,
  p,
  onClose,
  onChanged,
}: {
  item: NewsItem;
  token: string;
  p: any;
  onClose: () => void;
  onChanged: () => void;
}) {
  const insets = useAppSafeAreaInsets();
  const [comments, setComments] = useState<NewsCommentItem[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<NewsCommentItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchNewsComments(token, item.id);
      setComments(res.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [item.id, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || posting) return;
    setPosting(true);
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await postNewsComment(token, item.id, trimmed);
      setText("");
      setReplyTo(null);
      await load();
      onChanged();
    } finally {
      setPosting(false);
    }
  }, [item.id, load, onChanged, posting, text, token]);

  const remove = useCallback(
    async (comment: NewsCommentItem) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await deleteNewsComment(token, comment.commentId);
      await load();
      onChanged();
    },
    [load, onChanged, token],
  );

  const startReply = useCallback((comment: NewsCommentItem) => {
    void Haptics.selectionAsync();
    setReplyTo(comment);
    setText(`@${comment.name} `);
  }, []);

  const cancelReply = useCallback(() => {
    setReplyTo(null);
    setText("");
  }, []);

  const renderCommentItem = useCallback(
    ({ item: comment }: { item: NewsCommentItem }) => (
      <CommentRow
        comment={comment}
        p={p}
        onDelete={() => void remove(comment)}
        onReply={() => startReply(comment)}
      />
    ),
    [remove, startReply, p],
  );

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: p.pageBg, paddingTop: insets.top + 10 }}
      >
        <View
          style={{
            alignItems: "center",
            borderBottomWidth: 1,
            borderBottomColor: p.border,
            flexDirection: "row",
            justifyContent: "space-between",
            paddingBottom: 12,
            paddingHorizontal: 18,
          }}
        >
          <Text style={{ flex: 1, fontFamily: "Outfit-Bold", fontSize: 20, color: p.textPrimary }} numberOfLines={1}>
            Comments
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <X size={22} color={p.textSecondary} />
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 30 }} />
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(comment) => String(comment.commentId)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 150 }}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingVertical: 48 }}>
                <Text style={{ color: p.textPrimary, fontFamily: "Outfit-Bold", fontSize: 16 }}>
                  No comments yet
                </Text>
                <Text style={{ color: p.textSecondary, fontFamily: "Outfit-Regular", marginTop: 4 }}>
                  Start the conversation.
                </Text>
              </View>
            }
            renderItem={renderCommentItem}
          />
        )}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: insets.bottom + 12,
            backgroundColor: p.pageBg,
            borderTopWidth: 1,
            borderColor: p.border,
          }}
        >
          {replyTo ? (
            <View style={{ flexDirection: "row", alignItems: "center", paddingBottom: 8 }}>
              <Text style={{ flex: 1, color: p.textMuted, fontFamily: "Outfit-Regular", fontSize: 12 }}>
                Replying to <Text style={{ color: p.textPrimary, fontFamily: "Outfit-Bold" }}>{replyTo.name}</Text>
              </Text>
              <Pressable onPress={cancelReply} hitSlop={8}>
                <X size={16} color={p.textMuted} />
              </Pressable>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: 16, paddingBottom: 8 }}>
            {QUICK_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setText((value) => `${value}${emoji}`);
                }}
                hitSlop={8}
              >
                <Text style={{ fontSize: 22 }}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={replyTo ? `Reply to ${replyTo.name}...` : "Add a comment..."}
              placeholderTextColor={p.textMuted}
              multiline
              style={{
                flex: 1,
                maxHeight: 90,
                borderRadius: 20,
                backgroundColor: p.cardWhite,
                borderWidth: 1,
                borderColor: p.border,
                paddingHorizontal: 14,
                paddingVertical: 9,
                color: p.textPrimary,
                fontFamily: "Outfit-Regular",
              }}
            />
            {text.trim() ? (
              <Pressable onPress={() => void submit()} disabled={posting} hitSlop={8}>
                {posting ? (
                  <ActivityIndicator color={p.accent} />
                ) : (
                  <Text style={{ color: p.accent, fontFamily: "Outfit-Bold", fontSize: 14 }}>
                    Post
                  </Text>
                )}
              </Pressable>
            ) : (
              <View style={{ width: 44, alignItems: "center" }}>
                <Send size={18} color={p.textMuted} />
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CommentRow({
  comment,
  p,
  onDelete,
  onReply,
}: {
  comment: NewsCommentItem;
  p: any;
  onDelete: () => void;
  onReply: () => void;
}) {
  return (
    <Pressable
      onLongPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const options: Array<{ text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" }> = [
          { text: "Reply", onPress: () => onReply() },
        ];
        if (comment.canDelete) {
          options.push({ text: "Delete", style: "destructive", onPress: () => onDelete() });
        }
        options.push({ text: "Cancel", style: "cancel" });
        Alert.alert(comment.name, undefined, options);
      }}
      style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}
    >
      {comment.avatarUrl ? (
        <ExpoImage
          source={{ uri: comment.avatarUrl }}
          contentFit="cover"
          style={{ width: 32, height: 32, borderRadius: 16 }}
        />
      ) : (
        <View
          style={{
            alignItems: "center",
            backgroundColor: p.accentSoft,
            borderRadius: 16,
            height: 32,
            justifyContent: "center",
            width: 32,
          }}
        >
          <Text style={{ color: p.accent, fontFamily: "Outfit-Bold", fontSize: 13 }}>
            {initials(comment.name)}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ color: p.textPrimary, fontFamily: "Outfit-Regular", fontSize: 13, lineHeight: 19 }}>
          <Text style={{ fontFamily: "Outfit-Bold" }}>{comment.name}</Text>
          {"  "}
          {comment.content}
        </Text>
        <View style={{ alignItems: "center", flexDirection: "row", gap: 16, marginTop: 6 }}>
          <Text style={{ color: p.textMuted, fontFamily: "Outfit-Regular", fontSize: 11 }}>
            {relativeTime(comment.createdAt)}
          </Text>
          <Pressable onPress={onReply} hitSlop={8}>
            <Text style={{ color: p.textMuted, fontFamily: "Outfit-Bold", fontSize: 11 }}>
              Reply
            </Text>
          </Pressable>
          {comment.canDelete ? (
            <Pressable onPress={onDelete} hitSlop={8}>
              <Trash2 size={13} color={p.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function AdminPostModal({
  mode,
  item,
  token,
  p,
  insets,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  item?: NewsItem;
  token: string;
  p: any;
  insets: { top: number; bottom: number };
  onClose: () => void;
  onSaved: () => void;
}) {
  const parsed = React.useMemo(() => (item?.body ? parseNewsBody(item.body) : { text: "", media: [] }), [item]);

  const [title, setTitle] = useState(item?.title ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [summary, setSummary] = useState(item?.content ?? "");
  const [body, setBody] = useState(parsed.text);
  const [saving, setSaving] = useState(false);

  const fieldStyle = {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: p.border,
    backgroundColor: p.cardWhite,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: p.textPrimary,
    fontFamily: "Outfit-Regular",
    fontSize: 15,
    marginBottom: 12,
  };

  const handleSave = async () => {
    const t = title.trim();
    const s = summary.trim();
    if (!t || !s) {
      Alert.alert("Required", "Title and summary are required.");
      return;
    }
    setSaving(true);
    try {
      const bodyJson = body.trim()
        ? JSON.stringify({ text: body.trim(), media: parsed.media })
        : undefined;
      const payload = {
        title: t,
        content: s,
        body: bodyJson,
        category: category.trim() || undefined,
      };
      if (mode === "create") {
        await createNewsPost(token, payload);
      } else if (item) {
        await updateNewsPost(token, item.id, payload);
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved();
    } catch {
      Alert.alert("Error", "Could not save post. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!item) return;
    Alert.alert("Delete Post", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNewsPost(token, item.id);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSaved();
          } catch {
            Alert.alert("Error", "Could not delete post.");
          }
        },
      },
    ]);
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: p.pageBg, paddingTop: insets.top + 10 }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 18,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: p.border,
          }}
        >
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 20, color: p.textPrimary }}>
            {mode === "create" ? "New Post" : "Edit Post"}
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <X size={22} color={p.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 40 }}
        >
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title *"
            placeholderTextColor={p.textMuted}
            style={fieldStyle}
          />
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder="Category (e.g. Academy)"
            placeholderTextColor={p.textMuted}
            style={fieldStyle}
          />
          <TextInput
            value={summary}
            onChangeText={setSummary}
            placeholder="Short summary *"
            placeholderTextColor={p.textMuted}
            multiline
            style={[fieldStyle, { minHeight: 80 }]}
          />
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Full post body"
            placeholderTextColor={p.textMuted}
            multiline
            style={[fieldStyle, { minHeight: 120 }]}
          />

          <Pressable
            onPress={() => void handleSave()}
            disabled={saving}
            style={{
              borderRadius: 12,
              backgroundColor: p.accent,
              paddingVertical: 14,
              alignItems: "center",
              marginTop: 4,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: "#FFFFFF" }}>
                {mode === "create" ? "Publish" : "Save Changes"}
              </Text>
            )}
          </Pressable>

          {mode === "edit" ? (
            <Pressable
              onPress={handleDelete}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#E84A5F",
                paddingVertical: 14,
                alignItems: "center",
                marginTop: 12,
              }}
            >
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: "#E84A5F" }}>
                Delete Post
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
