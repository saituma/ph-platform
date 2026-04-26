import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  memo,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Share,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { useRunStore } from "@/store/useRunStore";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Text } from "@/components/ScaledText";
import { AppIcon } from "@/components/ui/app-icon";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { spacing, fonts } from "@/constants/theme";
import { trackingScrollBottomPad } from "@/lib/tracking/mainTabBarInset";
import { TrackingHeaderTabs } from "@/components/tracking/TrackingHeaderTabs";
import {
  canAccessTrackingTab,
  shouldUseTeamTrackingFeatures,
} from "@/lib/tracking/teamTrackingGate";
import { MiniRunPathPreview } from "@/components/tracking/social/MiniRunPathPreview";
import { CommentsSheet } from "@/components/tracking/social/CommentsSheet";
import { PostCommentsSheet } from "@/components/tracking/social/PostCommentsSheet";
import { PostComposerSheet } from "@/components/tracking/social/PostComposerSheet";
import {
  fetchAdultDirectory,
  fetchLeaderboard,
  fetchRunFeed,
  fetchPostFeed,
  fetchPrivacySettings,
  likeRun,
  unlikeRun,
  likeSocialPost,
  unlikeSocialPost,
  updatePrivacySettings,
  type PrivacySettings,
  type SocialLeaderboardItem,
  type SocialRunFeedItem,
  type SocialPostItem,
  type SocialSort,
} from "@/services/tracking/socialService";
import { fetchTeamLocations } from "@/services/tracking/locationService";
import { formatDurationClock, formatDistanceKm } from "@/lib/tracking/runUtils";

// ─── Tab definition ──────────────────────────────────────────────────────────

type TabKey = "feed" | "leaderboard" | "squad";

const TABS: Array<{ key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }> = [
  { key: "feed", label: "Feed", icon: "newspaper-outline", iconActive: "newspaper" },
  { key: "leaderboard", label: "Leaderboard", icon: "trophy-outline", iconActive: "trophy" },
  { key: "squad", label: "Squad", icon: "people-outline", iconActive: "people" },
];

// ─── Feed item union type ────────────────────────────────────────────────────

type FeedItem =
  | ({ _type: "run" } & SocialRunFeedItem)
  | ({ _type: "post" } & SocialPostItem);

// ─── Main screen ────────────────────────────────────────────────────────────

