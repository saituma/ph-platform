import React, { useCallback, useEffect, useMemo, useState, memo } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";

import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { spacing, radius, Shadows, fonts } from "@/constants/theme";
import { trackingScrollBottomPad } from "@/lib/tracking/mainTabBarInset";
import { shouldUseTeamTrackingFeatures } from "@/lib/tracking/teamTrackingGate";
import { MiniRunPathPreview } from "@/components/tracking/social/MiniRunPathPreview";
import { TeamLiveMap } from "@/components/tracking/social/TeamLiveMap";
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
import { fetchTeamLocations, type UserLocation } from "@/services/tracking/locationService";
import { formatDurationClock, formatDistanceKm } from "@/lib/tracking/runUtils";

type SectionKey = "overview" | "live" | "events" | "activities" | "stats" | "posts";

const TEAM_SECTIONS: Array<{ key: SectionKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "posts", label: "Posts", icon: "chatbubbles-outline" },
  { key: "activities", label: "Runs", icon: "pulse-outline" },
  { key: "stats", label: "Squad", icon: "bar-chart-outline" },
];

export default function TrackingSocialScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const token = useAppSelector((s) => s.user.token);
  const appRole = useAppSelector((s) => s.user.appRole);
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

  const teamName = (authTeamMembership?.team ?? "Team").trim() || "Team";
  const teamInitial = teamName.slice(0, 1).toUpperCase();
  const safeTop = Math.max(insets.top, 18);

  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const [leaderboard, setLeaderboard] = useState<SocialLeaderboardItem[]>([]);
  const [adults, setAdults] = useState<
    { userId: number; name: string; avatarUrl: string | null }[]
  >([]);
  const [feed, setFeed] = useState<SocialRunFeedItem[]>([]);
  const [postFeed, setPostFeed] = useState<SocialPostItem[]>([]);
  const [teamLocations, setTeamLocations] = useState<UserLocation[]>([]);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(
    null,
  );

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
  const [section, setSection] = useState<SectionKey>("posts");

  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : colors.border;
  const cardBg = isDark ? colors.cardElevated : colors.backgroundSecondary;

  const canLoad = token != null;

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
        limit: 25,
        cursor: null,
        windowDays: rangeDays,
        sort,
        useTeamFeed,
      });
      setFeed(res.items ?? []);
    } finally {
      setFeedLoading(false);
    }
  }, [rangeDays, sort, token, useTeamFeed]);

  const loadPosts = useCallback(async () => {
    if (!token) return;
    setPostLoading(true);
    try {
      const res = await fetchPostFeed(token, { limit: 25, cursor: null, useTeamFeed });
      setPostFeed(res.items ?? []);
    } finally {
      setPostLoading(false);
    }
  }, [token, useTeamFeed]);

  const loadSettings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetchPrivacySettings(token);
      setPrivacySettings(res.settings);
    } catch {
      setPrivacySettings(null);
    }
  }, [token]);

  const loadTeamLocations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetchTeamLocations(token);
      setTeamLocations(res.locations ?? []);
    } catch {
      // silent
    }
  }, [token]);

  const loadCommunity = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Fetch core overview data in parallel
      await Promise.all([
        loadLeaderboard(),
        loadFeed(),
        loadPosts(),
        fetchAdultDirectory(token, { limit: 24, cursor: null, useTeamFeed }).then(d => setAdults(d.items ?? [])),
        fetchTeamLocations(token).then(l => setTeamLocations(l.locations ?? [])),
      ]);
    } catch (e: any) {
      Alert.alert("Couldn't load team", String(e?.message ?? "Error"));
    } finally {
      setLoading(false);
    }
  }, [loadFeed, loadLeaderboard, loadPosts, token, useTeamFeed]);

  const toggleLike = useCallback(
    async (r: SocialRunFeedItem) => {
      if (!token) return;
      // Optimistic update
      const oldFeed = [...feed];
      setFeed(feed.map(item =>
        item.runLogId === r.runLogId
          ? {
              ...item,
              userLiked: !item.userLiked,
              likeCount: (item.likeCount ?? 0) + (item.userLiked ? -1 : 1)
            }
          : item
      ));

      try {
        if (r.userLiked) {
          await unlikeRun(token, r.runLogId, { useTeamFeed });
        } else {
          await likeRun(token, r.runLogId, { useTeamFeed });
        }
      } catch (e: any) {
        setFeed(oldFeed); // Rollback
        Alert.alert("Error", String(e?.message ?? "Error"));
      }
    },
    [feed, token, useTeamFeed],
  );

  const onTogglePostLike = useCallback(
    async (post: SocialPostItem) => {
      if (!token) return;
      // Optimistic update
      const oldPostFeed = [...postFeed];
      setPostFeed(postFeed.map(item =>
        item.id === post.id
          ? {
              ...item,
              userLiked: !item.userLiked,
              likeCount: item.likeCount + (item.userLiked ? -1 : 1)
            }
          : item
      ));

      try {
        if (post.userLiked) {
          await unlikeSocialPost(token, post.id, { useTeamFeed });
        } else {
          await likeSocialPost(token, post.id, { useTeamFeed });
        }
      } catch (e: any) {
        setPostFeed(oldPostFeed); // Rollback
        Alert.alert("Error", String(e?.message ?? "Error"));
      }
    },
    [postFeed, token, useTeamFeed],
  );

  const load = useCallback(() => {
    void loadSettings();
    void loadCommunity();
  }, [loadCommunity, loadSettings]);

  useEffect(() => {
    if (!canLoad) return;
    load();
  }, [canLoad, load]);

  useEffect(() => {
    if (!token) return;
    if (useTeamFeed) return;
    router.replace("/(tabs)/tracking" as any);
  }, [router, token, useTeamFeed]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      void loadTeamLocations();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadTeamLocations, token]);

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

  const openComments = useCallback((runLogId: number) => {
    setActiveRunLogId(runLogId);
    setCommentsOpen(true);
  }, []);

  const openPostComments = useCallback((postId: number) => {
    setActivePostId(postId);
    setPostCommentsOpen(true);
  }, []);

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
                  Alert.alert(
                    "Error",
                    String(e?.message ?? "Could not update settings"),
                  );
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
                  const res = await updatePrivacySettings(token, {
                    socialEnabled: false,
                  });
                  setPrivacySettings(res.settings);
                } catch (e: any) {
                  Alert.alert(
                    "Error",
                    String(e?.message ?? "Could not update settings"),
                  );
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

  const updateSetting = useCallback(
    async (key: keyof PrivacySettings, value: boolean) => {
      if (!token) return;
      setSettingsLoading(true);
      try {
        const res = await updatePrivacySettings(token, { [key]: value });
        setPrivacySettings(res.settings);
      } catch (e: any) {
        Alert.alert("Error", String(e?.message ?? "Could not update settings"));
      } finally {
        setSettingsLoading(false);
      }
    },
    [token],
  );

  const memberCount = useMemo(() => {
    const n = Math.max(adults.length, leaderboard.length);
    return n > 0 ? n : 0;
  }, [adults.length, leaderboard.length]);
  const liveCount = teamLocations.length;
  const latestLeaderboard = leaderboard[0] ?? null;
  const previewMembers = useMemo(() => adults.slice(0, 5), [adults]);
  const photoPostCount = useMemo(
    () => postFeed.filter((post) => post.mediaType === "image" && !!post.mediaUrl).length,
    [postFeed],
  );
  const latestPoster = postFeed[0]?.name?.split(" ")[0] ?? "You";

  const events = useMemo(() => {
    const nextSunday = (() => {
      const d = new Date();
      const day = d.getDay(); // 0 Sun
      const daysUntilSunday = (7 - day) % 7;
      const n = new Date(d);
      n.setDate(n.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
      n.setHours(9, 0, 0, 0);
      return n;
    })();

    const mk = (title: string, km: string, dt: Date) => ({
      title,
      km,
      date: dt,
      timeLabel: "9:00 AM · Social",
      note: "Don't forget to RSVP",
    });

    return [
      mk(`${teamInitial} weekly 5km`, "5km", nextSunday),
      mk(`${teamInitial} weekly 10km`, "10km", nextSunday),
    ];
  }, [teamInitial]);

  const shareTeam = useCallback(async () => {
    const message = `${teamName} · Team Tracking`;
    await Share.share({ message }).catch(() => {});
  }, [teamName]);

  const handleBack = useCallback(() => {
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)/tracking" as any);
  }, [router]);

  const openSettings = useCallback(() => {
    router.push("/(tabs)/tracking/team-settings" as any);
  }, [router]);

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: safeTop,
          paddingBottom: trackingScrollBottomPad(insets),
        }}
      >
        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
          <LinearGradient
            colors={isDark ? ["#10161A", "#14142A", "#0A0A12"] : ["#F4FFF7", "#EFF6FF", "#FFFFFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderBottomLeftRadius: radius.xxl,
              borderBottomRightRadius: radius.xxl,
              borderWidth: 1,
              borderColor: cardBorder,
              padding: spacing.xl,
              gap: spacing.lg,
              overflow: "hidden",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <RoundIconButton
                onPress={handleBack}
                icon={<Ionicons name="arrow-back" size={20} color={colors.textPrimary} />}
                backgroundColor={isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.92)"}
                borderColor={isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"}
              />
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <RoundIconButton
                  onPress={shareTeam}
                  icon={<Ionicons name="share-social-outline" size={18} color={colors.textPrimary} />}
                  backgroundColor={isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.92)"}
                  borderColor={isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"}
                />
                <RoundIconButton
                  onPress={openSettings}
                  icon={<Ionicons name="settings-outline" size={18} color={colors.textPrimary} />}
                  backgroundColor={isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.92)"}
                  borderColor={isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: spacing.lg, alignItems: "flex-start" }}>
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 20,
                  backgroundColor: "rgba(34,197,94,0.14)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(34,197,94,0.18)",
                }}
              >
                <Text style={{ fontFamily: fonts.heading2, fontSize: 24, color: colors.textPrimary }}>
                  {teamInitial}
                </Text>
              </View>

              <View style={{ flex: 1, gap: spacing.sm }}>
                <View
                  style={{
                    alignSelf: "flex-start",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: radius.pill,
                    backgroundColor: isDark ? "rgba(200,241,53,0.12)" : "#DCFCE7",
                  }}
                >
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: colors.accent }}>
                    TEAM FEED
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: fonts.heading2,
                    fontSize: 28,
                    color: colors.textPrimary,
                  }}
                >
                  {teamName}
                </Text>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary }}>
                  Posts, photos, and team energy.
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 2 }}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary }}>
                    {memberCount} members
                  </Text>
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: colors.textDim,
                    }}
                  />
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary }}>
                    {liveCount} live
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.86)",
                borderRadius: radius.xxl,
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
                padding: spacing.lg,
                gap: spacing.lg,
              }}
            >
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <TeamSummaryMetric label="Posts" value={`${postFeed.length}`} sublabel="feed" />
                <TeamSummaryMetric label="Photos" value={`${photoPostCount}`} sublabel="media" />
                <TeamSummaryMetric
                  label="Last"
                  value={latestPoster}
                  sublabel={postFeed.length > 0 ? "posted" : "empty"}
                />
              </View>

              {previewMembers.length > 0 ? (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {previewMembers.map((member, index) => (
                      <View key={member.userId} style={{ marginLeft: index === 0 ? 0 : -10 }}>
                        <InitialAvatar
                          initial={member.name.slice(0, 1).toUpperCase()}
                          url={member.avatarUrl}
                          size={34}
                        />
                      </View>
                    ))}
                  </View>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary }}>
                    Active now
                  </Text>
                </View>
              ) : null}
            </View>
          </LinearGradient>

          {privacySettings?.socialEnabled === false ? (
            <View
              style={{
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: cardBorder,
                borderRadius: radius.xxl,
                padding: spacing.xl,
                gap: spacing.lg,
              }}
            >
              <Text style={{ fontFamily: fonts.heading2, fontSize: 20, color: colors.textPrimary }}>
                Team feed is private
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                Enable team features to post, see activities, and join leaderboards.
              </Text>
              <Pressable
                onPress={() => handleToggleSocialEnabled(true)}
                style={({ pressed }) => ({
                  height: 48,
                  borderRadius: radius.pill,
                  backgroundColor: colors.accent,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.9 : 1,
                })}
                >
                  <Text style={{ fontFamily: fonts.heading3, fontSize: 15, color: "#07070F" }}>
                    Enable team features
                  </Text>
                </Pressable>
              </View>
          ) : null}

          {privacySettings?.socialEnabled !== false ? (
            <PostComposerRow
              initial={teamInitial}
              onPress={() => setComposerOpen(true)}
              colors={colors}
              cardBg={cardBg}
              cardBorder={cardBorder}
            />
          ) : null}

          <TeamSectionTabs
            items={TEAM_SECTIONS}
            activeKey={section}
            onChange={setSection}
            colors={colors}
            cardBg={cardBg}
            cardBorder={cardBorder}
          />

          <View style={{ gap: spacing.lg }}>
            {section === "overview" ? (
              <>
                <View
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: radius.xxl,
                    borderWidth: 1,
                    borderColor: cardBorder,
                    padding: spacing.xl,
                    gap: spacing.lg,
                  }}
                >
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.accent }}>
                      CLUB THIS WEEK
                    </Text>
                    <Text style={{ fontFamily: fonts.heading2, fontSize: 28, color: colors.textPrimary }}>
                      {leaderboard.reduce((sum, entry) => sum + entry.kmTotal, 0).toFixed(1)} km together
                    </Text>
                    <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary }}>
                      {feed.length} shared runs in the last {rangeDays === 0 ? "all time" : `${rangeDays} days`}.
                    </Text>
                  </View>

                  <View
                    style={{
                      borderRadius: radius.xl,
                      backgroundColor: colors.surfaceHigh,
                      borderWidth: 1,
                      borderColor: cardBorder,
                      padding: spacing.lg,
                      gap: spacing.lg,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ gap: 4 }}>
                        <Text style={{ fontFamily: fonts.heading3, fontSize: 18, color: colors.textPrimary }}>
                          Live club map
                        </Text>
                        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary }}>
                          Last 2 hours of shared activity
                        </Text>
                      </View>
                      <Pressable onPress={loadTeamLocations} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
                        <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
                      </Pressable>
                    </View>

                    {teamLocations.length > 0 ? (
                      <TeamLiveMap locations={teamLocations} colors={colors} isDark={isDark} />
                    ) : (
                      <EmptyState
                        title="No one live right now"
                        subtitle="Teammates appear here when they start a run with live sharing enabled."
                        colors={colors}
                        cardBg={colors.background}
                        cardBorder={cardBorder}
                      />
                    )}
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: spacing.lg }}>
                  <OverviewStatCard
                    title="Next up"
                    lines={
                      events[0]
                        ? [events[0].title, events[0].timeLabel, events[0].note]
                        : ["No events planned yet."]
                    }
                    cardBg={cardBg}
                    cardBorder={cardBorder}
                    colors={colors}
                  />
                  <OverviewStatCard
                    title="Leaderboard"
                    lines={
                      latestLeaderboard
                        ? [
                            latestLeaderboard.name,
                            `${latestLeaderboard.kmTotal.toFixed(1)} km · ${latestLeaderboard.durationMinutesTotal} min`,
                            `#${latestLeaderboard.rank}`,
                          ]
                        : ["No leaderboard data yet."]
                    }
                    cardBg={cardBg}
                    cardBorder={cardBorder}
                    colors={colors}
                    accentLastLine={Boolean(latestLeaderboard)}
                    loading={leaderboardLoading}
                  />
                </View>

                <SectionPreviewCard
                  title="Recent activity"
                  actionLabel="See all"
                  onPressAction={() => setSection("activities")}
                  colors={colors}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                >
                  {feed.slice(0, 2).map((r) => (
                    <CompactListRow
                      key={r.runLogId}
                      title={r.name}
                      subtitle={`${formatDistanceKm(r.distanceMeters, 2)} km · ${formatDurationClock(r.durationSeconds ?? 0)}`}
                      rightLabel={new Date(r.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      colors={colors}
                    />
                  ))}
                  {!feedLoading && feed.length === 0 ? (
                    <Text style={{ color: colors.textSecondary }}>No activity yet.</Text>
                  ) : null}
                </SectionPreviewCard>

                <SectionPreviewCard
                  title="Posts"
                  actionLabel="Open posts"
                  onPressAction={() => setSection("posts")}
                  colors={colors}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                >
                  {postFeed.slice(0, 2).map((post) => (
                    <CompactListRow
                      key={post.id}
                      title={post.name}
                      subtitle={post.content}
                      rightLabel={new Date(post.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      colors={colors}
                      truncateSubtitle
                    />
                  ))}
                  {!postLoading && postFeed.length === 0 ? (
                    <Text style={{ color: colors.textSecondary }}>No posts yet.</Text>
                  ) : null}
                </SectionPreviewCard>
              </>
            ) : null}

            {section === "live" ? (
              <View
                style={{
                  backgroundColor: cardBg,
                  borderRadius: radius.xxl,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  padding: spacing.xl,
                  gap: spacing.lg,
                }}
              >
                <RowHeader
                  title="Live team map"
                  right={
                    <Pressable onPress={loadTeamLocations} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
                      <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
                    </Pressable>
                  }
                  colors={colors}
                />
                {teamLocations.length > 0 ? (
                  <>
                    <TeamLiveMap locations={teamLocations} colors={colors} isDark={isDark} />
                    <View style={{ gap: spacing.md }}>
                      {teamLocations.map((location) => (
                        <CompactListRow
                          key={location.userId}
                          title={location.name}
                          subtitle="Live location shared"
                          rightLabel="Now"
                          colors={colors}
                        />
                      ))}
                    </View>
                  </>
                ) : (
                  <EmptyState
                    title="No one live right now"
                    subtitle="Teammates appear here when they start a run with live sharing enabled."
                    colors={colors}
                    cardBg={colors.surfaceHigh}
                    cardBorder={cardBorder}
                  />
                )}
              </View>
            ) : null}

            {section === "events" ? (
              <View style={{ gap: spacing.lg }}>
                {events.map((event) => (
                  <InfoCard
                    key={event.title}
                    title={event.title}
                    subtitle={`${event.km} · ${event.timeLabel}`}
                    note={event.note}
                    colors={colors}
                    cardBg={cardBg}
                    cardBorder={cardBorder}
                  />
                ))}
              </View>
            ) : null}

            {section === "activities" ? (
              <>
                <RowHeader
                  title="Activity"
                  right={
                    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                      <Pressable onPress={pickRange} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, flexDirection: "row", alignItems: "center", gap: 6 })}>
                        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                        <Text style={{ color: colors.textSecondary, fontFamily: fonts.bodyBold }}>
                          {rangeDays === 0 ? "All time" : `${rangeDays} days`}
                        </Text>
                      </Pressable>
                      <Pressable onPress={pickSort} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
                        <Ionicons name="options-outline" size={18} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  }
                  colors={colors}
                />

                {feedLoading && feed.length === 0 ? (
                  <ActivityIndicator color={colors.accent} style={{ marginVertical: 20 }} />
                ) : (
                  <View style={{ gap: 16 }}>
                    {feed.map((r) => (
                      <TeamRunPostCard
                        key={r.runLogId}
                        item={r}
                        colors={colors}
                        cardBg={cardBg}
                        cardBorder={cardBorder}
                        onPressComment={() => openComments(r.runLogId)}
                        onToggleLike={() => void toggleLike(r)}
                        onPressOpen={() =>
                          router.push({
                            pathname: "/(tabs)/tracking/run-path/[runLogId]" as any,
                            params: { runLogId: String(r.runLogId) },
                          } as any)
                        }
                      />
                    ))}
                    {!feedLoading && feed.length === 0 ? (
                      <EmptyState title="No activity yet" subtitle="When teammates record runs, they will show up here." colors={colors} cardBg={cardBg} cardBorder={cardBorder} />
                    ) : null}
                  </View>
                )}
              </>
            ) : null}

            {section === "stats" ? (
              <>
                <RowHeader
                  title="Leaderboard"
                  right={
                    <Pressable onPress={pickLeaderboardSort} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
                      <Ionicons name="swap-vertical-outline" size={18} color={colors.textSecondary} />
                    </Pressable>
                  }
                  colors={colors}
                />
                <View style={{ gap: spacing.md }}>
                  {leaderboardLoading && leaderboard.length === 0 ? (
                    <ActivityIndicator color={colors.accent} style={{ marginVertical: 20 }} />
                  ) : leaderboard.length > 0 ? (
                    leaderboard.map((entry) => (
                      <LeaderboardRow
                        key={entry.userId}
                        item={entry}
                        colors={colors}
                        cardBg={cardBg}
                        cardBorder={cardBorder}
                      />
                    ))
                  ) : (
                    <EmptyState
                      title="No leaderboard data yet"
                      subtitle="Ranking will show up once teammates share runs."
                      colors={colors}
                      cardBg={cardBg}
                      cardBorder={cardBorder}
                    />
                  )}
                </View>
              </>
            ) : null}

            {section === "posts" ? (
              <>
                <RowHeader
                  title="Team posts"
                  right={
                    <Pressable
                      onPress={() => setComposerOpen(true)}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.75 : 1,
                        height: 34,
                        paddingHorizontal: 12,
                        borderRadius: radius.pill,
                        backgroundColor: colors.surfaceHigh,
                        borderWidth: 1,
                        borderColor: cardBorder,
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                        gap: 6,
                      })}
                    >
                      <Ionicons name="add" size={16} color={colors.textPrimary} />
                      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary }}>
                        New
                      </Text>
                    </Pressable>
                  }
                  colors={colors}
                />

                {postLoading && postFeed.length === 0 ? (
                  <ActivityIndicator color={colors.accent} style={{ marginVertical: 30 }} />
                ) : (
                  <View style={{ gap: 16 }}>
                    {postFeed.length === 0 && !postLoading ? (
                      <EmptyState
                        title="No posts yet"
                        subtitle="Be the first to share something with the team!"
                        colors={colors}
                        cardBg={cardBg}
                        cardBorder={cardBorder}
                      />
                    ) : (
                      postFeed.map((post) => (
                        <TeamPostCard
                          key={post.id}
                          item={post}
                          colors={colors}
                          cardBg={cardBg}
                          cardBorder={cardBorder}
                          onPressComment={() => openPostComments(post.id)}
                          onToggleLike={() => void onTogglePostLike(post)}
                          onPressOpen={() => {}}
                        />
                      ))
                    )}
                  </View>
                )}
              </>
            ) : null}
          </View>
        </View>
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>

      {activeRunLogId != null && token != null && (
        <CommentsSheet
          open={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          token={token}
          runLogId={activeRunLogId}
          runOwnerName={feed.find((r) => r.runLogId === activeRunLogId)?.name ?? null}
          useTeamFeed={useTeamFeed}
        />
      )}

      {activePostId != null && token != null && (
        <PostCommentsSheet
          open={postCommentsOpen}
          onClose={() => setPostCommentsOpen(false)}
          token={token}
          postId={activePostId}
          postOwnerName={postFeed.find((post) => post.id === activePostId)?.name ?? null}
          useTeamFeed={useTeamFeed}
          onChanged={loadPosts}
        />
      )}

      {token != null && (
        <PostComposerSheet
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          token={token}
          useTeamFeed={useTeamFeed}
          onPostCreated={loadCommunity}
        />
      )}
    </View>
  );
}

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
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor,
        borderWidth: 1,
        borderColor,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {icon}
    </Pressable>
  );
}

