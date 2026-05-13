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
  Pressable,
  RefreshControl,
  Share,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  FadeInDown,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  Newspaper,
  Trophy,
  Flame,
  Users,
  Share2,
  Settings,
  Heart,
  MessageCircle,
  Clock,
  SlidersHorizontal,
  ArrowUpDown,
  Play,
  ImageIcon,
  PlusCircle,
  BarChart3,
  Send,
  Bookmark,
} from "lucide-react-native";

import { useRunStore } from "@/store/useRunStore";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSelector } from "@/store/hooks";
import { spacing } from "@/constants/theme";
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
import { LeaderboardCommentSheet } from "@/components/tracking/social/LeaderboardCommentSheet";
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
import { relativeTime } from "@/lib/tracking/relativeTime";

// ─── Tab definition ──────────────────────────────────────────────────────────

type TabKey = "feed" | "leaderboard" | "squad" | "challenges";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "feed", label: "Feed" },
  { key: "leaderboard", label: "Leaderboard" },
  { key: "challenges", label: "Challenges" },
  { key: "squad", label: "Squad" },
];

// ─── Feed item union type ────────────────────────────────────────────────────

type FeedItem =
  | ({ _type: "run" } & SocialRunFeedItem)
  | ({ _type: "post" } & SocialPostItem);

// ─── Main screen ────────────────────────────────────────────────────────────