export default function TrackingSocialScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const token = useAppSelector((s) => s.user.token);
  const appRole = useAppSelector((s) => s.user.appRole);
  const programTier = useAppSelector((s) => s.user.programTier);
  const authTeamMembership = useAppSelector((s) => s.user.authTeamMembership);
  const managedAthletes = useAppSelector((s) => s.user.managedAthletes);

  const useTeamFeed = useMemo(
    () =>
      shouldUseTeamTrackingFeatures({
        appRole,
        authTeamMembership,
        firstManagedAthlete: managedAthletes[0] ?? null,
      }),
    [appRole, authTeamMembership, managedAthletes],
  );

  const canAccessTracking = useMemo(
    () =>
      canAccessTrackingTab({
        appRole,
        programTier,
        authTeamMembership,
        firstManagedAthlete: managedAthletes[0] ?? null,
      }),
    [appRole, authTeamMembership, managedAthletes, programTier],
  );

  const teamName = (authTeamMembership?.team ?? "Team").trim() || "Team";
  const teamInitial = teamName.slice(0, 1).toUpperCase();

  // ── State ──
  const [activeTab, setActiveTab] = useState<TabKey>("feed");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(false);
  const [_postLoading, setPostLoading] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [postLoadingMore, setPostLoadingMore] = useState(false);

  const [leaderboard, setLeaderboard] = useState<SocialLeaderboardItem[]>([]);
  const [adults, setAdults] = useState<
    { userId: number; name: string; avatarUrl: string | null }[]
  >([]);
  const [feed, setFeed] = useState<SocialRunFeedItem[]>([]);
  const [feedCursor, setFeedCursor] = useState<number | null>(null);
  const [postFeed, setPostFeed] = useState<SocialPostItem[]>([]);
  const [postCursor, setPostCursor] = useState<number | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);

  const [rangeDays, setRangeDays] = useState<number>(7);
  const [sort, setSort] = useState<SocialSort>("date_desc");
  const [leaderboardSort, setLeaderboardSort] = useState<
    "distance_desc" | "distance_asc" | "duration_desc" | "duration_asc"
  >("distance_desc");

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [postCommentsOpen, setPostCommentsOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [activeRunLogId, setActiveRunLogId] = useState<number | null>(null);
  const [activePostId, setActivePostId] = useState<number | null>(null);

  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : colors.border;
  const cardBg = isDark ? colors.cardElevated : colors.backgroundSecondary;

  const canLoad = token != null;

  // ── Gate check ──
  useEffect(() => {
    if (canAccessTracking && useTeamFeed) return;
    router.replace("/(tabs)/tracking");
  }, [canAccessTracking, router, useTeamFeed]);

  useEffect(() => {
    if (!token) return;
    if (useTeamFeed) return;
    router.replace("/(tabs)/tracking" as any);
  }, [router, token, useTeamFeed]);

  if (!canAccessTracking || !useTeamFeed) {
    return null;
  }

  // ── Load functions ──
  const loadLeaderboard = useCallback(async () => {
    if (!token) return;
    setLeaderboardLoading(true);
    try {
      const res = await fetchLeaderboard(token, {
        windowDays: rangeDays === 0 ? 0 : rangeDays,
        limit: 25,
        sort: leaderboardSort,
        useTeamFeed,
      });
      setLeaderboard(res.items ?? []);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [leaderboardSort, rangeDays, token, useTeamFeed]);

  const loadFeed = useCallback(async () => {
    if (!token) return;
    setFeedLoading(true);
    try {
      const res = await fetchRunFeed(token, {
        limit: 20,
        cursor: null,
        windowDays: rangeDays,
        sort,
        useTeamFeed,
      });
      setFeed(res.items ?? []);
      setFeedCursor(res.nextCursor ?? null);
    } finally {
      setFeedLoading(false);
    }
  }, [rangeDays, sort, token, useTeamFeed]);

  const loadMoreFeed = useCallback(async () => {
    if (!token || feedCursor == null || feedLoadingMore) return;
    setFeedLoadingMore(true);
    try {
      const res = await fetchRunFeed(token, {
        limit: 20,
        cursor: feedCursor,
        windowDays: rangeDays,
        sort,
        useTeamFeed,
      });
      setFeed((prev) => [...prev, ...(res.items ?? [])]);
      setFeedCursor(res.nextCursor ?? null);
    } finally {
      setFeedLoadingMore(false);
    }
  }, [feedCursor, feedLoadingMore, rangeDays, sort, token, useTeamFeed]);

  const loadPosts = useCallback(async () => {
    if (!token) return;
    setPostLoading(true);
    try {
      const res = await fetchPostFeed(token, { limit: 20, cursor: null, useTeamFeed });
      setPostFeed(res.items ?? []);
      setPostCursor(res.nextCursor ?? null);
    } finally {
      setPostLoading(false);
    }
  }, [token, useTeamFeed]);

  const loadMorePosts = useCallback(async () => {
    if (!token || postCursor == null || postLoadingMore) return;
    setPostLoadingMore(true);
    try {
      const res = await fetchPostFeed(token, { limit: 20, cursor: postCursor, useTeamFeed });
      setPostFeed((prev) => [...prev, ...(res.items ?? [])]);
      setPostCursor(res.nextCursor ?? null);
    } finally {
      setPostLoadingMore(false);
    }
  }, [postCursor, postLoadingMore, token, useTeamFeed]);

  const loadSettings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetchPrivacySettings(token);
      setPrivacySettings(res.settings);
    } catch {
      setPrivacySettings(null);
    }
  }, [token]);

  const loadCommunity = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      await Promise.all([
        loadLeaderboard(),
        loadFeed(),
        loadPosts(),
        fetchAdultDirectory(token, { limit: 24, cursor: null, useTeamFeed }).then(
          (d) => setAdults(d.items ?? []),
        ),
        fetchTeamLocations(token).catch(() => null),
      ]);
    } catch (e: any) {
      Alert.alert("Couldn't load team", String(e?.message ?? "Error"));
    } finally {
      setLoading(false);
    }
  }, [loadFeed, loadLeaderboard, loadPosts, token, useTeamFeed]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadSettings(), loadCommunity()]);
    setRefreshing(false);
  }, [loadCommunity, loadSettings]);

  // ── Like handlers ──
  const toggleLike = useCallback(
    async (r: SocialRunFeedItem) => {
      if (!token) return;
      const oldFeed = [...feed];
      setFeed((prev) =>
        prev.map((item) =>
          item.runLogId === r.runLogId
            ? {
                ...item,
                userLiked: !item.userLiked,
                likeCount: (item.likeCount ?? 0) + (item.userLiked ? -1 : 1),
              }
            : item,
        ),
      );
      try {
        if (r.userLiked) {
          await unlikeRun(token, r.runLogId, { useTeamFeed });
        } else {
          await likeRun(token, r.runLogId, { useTeamFeed });
        }
      } catch (e: any) {
        setFeed(oldFeed);
        Alert.alert("Error", String(e?.message ?? "Error"));
      }
    },
    [feed, token, useTeamFeed],
  );

  const onTogglePostLike = useCallback(
    async (post: SocialPostItem) => {
      if (!token) return;
      const oldPostFeed = [...postFeed];
      setPostFeed((prev) =>
        prev.map((item) =>
          item.id === post.id
            ? {
                ...item,
                userLiked: !item.userLiked,
                likeCount: item.likeCount + (item.userLiked ? -1 : 1),
              }
            : item,
        ),
      );
      try {
        if (post.userLiked) {
          await unlikeSocialPost(token, post.id, { useTeamFeed });
        } else {
          await likeSocialPost(token, post.id, { useTeamFeed });
        }
      } catch (e: any) {
        setPostFeed(oldPostFeed);
        Alert.alert("Error", String(e?.message ?? "Error"));
      }
    },
    [postFeed, token, useTeamFeed],
  );

  // ── Initial load ──
  const load = useCallback(() => {
    void loadSettings();
    void loadCommunity();
  }, [loadCommunity, loadSettings]);

  useEffect(() => {
    if (!canLoad) return;
    load();
  }, [canLoad, load]);

  // ── Sort/range pickers ──
  const pickSort = useCallback(() => {
    Alert.alert("Sort", "Choose how to sort the feed.", [
      { text: "Cancel", style: "cancel" },
      { text: "Newest", onPress: () => setSort("date_desc") },
      { text: "Oldest", onPress: () => setSort("date_asc") },
      { text: "Longest distance", onPress: () => setSort("distance_desc") },
      { text: "Shortest distance", onPress: () => setSort("distance_asc") },
      { text: "Longest duration", onPress: () => setSort("duration_desc") },
      { text: "Shortest duration", onPress: () => setSort("duration_asc") },
      { text: "Most commented", onPress: () => setSort("comments_desc") },
    ]);
  }, []);

  const pickLeaderboardSort = useCallback(() => {
    Alert.alert("Leaderboard", "Choose how to rank athletes.", [
      { text: "Cancel", style: "cancel" },
      { text: "Most km", onPress: () => setLeaderboardSort("distance_desc") },
      { text: "Least km", onPress: () => setLeaderboardSort("distance_asc") },
      { text: "Most minutes", onPress: () => setLeaderboardSort("duration_desc") },
      { text: "Least minutes", onPress: () => setLeaderboardSort("duration_asc") },
    ]);
  }, []);

  const pickRange = useCallback(() => {
    Alert.alert("Range", "Choose a time window.", [
      { text: "Cancel", style: "cancel" },
      { text: "7 days", onPress: () => setRangeDays(7) },
      { text: "30 days", onPress: () => setRangeDays(30) },
      { text: "90 days", onPress: () => setRangeDays(90) },
      { text: "All time", onPress: () => setRangeDays(0) },
    ]);
  }, []);

  // ── Comment / sheet handlers ──
  const openComments = useCallback((runLogId: number) => {
    setActiveRunLogId(runLogId);
    setCommentsOpen(true);
  }, []);

  const openPostComments = useCallback((postId: number) => {
    setActivePostId(postId);
    setPostCommentsOpen(true);
  }, []);

  // ── Privacy handlers ──
  const handleToggleSocialEnabled = useCallback(
    async (value: boolean) => {
      if (!token) return;
      if (value) {
        Alert.alert(
          "Enable Team Features?",
          "This will allow others to see your runs, comment on them, and include you in leaderboards.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Enable",
              onPress: async () => {
                setSettingsLoading(true);
                try {
                  const res = await updatePrivacySettings(token, {
                    socialEnabled: true,
                    privacyVersionAccepted: "1.0",
                  });
                  setPrivacySettings(res.settings);
                } catch (e: any) {
                  Alert.alert("Error", String(e?.message ?? "Could not update settings"));
                } finally {
                  setSettingsLoading(false);
                }
              },
            },
          ],
        );
      } else {
        Alert.alert(
          "Disable Team Features?",
          "This will make your runs private and remove you from leaderboards.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Disable",
              style: "destructive",
              onPress: async () => {
                setSettingsLoading(true);
                try {
                  const res = await updatePrivacySettings(token, { socialEnabled: false });
                  setPrivacySettings(res.settings);
                } catch (e: any) {
                  Alert.alert("Error", String(e?.message ?? "Could not update settings"));
                } finally {
                  setSettingsLoading(false);
                }
              },
            },
          ],
        );
      }
    },
    [token],
  );

  // ── Navigation ──

  const openSettings = useCallback(() => {
    router.push("/(tabs)/tracking/team-settings" as any);
  }, [router]);

  const shareTeam = useCallback(async () => {
    await Share.share({ message: `${teamName} · Team Tracking` }).catch(() => {});
  }, [teamName]);

  const handleStartRun = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const store = useRunStore.getState();
    store.resetRun();
    store.setDestination(null);
    store.setGoalKm(null);
    store.setProgressNotifyEveryMeters(null);
    router.push("/(tabs)/tracking/active-run" as any);
  }, [router]);

  // ── Derived ──
  const memberCount = useMemo(
    () => Math.max(adults.length, leaderboard.length),
    [adults.length, leaderboard.length],
  );

  // Build unified feed sorted by date
  const unifiedFeed = useMemo<FeedItem[]>(() => {
    const runs: FeedItem[] = feed.map((r) => ({ _type: "run" as const, ...r }));
    const posts: FeedItem[] = postFeed.map((p) => ({ _type: "post" as const, ...p }));
    const all = [...runs, ...posts];
    all.sort((a, b) => {
      const da = new Date(a._type === "run" ? a.date : a.date).getTime();
      const db = new Date(b._type === "run" ? b.date : b.date).getTime();
      return db - da;
    });
    return all;
  }, [feed, postFeed]);

  const isFeedLoading = loading || (feedLoading && feed.length === 0 && postFeed.length === 0);

  if (!token) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingTop: insets.top + spacing.xl, padding: spacing.xl }}>
          <Text style={{ fontFamily: fonts.heading2, fontSize: 22, color: colors.textPrimary }}>
            Team
          </Text>
          <Text style={{ marginTop: 8, color: colors.textSecondary }}>
            Sign in to use team tracking.
          </Text>
        </View>
      </View>
    );
  }

  // ── Privacy gate ──
  const socialDisabled = privacySettings?.socialEnabled === false;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Fixed header - not in scroll */}
      <View
        style={{
          paddingTop: insets.top,
          paddingHorizontal: spacing.xl,
          backgroundColor: colors.background,
          zIndex: 10,
        }}
      >
        <TrackingHeaderTabs
          active="team"
          colors={colors}
          isDark={isDark}
          topInset={0}
          paddingHorizontal={0}
          showTeamTab
        />

        {/* Team header row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: spacing.sm,
            paddingBottom: spacing.md,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: colors.accentLight,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1.5,
                borderColor: colors.borderLime,
              }}
            >
              <Text
                style={{ fontFamily: fonts.heading2, fontSize: 20, color: colors.textPrimary }}
              >
                {teamInitial}
              </Text>
            </View>
            <View>
              <Text
                style={{ fontFamily: fonts.heading2, fontSize: 19, color: colors.textPrimary, letterSpacing: -0.2 }}
              >
                {teamName}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 3,
                }}
              >
                <Ionicons name="people" size={12} color={colors.accent} />
                <Text
                  style={{
                    fontFamily: fonts.bodyBold,
                    fontSize: 12,
                    color: colors.accent,
                  }}
                >
                  {memberCount} members
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <RoundIconButton
              onPress={shareTeam}
              icon={<AppIcon name="share" size={18} color={colors.textPrimary} />}
              backgroundColor={
                isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
              }
              borderColor={cardBorder}
            />
            <RoundIconButton
              onPress={openSettings}
              icon={<AppIcon name="settings" size={18} color={colors.textPrimary} />}
              backgroundColor={
                isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
              }
              borderColor={cardBorder}
            />
          </View>
        </View>

        {/* Pill tabs */}
        <PillTabs
          tabs={TABS}
          activeKey={activeTab}
          onChange={setActiveTab}
          colors={colors}
          isDark={isDark}
        />
      </View>

      {/* Privacy disabled gate */}
      {socialDisabled ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: spacing.xl,
          }}
        >
          <View
            style={{
              width: "100%",
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: cardBorder,
              borderRadius: 20,
              padding: spacing.xl,
              gap: spacing.md,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: colors.accentLight,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: spacing.sm,
              }}
            >
              <Ionicons name="people-outline" size={26} color={colors.accent} />
            </View>
            <Text
              style={{
                fontFamily: fonts.heading2,
                fontSize: 20,
                color: colors.textPrimary,
                textAlign: "center",
              }}
            >
              Join the team feed
            </Text>
            <Text
              style={{
                fontFamily: fonts.bodyMedium,
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              Enable team features to share runs, post updates, and appear on the leaderboard.
            </Text>
            <Pressable
              onPress={() => handleToggleSocialEnabled(true)}
              disabled={settingsLoading}
              style={({ pressed }) => ({
                width: "100%",
                height: 50,
                borderRadius: 25,
                backgroundColor: colors.accent,
                alignItems: "center",
                justifyContent: "center",
                marginTop: spacing.sm,
                opacity: pressed || settingsLoading ? 0.85 : 1,
              })}
            >
              {settingsLoading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text
                  style={{
                    fontFamily: fonts.heading3,
                    fontSize: 15,
                    color: colors.textInverse,
                  }}
                >
                  Enable team features
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          {/* ── Feed tab ── */}
          {activeTab === "feed" ? (
            <FeedTab
              unifiedFeed={unifiedFeed}
              feed={feed}
              postFeed={postFeed}
              colors={colors}
              isDark={isDark}
              cardBg={cardBg}
              cardBorder={cardBorder}
              teamInitial={teamInitial}
              loading={isFeedLoading}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              onLoadMoreFeed={loadMoreFeed}
              onLoadMorePosts={loadMorePosts}
              feedLoadingMore={feedLoadingMore}
              postLoadingMore={postLoadingMore}
              onPressRunComment={openComments}
              onToggleRunLike={toggleLike}
              onPressOpenRun={(runLogId) =>
                router.push({
                  pathname: "/(tabs)/tracking/run-path/[runLogId]" as any,
                  params: { runLogId: String(runLogId) },
                } as any)
              }
              onPressPostComment={openPostComments}
              onTogglePostLike={onTogglePostLike}
              onPressCompose={() => setComposerOpen(true)}
              sort={sort}
              rangeDays={rangeDays}
              onPickSort={pickSort}
              onPickRange={pickRange}
              bottomPad={trackingScrollBottomPad(insets) + 72}
            />
          ) : null}

          {/* ── Leaderboard tab ── */}
          {activeTab === "leaderboard" ? (
            <LeaderboardTab
              leaderboard={leaderboard}
              loading={leaderboardLoading}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={colors}
              isDark={isDark}
              cardBg={cardBg}
              cardBorder={cardBorder}
              rangeDays={rangeDays}
              onPickRange={pickRange}
              onPickSort={pickLeaderboardSort}
              bottomPad={trackingScrollBottomPad(insets) + 72}
            />
          ) : null}

          {/* ── Squad tab ── */}
          {activeTab === "squad" ? (
            <SquadTab
              adults={adults}
              loading={loading}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={colors}
              isDark={isDark}
              cardBg={cardBg}
              cardBorder={cardBorder}
              bottomPad={trackingScrollBottomPad(insets) + 72}
            />
          ) : null}
        </>
      )}

      {/* ── Sheets ── */}
      {activeRunLogId != null && token != null ? (
        <CommentsSheet
          open={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          token={token}
          runLogId={activeRunLogId}
          runOwnerName={feed.find((r) => r.runLogId === activeRunLogId)?.name ?? null}
          useTeamFeed={useTeamFeed}
        />
      ) : null}

      {activePostId != null && token != null ? (
        <PostCommentsSheet
          open={postCommentsOpen}
          onClose={() => setPostCommentsOpen(false)}
          token={token}
          postId={activePostId}
          postOwnerName={postFeed.find((p) => p.id === activePostId)?.name ?? null}
          useTeamFeed={useTeamFeed}
          onChanged={loadPosts}
        />
      ) : null}

      {token != null ? (
        <PostComposerSheet
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          token={token}
          useTeamFeed={useTeamFeed}
          onPostCreated={loadCommunity}
        />
      ) : null}

      {/* ── Floating Run button ── */}
      <View
        style={{
          position: "absolute",
          bottom: trackingScrollBottomPad(insets) + spacing.md,
          left: spacing.xl,
          right: spacing.xl,
          shadowColor: "#000",
          shadowOpacity: isDark ? 0.4 : 0.15,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 10,
          zIndex: 99,
        }}
      >
        <Pressable
          onPress={handleStartRun}
          style={({ pressed }) => ({
            width: "100%",
            height: 56,
            borderRadius: 28,
            backgroundColor: pressed ? colors.limeDark : colors.accent,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
          accessibilityRole="button"
          accessibilityLabel="Run"
        >
          <Ionicons name="play" size={20} color={colors.textInverse} />
          <Text
            style={{
              fontFamily: fonts.heading2,
              fontSize: 18,
              color: colors.textInverse,
            }}
          >
            Run
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── PillTabs ────────────────────────────────────────────────────────────────

function PillTabs<K extends string>({
  tabs,
  activeKey,
  onChange,
  colors,
  isDark,
}: {
  tabs: Array<{ key: K; label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }>;
  activeKey: K;
  onChange: (key: K) => void;
  colors: any;
  isDark: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        borderRadius: 16,
        padding: 4,
        marginTop: spacing.sm,
        marginBottom: spacing.xs ?? 4,
        gap: 3,
      }}
    >
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => ({
              flex: 1,
              height: 46,
              borderRadius: 13,
              backgroundColor: active
                ? isDark
                  ? "rgba(255,255,255,0.13)"
                  : "#FFFFFF"
                : "transparent",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              opacity: pressed ? 0.75 : 1,
              ...(active
                ? {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDark ? 0.25 : 0.1,
                    shadowRadius: 6,
                    elevation: 3,
                  }
                : {}),
            })}
          >
            <Ionicons
              name={active ? tab.iconActive : tab.icon}
              size={18}
              color={active ? (isDark ? "#FFFFFF" : "#000000") : colors.textSecondary}
            />
            <Text
              style={{
                fontFamily: active ? fonts.bodyBold : fonts.bodyMedium,
                fontSize: 11,
                lineHeight: 13,
                color: active
                  ? isDark
                    ? "#FFFFFF"
                    : "#000000"
                  : colors.textSecondary,
                letterSpacing: 0.1,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── FeedTab ────────────────────────────────────────────────────────────────

type FeedTabProps = {
  unifiedFeed: FeedItem[];
  feed: SocialRunFeedItem[];
  postFeed: SocialPostItem[];
  colors: any;
  isDark: boolean;
  cardBg: string;
  cardBorder: string;
  teamInitial: string;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onLoadMoreFeed: () => void;
  onLoadMorePosts: () => void;
  feedLoadingMore: boolean;
  postLoadingMore: boolean;
  onPressRunComment: (id: number) => void;
  onToggleRunLike: (r: SocialRunFeedItem) => void;
  onPressOpenRun: (id: number) => void;
  onPressPostComment: (id: number) => void;
  onTogglePostLike: (p: SocialPostItem) => void;
  onPressCompose: () => void;
  sort: SocialSort;
  rangeDays: number;
  onPickSort: () => void;
  onPickRange: () => void;
  bottomPad: number;
};

function FeedTab({
  unifiedFeed,
  feed: _feed,
  postFeed: _postFeed,
  colors,
  isDark,
  cardBg,
  cardBorder,
  teamInitial,
  loading,
  refreshing,
  onRefresh,
  onLoadMoreFeed,
  onLoadMorePosts,
  feedLoadingMore,
  postLoadingMore,
  onPressRunComment,
  onToggleRunLike,
  onPressOpenRun,
  onPressPostComment,
  onTogglePostLike,
  onPressCompose,
  sort: _sort,
  rangeDays,
  onPickSort,
  onPickRange,
  bottomPad,
}: FeedTabProps) {
  const handleEndReached = useCallback(() => {
    onLoadMoreFeed();
    onLoadMorePosts();
  }, [onLoadMoreFeed, onLoadMorePosts]);

  type ListItem =
    | { _listType: "composer" }
    | { _listType: "filters" }
    | { _listType: "item"; data: FeedItem }
    | { _listType: "empty" }
    | { _listType: "loading" };

  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [
      { _listType: "composer" },
      { _listType: "filters" },
    ];
    if (loading) {
      items.push({ _listType: "loading" });
    } else if (unifiedFeed.length === 0) {
      items.push({ _listType: "empty" });
    } else {
      for (const item of unifiedFeed) {
        items.push({ _listType: "item", data: item });
      }
    }
    return items;
  }, [loading, unifiedFeed]);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item._listType === "composer") {
        return (
          <PostComposerRow
            initial={teamInitial}
            onPress={onPressCompose}
            colors={colors}
            cardBg={cardBg}
            cardBorder={cardBorder}
          />
        );
      }
      if (item._listType === "filters") {
        return (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingBottom: 4,
            }}
          >
            <FilterPill
              label={rangeDays === 0 ? "All time" : `${rangeDays}d`}
              icon="time-outline"
              onPress={onPickRange}
              colors={colors}
              isDark={isDark}
            />
            <FilterPill
              label="Sort"
              icon="options-outline"
              onPress={onPickSort}
              colors={colors}
              isDark={isDark}
            />
          </View>
        );
      }
      if (item._listType === "loading") {
        return (
          <ActivityIndicator
            color={colors.accent}
            style={{ marginVertical: 40 }}
          />
        );
      }
      if (item._listType === "empty") {
        return (
          <EmptyState
            title="Nothing here yet"
            subtitle="When teammates record runs or post updates, they'll appear here."
            colors={colors}
            cardBg={cardBg}
            cardBorder={cardBorder}
          />
        );
      }
      // item
      const feedItem = item.data;
      if (feedItem._type === "run") {
        return (
          <RunCard
            item={feedItem}
            colors={colors}
            cardBg={cardBg}
            cardBorder={cardBorder}
            onPressComment={() => onPressRunComment(feedItem.runLogId)}
            onToggleLike={() => onToggleRunLike(feedItem)}
            onPressOpen={() => onPressOpenRun(feedItem.runLogId)}
          />
        );
      }
      return (
        <PostCard
          item={feedItem}
          colors={colors}
          cardBg={cardBg}
          cardBorder={cardBorder}
          onPressComment={() => onPressPostComment(feedItem.id)}
          onToggleLike={() => onTogglePostLike(feedItem)}
        />
      );
    },
    [
      cardBg,
      cardBorder,
      colors,
      isDark,
      onPickRange,
      onPickSort,
      onPressCompose,
      onPressOpenRun,
      onPressPostComment,
      onPressRunComment,
      onTogglePostLike,
      onToggleRunLike,
      rangeDays,
      teamInitial,
    ],
  );

  const keyExtractor = useCallback((item: ListItem, _index: number) => {
    if (item._listType === "composer") return "composer";
    if (item._listType === "filters") return "filters";
    if (item._listType === "loading") return "loading";
    if (item._listType === "empty") return "empty";
    const d = item.data;
    return d._type === "run" ? `run-${d.runLogId}` : `post-${d.id}`;
  }, []);

  return (
    <FlatList
      data={listData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.sm,
        paddingBottom: bottomPad,
        gap: 12,
      }}
      showsVerticalScrollIndicator={false}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
      ListFooterComponent={
        feedLoadingMore || postLoadingMore ? (
          <ActivityIndicator
            color={colors.accent}
            style={{ marginVertical: 20 }}
          />
        ) : null
      }
    />
  );
}

