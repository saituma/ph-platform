import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  Switch,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { spacing, radius, Shadows, fonts } from "@/constants/theme";
import { trackingScrollBottomPad } from "@/lib/tracking/mainTabBarInset";
import { shouldUseTeamTrackingFeatures } from "@/lib/tracking/teamTrackingGate";
import { MiniRunPathPreview } from "@/components/tracking/social/MiniRunPathPreview";
import { CommentsSheet } from "@/components/tracking/social/CommentsSheet";
import {
  fetchAdultDirectory,
  fetchLeaderboard,
  fetchRunFeed,
  fetchPrivacySettings,
  likeRun,
  unlikeRun,
  updatePrivacySettings,
  type PrivacySettings,
  type SocialLeaderboardItem,
  type SocialRunFeedItem,
  type SocialSort,
} from "@/services/tracking/socialService";
import { formatDurationClock, formatDistanceKm } from "@/lib/tracking/runUtils";

type SectionKey =
  | "overview"
  | "events"
  | "activities"
  | "stats"
  | "posts"
  | "settings";

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

  const [section, setSection] = useState<SectionKey>("overview");

  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const [leaderboard, setLeaderboard] = useState<SocialLeaderboardItem[]>([]);
  const [adults, setAdults] = useState<
    { userId: number; name: string; avatarUrl: string | null }[]
  >([]);
  const [feed, setFeed] = useState<SocialRunFeedItem[]>([]);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(
    null,
  );

  const [rangeDays, setRangeDays] = useState<number>(7);
  const [sort, setSort] = useState<SocialSort>("date_desc");
  const [leaderboardSort, setLeaderboardSort] = useState<
    "distance_desc" | "distance_asc" | "duration_desc" | "duration_asc"
  >("distance_desc");

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [activeRunLogId, setActiveRunLogId] = useState<number | null>(null);

  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : colors.border;
  const cardBg = isDark ? colors.cardElevated : colors.backgroundSecondary;

  const canLoad = token != null;

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
      const [lb, dir, runs] = await Promise.all([
        fetchLeaderboard(token, {
          windowDays: rangeDays === 0 ? 0 : rangeDays,
          limit: 25,
          sort: leaderboardSort,
          useTeamFeed,
        }),
        fetchAdultDirectory(token, { limit: 24, cursor: null, useTeamFeed }),
        fetchRunFeed(token, {
          limit: 25,
          cursor: null,
          windowDays: rangeDays,
          sort,
          useTeamFeed,
        }),
      ]);
      setLeaderboard(lb.items ?? []);
      setAdults(dir.items ?? []);
      setFeed(runs.items ?? []);
    } catch (e: any) {
      Alert.alert("Couldn't load team", String(e?.message ?? "Error"));
    } finally {
      setLoading(false);
    }
  }, [leaderboardSort, rangeDays, sort, token, useTeamFeed]);

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

  const toggleLike = useCallback(
    async (run: SocialRunFeedItem) => {
      if (!token) return;
      try {
        if (run.userLiked) {
          await unlikeRun(token, run.runLogId, { useTeamFeed });
        } else {
          await likeRun(token, run.runLogId, { useTeamFeed });
        }
        const runs = await fetchRunFeed(token, {
          limit: 25,
          cursor: null,
          windowDays: rangeDays,
          sort,
          useTeamFeed,
        });
        setFeed(runs.items ?? []);
      } catch (e: any) {
        Alert.alert("Error", String(e?.message ?? "Could not update like"));
      }
    },
    [rangeDays, sort, token, useTeamFeed],
  );

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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: trackingScrollBottomPad(insets),
        }}
      >
        <View style={{ marginHorizontal: -spacing.xl }}>
          <LinearGradient
            colors={["#FF3D00", "#7B61FF", "#00E5FF"]}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 0.9, y: 0.9 }}
            style={{
              height: 240 + insets.top,
              paddingTop: insets.top + spacing.lg,
              paddingHorizontal: spacing.xl,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <RoundIconButton
                onPress={() => router.back()}
                icon={<Ionicons name="arrow-back" size={22} color="#FFF" />}
              />
              <RoundIconButton
                onPress={() => setSection("settings")}
                icon={<Ionicons name="settings-outline" size={22} color="#FFF" />}
              />
            </View>

            <View style={{ height: spacing.xxxl }} />
            <View style={{ alignItems: "flex-end", opacity: 0.25 }}>
              <MaterialCommunityIcons name="run-fast" size={140} color="#FFF" />
            </View>
          </LinearGradient>
        </View>

        <View style={{ marginTop: -72, paddingHorizontal: spacing.xl }}>
          <View
            style={{
              backgroundColor: isDark ? "rgba(15,15,30,0.96)" : cardBg,
              borderRadius: radius.xxl,
              borderWidth: 1,
              borderColor: cardBorder,
              padding: spacing.xl,
              ...(isDark ? Shadows.none : Shadows.lg),
            }}
          >
            <View style={{ flexDirection: "row", gap: spacing.lg, alignItems: "flex-start" }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 14,
                  backgroundColor: "rgba(148,163,184,0.25)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                }}
              >
                <Text style={{ fontFamily: fonts.heading2, fontSize: 22, color: "#FFF" }}>
                  {teamInitial}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: fonts.heading1,
                    fontSize: 34,
                    color: colors.textPrimary,
                    lineHeight: 36,
                  }}
                >
                  {teamName}
                </Text>

                <View style={{ height: 10 }} />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
                  <MetaPill
                    icon="run"
                    label="Running"
                    colors={colors}
                    isDark={isDark}
                  />
                  <MetaPill
                    icon="account-group-outline"
                    label={`${memberCount} Members`}
                    colors={colors}
                    isDark={isDark}
                  />
                  <MetaPill
                    icon="earth"
                    label="Public"
                    colors={colors}
                    isDark={isDark}
                  />
                </View>

                <Text
                  style={{
                    marginTop: spacing.lg,
                    fontFamily: fonts.bodyMedium,
                    fontSize: 14,
                    color: colors.textSecondary,
                  }}
                >
                  Just for fun
                </Text>
              </View>
            </View>

            <View style={{ height: spacing.xl }} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 18 }}>
                <ClubAction
                  label="Share"
                  icon={<Ionicons name="share-social-outline" size={22} color="#FFF" />}
                  onPress={shareTeam}
                />
                <ClubAction
                  label="Overview"
                  icon={<Ionicons name="information-circle-outline" size={22} color="#FFF" />}
                  onPress={() => setSection("overview")}
                  active={section === "overview"}
                />
                <ClubAction
                  label="Events"
                  icon={<Ionicons name="calendar-outline" size={22} color="#FFF" />}
                  onPress={() => setSection("events")}
                  active={section === "events"}
                />
                <ClubAction
                  label="Activities"
                  icon={<Ionicons name="pulse-outline" size={22} color="#FFF" />}
                  onPress={() => setSection("activities")}
                  active={section === "activities"}
                />
                <ClubAction
                  label="Stats"
                  icon={<Ionicons name="bar-chart-outline" size={22} color="#FFF" />}
                  onPress={() => setSection("stats")}
                  active={section === "stats"}
                />
                <ClubAction
                  label="Posts"
                  icon={<Ionicons name="newspaper-outline" size={22} color="#FFF" />}
                  onPress={() => setSection("posts")}
                  active={section === "posts"}
                />
              </View>
            </ScrollView>
          </View>
        </View>

        <View style={{ height: spacing.xl }} />

        {privacySettings?.socialEnabled === false && section !== "settings" ? (
          <View style={{ paddingHorizontal: spacing.xl }}>
            <View
              style={{
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: cardBorder,
                borderRadius: radius.xxl,
                padding: spacing.xl,
              }}
            >
              <Text style={{ fontFamily: fonts.heading2, fontSize: 20, color: colors.textPrimary }}>
                Team feed is private
              </Text>
              <Text style={{ marginTop: 8, color: colors.textSecondary }}>
                Enable team features to post, see activities, and join leaderboards.
              </Text>
              <View style={{ height: spacing.lg }} />
              <Pressable
                onPress={() => setSection("settings")}
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
                  Open settings
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {section === "overview" ? (
          <View style={{ paddingHorizontal: spacing.xl, gap: spacing.xl }}>
            <RowHeader
              title="Upcoming Events"
              right={
                <Pressable
                  onPress={() => setSection("events")}
                  style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, flexDirection: "row", alignItems: "center", gap: 6 })}
                >
                  <Text style={{ color: colors.textSecondary, fontFamily: fonts.bodyBold }}>
                    See all
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </Pressable>
              }
              colors={colors}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 16 }}>
                {events.map((e, idx) => (
                  <EventCard key={idx} event={e} colors={colors} cardBg={cardBg} cardBorder={cardBorder} />
                ))}
              </View>
            </ScrollView>

            <RowHeader
              title="Recent"
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

            {loading ? (
              <View style={{ paddingTop: 40, alignItems: "center" }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                {feed.slice(0, 4).map((r) => (
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
                        pathname:
                          "/(tabs)/tracking/run-path/[runLogId]" as any,
                        params: { runLogId: String(r.runLogId) },
                      } as any)
                    }
                  />
                ))}
                {feed.length === 0 ? (
                  <EmptyState title="No activity yet" subtitle="When teammates record runs, they will show up here." colors={colors} cardBg={cardBg} cardBorder={cardBorder} />
                ) : null}
              </View>
            )}
          </View>
        ) : null}

        {section === "events" ? (
          <View style={{ paddingHorizontal: spacing.xl, gap: spacing.xl }}>
            <RowHeader title="Upcoming Events" colors={colors} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 16 }}>
                {events.map((e, idx) => (
                  <EventCard key={idx} event={e} colors={colors} cardBg={cardBg} cardBorder={cardBorder} />
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}

        {section === "activities" ? (
          <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
            <RowHeader
              title="Activities"
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

            {loading ? (
              <View style={{ paddingTop: 40, alignItems: "center" }}>
                <ActivityIndicator color={colors.accent} />
              </View>
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
                        pathname:
                          "/(tabs)/tracking/run-path/[runLogId]" as any,
                        params: { runLogId: String(r.runLogId) },
                      } as any)
                    }
                  />
                ))}
                {feed.length === 0 ? (
                  <EmptyState title="No activity yet" subtitle="When teammates record runs, they will show up here." colors={colors} cardBg={cardBg} cardBorder={cardBorder} />
                ) : null}
              </View>
            )}

            <View style={{ height: spacing.xl }} />
          </View>
        ) : null}

        {section === "posts" ? (
          <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
            <RowHeader
              title="Posts"
              right={
                <Pressable
                  onPress={() =>
                    Alert.alert("Coming soon", "Posting will be added next.")
                  }
                  style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                >
                  <Ionicons name="add-circle-outline" size={22} color={colors.textSecondary} />
                </Pressable>
              }
              colors={colors}
            />

            <PostComposerRow
              initial={teamInitial}
              onPress={() =>
                Alert.alert("Coming soon", "Posting will be added next.")
              }
              colors={colors}
              cardBg={cardBg}
              cardBorder={cardBorder}
            />

            {loading ? (
              <View style={{ paddingTop: 40, alignItems: "center" }}>
                <ActivityIndicator color={colors.accent} />
              </View>
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
                        pathname:
                          "/(tabs)/tracking/run-path/[runLogId]" as any,
                        params: { runLogId: String(r.runLogId) },
                      } as any)
                    }
                  />
                ))}
                {feed.length === 0 ? (
                  <EmptyState title="No posts yet" subtitle="Start an activity to share it here." colors={colors} cardBg={cardBg} cardBorder={cardBorder} />
                ) : null}
              </View>
            )}

            <View style={{ height: spacing.xl }} />
          </View>
        ) : null}

        {section === "stats" ? (
          <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
            <RowHeader
              title="Stats"
              right={
                <Pressable onPress={pickLeaderboardSort} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, flexDirection: "row", alignItems: "center", gap: 6 })}>
                  <Ionicons name="swap-vertical" size={18} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontFamily: fonts.bodyBold }}>
                    Sort
                  </Text>
                </Pressable>
              }
              colors={colors}
            />

            <View
              style={{
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: cardBorder,
                borderRadius: radius.xxl,
                padding: spacing.xl,
              }}
            >
              {loading ? (
                <View style={{ paddingVertical: 20, alignItems: "center" }}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              ) : leaderboard.length === 0 ? (
                <Text style={{ color: colors.textSecondary }}>
                  No leaderboard data yet.
                </Text>
              ) : (
                <View style={{ gap: 12 }}>
                  {leaderboard.map((u) => (
                    <View
                      key={u.userId}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: "rgba(255,255,255,0.06)",
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <InitialAvatar initial={u.name.slice(0, 1).toUpperCase()} />
                        <View>
                          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary }}>
                            {u.name}
                          </Text>
                          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary }}>
                            {u.kmTotal.toFixed(1)} km · {u.durationMinutesTotal} min
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontFamily: fonts.heading3, color: colors.accent }}>
                        #{u.rank}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : null}

        {section === "settings" ? (
          <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
            <RowHeader title="Settings" colors={colors} />

            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: radius.xxl,
                padding: spacing.xl,
                borderWidth: 1,
                borderColor: cardBorder,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1, paddingRight: spacing.md }}>
                  <Text style={{ fontFamily: fonts.heading2, fontSize: 18, color: colors.textPrimary }}>
                    Team Features
                  </Text>
                  <Text style={{ marginTop: 6, color: colors.textSecondary }}>
                    Allow teammates to see your runs and comment.
                  </Text>
                </View>

                {settingsLoading ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Switch
                    value={privacySettings?.socialEnabled ?? false}
                    onValueChange={handleToggleSocialEnabled}
                    trackColor={{ false: colors.surfaceHigh, true: colors.accent }}
                    thumbColor="#fff"
                  />
                )}
              </View>
            </View>

            {privacySettings?.socialEnabled ? (
              <View
                style={{
                  backgroundColor: cardBg,
                  borderRadius: radius.xxl,
                  padding: spacing.xl,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  gap: 18,
                }}
              >
                <Text style={{ fontFamily: fonts.bodyBold, color: colors.textPrimary }}>
                  Preferences
                </Text>

                <SettingRow
                  label="Share runs publicly"
                  subtitle="Visible in the team feed"
                  value={privacySettings.shareRunsPublicly}
                  onChange={(v) => void updateSetting("shareRunsPublicly", v)}
                  colors={colors}
                  disabled={settingsLoading}
                />
                <Divider color={colors.borderSubtle} />
                <SettingRow
                  label="Allow comments"
                  subtitle="Teammates can comment on your runs"
                  value={privacySettings.allowComments}
                  onChange={(v) => void updateSetting("allowComments", v)}
                  colors={colors}
                  disabled={settingsLoading}
                />
                <Divider color={colors.borderSubtle} />
                <SettingRow
                  label="Show in leaderboard"
                  subtitle="Include your stats in ranking"
                  value={privacySettings.showInLeaderboard}
                  onChange={(v) => void updateSetting("showInLeaderboard", v)}
                  colors={colors}
                  disabled={settingsLoading}
                />
                <Divider color={colors.borderSubtle} />
                <SettingRow
                  label="Show in directory"
                  subtitle="Teammates can find your profile"
                  value={privacySettings.showInDirectory}
                  onChange={(v) => void updateSetting("showInDirectory", v)}
                  colors={colors}
                  disabled={settingsLoading}
                />
              </View>
            ) : null}

            <View style={{ height: spacing.xl }} />
          </View>
        ) : null}

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
    </View>
  );
}

