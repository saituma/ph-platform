import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  View,
  Switch,
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
import { 
  Users, 
  Activity, 
  Settings, 
  Calendar, 
  SlidersHorizontal, 
  MessageCircle, 
  Heart, 
  Share2, 
  ShieldCheck, 
  Lock, 
  Trophy,
  User,
  ChevronRight,
  RefreshCw
} from "lucide-react-native";
import { spacing, radius } from "@/constants/theme";
import { trackingScrollBottomPad } from "@/lib/tracking/mainTabBarInset";
import { shouldUseTeamTrackingFeatures } from "@/lib/tracking/teamTrackingGate";
import { MiniRunPathPreview } from "@/components/tracking/social/MiniRunPathPreview";

type TabType = "community" | "my-runs" | "settings";

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

  // Design Tokens (Robi's Best Practice)
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const cardBg = isDark ? colors.cardElevated : colors.backgroundSecondary;
  const accentMuted = `${colors.accent}20`; // 12% opacity for backgrounds

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
        fetchLeaderboard(token, {
          windowDays: rangeDays === 0 ? 0 : rangeDays,
          limit: 25,
          sort: leaderboardSort,
          useTeamFeed,
        }),
        fetchAdultDirectory(token, { limit: 20, cursor: null, useTeamFeed }),
        fetchRunFeed(token, { limit: 20, cursor: null, windowDays: rangeDays, sort, useTeamFeed }),
      ]);
      setLeaderboard(lb.items ?? []);
      setAdults(dir.items ?? []);
      setFeed(runs.items ?? []);
    } catch (e: any) {
      Alert.alert("Couldn't load Social", String(e?.message ?? "Error"));
    } finally {
      setLoading(false);
    }
  }, [leaderboardSort, rangeDays, sort, token, useTeamFeed]);

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

  useEffect(() => {
    if (!token) return;
    if (useTeamFeed) return;
    router.replace("/(tabs)/tracking" as any);
  }, [token, useTeamFeed, router]);

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
        await unlikeRun(token, run.runLogId, { useTeamFeed });
      } else {
        await likeRun(token, run.runLogId, { useTeamFeed });
      }
      const runs = await fetchRunFeed(token, {
        limit: 20,
        cursor: null,
        windowDays: rangeDays,
        sort,
        useTeamFeed,
      });
      setFeed(runs.items ?? []);
    } catch (e: any) {
      Alert.alert("Error", String(e?.message ?? "Could not update like"));
    }
  }, [token, rangeDays, sort, useTeamFeed]);

  const handleToggleSocialEnabled = useCallback(async (value: boolean) => {
    if (!token || !privacySettings) return;

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
        ]
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

  const renderTabButton = (tab: TabType, label: string, IconComponent: any) => (
    <Pressable
      onPress={() => setActiveTab(tab)}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: activeTab === tab ? colors.accent : "transparent",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <IconComponent size={16} color={activeTab === tab ? colors.accent : colors.textSecondary} strokeWidth={activeTab === tab ? 2.5 : 2} />
        <Text
          className="text-sm font-clash font-semibold"
          style={{ color: activeTab === tab ? colors.accent : colors.textSecondary }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );

  const SectionHeader = ({ title, icon: IconComponent, rightAction }: { title: string; icon: any; rightAction?: React.ReactNode }) => (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 32, height: 32, borderRadius: radius.md, backgroundColor: accentMuted, alignItems: "center", justifyContent: "center" }}>
          <IconComponent size={18} color={colors.accent} strokeWidth={2.5} />
        </View>
        <Text className="text-base font-clash font-bold" style={{ color: colors.text }}>{title}</Text>
      </View>
      {rightAction}
    </View>
  );

  const renderCommunityTab = () => {
    if (!privacySettings?.socialEnabled) {
      return (
        <View style={{ padding: spacing.xxl, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: cardBg, alignItems: "center", justifyContent: "center", marginBottom: spacing.xl, borderWidth: 1, borderColor: cardBorder }}>
            <Users size={48} color={colors.textDim} strokeWidth={1.5} />
          </View>
          <Text className="text-xl font-clash font-bold text-center" style={{ color: colors.text, marginBottom: spacing.sm }}>
            Team Feed is Private
          </Text>
          <Text className="text-sm font-outfit text-center px-8" style={{ color: colors.textSecondary, marginBottom: spacing.xxl, lineHeight: 20 }}>
            Enable team features in your settings to connect with other athletes and see the leaderboard.
          </Text>
          <Pressable
            onPress={() => setActiveTab("settings")}
            style={({ pressed }) => ({
              backgroundColor: colors.accent,
              paddingHorizontal: spacing.xl,
              paddingVertical: spacing.md,
              borderRadius: radius.pill,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text className="text-sm font-clash font-bold" style={{ color: colors.textInverse }}>
              OPEN SETTINGS
            </Text>
          </Pressable>
        </View>
      );
    }

    if (loading) {
      return (
        <View style={{ paddingTop: 60, alignItems: "center" }}>
          <ActivityIndicator color={colors.accent} />
          <Text className="text-xs font-outfit mt-4" style={{ color: colors.textDim }}>Loading community data...</Text>
        </View>
      );
    }

    return (
      <View style={{ paddingHorizontal: spacing.xl, gap: 20, paddingBottom: 40 }}>
        {/* Leaderboard Section */}
        <View style={{ backgroundColor: cardBg, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: cardBorder }}>
          <SectionHeader 
            title="Leaderboard" 
            icon={Trophy} 
            rightAction={
              <Pressable onPress={pickLeaderboardSort} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text className="text-xs font-outfit font-bold" style={{ color: colors.accent }}>RANK</Text>
                <ChevronRight size={14} color={colors.accent} />
              </Pressable>
            }
          />
          <View style={{ gap: 12 }}>
            {leaderboard.length === 0 ? (
              <Text className="text-sm font-outfit italic" style={{ color: colors.textDim }}>No activity this period.</Text>
            ) : null}
            {leaderboard.slice(0, 5).map((it, idx) => (
              <View key={it.userId} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 24, height: 24, borderRadius: radius.sm, backgroundColor: idx < 3 ? colors.accent : colors.surfaceHigh, alignItems: "center", justifyContent: "center" }}>
                  <Text className="text-xs font-clash font-bold" style={{ color: idx < 3 ? colors.textInverse : colors.textSecondary }}>{it.rank}</Text>
                </View>
                <Text className="text-sm font-outfit font-semibold flex-1" style={{ color: colors.text }}>{it.name}</Text>
                <Text className="text-sm font-outfit font-bold" style={{ color: colors.textPrimary }}>{it.kmTotal.toFixed(1)} <Text className="text-xs font-outfit font-normal" style={{ color: colors.textSecondary }}>km</Text></Text>
              </View>
            ))}
            {leaderboard.length > 5 && (
              <Text className="text-xs font-outfit text-center mt-2" style={{ color: colors.textDim }}>+ {leaderboard.length - 5} more athletes</Text>
            )}
          </View>
        </View>

        {/* Directory Section */}
        <View style={{ backgroundColor: cardBg, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: cardBorder }}>
          <SectionHeader title="Active Athletes" icon={Users} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {adults.length === 0 ? (
              <Text className="text-sm font-outfit italic" style={{ color: colors.textDim }}>No other athletes found.</Text>
            ) : null}
            {adults.map((u) => (
              <View key={u.userId} style={{ alignItems: "center", gap: 6, width: 64 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceHigh, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: cardBorder }}>
                  <User size={24} color={colors.textDim} />
                </View>
                <Text className="text-[10px] font-outfit font-semibold text-center" numberOfLines={1} style={{ color: colors.text }}>{u.name.split(" ")[0]}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Feed Section */}
        <View>
          <SectionHeader 
            title="Public Feed" 
            icon={Activity} 
            rightAction={
              <Pressable onPress={pickSort} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <SlidersHorizontal size={14} color={colors.textSecondary} />
                <Text className="text-xs font-outfit font-bold" style={{ color: colors.textSecondary }}>SORT</Text>
              </Pressable>
            }
          />
          <View style={{ gap: 16 }}>
            {feed.length === 0 ? (
              <View style={{ padding: spacing.xl, backgroundColor: cardBg, borderRadius: radius.xl, alignItems: "center", borderWidth: 1, borderColor: cardBorder }}>
                <Activity size={32} color={colors.textDim} strokeWidth={1} />
                <Text className="text-sm font-outfit text-center mt-4" style={{ color: colors.textDim }}>No public runs in the team feed yet.</Text>
              </View>
            ) : null}
            {feed.map((r) => {
              const km = formatDistanceKm(r.distanceMeters, 2);
              const time = formatDurationClock(r.durationSeconds);
              const pace = r.avgPace != null && Number.isFinite(r.avgPace) ? `${r.avgPace.toFixed(2)}/km` : "—";
              return (
                <View key={r.runLogId} style={{ backgroundColor: cardBg, borderRadius: radius.xl, overflow: "hidden", borderWidth: 1, borderColor: cardBorder }}>
                  <Pressable
                    onPress={() => router.push({ pathname: "/(tabs)/tracking/run-path/[runLogId]" as any, params: { runLogId: String(r.runLogId) } } as any)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}
                  >
                    <MiniRunPathPreview points={r.pathPreview} height={120} colors={colors} />
                  </Pressable>
                  
                  <View style={{ padding: spacing.lg }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text className="text-base font-clash font-bold" style={{ color: colors.text }}>{r.name}</Text>
                      <Text className="text-[10px] font-outfit font-bold" style={{ color: colors.textDim, textTransform: "uppercase" }}>{new Date(r.date).toLocaleDateString()}</Text>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: spacing.lg }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Text className="text-sm font-outfit font-bold" style={{ color: colors.accent }}>{km}</Text>
                        <Text className="text-xs font-outfit" style={{ color: colors.textSecondary }}>km</Text>
                      </View>
                      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
                      <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>{time}</Text>
                      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
                      <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>{pace}</Text>
                    </View>

                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Pressable
                        onPress={() => openComments(r.runLogId)}
                        style={({ pressed }) => ({
                          flex: 1,
                          height: 44,
                          borderRadius: radius.lg,
                          backgroundColor: colors.surfaceHigh,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <MessageCircle size={18} color={colors.textSecondary} />
                        <Text className="text-xs font-clash font-bold" style={{ color: colors.textSecondary }}>{r.commentCount}</Text>
                      </Pressable>
                      
                      <Pressable
                        onPress={() => void toggleLike(r)}
                        style={({ pressed }) => ({
                          width: 56,
                          height: 44,
                          borderRadius: radius.lg,
                          backgroundColor: r.userLiked ? accentMuted : colors.surfaceHigh,
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Heart size={20} color={r.userLiked ? colors.accent : colors.textDim} fill={r.userLiked ? colors.accent : "transparent"} strokeWidth={r.userLiked ? 0 : 2} />
                      </Pressable>

                      <Pressable
                        onPress={() => void onShare(r)}
                        style={({ pressed }) => ({
                          width: 56,
                          height: 44,
                          borderRadius: radius.lg,
                          backgroundColor: colors.surfaceHigh,
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Share2 size={20} color={colors.textDim} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={() => void load()}
          style={({ pressed }) => ({
            height: 52,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: cardBorder,
            backgroundColor: cardBg,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            opacity: pressed ? 0.8 : 1,
            marginTop: spacing.md,
          })}
        >
          <RefreshCw size={18} color={colors.textSecondary} />
          <Text className="text-sm font-clash font-bold" style={{ color: colors.textSecondary }}>REFRESH FEED</Text>
        </Pressable>
      </View>
    );
  };

  const renderMyRunsTab = () => {
    if (!privacySettings?.socialEnabled) {
      return (
        <View style={{ padding: spacing.xxl, alignItems: "center" }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: cardBg, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg, borderWidth: 1, borderColor: cardBorder }}>
            <Lock size={36} color={colors.textDim} />
          </View>
          <Text className="text-lg font-clash font-bold text-center" style={{ color: colors.text }}>Social Features Off</Text>
          <Text className="text-sm font-outfit text-center mt-2 px-8" style={{ color: colors.textSecondary, lineHeight: 20 }}>
            Enable team features to see your social activity and engagement from others.
          </Text>
        </View>
      );
    }

    if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />;

    if (myRuns.length === 0) {
      return (
        <View style={{ padding: spacing.xxl, alignItems: "center" }}>
          <Text className="text-sm font-outfit text-center" style={{ color: colors.textDim }}>No runs shared yet. Make your runs public to see them here.</Text>
        </View>
      );
    }

    return (
      <View style={{ paddingHorizontal: spacing.xl, gap: 16, paddingBottom: 40 }}>
        {myRuns.map((r) => {
          const km = formatDistanceKm(r.distanceMeters, 2);
          const time = formatDurationClock(r.durationSeconds);
          return (
            <View key={r.runLogId} style={{ backgroundColor: cardBg, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: cardBorder }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md }}>
                <Text className="text-sm font-clash font-bold" style={{ color: colors.text }}>{new Date(r.date).toLocaleDateString()}</Text>
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: r.visibility === "public" ? accentMuted : colors.surfaceHigh }}>
                  <Text className="text-[10px] font-clash font-bold" style={{ color: r.visibility === "public" ? colors.accent : colors.textSecondary, textTransform: "uppercase" }}>
                    {r.visibility}
                  </Text>
                </View>
              </View>
              
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: spacing.lg }}>
                <Text className="text-lg font-outfit font-bold" style={{ color: colors.textPrimary }}>{km} km</Text>
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
                <Text className="text-base font-outfit" style={{ color: colors.textSecondary }}>{time}</Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Heart size={14} color={colors.accent} fill={colors.accent} />
                  <Text className="text-xs font-outfit font-bold" style={{ color: colors.textPrimary }}>{r.likeCount}</Text>
                </View>
                <Pressable onPress={() => openComments(r.runLogId)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <MessageCircle size={14} color={colors.textSecondary} />
                  <Text className="text-xs font-outfit font-bold" style={{ color: colors.textSecondary }}>Comments</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderSettingsTab = () => (
    <View style={{ paddingHorizontal: spacing.xl, gap: 16, paddingBottom: 40 }}>
      <View style={{ backgroundColor: cardBg, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: cardBorder }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text className="text-lg font-clash font-bold" style={{ color: colors.text }}>Team Features</Text>
            <Text className="text-xs font-outfit mt-1" style={{ color: colors.textSecondary, lineHeight: 18 }}>
              Allow teammates to see your runs, comment, and see you on leaderboards.
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

      <View style={{ backgroundColor: isDark ? "rgba(255,200,100,0.05)" : "rgba(255,200,100,0.1)", borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: isDark ? "rgba(255,200,100,0.1)" : "rgba(255,200,100,0.2)" }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <ShieldCheck size={20} color={colors.amber} />
          <View style={{ flex: 1 }}>
            <Text className="text-sm font-clash font-bold" style={{ color: colors.text }}>Privacy Control</Text>
            <Text className="text-xs font-outfit mt-1" style={{ color: colors.textSecondary, lineHeight: 16 }}>
              Your data is only shared with your team if you opt-in. You can withdraw consent at any time.
            </Text>
          </View>
        </View>
      </View>

      {privacySettings?.socialEnabled && (
        <View style={{ backgroundColor: cardBg, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: cardBorder, gap: 20 }}>
          <Text className="text-sm font-clash font-bold" style={{ color: colors.text }}>Preferences</Text>

          {[
            { label: "Share runs publicly", sub: "Visible in the public team feed", key: "shareRunsPublicly" },
            { label: "Allow comments", sub: "Teammates can comment on your runs", key: "allowComments" },
            { label: "Show in leaderboard", sub: "Include stats in ranking", key: "showInLeaderboard" },
            { label: "Show in directory", sub: "Teammates can find your profile", key: "showInDirectory" }
          ].map((item, idx, arr) => (
            <React.Fragment key={item.key}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1, paddingRight: spacing.md }}>
                  <Text className="text-sm font-outfit font-semibold" style={{ color: colors.text }}>{item.label}</Text>
                  <Text className="text-[10px] font-outfit mt-0.5" style={{ color: colors.textSecondary }}>{item.sub}</Text>
                </View>
                <Switch
                  value={(privacySettings as any)?.[item.key] ?? true}
                  onValueChange={(v) => updateSetting(item.key as any, v)}
                  trackColor={{ false: colors.surfaceHigh, true: colors.accent }}
                  thumbColor="#fff"
                  disabled={settingsLoading}
                />
              </View>
              {idx < arr.length - 1 && <View style={{ height: 1, backgroundColor: colors.borderSubtle }} />}
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: trackingScrollBottomPad(insets),
        }}
      >
        <TrackingHeaderTabs
          active="team"
          colors={colors}
          isDark={isDark}
          topInset={insets.top + 12}
          paddingHorizontal={spacing.xl}
          showTeamTab={useTeamFeed}
        />

        <View style={{ flexDirection: "row", marginHorizontal: spacing.xl, marginBottom: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }}>
          {renderTabButton("community", "COMMUNITY", Users)}
          {renderTabButton("my-runs", "MY RUNS", Activity)}
          {renderTabButton("settings", "SETTINGS", Settings)}
        </View>

        {activeTab === "community" && privacySettings?.socialEnabled && (
          <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing.lg, flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={pickRange}
              style={({ pressed }) => ({
                height: 38,
                paddingHorizontal: 16,
                borderRadius: radius.pill,
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: cardBorder,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Calendar size={14} color={colors.accent} />
              <Text className="text-xs font-clash font-bold" style={{ color: colors.textSecondary }}>
                {rangeDays === 0 ? "ALL TIME" : `${rangeDays} DAYS`}
              </Text>
            </Pressable>
          </View>
        )}

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
          useTeamFeed={useTeamFeed}
        />
      )}
    </View>
  );
}