export default function TrackingSocialScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();
  const token = useAppSelector((s) => s.user.token);
  const appRole = useAppSelector((s) => s.user.appRole);
  const capabilities = useAppSelector((s) => s.user.capabilities);
  const capabilitiesLoaded = useAppSelector((s) => s.user.capabilitiesLoaded);
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
        capabilities,
        authTeamMembership,
        firstManagedAthlete: managedAthletes[0] ?? null,
      }),
    [appRole, authTeamMembership, managedAthletes, capabilities],
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
  const [lbCommentItem, setLbCommentItem] = useState<SocialLeaderboardItem | null>(null);
  const [lbCommentOpen, setLbCommentOpen] = useState(false);

  const canLoad = token != null;

  // ── Gate check ──
  useEffect(() => {
    if (!capabilitiesLoaded) return;
    if (canAccessTracking && useTeamFeed) return;
    if (!canAccessTracking) {
      router.replace("/(tabs)/tracking" as any);
    }
  }, [capabilitiesLoaded, canAccessTracking, router, useTeamFeed]);

  if (!capabilitiesLoaded || !canAccessTracking || !useTeamFeed) {
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    const posts: FeedItem[] = postFeed.map((pItem) => ({ _type: "post" as const, ...pItem }));
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
      <View style={{ flex: 1, backgroundColor: p.pageBg }}>
        <View style={{ paddingTop: insets.top + spacing.xl, padding: spacing.xl }}>
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 22, color: p.textPrimary }}>
            Team
          </Text>
          <Text style={{ marginTop: 8, fontFamily: "Outfit-Regular", fontSize: 14, color: p.textSecondary }}>
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
    <View style={{ flex: 1, backgroundColor: p.pageBg }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Fixed header - not in scroll */}
      <View
        style={{
          paddingTop: insets.top,
          paddingHorizontal: spacing.xl,
          backgroundColor: p.pageBg,
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
                backgroundColor: p.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{ fontFamily: "Outfit-Bold", fontSize: 20, color: p.textPrimary }}
              >
                {teamInitial}
              </Text>
            </View>
            <View>
              <Text
                style={{ fontFamily: "Outfit-Bold", fontSize: 19, color: p.textPrimary, letterSpacing: -0.2 }}
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
                <Users size={12} color={p.accent} />
                <Text
                  style={{
                    fontFamily: "Outfit-Bold",
                    fontSize: 12,
                    color: p.accent,
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
              icon={<Share2 size={18} color={p.textPrimary} />}
              backgroundColor={p.inputBg}
            />
            <RoundIconButton
              onPress={openSettings}
              icon={<Settings size={18} color={p.textPrimary} />}
              backgroundColor={p.inputBg}
            />
          </View>
        </View>

      </View>

      {/* Full-width tab cards */}
      <PillTabs
        tabs={TABS}
        activeKey={activeTab}
        onChange={setActiveTab}
        p={p}
      />

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
              backgroundColor: p.cardWhite,
              borderRadius: 22,
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
                backgroundColor: p.accentSoft,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: spacing.sm,
              }}
            >
              <Users size={26} color={p.accent} />
            </View>
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 20,
                color: p.textPrimary,
                textAlign: "center",
              }}
            >
              Join the team feed
            </Text>
            <Text
              style={{
                fontFamily: "Outfit-Regular",
                fontSize: 14,
                color: p.textSecondary,
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
                borderRadius: 100,
                backgroundColor: p.accent,
                alignItems: "center",
                justifyContent: "center",
                marginTop: spacing.sm,
                opacity: pressed || settingsLoading ? 0.85 : 1,
              })}
            >
              {settingsLoading ? (
                <ActivityIndicator color={p.buttonPrimaryText} />
              ) : (
                <Text
                  style={{
                    fontFamily: "Outfit-Bold",
                    fontSize: 15,
                    color: p.buttonPrimaryText,
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
              leaderboard={leaderboard}
              p={p}
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
              colors={colors}
            />
          ) : null}

          {/* ── Leaderboard tab ── */}
          {activeTab === "leaderboard" ? (
            <LeaderboardTab
              leaderboard={leaderboard}
              loading={leaderboardLoading}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              p={p}
              rangeDays={rangeDays}
              onPickRange={pickRange}
              onPickSort={pickLeaderboardSort}
              bottomPad={trackingScrollBottomPad(insets) + 72}
              postFeed={postFeed}
              onPressComment={(item) => {
                setLbCommentItem(item);
                setLbCommentOpen(true);
              }}
            />
          ) : null}

          {/* ── Challenges tab ── */}
          {activeTab === "challenges" ? (
            <ChallengesTab
              leaderboard={leaderboard}
              memberCount={memberCount}
              loading={loading}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              p={p}
              bottomPad={trackingScrollBottomPad(insets) + 72}
              teamName={teamName}
            />
          ) : null}

          {/* ── Squad tab ── */}
          {activeTab === "squad" ? (
            <SquadTab
              adults={adults}
              leaderboard={leaderboard}
              loading={loading}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              p={p}
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
          postOwnerName={postFeed.find((pItem) => pItem.id === activePostId)?.name ?? null}
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

      {lbCommentItem != null && token != null ? (
        <LeaderboardCommentSheet
          open={lbCommentOpen}
          onClose={() => setLbCommentOpen(false)}
          item={lbCommentItem}
          token={token}
          useTeamFeed={useTeamFeed}
          postFeed={postFeed}
          onPosted={(post) => setPostFeed((prev) => [post, ...prev])}
        />
      ) : null}

    </View>
  );
}

// ─── PillTabs ────────────────────────────────────────────────────────────────

function PillTabs<K extends string>({
  tabs,
  activeKey,
  onChange,
  p,
}: {
  tabs: Array<{ key: K; label: string }>;
  activeKey: K;
  onChange: (key: K) => void;
  p: ReturnType<typeof useAdminPastel>;
}) {
  const tabIcons: Record<string, (active: boolean, color: string) => React.ReactNode> = {
    feed: (_, color) => <Newspaper size={20} color={color} />,
    leaderboard: (_, color) => <Trophy size={20} color={color} />,
    challenges: (_, color) => <Flame size={20} color={color} />,
    squad: (_, color) => <Users size={20} color={color} />,
  };

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: p.inputBg,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: p.divider,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
      }}
    >
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        const iconColor = active ? p.accent : p.textMuted;
        const renderIcon = tabIcons[tab.key as string];
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => ({
              flex: 1,
              height: 60,
              borderRadius: 22,
              backgroundColor: active ? p.cardWhite : "transparent",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            {renderIcon ? renderIcon(active, iconColor) : null}
            <Text
              style={{
                fontFamily: active ? "Outfit-Bold" : "Outfit-Regular",
                fontSize: 11,
                lineHeight: 14,
                color: active ? p.textPrimary : p.textMuted,
                letterSpacing: 0.2,
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
  leaderboard: SocialLeaderboardItem[];
  p: ReturnType<typeof useAdminPastel>;
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
  onTogglePostLike: (pItem: SocialPostItem) => void;
  onPressCompose: () => void;
  sort: SocialSort;
  rangeDays: number;
  onPickSort: () => void;
  onPickRange: () => void;
  bottomPad: number;
  colors: any;
};

function FeedTab({
  unifiedFeed,
  feed: _feed,
  postFeed: _postFeed,
  leaderboard,
  p,
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
  colors,
}: FeedTabProps) {
  const handleEndReached = useCallback(() => {
    onLoadMoreFeed();
    onLoadMorePosts();
  }, [onLoadMoreFeed, onLoadMorePosts]);

  type ListItem =
    | { _listType: "composer" }
    | { _listType: "team-stats" }
    | { _listType: "filters" }
    | { _listType: "item"; data: FeedItem }
    | { _listType: "empty" }
    | { _listType: "loading" };

  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [
      { _listType: "composer" },
      { _listType: "team-stats" },
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
    ({ item, index }: { item: ListItem; index: number }) => {
      if (item._listType === "composer") {
        return (
          <View style={{ paddingHorizontal: spacing.xl }}>
            <PostComposerRow
              initial={teamInitial}
              onPress={onPressCompose}
              p={p}
            />
          </View>
        );
      }
      if (item._listType === "team-stats") {
        if (leaderboard.length === 0) return null;
        const totalKm = leaderboard.reduce((s, l) => s + l.kmTotal, 0);
        const totalMin = leaderboard.reduce((s, l) => s + l.durationMinutesTotal, 0);
        const activeMembers = leaderboard.filter((l) => l.kmTotal > 0).length;
        return (
          <View style={{ paddingHorizontal: spacing.xl }}>
            <TeamStatsBanner
              totalKm={totalKm}
              totalMinutes={totalMin}
              activeRunners={activeMembers}
              rangeDays={rangeDays}
              p={p}
            />
          </View>
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
              paddingHorizontal: spacing.xl,
            }}
          >
            <FilterPill
              label={rangeDays === 0 ? "All time" : `${rangeDays}d`}
              icon="clock"
              onPress={onPickRange}
              p={p}
            />
            <FilterPill
              label="Sort"
              icon="sliders"
              onPress={onPickSort}
              p={p}
            />
          </View>
        );
      }
      if (item._listType === "loading") {
        return (
          <ActivityIndicator
            color={p.accent}
            style={{ marginVertical: 40 }}
          />
        );
      }
      if (item._listType === "empty") {
        return (
          <EmptyState
            title="Nothing here yet"
            subtitle="When teammates record runs or post updates, they'll appear here."
            p={p}
          />
        );
      }
      // item
      const feedItem = item.data;
      const itemIndex = Math.max(0, index - 3); // offset for header items
      if (feedItem._type === "run") {
        return (
          <Animated.View entering={FadeInDown.delay(Math.min(itemIndex, 10) * 50).springify().damping(15)}>
            <RunCard
              item={feedItem}
              p={p}
              colors={colors}
              onPressComment={() => onPressRunComment(feedItem.runLogId)}
              onToggleLike={() => onToggleRunLike(feedItem)}
              onPressOpen={() => onPressOpenRun(feedItem.runLogId)}
            />
          </Animated.View>
        );
      }
      return (
        <Animated.View entering={FadeInDown.delay(Math.min(itemIndex, 10) * 50).springify().damping(15)}>
          <PostCard
            item={feedItem}
            p={p}
            onPressComment={() => onPressPostComment(feedItem.id)}
            onToggleLike={() => onTogglePostLike(feedItem)}
          />
        </Animated.View>
      );
    },
    [
      colors,
      leaderboard,
      onPickRange,
      onPickSort,
      onPressCompose,
      onPressOpenRun,
      onPressPostComment,
      onPressRunComment,
      onTogglePostLike,
      onToggleRunLike,
      p,
      rangeDays,
      teamInitial,
    ],
  );

  const keyExtractor = useCallback((item: ListItem, _index: number) => {
    if (item._listType === "composer") return "composer";
    if (item._listType === "team-stats") return "team-stats";
    if (item._listType === "filters") return "filters";
    if (item._listType === "loading") return "loading";
    if (item._listType === "empty") return "empty";
    const d = item.data;
    return d._type === "run" ? `run-${d.runLogId}` : `post-${d.id}`;
  }, []);

  return (
    <FlashList
      data={listData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={{
        paddingTop: spacing.sm,
        paddingBottom: bottomPad,
      }}
      showsVerticalScrollIndicator={false}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={p.accent}
        />
      }
      ListFooterComponent={
        feedLoadingMore || postLoadingMore ? (
          <ActivityIndicator
            color={p.accent}
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
  p,
  rangeDays,
  onPickRange,
  onPickSort,
  bottomPad,
  postFeed,
  onPressComment,
}: {
  leaderboard: SocialLeaderboardItem[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  p: ReturnType<typeof useAdminPastel>;
  rangeDays: number;
  onPickRange: () => void;
  onPickSort: () => void;
  bottomPad: number;
  postFeed: SocialPostItem[];
  onPressComment: (item: SocialLeaderboardItem) => void;
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
              icon="clock"
              onPress={onPickRange}
              p={p}
            />
            <FilterPill
              label="Sort"
              icon="arrows"
              onPress={onPickSort}
              p={p}
            />
          </View>
        );
      }
      if (item._listType === "loading") {
        return (
          <ActivityIndicator color={p.accent} style={{ marginVertical: 40 }} />
        );
      }
      if (item._listType === "empty") {
        return (
          <EmptyState
            title="No rankings yet"
            subtitle="Rankings will appear once teammates share runs."
            p={p}
          />
        );
      }
      const commentCount = postFeed.filter(
        (pItem) => pItem.content?.startsWith(`[lb:${item.data.userId}] `) ?? false,
      ).length;
      return (
        <LeaderboardRow
          item={item.data}
          p={p}
          commentCount={commentCount}
          onPressComment={() => onPressComment(item.data)}
        />
      );
    },
    [onPickRange, onPickSort, onPressComment, p, postFeed, rangeDays],
  );

  const keyExtractor = useCallback((item: ListItem) => {
    if (item._listType !== "item") return item._listType;
    return `lb-${item.data.userId}`;
  }, []);

  return (
    <FlashList
      data={listData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.sm,
        paddingBottom: bottomPad,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={p.accent}
        />
      }
    />
  );
}

// ─── SquadTab ────────────────────────────────────────────────────────────────

function SquadTab({
  adults,
  leaderboard,
  loading,
  refreshing,
  onRefresh,
  p,
  bottomPad,
}: {
  adults: { userId: number; name: string; avatarUrl: string | null }[];
  leaderboard: SocialLeaderboardItem[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  p: ReturnType<typeof useAdminPastel>;
  bottomPad: number;
}) {
  const statsByUserId = useMemo(() => {
    const map = new Map<number, SocialLeaderboardItem>();
    for (const l of leaderboard) map.set(l.userId, l);
    return map;
  }, [leaderboard]);
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
          <ActivityIndicator color={p.accent} style={{ marginVertical: 40 }} />
        );
      }
      if (item._listType === "empty") {
        return (
          <EmptyState
            title="No members yet"
            subtitle="Team members will appear here once they join."
            p={p}
          />
        );
      }
      const member = item.data;
      const stats = statsByUserId.get(member.userId);
      return (
        <View
          style={{
            width: "100%",
            backgroundColor: p.cardWhite,
            borderRadius: 22,
            padding: spacing.lg,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <InitialAvatar
              initial={member.name.slice(0, 1).toUpperCase()}
              url={member.avatarUrl}
              size={44}
              p={p}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Outfit-Bold",
                  fontSize: 15,
                  color: p.textPrimary,
                }}
              >
                {member.name}
              </Text>
              {stats ? (
                <Text
                  style={{
                    fontFamily: "Outfit-Regular",
                    fontSize: 12,
                    color: p.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {stats.kmTotal > 0 ? `${stats.kmTotal.toFixed(1)} km this week` : "No runs yet"}
                </Text>
              ) : null}
            </View>
            {stats && stats.rank <= 3 ? (
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor:
                    stats.rank === 1
                      ? p.warningSoft
                      : stats.rank === 2
                        ? p.infoSoft
                        : p.warningSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 14 }}>
                  {stats.rank === 1 ? "🥇" : stats.rank === 2 ? "🥈" : "🥉"}
                </Text>
              </View>
            ) : null}
          </View>
          {stats && stats.kmTotal > 0 ? (
            <View style={{ flexDirection: "row", gap: 16, paddingLeft: 56 }}>
              <View>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textPrimary }}>
                  {stats.durationMinutesTotal}
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 10, color: p.textSecondary }}>
                  min
                </Text>
              </View>
              <View>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textPrimary }}>
                  #{stats.rank}
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 10, color: p.textSecondary }}>
                  rank
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      );
    },
    [p, statsByUserId],
  );

  const keyExtractor = useCallback((item: ListItem) => {
    if (item._listType !== "item") return item._listType;
    return `squad-${item.data.userId}`;
  }, []);

  return (
    <FlashList
      data={listData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.sm,
        paddingBottom: bottomPad,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={p.accent}
        />
      }
    />
  );
}