// ─── LeaderboardTab ──────────────────────────────────────────────────────────

function LeaderboardTab({
  leaderboard,
  loading,
  refreshing,
  onRefresh,
  colors,
  isDark,
  cardBg,
  cardBorder,
  rangeDays,
  onPickRange,
  onPickSort,
  bottomPad,
}: {
  leaderboard: SocialLeaderboardItem[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  colors: any;
  isDark: boolean;
  cardBg: string;
  cardBorder: string;
  rangeDays: number;
  onPickRange: () => void;
  onPickSort: () => void;
  bottomPad: number;
}) {
  type ListItem =
    | { _listType: "filters" }
    | { _listType: "loading" }
    | { _listType: "empty" }
    | { _listType: "item"; data: SocialLeaderboardItem };

  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [{ _listType: "filters" }];
    if (loading) {
      items.push({ _listType: "loading" });
    } else if (leaderboard.length === 0) {
      items.push({ _listType: "empty" });
    } else {
      for (const entry of leaderboard) {
        items.push({ _listType: "item", data: entry });
      }
    }
    return items;
  }, [leaderboard, loading]);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item._listType === "filters") {
        return (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 4 }}>
            <FilterPill
              label={rangeDays === 0 ? "All time" : `${rangeDays}d`}
              icon="time-outline"
              onPress={onPickRange}
              colors={colors}
              isDark={isDark}
            />
            <FilterPill
              label="Sort"
              icon="swap-vertical-outline"
              onPress={onPickSort}
              colors={colors}
              isDark={isDark}
            />
          </View>
        );
      }
      if (item._listType === "loading") {
        return (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 40 }} />
        );
      }
      if (item._listType === "empty") {
        return (
          <EmptyState
            title="No rankings yet"
            subtitle="Rankings will appear once teammates share runs."
            colors={colors}
            cardBg={cardBg}
            cardBorder={cardBorder}
          />
        );
      }
      return (
        <LeaderboardRow
          item={item.data}
          colors={colors}
          cardBg={cardBg}
          cardBorder={cardBorder}
        />
      );
    },
    [cardBg, cardBorder, colors, isDark, onPickRange, onPickSort, rangeDays],
  );

  const keyExtractor = useCallback((item: ListItem) => {
    if (item._listType !== "item") return item._listType;
    return `lb-${item.data.userId}`;
  }, []);

  return (
    <FlatList
      data={listData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.sm,
        paddingBottom: bottomPad,
        gap: 10,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
    />
  );
}