function TeamSummaryMetric({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(34,197,94,0.05)",
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: "rgba(34,197,94,0.08)",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        gap: 4,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.labelCaps,
          fontSize: 10,
          color: "#86EFAC",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: fonts.bodyBold,
          fontSize: 15,
          color: "#F4F6F4",
        }}
      >
        {value}
      </Text>
      {sublabel ? (
        <Text
          style={{
            fontFamily: fonts.bodyMedium,
            fontSize: 11,
            color: "rgba(244,246,244,0.72)",
          }}
        >
          {sublabel}
        </Text>
      ) : null}
    </View>
  );
}

function OverviewStatCard({
  title,
  lines,
  cardBg,
  cardBorder,
  colors,
  accentLastLine = false,
  loading = false,
}: {
  title: string;
  lines: string[];
  cardBg: string;
  cardBorder: string;
  colors: any;
  accentLastLine?: boolean;
  loading?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: cardBg,
        borderRadius: radius.xxl,
        borderWidth: 1,
        borderColor: cardBorder,
        padding: spacing.xl,
        gap: spacing.md,
      }}
    >
      <Text style={{ fontFamily: fonts.heading3, fontSize: 18, color: colors.textPrimary }}>
        {title}
      </Text>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        lines.map((line, index) => (
          <Text
            key={`${title}-${index}`}
            style={{
              fontFamily: index === 0 ? fonts.bodyBold : fonts.bodyMedium,
              fontSize: index === 2 ? 16 : 13,
              color:
                accentLastLine && index === lines.length - 1
                  ? colors.accent
                  : index === 0
                    ? colors.textPrimary
                    : index === lines.length - 1
                      ? colors.textDim
                      : colors.textSecondary,
            }}
          >
            {line}
          </Text>
        ))
      )}
    </View>
  );
}

