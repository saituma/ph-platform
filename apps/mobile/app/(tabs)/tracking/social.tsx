import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  View,
  Switch,
  Modal,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import { TrackingHeaderTabs } from "@/components/tracking/TrackingHeaderTabs";
import {
  fetchAdultDirectory,
  fetchLeaderboard,
  fetchRunFeed,
  fetchMySocialRuns,
  fetchPrivacySettings,
  updatePrivacySettings,
  likeRun,
  unlikeRun,
  type SocialSort,
  type SocialLeaderboardItem,
  type SocialRunFeedItem,
  type PrivacySettings,
  type MySocialRunItem,
} from "@/services/tracking/socialService";
import { CommentsSheet } from "@/components/tracking/social/CommentsSheet";
import { formatDurationClock, formatDistanceKm } from "@/lib/tracking/runUtils";
import { Feather, Ionicons } from "@expo/vector-icons";
import { spacing, radius } from "@/constants/theme";
import { trackingScrollBottomPad } from "@/lib/tracking/mainTabBarInset";
import { MiniRunPathPreview } from "@/components/tracking/social/MiniRunPathPreview";

type TabType = "community" | "my-runs" | "settings";

export default function TrackingSocialScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const token = useAppSelector((s) => s.user.token);

  const [activeTab, setActiveTab] = useState<TabType>("community");

  // Loading states
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Data states
  const [leaderboard, setLeaderboard] = useState<SocialLeaderboardItem[]>([]);
  const [adults, setAdults] = useState<{ userId: number; name: string; avatarUrl: string | null }[]>([]);
  const [feed, setFeed] = useState<SocialRunFeedItem[]>([]);
  const [myRuns, setMyRuns] = useState<MySocialRunItem[]>([]);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);

  // Filter states
  const [rangeDays, setRangeDays] = useState<number>(7);
  const [sort, setSort] = useState<SocialSort>("date_desc");
  const [leaderboardSort, setLeaderboardSort] = useState<
    "distance_desc" | "distance_asc" | "duration_desc" | "duration_asc"
  >("distance_desc");

  // Comments modal
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [activeRunLogId, setActiveRunLogId] = useState<number | null>(null);

  const canLoad = Boolean(token);

  const cardBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)";
  const cardBg = isDark ? colors.cardElevated : colors.backgroundSecondary;

  const loadSettings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetchPrivacySettings(token);
      setPrivacySettings(res.settings);
    } catch (e: any) {
      console.warn("Failed to load privacy settings:", e);
    }
  }, [token]);

  const loadCommunityData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [lb, dir, runs] = await Promise.all([
        fetchLeaderboard(token, { windowDays: rangeDays === 0 ? 0 : rangeDays, limit: 25, sort: leaderboardSort }),
        fetchAdultDirectory(token, { limit: 20, cursor: null }),
        fetchRunFeed(token, { limit: 20, cursor: null, windowDays: rangeDays, sort }),
      ]);
      setLeaderboard(lb.items ?? []);
      setAdults(dir.items ?? []);
      setFeed(runs.items ?? []);
    } catch (e: any) {
      Alert.alert("Couldn't load Social", String(e?.message ?? "Error"));
    } finally {
      setLoading(false);
    }
  }, [leaderboardSort, rangeDays, sort, token]);

  const loadMyRuns = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetchMySocialRuns(token, { limit: 20 });
      setMyRuns(res.items ?? []);
    } catch (e: any) {
      Alert.alert("Couldn't load My Runs", String(e?.message ?? "Error"));
    } finally {
      setLoading(false);
    }
  }, [token]);

  const load = useCallback(() => {
    void loadSettings();
    if (activeTab === "community") {
      void loadCommunityData();
    } else if (activeTab === "my-runs") {
      void loadMyRuns();
    }
  }, [loadSettings, loadCommunityData, loadMyRuns, activeTab]);

  useEffect(() => {
    if (!canLoad) return;
    load();
  }, [canLoad, load]);

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
    Alert.alert("Leaderboard sort", "Choose how to rank athletes.", [
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

  const onShare = useCallback(async (item: SocialRunFeedItem) => {
    const km = Number.isFinite(item.distanceMeters) ? formatDistanceKm(item.distanceMeters, 2) : "0.00";
    const time = formatDurationClock(item.durationSeconds ?? 0);
    const pace = item.avgPace != null && Number.isFinite(item.avgPace) ? `${item.avgPace.toFixed(2)}/km` : "—";
    const msg = `${item.name} ran ${km} km in ${time} (pace ${pace}).`;
    await Share.share({ message: msg }).catch(() => {});
  }, []);

  const toggleLike = useCallback(async (run: SocialRunFeedItem) => {
    if (!token) return;
    try {
      if (run.userLiked) {
        await unlikeRun(token, run.runLogId);
      } else {
        await likeRun(token, run.runLogId);
      }
      // Refresh feed to update like counts
      const runs = await fetchRunFeed(token, { limit: 20, cursor: null, windowDays: rangeDays, sort });
      setFeed(runs.items ?? []);
    } catch (e: any) {
      Alert.alert("Error", String(e?.message ?? "Could not update like"));
    }
  }, [token, rangeDays, sort]);

  const handleToggleSocialEnabled = useCallback(async (value: boolean) => {
    if (!token || !privacySettings) return;

    if (value) {
      // Show confirmation before enabling
      Alert.alert(
        "Enable Team Features?",
        "This will allow others to see your runs, comment on them, and include you in leaderboards. You can disable this anytime.",
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
                Alert.alert("Success", "Team features enabled!");
              } catch (e: any) {
                Alert.alert("Error", String(e?.message ?? "Could not update settings"));
              } finally {
                setSettingsLoading(false);
              }
            },
          },
        ]
      );
    } else {
      // Show warning before disabling
      Alert.alert(
        "Disable Team Features?",
        "This will:\n\n• Make all your runs private\n• Remove you from leaderboards\n• Delete all likes on your runs\n• Hide your profile from the directory\n\nYou can re-enable anytime, but your previous data won't be restored.",
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
                Alert.alert("Success", "Team features disabled.");
              } catch (e: any) {
                Alert.alert("Error", String(e?.message ?? "Could not update settings"));
              } finally {
                setSettingsLoading(false);
              }
            },
          },
        ]
      );
    }
  }, [token, privacySettings]);

  const updateSetting = useCallback(async (key: keyof PrivacySettings, value: boolean) => {
    if (!token || !privacySettings) return;
    setSettingsLoading(true);
    try {
      const res = await updatePrivacySettings(token, { [key]: value });
      setPrivacySettings(res.settings);
    } catch (e: any) {
      Alert.alert("Error", String(e?.message ?? "Could not update settings"));
    } finally {
      setSettingsLoading(false);
    }
  }, [token, privacySettings]);

  if (!token) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 16, paddingHorizontal: 20 }}>
        <TrackingHeaderTabs
          active="team"
          colors={colors}
          isDark={isDark}
          topInset={0}
          paddingHorizontal={0}
        />
        <Text className="text-base font-outfit" style={{ color: colors.textSecondary }}>
          Sign in to view Team.
        </Text>
      </View>
    );
  }

  const renderTabButton = (tab: TabType, label: string, icon: string) => (
    <Pressable
      onPress={() => setActiveTab(tab)}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        gap: 6,
        borderBottomWidth: 2,
        borderBottomColor: activeTab === tab ? colors.accent : "transparent",
      }}
    >
      <Feather name={icon as any} size={14} color={activeTab === tab ? colors.accent : colors.textSecondary} />
      <Text
        className="text-sm font-outfit font-semibold"
        style={{ color: activeTab === tab ? colors.accent : colors.textSecondary }}
      >
        {label}
      </Text>
    </Pressable>
  );

  const renderCommunityTab = () => {
    if (!privacySettings?.socialEnabled) {
      return (
        <View style={{ padding: spacing.xl, alignItems: "center" }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.surfaceHigh,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: spacing.lg,
            }}
          >
            <Feather name="users" size={36} color={colors.textDim} />
          </View>
          <Text className="text-lg font-clash text-center" style={{ color: colors.text, marginBottom: spacing.sm }}>
            Team Features Disabled
          </Text>
          <Text className="text-sm font-outfit text-center" style={{ color: colors.textSecondary, marginBottom: spacing.xl }}>
            Enable team features in Settings to see the leaderboard and connect with other athletes.
          </Text>
          <Pressable
            onPress={() => setActiveTab("settings")}
            style={{
              backgroundColor: colors.accent,
              paddingHorizontal: spacing.xl,
              paddingVertical: spacing.md,
              borderRadius: radius.xl,
            }}
          >
            <Text className="text-sm font-outfit font-semibold" style={{ color: colors.textInverse }}>
              Go to Settings
            </Text>
          </Pressable>
        </View>
      );
    }

    if (loading) {
      return (
        <View style={{ paddingTop: 40, alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <View style={{ paddingHorizontal: spacing.xl, gap: 14 }}>
        {/* Leaderboard */}
        <View
          style={{
            backgroundColor: cardBg,
            borderColor: cardBorder,
            borderWidth: 1,
            borderRadius: radius.xl,
            padding: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text className="text-sm font-clash font-semibold" style={{ color: colors.text }}>
              Leaderboard ({rangeDays === 0 ? "All" : `${rangeDays} days`})
            </Text>
            <Pressable onPress={pickLeaderboardSort}>
              <Text className="text-xs font-outfit font-semibold" style={{ color: colors.textSecondary }}>
                Rank
              </Text>
            </Pressable>
          </View>
          <View style={{ gap: 10, marginTop: 10 }}>
            {leaderboard.length === 0 ? (
              <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>
                No leaderboard entries yet.
              </Text>
            ) : null}
            {leaderboard.slice(0, 10).map((it) => (
              <View key={it.userId} style={{ flexDirection: "row", alignItems: "center" }}>
                <Text className="text-xs font-outfit font-semibold" style={{ width: 22, color: colors.textSecondary }}>
                  {it.rank}
                </Text>
                <Text className="text-sm font-outfit font-semibold" style={{ flex: 1, color: colors.text }}>
                  {it.name}
                </Text>
                <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>
                  {it.kmTotal.toFixed(2)} km
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Adult Athletes */}
        <View
          style={{
            backgroundColor: cardBg,
            borderColor: cardBorder,
            borderWidth: 1,
            borderRadius: radius.xl,
            padding: 14,
          }}
        >
          <Text className="text-sm font-clash font-semibold" style={{ color: colors.text }}>
            Adult athletes
          </Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {adults.length === 0 ? (
              <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>
                No athletes found.
              </Text>
            ) : null}
            {adults.slice(0, 12).map((u) => (
              <View key={u.userId} style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.accent,
                    marginRight: 10,
                    opacity: 0.55,
                  }}
                />
                <Text className="text-sm font-outfit" style={{ color: colors.text }}>
                  {u.name}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Public Runs */}
        <View
          style={{
            backgroundColor: cardBg,
            borderColor: cardBorder,
            borderWidth: 1,
            borderRadius: radius.xl,
            padding: 14,
          }}
        >
          <Text className="text-sm font-clash font-semibold" style={{ color: colors.text }}>
            Public runs
          </Text>
          <View style={{ gap: 12, marginTop: 10 }}>
            {feed.length === 0 ? (
              <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>
                No public runs yet.
              </Text>
            ) : null}
            {feed.map((r) => {
              const km = formatDistanceKm(r.distanceMeters, 2);
              const time = formatDurationClock(r.durationSeconds);
              const pace =
                r.avgPace != null && Number.isFinite(r.avgPace) ? `${r.avgPace.toFixed(2)}/km` : "—";
              return (
                <View
                  key={r.runLogId}
                  style={{
                    borderWidth: 1,
                    borderColor: cardBorder,
                    borderRadius: radius.lg,
                    padding: 12,
                  }}
                >
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/tracking/run-path/[runLogId]" as any,
                        params: { runLogId: String(r.runLogId) },
                      } as any)
                    }
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.92 : 1,
                      marginBottom: 10,
                    })}
                  >
                    <MiniRunPathPreview
                      points={r.pathPreview}
                      height={108}
                      colors={colors}
                    />
                  </Pressable>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text className="text-sm font-outfit font-semibold" style={{ color: colors.text }}>
                      {r.name}
                    </Text>
                    <Text className="text-xs font-outfit" style={{ color: colors.textSecondary }}>
                      {new Date(r.date).toLocaleDateString()}
                    </Text>
                  </View>

                  <Text className="text-sm font-outfit mt-1" style={{ color: colors.textSecondary }}>
                    {km} km · {time} · {pace}
                  </Text>

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                    <Pressable
                      onPress={() => openComments(r.runLogId)}
                      style={({ pressed }) => ({
                        flex: 1,
                        height: 40,
                        borderRadius: radius.pill,
                        borderWidth: 1,
                        borderColor: cardBorder,
                        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: pressed ? 0.9 : 1,
                        flexDirection: "row",
                        gap: 8,
                      })}
                    >
                      <Feather name="message-circle" size={16} color={colors.icon} />
                      <Text className="text-sm font-outfit font-semibold" style={{ color: colors.textSecondary }}>
                        Comment ({r.commentCount})
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void toggleLike(r)}
                      style={({ pressed }) => ({
                        width: 48,
                        height: 40,
                        borderRadius: radius.pill,
                        borderWidth: 1,
                        borderColor: cardBorder,
                        backgroundColor: r.userLiked ? `${colors.accent}22` : isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: pressed ? 0.9 : 1,
                      })}
                    >
                      <Feather name="heart" size={16} color={r.userLiked ? colors.accent : colors.icon} />
                    </Pressable>
                    <Pressable
                      onPress={() => void onShare(r)}
                      style={({ pressed }) => ({
                        width: 48,
                        height: 40,
                        borderRadius: radius.pill,
                        borderWidth: 1,
                        borderColor: cardBorder,
                        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: pressed ? 0.9 : 1,
                      })}
                    >
                      <Feather name="share-2" size={16} color={colors.icon} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={() => void load()}
          style={({ pressed }) => ({
            height: 48,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: cardBorder,
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Text className="text-sm font-outfit font-semibold" style={{ color: colors.textSecondary }}>
            Refresh
          </Text>
        </Pressable>
      </View>
    );
  };

  const renderMyRunsTab = () => {
    if (!privacySettings?.socialEnabled) {
      return (
        <View style={{ padding: spacing.xl, alignItems: "center" }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.surfaceHigh,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: spacing.lg,
            }}
          >
            <Feather name="lock" size={36} color={colors.textDim} />
          </View>
          <Text className="text-lg font-clash text-center" style={{ color: colors.text, marginBottom: spacing.sm }}>
            Team Features Disabled
          </Text>
          <Text className="text-sm font-outfit text-center" style={{ color: colors.textSecondary }}>
            Enable team features to track your social runs and see likes from other athletes.
          </Text>
        </View>
      );
    }

    if (loading) {
      return (
        <View style={{ paddingTop: 40, alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      );
    }

    if (myRuns.length === 0) {
      return (
        <View style={{ padding: spacing.xl, alignItems: "center" }}>
          <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>
            No runs shared yet. Your runs will appear here when you make them public.
          </Text>
        </View>
      );
    }

    return (
      <View style={{ paddingHorizontal: spacing.xl, gap: 14 }}>
        {myRuns.map((r) => {
          const km = formatDistanceKm(r.distanceMeters, 2);
          const time = formatDurationClock(r.durationSeconds);
          const pace = r.avgPace != null && Number.isFinite(r.avgPace) ? `${r.avgPace.toFixed(2)}/km` : "—";
          return (
            <View
              key={r.runLogId}
              style={{
                backgroundColor: cardBg,
                borderColor: cardBorder,
                borderWidth: 1,
                borderRadius: radius.xl,
                padding: 14,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text className="text-sm font-outfit font-semibold" style={{ color: colors.text }}>
                  {new Date(r.date).toLocaleDateString()}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: radius.pill,
                    backgroundColor: r.visibility === "public" ? `${colors.accent}22` : colors.surfaceHigh,
                  }}
                >
                  <Text className="text-xs font-outfit" style={{ color: r.visibility === "public" ? colors.accent : colors.textSecondary }}>
                    {r.visibility === "public" ? "Public" : "Private"}
                  </Text>
                </View>
              </View>
              <Text className="text-sm font-outfit mt-2" style={{ color: colors.textSecondary }}>
                {km} km · {time} · {pace}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Feather name="heart" size={14} color={colors.textSecondary} />
                  <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>
                    {r.likeCount} likes
                  </Text>
                </View>
                <Pressable
                  onPress={() => openComments(r.runLogId)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Feather name="message-circle" size={14} color={colors.textSecondary} />
                  <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>
                    Comments
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderSettingsTab = () => (
    <View style={{ paddingHorizontal: spacing.xl, gap: 14 }}>
      {/* Main Toggle */}
      <View
        style={{
          backgroundColor: cardBg,
          borderColor: cardBorder,
          borderWidth: 1,
          borderRadius: radius.xl,
          padding: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text className="text-base font-clash font-semibold" style={{ color: colors.text }}>
              Enable Team Features
            </Text>
            <Text className="text-sm font-outfit mt-1" style={{ color: colors.textSecondary }}>
              {privacySettings?.socialEnabled
                ? "Your runs are visible to other athletes"
                : "Team features are disabled by default for your privacy"}
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

      {/* Privacy Notice */}
      <View
        style={{
          backgroundColor: isDark ? "rgba(255,200,100,0.08)" : "rgba(255,200,100,0.15)",
          borderColor: isDark ? "rgba(255,200,100,0.2)" : "rgba(255,200,100,0.3)",
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: 14,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
          <Feather name="shield" size={18} color={colors.amber} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text className="text-sm font-outfit font-semibold" style={{ color: colors.text }}>
              Privacy First
            </Text>
            <Text className="text-sm font-outfit mt-1" style={{ color: colors.textSecondary }}>
              Team features are off by default. Your data is only shared when you explicitly opt-in. You can disable anytime and all your social data will be removed.
            </Text>
          </View>
        </View>
      </View>

      {/* Granular Settings */}
      {privacySettings?.socialEnabled && (
        <View
          style={{
            backgroundColor: cardBg,
            borderColor: cardBorder,
            borderWidth: 1,
            borderRadius: radius.xl,
            padding: 16,
            gap: 16,
          }}
        >
          <Text className="text-sm font-clash font-semibold" style={{ color: colors.text }}>
            Privacy Preferences
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text className="text-sm font-outfit" style={{ color: colors.text }}>
                Share runs publicly
              </Text>
              <Text className="text-xs font-outfit mt-1" style={{ color: colors.textSecondary }}>
                Allow others to see your runs in the feed
              </Text>
            </View>
            <Switch
              value={privacySettings?.shareRunsPublicly ?? false}
              onValueChange={(v) => updateSetting("shareRunsPublicly", v)}
              trackColor={{ false: colors.surfaceHigh, true: colors.accent }}
              thumbColor="#fff"
              disabled={settingsLoading}
            />
          </View>

          <View style={{ height: 1, backgroundColor: colors.border }} />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text className="text-sm font-outfit" style={{ color: colors.text }}>
                Allow comments
              </Text>
              <Text className="text-xs font-outfit mt-1" style={{ color: colors.textSecondary }}>
                Let others comment on your runs
              </Text>
            </View>
            <Switch
              value={privacySettings?.allowComments ?? true}
              onValueChange={(v) => updateSetting("allowComments", v)}
              trackColor={{ false: colors.surfaceHigh, true: colors.accent }}
              thumbColor="#fff"
              disabled={settingsLoading}
            />
          </View>

          <View style={{ height: 1, backgroundColor: colors.border }} />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text className="text-sm font-outfit" style={{ color: colors.text }}>
                Show in leaderboard
              </Text>
              <Text className="text-xs font-outfit mt-1" style={{ color: colors.textSecondary }}>
                Include your stats in public leaderboards
              </Text>
            </View>
            <Switch
              value={privacySettings?.showInLeaderboard ?? true}
              onValueChange={(v) => updateSetting("showInLeaderboard", v)}
              trackColor={{ false: colors.surfaceHigh, true: colors.accent }}
              thumbColor="#fff"
              disabled={settingsLoading}
            />
          </View>

          <View style={{ height: 1, backgroundColor: colors.border }} />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text className="text-sm font-outfit" style={{ color: colors.text }}>
                Show in directory
              </Text>
              <Text className="text-xs font-outfit mt-1" style={{ color: colors.textSecondary }}>
                Appear in the athletes directory
              </Text>
            </View>
            <Switch
              value={privacySettings?.showInDirectory ?? true}
              onValueChange={(v) => updateSetting("showInDirectory", v)}
              trackColor={{ false: colors.surfaceHigh, true: colors.accent }}
              thumbColor="#fff"
              disabled={settingsLoading}
            />
          </View>
        </View>
      )}

      {/* Data Deletion Notice */}
      <Text className="text-xs font-outfit text-center" style={{ color: colors.textDim, marginTop: spacing.md }}>
        To request deletion of all your social data, please contact support.
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 0,
          paddingBottom: trackingScrollBottomPad(insets),
        }}
        refreshControl={undefined}
      >
        <TrackingHeaderTabs
          active="team"
          colors={colors}
          isDark={isDark}
          topInset={insets.top + 12}
          paddingHorizontal={spacing.xl}
        />

        {/* Tab Navigation */}
        <View
          style={{
            flexDirection: "row",
            marginHorizontal: spacing.xl,
            marginBottom: spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          {renderTabButton("community", "Community", "users")}
          {renderTabButton("my-runs", "My Runs", "activity")}
          {renderTabButton("settings", "Settings", "settings")}
        </View>

        {/* Filters (only for community tab) */}
        {activeTab === "community" && privacySettings?.socialEnabled && (
          <View style={{ paddingHorizontal: spacing.xl, paddingBottom: 6, flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={pickRange}
              style={({ pressed }) => ({
                height: 36,
                paddingHorizontal: 12,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: cardBorder,
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Feather name="calendar" size={14} color={colors.icon} />
              <Text className="text-xs font-outfit font-semibold" style={{ color: colors.textSecondary }}>
                {rangeDays === 0 ? "All" : `${rangeDays}D`}
              </Text>
            </Pressable>

            <Pressable
              onPress={pickSort}
              style={({ pressed }) => ({
                height: 36,
                paddingHorizontal: 12,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: cardBorder,
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Feather name="sliders" size={14} color={colors.icon} />
              <Text className="text-xs font-outfit font-semibold" style={{ color: colors.textSecondary }}>
                Sort
              </Text>
            </Pressable>
          </View>
        )}

        {/* Tab Content */}
        {activeTab === "community" && renderCommunityTab()}
        {activeTab === "my-runs" && renderMyRunsTab()}
        {activeTab === "settings" && renderSettingsTab()}
      </ScrollView>

      {activeRunLogId != null && (
        <CommentsSheet
          open={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          token={token}
          runLogId={activeRunLogId}
          runOwnerName={feed.find((r) => r.runLogId === activeRunLogId)?.name ?? null}
        />
      )}
    </View>
  );
}