// ─── RunCard ────────────────────────────────────────────────────────────────

const RunCard = memo(function RunCard({
  item,
  p,
  colors,
  onPressComment,
  onToggleLike,
  onPressOpen,
}: {
  item: SocialRunFeedItem;
  p: ReturnType<typeof useAdminPastel>;
  colors: any;
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
  const dateLabel = relativeTime(item.date);

  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const triggerLikeHaptic = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!item.userLiked) onToggleLike();
  }, [item.userLiked, onToggleLike]);

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((_e, success) => {
      if (success) {
        heartScale.value = 0;
        heartOpacity.value = 1;
        heartScale.value = withSpring(1.2, { damping: 6, stiffness: 200 });
        heartOpacity.value = withDelay(600, withTiming(0, { duration: 300 }));
        runOnJS(triggerLikeHaptic)();
      }
    });

  const singleTap = Gesture.Tap().numberOfTaps(1).onEnd(() => {});
  const composedGesture = Gesture.Exclusive(doubleTap, singleTap);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
    position: "absolute" as const,
    alignSelf: "center" as const,
    top: "40%",
    left: 0,
    right: 0,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    zIndex: 100,
    pointerEvents: "none" as const,
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={{ width: "100%", borderBottomWidth: 0.5, borderBottomColor: p.divider, paddingBottom: 12 }}>
        <Animated.View style={heartStyle} pointerEvents="none">
          <Heart size={80} color="#FF3040" fill="#FF3040" />
        </Animated.View>

        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 10 }}>
          <InitialAvatar initial={item.name.slice(0, 1).toUpperCase()} url={item.avatarUrl} size={34} p={p} />
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textPrimary, flex: 1 }}>{item.name}</Text>
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted }}>{dateLabel}</Text>
        </View>

        <Pressable onPress={onPressOpen} style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}>
          <MiniRunPathPreview points={item.pathPreview} height={280} colors={colors} />
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 18, flex: 1 }}>
            <Pressable onPress={onToggleLike} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} accessibilityLabel={item.userLiked ? "Unlike" : "Like"}>
              <Heart size={26} color={item.userLiked ? "#FF3040" : p.textPrimary} fill={item.userLiked ? "#FF3040" : "none"} />
            </Pressable>
            <Pressable onPress={onPressComment} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} accessibilityLabel="Comment">
              <MessageCircle size={25} color={p.textPrimary} />
            </Pressable>
            <Pressable
              onPress={async () => { await Share.share({ message: `${item.name} ran ${km} km in ${time}` }).catch(() => {}); }}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              accessibilityLabel="Share"
            >
              <Send size={24} color={p.textPrimary} />
            </Pressable>
          </View>
        </View>

        {likeCount > 0 ? (
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textPrimary, paddingHorizontal: 14, paddingTop: 2 }}>
            {likeCount} {likeCount === 1 ? "like" : "likes"}
          </Text>
        ) : null}

        <View style={{ paddingHorizontal: 14, paddingTop: 6 }}>
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textPrimary, lineHeight: 20 }}>
            <Text style={{ fontFamily: "Outfit-Bold" }}>{item.name} </Text>
            ran {km} km in {time} · Pace {pace}
          </Text>
        </View>

        {commentCount > 0 ? (
          <Pressable onPress={onPressComment} hitSlop={6} style={{ paddingHorizontal: 14, paddingTop: 6 }}>
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textMuted }}>
              View all {commentCount} {commentCount === 1 ? "comment" : "comments"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </GestureDetector>
  );
});