function SectionPreviewCard({
  title,
  actionLabel,
  onPressAction,
  colors,
  cardBg,
  cardBorder,
  children,
}: {
  title: string;
  actionLabel: string;
  onPressAction: () => void;
  colors: any;
  cardBg: string;
  cardBorder: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: cardBg,
        borderRadius: radius.xxl,
        borderWidth: 1,
        borderColor: cardBorder,
        padding: spacing.xl,
        gap: spacing.lg,
      }}
    >
      <RowHeader
        title={title}
        right={
          <Pressable onPress={onPressAction} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
            <Text style={{ fontFamily: fonts.bodyBold, color: colors.accent }}>{actionLabel}</Text>
          </Pressable>
        }
        colors={colors}
      />
      <View style={{ gap: spacing.md }}>{children}</View>
    </View>
  );
}

function CompactListRow({
  title,
  subtitle,
  rightLabel,
  colors,
  truncateSubtitle = false,
}: {
  title: string;
  subtitle: string;
  rightLabel: string;
  colors: any;
  truncateSubtitle?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "flex-start" }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontFamily: fonts.bodyBold, color: colors.textPrimary }}>{title}</Text>
        <Text
          numberOfLines={truncateSubtitle ? 2 : undefined}
          style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary }}
        >
          {subtitle}
        </Text>
      </View>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textDim }}>
        {rightLabel}
      </Text>
    </View>
  );
}