// ─── SquadTab ────────────────────────────────────────────────────────────────

function SquadTab({
  adults,
  loading,
  refreshing,
  onRefresh,
  colors,
  isDark: _isDark,
  cardBg,
  cardBorder,
  bottomPad,
}: {
  adults: { userId: number; name: string; avatarUrl: string | null }[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  colors: any;
  isDark: boolean;
  cardBg: string;
  cardBorder: string;
  bottomPad: number;
}) {
  type ListItem =
    | { _listType: "loading" }
    | { _listType: "empty" }
    | { _listType: "item"; data: { userId: number; name: string; avatarUrl: string | null } };

  const listData = useMemo<ListItem[]>(() => {
    if (loading) return [{ _listType: "loading" }];
    if (adults.length === 0) return [{ _listType: "empty" }];
    return adults.map((a) => ({ _listType: "item" as const, data: a }));
  }, [adults, loading]);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item._listType === "loading") {
        return (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 40 }} />
        );
      }
      if (item._listType === "empty") {
        return (
          <EmptyState
            title="No members yet"
            subtitle="Team members will appear here once they join."
            colors={colors}
            cardBg={cardBg}
            cardBorder={cardBorder}
          />
        );
      }
      const member = item.data;
      return (
        <View
          style={{
            width: "100%",
            backgroundColor: cardBg,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: cardBorder,
            padding: spacing.lg,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <InitialAvatar
            initial={member.name.slice(0, 1).toUpperCase()}
            url={member.avatarUrl}
            size={44}
          />
          <Text
            style={{
              fontFamily: fonts.bodyBold,
              fontSize: 15,
              color: colors.textPrimary,
              flex: 1,
            }}
          >
            {member.name}
          </Text>
        </View>
      );
    },
    [cardBg, cardBorder, colors],
  );

  const keyExtractor = useCallback((item: ListItem) => {
    if (item._listType !== "item") return item._listType;
    return `squad-${item.data.userId}`;
  }, []);

  return (
    <FlatList
      data={listData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.sm,
        paddingBottom: bottomPad,
        gap: 10,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
    />
  );
}