// ─── PostCard ────────────────────────────────────────────────────────────────

const PostCard = memo(function PostCard({
  item,
  p,
  onPressComment,
  onToggleLike,
}: {
  item: SocialPostItem;
  p: ReturnType<typeof useAdminPastel>;
  onPressComment: () => void;
  onToggleLike: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const likeCount = item.likeCount ?? 0;
  const commentCount = item.commentCount ?? 0;
  const dateLabel = relativeTime(item.date);
  const isLongText = item.content && item.content.length > 180;

  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const triggerLikeHaptic = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!item.userLiked) onToggleLike();
  }, [item.userLiked, onToggleLike]);

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((_e, success) => {
      if (success) {
        heartScale.value = 0;
        heartOpacity.value = 1;
        heartScale.value = withSpring(1.2, { damping: 6, stiffness: 200 });
        heartOpacity.value = withDelay(600, withTiming(0, { duration: 300 }));
        runOnJS(triggerLikeHaptic)();
      }
    });

  const singleTap = Gesture.Tap().numberOfTaps(1).onEnd(() => {});
  const composedGesture = Gesture.Exclusive(doubleTap, singleTap);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
    position: "absolute" as const,
    alignSelf: "center" as const,
    top: "40%",
    left: 0,
    right: 0,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    zIndex: 100,
    pointerEvents: "none" as const,
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={{ width: "100%", borderBottomWidth: 0.5, borderBottomColor: p.divider, paddingBottom: 12 }}>
        <Animated.View style={heartStyle} pointerEvents="none">
          <Heart size={80} color="#FF3040" fill="#FF3040" />
        </Animated.View>

        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 10 }}>
          <InitialAvatar initial={item.name.slice(0, 1).toUpperCase()} url={item.avatarUrl} size={34} p={p} />
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textPrimary, flex: 1 }}>{item.name}</Text>
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted }}>{dateLabel}</Text>
        </View>

        {item.mediaUrl ? (
          item.mediaType === "video" ? (
            <View style={{ width: "100%", aspectRatio: 1, backgroundColor: p.inputBg, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}>
                <Play size={24} color="#fff" />
              </View>
            </View>
          ) : (
            <Image source={{ uri: item.mediaUrl }} style={{ width: "100%", aspectRatio: 1 }} contentFit="cover" transition={200} />
          )
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 18, flex: 1 }}>
            <Pressable onPress={onToggleLike} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} accessibilityLabel={item.userLiked ? "Unlike" : "Like"}>
              <Heart size={26} color={item.userLiked ? "#FF3040" : p.textPrimary} fill={item.userLiked ? "#FF3040" : "none"} />
            </Pressable>
            <Pressable onPress={onPressComment} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} accessibilityLabel="Comment">
              <MessageCircle size={25} color={p.textPrimary} />
            </Pressable>
            <Pressable
              onPress={async () => { await Share.share({ message: item.content ?? "" }).catch(() => {}); }}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              accessibilityLabel="Share"
            >
              <Send size={24} color={p.textPrimary} />
            </Pressable>
          </View>
        </View>

        {likeCount > 0 ? (
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textPrimary, paddingHorizontal: 14, paddingTop: 2 }}>
            {likeCount} {likeCount === 1 ? "like" : "likes"}
          </Text>
        ) : null}

        {item.content ? (
          <View style={{ paddingHorizontal: 14, paddingTop: 6 }}>
            <Text
              numberOfLines={expanded ? undefined : isLongText ? 2 : undefined}
              style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textPrimary, lineHeight: 20 }}
            >
              <Text style={{ fontFamily: "Outfit-Bold" }}>{item.name} </Text>
              {item.content}
            </Text>
            {isLongText && !expanded ? (
              <Pressable onPress={() => setExpanded(true)} hitSlop={8}>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textMuted, marginTop: 2 }}>more</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {commentCount > 0 ? (
          <Pressable onPress={onPressComment} hitSlop={6} style={{ paddingHorizontal: 14, paddingTop: 6 }}>
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textMuted }}>
              View all {commentCount} {commentCount === 1 ? "comment" : "comments"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </GestureDetector>
  );
});