function InfoCard({
  title,
  subtitle,
  note,
  colors,
  cardBg,
  cardBorder,
}: {
  title: string;
  subtitle: string;
  note: string;
  colors: any;
  cardBg: string;
  cardBorder: string;
}) {
  return (
    <View
      style={{
        backgroundColor: cardBg,
        borderRadius: radius.xxl,
        borderWidth: 1,
        borderColor: cardBorder,
        padding: spacing.xl,
        gap: spacing.sm,
      }}
    >
      <Text style={{ fontFamily: fonts.heading3, fontSize: 18, color: colors.textPrimary }}>
        {title}
      </Text>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary }}>
        {subtitle}
      </Text>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textDim }}>
        {note}
      </Text>
    </View>
  );
}

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
  return (
    <View
      style={{
        backgroundColor: cardBg,
        borderRadius: radius.xxl,
        borderWidth: 1,
        borderColor: cardBorder,
        padding: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: "rgba(34,197,94,0.14)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontFamily: fonts.bodyBold, color: colors.accent }}>#{item.rank}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.bodyBold, color: colors.textPrimary }}>{item.name}</Text>
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary }}>
          {item.kmTotal.toFixed(1)} km · {item.durationMinutesTotal} min
        </Text>
      </View>
    </View>
  );
}