// ─── RunCard ────────────────────────────────────────────────────────────────

const RunCard = memo(function RunCard({
  item,
  colors,
  cardBg,
  cardBorder,
  onPressComment,
  onToggleLike,
  onPressOpen,
}: {
  item: SocialRunFeedItem;
  colors: any;
  cardBg: string;
  cardBorder: string;
  onPressComment: () => void;
  onToggleLike: () => void;
  onPressOpen: () => void;
}) {
  const km = formatDistanceKm(item.distanceMeters, 2);
  const time = formatDurationClock(item.durationSeconds ?? 0);
  const pace =
    item.avgPace != null && Number.isFinite(item.avgPace)
      ? `${item.avgPace.toFixed(2)} /km`
      : "—";
  const likeCount = item.likeCount ?? 0;
  const commentCount = item.commentCount ?? 0;
  const dateLabel = new Date(item.date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <View
      style={{
        width: "100%",
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: cardBorder,
        borderRadius: 20,
        overflow: "hidden",
      }}
    >
      {/* Header row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 10,
          gap: 10,
        }}
      >
        <InitialAvatar
          initial={item.name.slice(0, 1).toUpperCase()}
          url={item.avatarUrl}
          size={40}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: fonts.bodyBold,
              fontSize: 14,
              color: colors.textPrimary,
            }}
          >
            {item.name}
          </Text>
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 12,
              color: colors.textSecondary,
              marginTop: 1,
            }}
          >
            {dateLabel}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 20,
            backgroundColor: colors.accentLight,
          }}
        >
          <Text
            style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: colors.accent }}
          >
            Run
          </Text>
        </View>
      </View>

      {/* Route preview */}
      <Pressable onPress={onPressOpen} style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}>
        <MiniRunPathPreview points={item.pathPreview} height={180} colors={colors} />
      </Pressable>

      {/* Stats row */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 2,
          gap: 0,
        }}
      >
        <StatColumn label="Distance" value={`${km} km`} colors={colors} />
        <StatDivider />
        <StatColumn label="Time" value={time} colors={colors} />
        <StatDivider />
        <StatColumn label="Pace" value={pace} colors={colors} />
      </View>

      {/* Interaction row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingTop: 12,
          paddingBottom: 14,
          gap: 8,
        }}
      >
        {/* Kudos count */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            flex: 1,
          }}
        >
          <Ionicons name="heart" size={14} color={colors.textDim} />
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 12,
              color: colors.textSecondary,
            }}
          >
            {likeCount}
          </Text>
          <Ionicons
            name="chatbubble-outline"
            size={13}
            color={colors.textDim}
            style={{ marginLeft: 8 }}
          />
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 12,
              color: colors.textSecondary,
            }}
          >
            {commentCount}
          </Text>
        </View>

        {/* Action buttons */}
        <Pressable
          onPress={onToggleLike}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: item.userLiked ? colors.accentLight : "rgba(255,255,255,0.06)",
            opacity: pressed ? 0.8 : 1,
          })}
          accessibilityLabel={item.userLiked ? "Unlike" : "Like"}
        >
          <Ionicons
            name={item.userLiked ? "heart" : "heart-outline"}
            size={16}
            color={item.userLiked ? colors.accent : colors.textSecondary}
          />
          <Text
            style={{
              fontFamily: fonts.bodyBold,
              fontSize: 13,
              color: item.userLiked ? colors.accent : colors.textSecondary,
            }}
          >
            Kudos
          </Text>
        </Pressable>

        <Pressable
          onPress={onPressComment}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: "rgba(255,255,255,0.06)",
            opacity: pressed ? 0.8 : 1,
          })}
          accessibilityLabel="Comment"
        >
          <Ionicons name="chatbubble-outline" size={15} color={colors.textSecondary} />
          <Text
            style={{
              fontFamily: fonts.bodyBold,
              fontSize: 13,
              color: colors.textSecondary,
            }}
          >
            Comment
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