// ─── LeaderboardRow ─────────────────────────────────────────────────────────

function LeaderboardRow({
  item,
  p,
  commentCount,
  onPressComment,
}: {
  item: SocialLeaderboardItem;
  p: ReturnType<typeof useAdminPastel>;
  commentCount: number;
  onPressComment: () => void;
}) {
  const rankColor =
    item.rank === 1
      ? p.warning
      : item.rank === 2
      ? p.info
      : item.rank === 3
      ? p.warning
      : p.textSecondary;
  const rankBg =
    item.rank === 1
      ? p.warningSoft
      : item.rank === 2
      ? p.infoSoft
      : item.rank === 3
      ? p.warningSoft
      : p.inputBg;

  return (
    <View
      style={{
        width: "100%",
        backgroundColor: p.cardWhite,
        borderRadius: 22,
        padding: spacing.lg,
        gap: 10,
      }}
    >
      {/* Main row */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
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
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: rankColor }}>
            #{item.rank}
          </Text>
        </View>
        <InitialAvatar
          initial={item.name.slice(0, 1).toUpperCase()}
          url={item.avatarUrl}
          size={38}
          p={p}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textPrimary }}>
            {item.name}
          </Text>
          <Text
            style={{
              fontFamily: "Outfit-Regular",
              fontSize: 12,
              color: p.textSecondary,
              marginTop: 1,
            }}
          >
            {item.kmTotal.toFixed(1)} km · {item.durationMinutesTotal} min
          </Text>
        </View>
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: rankColor }}>
          {item.kmTotal.toFixed(1)}
          <Text style={{ fontSize: 11, color: p.textSecondary }}> km</Text>
        </Text>
      </View>

      {/* Comment bar */}
      <Pressable
        onPress={onPressComment}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingVertical: 7,
          paddingHorizontal: 12,
          borderRadius: 100,
          backgroundColor: p.inputBg,
          opacity: pressed ? 0.7 : 1,
          alignSelf: "flex-start",
        })}
      >
        <MessageCircle size={14} color={p.textSecondary} />
        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textSecondary }}>
          {commentCount > 0
            ? `${commentCount} ${commentCount === 1 ? "comment" : "comments"}`
            : "Leave a comment"}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── StatColumn ─────────────────────────────────────────────────────────────