function RowHeader({
  title,
  right,
  colors,
}: {
  title: string;
  right?: React.ReactNode;
  colors: any;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ fontFamily: fonts.heading2, fontSize: 22, color: colors.textPrimary }}>
        {title}
      </Text>
      {right ?? null}
    </View>
  );
}

function PostComposerRow({
  initial,
  onPress,
  colors,
  cardBg,
  cardBorder,
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
        borderRadius: radius.xxl,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <LinearGradient
        colors={["rgba(200,241,53,0.16)", "rgba(123,97,255,0.12)", "rgba(255,255,255,0.02)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: radius.xxl,
          padding: 1,
        }}
      >
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: radius.xxl,
            paddingVertical: 12,
            paddingHorizontal: spacing.lg,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
          }}
        >
          <InitialAvatar initial={initial} size={38} />
          <View
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: radius.xl,
              backgroundColor: colors.surfaceHigh,
              paddingHorizontal: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary }}>
              Share with the team
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="image-outline" size={18} color={colors.textSecondary} />
              <Ionicons name="add-circle" size={18} color={colors.accent} />
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const TeamRunPostCard = memo(({
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
}) => {
  const km = formatDistanceKm(item.distanceMeters, 2);
  const time = formatDurationClock(item.durationSeconds ?? 0);
  const pace =
    item.avgPace != null && Number.isFinite(item.avgPace)
      ? `${item.avgPace.toFixed(2)} /km`
      : "—";
  const likeCount = item.likeCount ?? 0;
  const dateLabel = new Date(item.date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <View
      style={{
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: cardBorder,
        borderRadius: radius.xxl,
        overflow: "hidden",
      }}
    >
      <View style={{ padding: spacing.xl, paddingBottom: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
          <InitialAvatar initial={item.name.slice(0, 1).toUpperCase()} url={item.avatarUrl} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 17, color: colors.textPrimary }}>
              {item.name}
            </Text>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary }}>
              {dateLabel}
            </Text>
          </View>
        </View>
      </View>

      <Pressable onPress={onPressOpen} style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}>
        <MiniRunPathPreview points={item.pathPreview} height={220} colors={colors} />
      </Pressable>

      <View style={{ padding: spacing.xl, paddingTop: spacing.lg, gap: spacing.md }}>
        <Text style={{ fontFamily: fonts.heading3, fontSize: 20, color: colors.textPrimary }}>
          {km} km
        </Text>
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary }}>
          {time} · {pace}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <StackedAvatars />
            <Text style={{ fontFamily: fonts.bodyMedium, color: colors.textSecondary }}>
              {likeCount} gave kudos
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm }}>
          <Pressable
            onPress={onToggleLike}
            style={({ pressed }) => ({
              width: 60,
              height: 48,
              borderRadius: radius.xl,
              backgroundColor: colors.surfaceHigh,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
            })}
            accessibilityLabel="Kudos"
          >
            <Ionicons
              name={item.userLiked ? "heart" : "heart-outline"}
              size={26}
              color={item.userLiked ? colors.accent : colors.textPrimary}
            />
          </Pressable>

          <Pressable
            onPress={onPressComment}
            style={({ pressed }) => ({
              width: 60,
              height: 48,
              borderRadius: radius.xl,
              backgroundColor: colors.surfaceHigh,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
            })}
            accessibilityLabel="Comments"
          >
            <Ionicons name="chatbubble-outline" size={24} color={colors.textPrimary} />
          </Pressable>

          <View style={{ flex: 1 }} />

          <Pressable
            onPress={onPressOpen}
            style={({ pressed }) => ({
              height: 48,
              borderRadius: radius.xl,
              backgroundColor: "rgba(34,197,94,0.14)",
              borderWidth: 1,
              borderColor: "rgba(34,197,94,0.18)",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: spacing.xl,
              opacity: pressed ? 0.85 : 1,
              flexDirection: "row",
              gap: 8,
            })}
          >
            <Text style={{ fontFamily: fonts.bodyBold, color: colors.textPrimary }}>
              Open
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.accent} />
          </Pressable>
        </View>
      </View>
    </View>
  );
});