function RoundIconButton({
  onPress,
  icon,
}: {
  onPress: () => void;
  icon: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(0,0,0,0.35)",
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {icon}
    </Pressable>
  );
}

function MetaPill({
  icon,
  label,
  colors,
  isDark,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  colors: any;
  isDark: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <MaterialCommunityIcons
        name={icon}
        size={18}
        color={isDark ? "rgba(255,255,255,0.9)" : colors.textSecondary}
      />
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary }}>
        {label}
      </Text>
    </View>
  );
}

function ClubAction({
  label,
  icon,
  onPress,
  active,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 86,
        alignItems: "center",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.10)",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: active ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.12)",
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          marginTop: spacing.md,
          fontFamily: fonts.bodyBold,
          fontSize: 14,
          color: "#FFF",
          opacity: active ? 1 : 0.92,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
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

function EventCard({
  event,
  colors,
  cardBg,
  cardBorder,
}: {
  event: { title: string; km: string; date: Date; timeLabel: string; note: string };
  colors: any;
  cardBg: string;
  cardBorder: string;
}) {
  const month = event.date.toLocaleString(undefined, { month: "short" }).toUpperCase();
  const day = String(event.date.getDate());
  const weekday = event.date.toLocaleString(undefined, { weekday: "short" }).toUpperCase();

  return (
    <View
      style={{
        width: 340,
        backgroundColor: cardBg,
        borderRadius: radius.xxl,
        borderWidth: 1,
        borderColor: cardBorder,
        padding: spacing.xl,
      }}
    >
      <View style={{ flexDirection: "row", gap: spacing.lg, alignItems: "center" }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 14,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
            backgroundColor: "#0F0F1E",
          }}
        >
          <View style={{ height: 22, backgroundColor: "#FF3D00", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: "#FFF" }}>
              {month}
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: fonts.heading1, fontSize: 28, color: "#FFF" }}>
              {day}
            </Text>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary }}>
              {weekday}
            </Text>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.heading2, fontSize: 20, color: colors.textPrimary }}>
            {event.title}
          </Text>
          <View style={{ height: 6 }} />
          <Text style={{ fontFamily: fonts.bodyMedium, color: colors.textSecondary }}>
            {event.timeLabel}
          </Text>
          <Text style={{ marginTop: 6, fontFamily: fonts.bodyMedium, color: colors.textDim }}>
            {event.note}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </View>
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
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: cardBorder,
        borderRadius: radius.xxl,
        paddingVertical: 14,
        paddingHorizontal: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.lg,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <InitialAvatar initial={initial} size={46} />
      <Text style={{ flex: 1, fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.textSecondary }}>
        Post something...
      </Text>
      <Ionicons name="image-outline" size={22} color={colors.textSecondary} />
    </Pressable>
  );
}

