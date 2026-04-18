import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import { TrackingHeaderTabs } from "@/components/tracking/TrackingHeaderTabs";
import {
  fetchAdultDirectory,
  fetchLeaderboard,
  fetchRunFeed,
  type SocialSort,
  type SocialLeaderboardItem,
  type SocialRunFeedItem,
} from "@/services/tracking/socialService";
import { CommentsSheet } from "@/components/tracking/social/CommentsSheet";
import { formatDurationClock, formatDistanceKm } from "@/lib/tracking/runUtils";
import { Feather } from "@expo/vector-icons";
import { spacing, radius } from "@/constants/theme";
import { trackingScrollBottomPad } from "@/lib/tracking/mainTabBarInset";
import { MiniRunPathPreview } from "@/components/tracking/social/MiniRunPathPreview";

export default function TrackingSocialScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const token = useAppSelector((s) => s.user.token);

  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<SocialLeaderboardItem[]>([]);
  const [adults, setAdults] = useState<{ userId: number; name: string; avatarUrl: string | null }[]>([]);
  const [feed, setFeed] = useState<SocialRunFeedItem[]>([]);

  const [rangeDays, setRangeDays] = useState<number>(7); // 0 = All
  const [sort, setSort] = useState<SocialSort>("date_desc");
  const [leaderboardSort, setLeaderboardSort] = useState<
    "distance_desc" | "distance_asc" | "duration_desc" | "duration_asc"
  >("distance_desc");

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [activeRunLogId, setActiveRunLogId] = useState<number | null>(null);

  const canLoad = Boolean(token);

  const cardBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)";
  const cardBg = isDark ? colors.cardElevated : colors.backgroundSecondary;

  const load = useCallback(async () => {
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

  const headerSubtitle = useMemo(() => "Adults only · Public runs + leaderboard", []);

  // Refresh when filters change.
  useEffect(() => {
    if (!canLoad) return;
    void load();
  }, [canLoad, load, rangeDays, sort, leaderboardSort]);

  if (!token) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 16, paddingHorizontal: 20 }}>
        <TrackingHeaderTabs
          active="social"
          colors={colors}
          isDark={isDark}
          topInset={0}
          paddingHorizontal={0}
        />
        <Text className="text-base font-outfit" style={{ color: colors.textSecondary }}>
          Sign in to view Social.
        </Text>
      </View>
    );
  }

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
          active="social"
          colors={colors}
          isDark={isDark}
          topInset={insets.top + 12}
          paddingHorizontal={spacing.xl}
        />

        <View style={{ paddingHorizontal: spacing.xl, paddingBottom: 8 }}>
          <Text className="text-xs font-outfit font-semibold uppercase tracking-[1.4px]" style={{ color: colors.textSecondary }}>
            {headerSubtitle}
          </Text>
        </View>

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

        {loading ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <ActivityIndicator />
          </View>
        ) : (
          <View style={{ paddingHorizontal: spacing.xl, gap: 14 }}>
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
        )}
      </ScrollView>

      {activeRunLogId != null ? (
        <CommentsSheet
          open={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          token={token}
          runLogId={activeRunLogId}
          runOwnerName={feed.find((r) => r.runLogId === activeRunLogId)?.name ?? null}
        />
      ) : null}
    </View>
  );
}