const TeamPostCard = memo(({
  item,
  colors,
  cardBg,
  cardBorder,
  onPressComment,
  onToggleLike,
  onPressOpen,
}: {
  item: SocialPostItem;
  colors: any;
  cardBg: string;
  cardBorder: string;
  onPressComment: () => void;
  onToggleLike: () => void;
  onPressOpen: () => void;
}) => {
  const likeCount = item.likeCount ?? 0;
  const commentCount = item.commentCount ?? 0;
  const dateLabel = new Date(item.date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const interactionTone =
    likeCount + commentCount > 0
      ? `${likeCount + commentCount} interactions`
      : "Start the conversation";

  return (
    <View
      style={{
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: cardBorder,
        borderRadius: radius.xxl,
        overflow: "hidden",
      }}
    >
      <View style={{ padding: spacing.lg, paddingBottom: 14, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <InitialAvatar initial={item.name.slice(0, 1).toUpperCase()} url={item.avatarUrl} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary }}>
              {item.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary }}>
                {dateLabel}
              </Text>
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.textDim,
                }}
              />
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary }}>
                Team
              </Text>
            </View>
          </View>
        </View>

        {item.content ? (
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.textPrimary, lineHeight: 24 }}>
            {item.content}
          </Text>
        ) : null}
      </View>

      {item.mediaUrl ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
          <View
            style={{
              borderRadius: radius.xl,
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
                  backgroundColor: colors.surfaceHigh,
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
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary }}>
                  Video post
                </Text>
              </View>
            ) : (
              <View>
                <Image
                  source={{ uri: item.mediaUrl }}
                  style={{ width: "100%", height: 320 }}
                  contentFit="cover"
                  transition={200}
                />
                <LinearGradient
                  colors={["transparent", "rgba(7,7,15,0.55)"]}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 96,
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    left: 14,
                    bottom: 14,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: radius.pill,
                    backgroundColor: "rgba(7,7,15,0.56)",
                  }}
                >
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: "#fff" }}>
                    Photo
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      ) : null}

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: 14, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            onPress={onToggleLike}
            hitSlop={10}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: radius.pill,
              backgroundColor: item.userLiked ? colors.accentLight : colors.surfaceHigh,
              opacity: pressed ? 0.82 : 1,
            })}
            accessibilityLabel={item.userLiked ? "Unlike post" : "Like post"}
          >
            <Ionicons
              name={item.userLiked ? "heart" : "heart-outline"}
              size={18}
              color={item.userLiked ? colors.accent : colors.textSecondary}
            />
            <Text
              style={{
                fontFamily: fonts.bodyBold,
                fontSize: 13,
                color: item.userLiked ? colors.textPrimary : colors.textSecondary,
              }}
            >
              {likeCount} Like{likeCount === 1 ? "" : "s"}
            </Text>
          </Pressable>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: radius.pill,
              backgroundColor: colors.surfaceHigh,
            }}
          >
            <Ionicons name="chatbubble-outline" size={14} color={colors.textSecondary} />
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary }}>
              {commentCount}
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary }}>
            {interactionTone}
          </Text>
        </View>

        <Pressable
          onPress={onPressComment}
          style={({ pressed }) => ({
            opacity: pressed ? 0.82 : 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: radius.xl,
            backgroundColor: isColorDark(cardBg) ? "rgba(255,255,255,0.05)" : colors.surfaceHigh,
          })}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.background,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.textSecondary} />
            </View>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary }}>
                {commentCount > 0 ? "Open comments" : "Add a comment"}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
  );
});