function TeamRunPostCard({
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
  const dateLabel = new Date(item.date).toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
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
      <View style={{ padding: spacing.xl, paddingBottom: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
          <InitialAvatar initial={item.name.slice(0, 1).toUpperCase()} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary }}>
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

      <View style={{ padding: spacing.xl, paddingTop: spacing.lg }}>
        <Text style={{ fontFamily: fonts.heading2, fontSize: 22, color: colors.textPrimary }}>
          Run
        </Text>
        <Text style={{ marginTop: 6, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary }}>
          {km} km · {pace} · {time}
        </Text>

        <View style={{ height: spacing.xl }} />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <StackedAvatars />
            <Text style={{ fontFamily: fonts.bodyMedium, color: colors.textSecondary }}>
              {likeCount} gave kudos
            </Text>
          </View>
        </View>

        <View style={{ height: spacing.lg }} />

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Pressable
            onPress={onToggleLike}
            style={({ pressed }) => ({
              width: 68,
              height: 52,
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
              width: 68,
              height: 52,
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
              height: 52,
              borderRadius: radius.xl,
              backgroundColor: colors.surfaceHigh,
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
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function InitialAvatar({ initial, size = 42 }: { initial: string; size?: number }) {
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
      }}
    >
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: Math.max(14, size * 0.36), color: "#FFF" }}>
        {initial}
      </Text>
    </View>
  );
}

function StackedAvatars() {
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
}

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

function Divider({ color }: { color: string }) {
  return <View style={{ height: 1, backgroundColor: color, opacity: 0.9 }} />;
}

function SettingRow({
  label,
  subtitle,
  value,
  onChange,
  colors,
  disabled,
}: {
  label: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  colors: any;
  disabled: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary }}>
          {label}
        </Text>
        <Text style={{ marginTop: 4, fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary }}>
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surfaceHigh, true: colors.accent }}
        thumbColor="#fff"
        disabled={disabled}
      />
    </View>
  );
}