// ─── PostCard ────────────────────────────────────────────────────────────────

const PostCard = memo(function PostCard({
  item,
  colors,
  cardBg,
  cardBorder,
  onPressComment,
  onToggleLike,
}: {
  item: SocialPostItem;
  colors: any;
  cardBg: string;
  cardBorder: string;
  onPressComment: () => void;
  onToggleLike: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const likeCount = item.likeCount ?? 0;
  const commentCount = item.commentCount ?? 0;
  const dateLabel = new Date(item.date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const isLongText = item.content && item.content.length > 180;

  return (
    <View
      style={{
        width: "100%",
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: cardBorder,
        borderRadius: 20,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 10,
          gap: 10,
        }}
      >
        <InitialAvatar
          initial={item.name.slice(0, 1).toUpperCase()}
          url={item.avatarUrl}
          size={40}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: fonts.bodyBold,
              fontSize: 14,
              color: colors.textPrimary,
            }}
          >
            {item.name}
          </Text>
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 12,
              color: colors.textSecondary,
              marginTop: 1,
            }}
          >
            {dateLabel}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 20,
            backgroundColor: "rgba(123,97,255,0.12)",
          }}
        >
          <Text
            style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: "#7B61FF" }}
          >
            Post
          </Text>
        </View>
      </View>

      {/* Text content */}
      {item.content ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: item.mediaUrl ? 10 : 0 }}>
          <Text
            numberOfLines={expanded ? undefined : isLongText ? 3 : undefined}
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 15,
              color: colors.textPrimary,
              lineHeight: 22,
            }}
          >
            {item.content}
          </Text>
          {isLongText && !expanded ? (
            <Pressable onPress={() => setExpanded(true)} hitSlop={8}>
              <Text
                style={{
                  fontFamily: fonts.bodyBold,
                  fontSize: 13,
                  color: colors.accent,
                  marginTop: 4,
                }}
              >
                Read more
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Media */}
      {item.mediaUrl ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
          <View
            style={{
              borderRadius: 12,
              overflow: "hidden",
              backgroundColor: colors.surfaceHigh,
              borderWidth: 1,
              borderColor: cardBorder,
            }}
          >
            {item.mediaType === "video" ? (
              <View
                style={{
                  height: 180,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    backgroundColor: colors.accentLight,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="play" size={20} color={colors.accent} />
                </View>
                <Text
                  style={{
                    fontFamily: fonts.bodyBold,
                    fontSize: 13,
                    color: colors.textPrimary,
                  }}
                >
                  Video post
                </Text>
              </View>
            ) : (
              <View>
                <Image
                  source={{ uri: item.mediaUrl }}
                  style={{ width: "100%", aspectRatio: 16 / 9 }}
                  contentFit="cover"
                  transition={200}
                />
                <LinearGradient
                  colors={["transparent", "rgba(7,7,15,0.45)"]}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 60,
                  }}
                />
              </View>
            )}
          </View>
        </View>
      ) : null}

      {/* Like/comment counts + actions */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: 14,
        }}
      >
        {(likeCount > 0 || commentCount > 0) ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingBottom: 10,
            }}
          >
            {likeCount > 0 ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="heart" size={13} color={colors.textDim} />
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 12,
                    color: colors.textSecondary,
                  }}
                >
                  {likeCount} {likeCount === 1 ? "like" : "likes"}
                </Text>
              </View>
            ) : null}
            {commentCount > 0 ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="chatbubble-outline" size={12} color={colors.textDim} />
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 12,
                    color: colors.textSecondary,
                  }}
                >
                  {commentCount} {commentCount === 1 ? "comment" : "comments"}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: cardBorder,
            marginBottom: 10,
            opacity: 0.5,
          }}
        />

        {/* Action buttons */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={onToggleLike}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingVertical: 9,
              borderRadius: 12,
              backgroundColor: item.userLiked
                ? colors.accentLight
                : "rgba(255,255,255,0.05)",
              opacity: pressed ? 0.8 : 1,
            })}
            accessibilityLabel={item.userLiked ? "Unlike" : "Like"}
          >
            <Ionicons
              name={item.userLiked ? "heart" : "heart-outline"}
              size={16}
              color={item.userLiked ? colors.accent : colors.textSecondary}
            />
            <Text
              style={{
                fontFamily: fonts.bodyBold,
                fontSize: 13,
                color: item.userLiked ? colors.accent : colors.textSecondary,
              }}
            >
              Like
            </Text>
          </Pressable>

          <Pressable
            onPress={onPressComment}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingVertical: 9,
              borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.05)",
              opacity: pressed ? 0.8 : 1,
            })}
            accessibilityLabel="Comment"
          >
            <Ionicons name="chatbubble-outline" size={15} color={colors.textSecondary} />
            <Text
              style={{
                fontFamily: fonts.bodyBold,
                fontSize: 13,
                color: colors.textSecondary,
              }}
            >
              Comment
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