const InitialAvatar = memo(({ initial, size = 42, url }: { initial: string; size?: number; url?: string | null }) => {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "rgba(148,163,184,0.25)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {url ? (
        <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
      ) : (
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: Math.max(14, size * 0.36), color: "#FFF" }}>
          {initial}
        </Text>
      )}
    </View>
  );
});

function isColorDark(value: string) {
  return value.startsWith("#0") || value.startsWith("rgba(255,255,255") === false;
}

const StackedAvatars = memo(() => {
  return (
    <View style={{ flexDirection: "row" }}>
      <View style={{ marginRight: -8 }}>
        <InitialAvatar initial="A" size={26} />
      </View>
      <View style={{ marginRight: -8 }}>
        <InitialAvatar initial="B" size={26} />
      </View>
      <InitialAvatar initial="C" size={26} />
    </View>
  );
});

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
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: cardBorder,
        borderRadius: radius.xxl,
        padding: spacing.xl,
      }}
    >
      <Text style={{ fontFamily: fonts.heading2, fontSize: 18, color: colors.textPrimary }}>
        {title}
      </Text>
      <Text style={{ marginTop: 8, color: colors.textSecondary }}>{subtitle}</Text>
    </View>
  );
}

function TeamSectionTabs({
  items,
  activeKey,
  onChange,
  colors,
  cardBg,
  cardBorder,
}: {
  items: Array<{ key: SectionKey; label: string; icon: keyof typeof Ionicons.glyphMap }>;
  activeKey: SectionKey;
  onChange: (key: SectionKey) => void;
  colors: any;
  cardBg: string;
  cardBorder: string;
}) {
  return (
    <View
      style={{
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: cardBorder,
        borderRadius: radius.xxl,
        padding: 6,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingRight: spacing.xs }}
      >
        {items.map((item) => (
          <TeamSectionTabButton
            key={item.key}
            label={item.label}
            icon={item.icon}
            active={activeKey === item.key}
            colors={colors}
            onPress={() => onChange(item.key)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function TeamSectionTabButton({
  label,
  icon,
  active,
  colors,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  colors: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 46,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: active ? `${colors.accent}44` : "transparent",
        backgroundColor: active ? colors.surfaceHigh : "transparent",
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.88 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: active ? colors.accentLight : colors.surfaceHigh,
          }}
        >
          <Ionicons
            name={icon}
            size={13}
            color={active ? colors.accent : colors.textSecondary}
          />
        </View>
        <Text
          style={{
            fontFamily: active ? fonts.bodyBold : fonts.bodyMedium,
            fontSize: 14,
            color: active ? colors.textPrimary : colors.textSecondary,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