function StatColumn({
  label,
  value,
  p,
}: {
  label: string;
  value: string;
  p: ReturnType<typeof useAdminPastel>;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", paddingVertical: 8 }}>
      <Text
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 17,
          color: p.textPrimary,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: "Outfit-Regular",
          fontSize: 11,
          color: p.textSecondary,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function StatDivider({ p }: { p: ReturnType<typeof useAdminPastel> }) {
  return (
    <View
      style={{
        width: 1,
        marginVertical: 8,
        backgroundColor: p.divider,
      }}
    />
  );
}

// ─── FilterPill ─────────────────────────────────────────────────────────────

function FilterPill({
  label,
  icon,
  onPress,
  p,
}: {
  label: string;
  icon: "clock" | "sliders" | "arrows";
  onPress: () => void;
  p: ReturnType<typeof useAdminPastel>;
}) {
  const IconComponent = icon === "clock" ? Clock : icon === "sliders" ? SlidersHorizontal : ArrowUpDown;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 100,
        backgroundColor: p.inputBg,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <IconComponent size={13} color={p.textSecondary} />
      <Text
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 12,
          color: p.textSecondary,
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
  p,
}: {
  initial: string;
  onPress: () => void;
  p: ReturnType<typeof useAdminPastel>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.92 : 1,
        borderBottomWidth: 0.5,
        borderBottomColor: p.divider,
        paddingVertical: 12,
        paddingHorizontal: 4,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      })}
    >
      <InitialAvatar initial={initial} size={34} p={p} />
      <View
        style={{
          flex: 1,
          height: 38,
          borderRadius: 19,
          borderWidth: 1,
          borderColor: p.divider,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textMuted }}>
          What's on your mind?
        </Text>
        <ImageIcon size={18} color={p.textSecondary} />
      </View>
    </Pressable>
  );
}