// ─── LeaderboardRow ─────────────────────────────────────────────────────────

function LeaderboardRow({
  item,
  colors,
  cardBg,
  cardBorder,
}: {
  item: SocialLeaderboardItem;
  colors: any;
  cardBg: string;
  cardBorder: string;
}) {
  const rankColor =
    item.rank === 1
      ? "#FFB020"
      : item.rank === 2
      ? "#B0BEC5"
      : item.rank === 3
      ? "#CD7F32"
      : colors.textSecondary;
  const rankBg =
    item.rank === 1
      ? "rgba(255,176,32,0.12)"
      : item.rank === 2
      ? "rgba(176,190,197,0.10)"
      : item.rank === 3
      ? "rgba(205,127,50,0.10)"
      : "rgba(255,255,255,0.06)";

  return (
    <View
      style={{
        width: "100%",
        backgroundColor: cardBg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: cardBorder,
        padding: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: rankBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: rankColor }}>
          #{item.rank}
        </Text>
      </View>
      <InitialAvatar
        initial={item.name.slice(0, 1).toUpperCase()}
        url={item.avatarUrl}
        size={38}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary }}>
          {item.name}
        </Text>
        <Text
          style={{
            fontFamily: fonts.bodyMedium,
            fontSize: 12,
            color: colors.textSecondary,
            marginTop: 1,
          }}
        >
          {item.kmTotal.toFixed(1)} km · {item.durationMinutesTotal} min
        </Text>
      </View>
      <Text style={{ fontFamily: fonts.statNumber, fontSize: 16, color: rankColor }}>
        {item.kmTotal.toFixed(1)}
        <Text style={{ fontSize: 11, color: colors.textSecondary }}> km</Text>
      </Text>
    </View>
  );
}