// ─── RoundIconButton ────────────────────────────────────────────────────────

function RoundIconButton({
  onPress,
  icon,
  backgroundColor = "transparent",
}: {
  onPress: () => void;
  icon: React.ReactNode;
  backgroundColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor,
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
  p,
}: {
  initial: string;
  size?: number;
  url?: string | null;
  p: ReturnType<typeof useAdminPastel>;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: p.accentSoft,
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
            fontFamily: "Outfit-Bold",
            fontSize: Math.max(12, size * 0.36),
            color: p.accent,
          }}
        >
          {initial}
        </Text>
      )}
    </View>
  );
});

// ─── TeamStatsBanner ────────────────────────────────────────────────────────

function TeamStatsBanner({
  totalKm,
  totalMinutes,
  activeRunners,
  rangeDays,
  p,
}: {
  totalKm: number;
  totalMinutes: number;
  activeRunners: number;
  rangeDays: number;
  p: ReturnType<typeof useAdminPastel>;
}) {
  const rangeLabel = rangeDays === 0 ? "All time" : rangeDays === 7 ? "This week" : `Last ${rangeDays} days`;
  return (
    <View
      style={{
        borderRadius: 22,
        backgroundColor: p.cardWhite,
        padding: 18,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <BarChart3 size={16} color={p.accent} />
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.accent, letterSpacing: 0.5 }}>
          TEAM ACTIVITY · {rangeLabel.toUpperCase()}
        </Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 24, color: p.textPrimary }}>
            {totalKm.toFixed(1)}
          </Text>
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textSecondary, marginTop: 2 }}>
            km total
          </Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 24, color: p.textPrimary }}>
            {totalMinutes >= 60
              ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
              : `${totalMinutes}m`}
          </Text>
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textSecondary, marginTop: 2 }}>
            time
          </Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 24, color: p.textPrimary }}>
            {activeRunners}
          </Text>
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textSecondary, marginTop: 2 }}>
            runners
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── ChallengesTab ──────────────────────────────────────────────────────────

function ChallengesTab({
  leaderboard,
  memberCount,
  loading,
  refreshing,
  onRefresh,
  p,
  bottomPad,
  teamName,
}: {
  leaderboard: SocialLeaderboardItem[];
  memberCount: number;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  p: ReturnType<typeof useAdminPastel>;
  bottomPad: number;
  teamName: string;
}) {
  const totalKm = leaderboard.reduce((s, l) => s + l.kmTotal, 0);
  const activeRunners = leaderboard.filter((l) => l.kmTotal > 0).length;
  const participationPct = memberCount > 0 ? Math.round((activeRunners / memberCount) * 100) : 0;

  const weeklyGoalKm = memberCount * 5;
  const goalProgress = weeklyGoalKm > 0 ? Math.min(1, totalKm / weeklyGoalKm) : 0;

  type ListItem =
    | { _listType: "weekly-goal" }
    | { _listType: "participation" }
    | { _listType: "streaks" }
    | { _listType: "loading" };

  const data: ListItem[] = loading
    ? [{ _listType: "loading" }]
    : [{ _listType: "weekly-goal" }, { _listType: "participation" }, { _listType: "streaks" }];

  const renderChallengeItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item._listType === "loading") {
        return <ActivityIndicator color={p.accent} style={{ marginVertical: 40 }} />;
      }

      if (item._listType === "weekly-goal") {
        return (
          <View
            style={{
              backgroundColor: p.cardWhite,
              borderRadius: 22,
              padding: 20,
              gap: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: p.warningSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trophy size={22} color={p.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 17, color: p.textPrimary }}>
                  Weekly Team Goal
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textSecondary, marginTop: 2 }}>
                  {teamName} · {weeklyGoalKm} km target
                </Text>
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.textPrimary }}>
                  {totalKm.toFixed(1)} / {weeklyGoalKm} km
                </Text>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.accent }}>
                  {Math.round(goalProgress * 100)}%
                </Text>
              </View>
              <View
                style={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: p.inputBg,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${Math.round(goalProgress * 100)}%`,
                    borderRadius: 5,
                    backgroundColor: p.accent,
                  }}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-around", paddingTop: 4 }}>
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 20, color: p.textPrimary }}>
                  {totalKm.toFixed(1)}
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 10, color: p.textSecondary }}>km total</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 20, color: p.textPrimary }}>
                  {activeRunners}
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 10, color: p.textSecondary }}>runners</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 20, color: p.textPrimary }}>
                  {leaderboard.length}
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 10, color: p.textSecondary }}>members</Text>
              </View>
            </View>
          </View>
        );
      }

      if (item._listType === "participation") {
        return (
          <View
            style={{
              backgroundColor: p.cardWhite,
              borderRadius: 22,
              padding: 20,
              gap: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: p.infoSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users size={18} color={p.info} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: p.textPrimary }}>
                  Team Participation
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textSecondary }}>
                  {activeRunners} of {memberCount} members active
                </Text>
              </View>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 22, color: p.info }}>
                {participationPct}%
              </Text>
            </View>
            <View
              style={{
                height: 8,
                borderRadius: 4,
                backgroundColor: p.inputBg,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${participationPct}%`,
                  borderRadius: 4,
                  backgroundColor: p.info,
                }}
              />
            </View>
          </View>
        );
      }

      // streaks - show top 5 performers
      const top5 = leaderboard.filter((l) => l.kmTotal > 0).slice(0, 5);
      if (top5.length === 0) {
        return (
          <EmptyState
            title="No activity yet"
            subtitle="Start running to see team challenges!"
            p={p}
          />
        );
      }
      return (
        <View
          style={{
            backgroundColor: p.cardWhite,
            borderRadius: 22,
            padding: 20,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: p.dangerSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Flame size={18} color={p.danger} />
            </View>
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: p.textPrimary }}>
              Top Performers
            </Text>
          </View>
          {top5.map((athlete, i) => (
            <View
              key={athlete.userId}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  fontFamily: "Outfit-Bold",
                  fontSize: 14,
                  color: i === 0 ? p.warning : i === 1 ? p.info : i === 2 ? p.warning : p.textSecondary,
                  width: 22,
                }}
              >
                #{i + 1}
              </Text>
              <InitialAvatar
                initial={athlete.name.slice(0, 1).toUpperCase()}
                url={athlete.avatarUrl}
                size={34}
                p={p}
              />
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textPrimary, flex: 1 }}>
                {athlete.name}
              </Text>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.accent }}>
                {athlete.kmTotal.toFixed(1)} km
              </Text>
            </View>
          ))}
        </View>
      );
    },
    [activeRunners, goalProgress, leaderboard, memberCount, p, participationPct, teamName, totalKm, weeklyGoalKm],
  );

  return (
    <FlashList
      data={data}
      keyExtractor={(item) => item._listType}
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.sm,
        paddingBottom: bottomPad,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={p.accent} />
      }
      renderItem={renderChallengeItem}
    />
  );
}

// ─── EmptyState ─────────────────────────────────────────────────────────────

function EmptyState({
  title,
  subtitle,
  p,
}: {
  title: string;
  subtitle: string;
  p: ReturnType<typeof useAdminPastel>;
}) {
  return (
    <View
      style={{
        width: "100%",
        backgroundColor: p.cardWhite,
        borderRadius: 22,
        padding: spacing.xl,
        alignItems: "center",
        gap: spacing.sm,
      }}
    >
      <Text
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 17,
          color: p.textPrimary,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: "Outfit-Regular",
          fontSize: 13,
          color: p.textSecondary,
          textAlign: "center",
          lineHeight: 19,
        }}
      >
        {subtitle}
      </Text>
    </View>
  );
}