// ─── StatColumn ─────────────────────────────────────────────────────────────

function StatColumn({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", paddingVertical: 8 }}>
      <Text
        style={{
          fontFamily: fonts.statNumber,
          fontSize: 17,
          color: colors.textPrimary,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: fonts.bodyMedium,
          fontSize: 11,
          color: colors.textSecondary,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function StatDivider() {
  return (
    <View
      style={{
        width: 1,
        marginVertical: 8,
        backgroundColor: "rgba(255,255,255,0.08)",
      }}
    />
  );
}

// ─── FilterPill ─────────────────────────────────────────────────────────────

function FilterPill({
  label,
  icon,
  onPress,
  colors,
  isDark,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  colors: any;
  isDark: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Ionicons name={icon} size={13} color={colors.textSecondary} />
      <Text
        style={{
          fontFamily: fonts.bodyBold,
          fontSize: 12,
          color: colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── PostComposerRow ────────────────────────────────────────────────────────

function PostComposerRow({
  initial,
  onPress,
  colors,
  cardBg,
  cardBorder: _cardBorder,
}: {
  initial: string;
  onPress: () => void;
  colors: any;
  cardBg: string;
  cardBorder: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 20,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <LinearGradient
        colors={[
          "rgba(200,241,53,0.16)",
          "rgba(123,97,255,0.12)",
          "rgba(255,255,255,0.02)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 20, padding: 1 }}
      >
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 19,
            paddingVertical: 12,
            paddingHorizontal: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <InitialAvatar initial={initial} size={38} />
          <View
            style={{
              flex: 1,
              minHeight: 40,
              borderRadius: 20,
              backgroundColor: colors.surfaceHigh,
              paddingHorizontal: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                flex: 1,
                fontFamily: fonts.bodyMedium,
                fontSize: 14,
                color: colors.textSecondary,
              }}
            >
              Share with the team...
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <AppIcon name="image" size={17} color={colors.textSecondary} />
              <AppIcon name="add-circle" size={17} color={colors.accent} />
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// ─── RoundIconButton ────────────────────────────────────────────────────────

function RoundIconButton({
  onPress,
  icon,
  backgroundColor = "rgba(0,0,0,0.35)",
  borderColor = "transparent",
}: {
  onPress: () => void;
  icon: React.ReactNode;
  backgroundColor?: string;
  borderColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor,
        borderWidth: 1,
        borderColor,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {icon}
    </Pressable>
  );
}

// ─── InitialAvatar ──────────────────────────────────────────────────────────

const InitialAvatar = memo(function InitialAvatar({
  initial,
  size = 40,
  url,
}: {
  initial: string;
  size?: number;
  url?: string | null;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "rgba(148,163,184,0.22)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <Text
          style={{
            fontFamily: fonts.bodyBold,
            fontSize: Math.max(12, size * 0.36),
            color: "#FFF",
          }}
        >
          {initial}
        </Text>
      )}
    </View>
  );
});

// ─── EmptyState ─────────────────────────────────────────────────────────────

function EmptyState({
  title,
  subtitle,
  colors,
  cardBg,
  cardBorder,
}: {
  title: string;
  subtitle: string;
  colors: any;
  cardBg: string;
  cardBorder: string;
}) {
  return (
    <View
      style={{
        width: "100%",
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: cardBorder,
        borderRadius: 20,
        padding: spacing.xl,
        alignItems: "center",
        gap: spacing.sm,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.heading2,
          fontSize: 17,
          color: colors.textPrimary,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: fonts.bodyMedium,
          fontSize: 13,
          color: colors.textSecondary,
          textAlign: "center",
          lineHeight: 19,
        }}
      >
        {subtitle}
      </Text>
    </View>
  );
}
