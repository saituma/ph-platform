import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { fonts } from "@/constants/theme";
import {
  fetchLeaderboard,
  type SocialLeaderboardItem,
} from "@/services/tracking/socialService";

// ─────────────────────────────────────────────────────────────────────────────
// TeamManagerHomeScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function TeamManagerHomeScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const { authTeamMembership, managedAthletes, token, appRole } =
    useAppSelector((state) => state.user);

  const [refreshing, setRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<SocialLeaderboardItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const teamName =
    authTeamMembership?.team ?? managedAthletes[0]?.team ?? "Your Team";
  const memberCount = managedAthletes.length;

  const youthCount = useMemo(
    () => managedAthletes.filter((a) => a.athleteType === "youth").length,
    [managedAthletes],
  );
  const adultCount = useMemo(
    () => managedAthletes.filter((a) => a.athleteType === "adult").length,
    [managedAthletes],
  );
  const activeCount = useMemo(
    () => leaderboard.filter((l) => l.kmTotal > 0).length,
    [leaderboard],
  );
  const teamKm = useMemo(
    () => leaderboard.reduce((s, l) => s + l.kmTotal, 0),
    [leaderboard],
  );

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetchLeaderboard(token, {
        windowDays: 7,
        limit: 100,
        useTeamFeed: true,
      });
      setLeaderboard(res?.items ?? []);
    } catch {
      // silent
    } finally {
      setLoaded(true);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 480,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 480,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  if (appRole !== "team_manager") return null;

  const cardBg = isDark ? colors.surfaceHigh : colors.card;
  const cardBorder = isDark ? colors.borderMid : colors.borderSubtle;

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top,
        backgroundColor: colors.background,
      }}
    >
      <ThemedScrollView
        contentContainerStyle={{ paddingBottom: 56 + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <View
            style={{
              paddingTop: 40,
              paddingHorizontal: 24,
              marginBottom: 24,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: 42,
                fontFamily: "TelmaBold",
                color: isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,8%)",
                letterSpacing: -0.5,
                lineHeight: 50,
                marginBottom: 10,
              }}
            >
              {teamName}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  backgroundColor: isDark
                    ? colors.surfaceHigher
                    : colors.backgroundSecondary,
                  borderRadius: 99,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderWidth: 1,
                  borderColor: cardBorder,
                }}
              >
                <Ionicons
                  name="people-outline"
                  size={11}
                  color={colors.textSecondary}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: fonts.bodyMedium,
                    color: colors.textSecondary,
                  }}
                >
                  {memberCount} athletes
                </Text>
              </View>
              {loaded && activeCount > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    backgroundColor: colors.accentLight,
                    borderRadius: 99,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderWidth: 1,
                    borderColor: colors.borderLime,
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: colors.accent,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: fonts.bodyMedium,
                      color: colors.accent,
                    }}
                  >
                    {activeCount} active this week
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Body ───────────────────────────────────────────────── */}
          <View style={{ gap: 14 }}>

            {/* Activity Hero Card */}
            <View style={{ paddingHorizontal: 24 }}>
              {loaded ? (
                <ActivityHeroCard
                  teamKm={teamKm}
                  activeCount={activeCount}
                  memberCount={memberCount}
                />
              ) : (
                <SkeletonBlock height={118} borderRadius={20} />
              )}
            </View>

            {/* Asymmetric Stats Bento */}
            <View style={{ paddingHorizontal: 24 }}>
              {loaded ? (
                <StatsBento
                  memberCount={memberCount}
                  youthCount={youthCount}
                  adultCount={adultCount}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                />
              ) : (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <SkeletonBlock
                    height={132}
                    borderRadius={20}
                    style={{ flex: 1.35 }}
                  />
                  <View style={{ flex: 1, gap: 10 }}>
                    <SkeletonBlock height={58} borderRadius={16} />
                    <SkeletonBlock height={58} borderRadius={16} />
                  </View>
                </View>
              )}
            </View>

            {/* Leaderboard Preview */}
            {loaded && leaderboard.length > 0 && (
              <LeaderboardPreview leaderboard={leaderboard} />
            )}
            {!loaded && (
              <View style={{ paddingHorizontal: 24 }}>
                <SkeletonBlock height={108} borderRadius={18} />
              </View>
            )}

            {/* Quick Actions */}
            <View style={{ paddingHorizontal: 24, gap: 10, marginTop: 4 }}>
              <SectionLabel label="Actions" />

              {/* Roster — primary full-width */}
              <PrimaryActionTile
                icon="people-outline"
                label="Roster"
                subtitle={`${memberCount} athlete${memberCount !== 1 ? "s" : ""} on your team`}
                accent={colors.accent}
                cardBg={cardBg}
                cardBorder={cardBorder}
                onPress={() => router.push("/team-manager/roster")}
              />

              {/* Row: Messages + Announcements */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <ActionTile
                  icon="chatbubbles-outline"
                  label="Messages"
                  accent={isDark ? "hsl(200,26%,62%)" : "hsl(200,40%,45%)"}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                  onPress={() => router.push("/(tabs)/messages" as any)}
                />
                <ActionTile
                  icon="megaphone-outline"
                  label="Announce"
                  accent={isDark ? "hsl(32,30%,62%)" : "hsl(32,45%,45%)"}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                  onPress={() => router.push("/announcements" as any)}
                />
              </View>

              {/* Row: Schedule + Stats */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <ActionTile
                  icon="calendar-outline"
                  label="Schedule"
                  accent={isDark ? "hsl(270,25%,65%)" : "hsl(270,35%,50%)"}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                  onPress={() => router.push("/(tabs)/schedule")}
                />
                <ActionTile
                  icon="analytics-outline"
                  label="Stats"
                  accent={isDark ? "hsl(40,30%,62%)" : "hsl(40,45%,45%)"}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                  onPress={() =>
                    router.push("/(tabs)/tracking/social" as any)
                  }
                />
              </View>

              {/* Settings — tertiary text row */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Team Settings"
                onPress={() =>
                  router.push("/(tabs)/tracking/team-settings" as any)
                }
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 14,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  backgroundColor: pressed
                    ? isDark
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(0,0,0,0.02)"
                    : "transparent",
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <Ionicons
                  name="settings-outline"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: fonts.bodyMedium,
                    color: colors.textSecondary,
                  }}
                >
                  Team Settings
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={12}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

          </View>
        </Animated.View>
      </ThemedScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionLabel
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  const { isDark } = useAppTheme();
  return (
    <Text
      style={{
        fontFamily: fonts.labelCaps,
        fontSize: 11,
        letterSpacing: 1.2,
        color: isDark ? "hsl(220,5%,44%)" : "hsl(220,5%,50%)",
        textTransform: "uppercase",
        paddingLeft: 2,
      }}
    >
      {label}
    </Text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SkeletonBlock
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonBlock({
  height,
  borderRadius = 16,
  style,
}: {
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const { isDark } = useAppTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.65],
  });

  return (
    <Animated.View
      style={[
        {
          height,
          borderRadius,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.07)"
            : "rgba(0,0,0,0.06)",
          opacity,
        },
        style,
      ]}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ActivityHeroCard
// ─────────────────────────────────────────────────────────────────────────────

function ActivityHeroCard({
  teamKm,
  activeCount,
  memberCount,
}: {
  teamKm: number;
  activeCount: number;
  memberCount: number;
}) {
  const { colors, isDark } = useAppTheme();
  const participationPct =
    memberCount > 0 ? Math.min((activeCount / memberCount) * 100, 100) : 0;

  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.borderLime,
        backgroundColor: isDark
          ? "rgba(52,199,89,0.07)"
          : "rgba(22,163,74,0.06)",
        padding: 20,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        {/* Left: KM metric */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 10,
              fontFamily: fonts.labelCaps,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: colors.accent,
              marginBottom: 6,
            }}
          >
            Last 7 Days
          </Text>
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}
          >
            <Text
              style={{
                fontSize: 38,
                fontFamily: "ClashDisplay-Bold",
                color: isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,8%)",
                letterSpacing: -1,
                lineHeight: 42,
              }}
            >
              {teamKm.toFixed(1)}
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: fonts.bodyMedium,
                color: colors.textSecondary,
                marginBottom: 2,
              }}
            >
              km
            </Text>
          </View>
          <Text
            style={{
              fontSize: 11,
              fontFamily: fonts.bodyRegular,
              color: colors.textSecondary,
              marginTop: 2,
            }}
          >
            Team distance
          </Text>
        </View>

        {/* Right: Active badge */}
        <View
          style={{
            alignItems: "center",
            backgroundColor: isDark
              ? "rgba(52,199,89,0.14)"
              : "rgba(22,163,74,0.10)",
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontFamily: "ClashDisplay-Bold",
              color: colors.accent,
              lineHeight: 28,
            }}
          >
            {activeCount}
          </Text>
          <Text
            style={{
              fontSize: 9,
              fontFamily: fonts.labelBold,
              color: colors.accent,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginTop: 1,
            }}
          >
            active
          </Text>
        </View>
      </View>

      {/* Participation bar */}
      {memberCount > 0 && (
        <View style={{ marginTop: 14 }}>
          <View
            style={{
              height: 3,
              borderRadius: 2,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.07)",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${participationPct}%`,
                borderRadius: 2,
                backgroundColor: colors.accent,
              }}
            />
          </View>
          <Text
            style={{
              fontSize: 10,
              fontFamily: fonts.bodyRegular,
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            {participationPct.toFixed(0)}% participation this week
          </Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatsBento — asymmetric 3-stat layout
// ─────────────────────────────────────────────────────────────────────────────

function StatsBento({
  memberCount,
  youthCount,
  adultCount,
  cardBg,
  cardBorder,
}: {
  memberCount: number;
  youthCount: number;
  adultCount: number;
  cardBg: string;
  cardBorder: string;
}) {
  const { colors, isDark } = useAppTheme();

  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      {/* Left dominant tile */}
      <View
        style={{
          flex: 1.35,
          borderRadius: 20,
          borderWidth: 1,
          padding: 16,
          backgroundColor: cardBg,
          borderColor: cardBorder,
          justifyContent: "space-between",
          minHeight: 128,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark
              ? `${colors.accent}18`
              : `${colors.accent}14`,
          }}
        >
          <Ionicons name="people-outline" size={16} color={colors.accent} />
        </View>
        <View>
          <Text
            style={{
              fontSize: 34,
              fontFamily: "ClashDisplay-Bold",
              color: isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,8%)",
              letterSpacing: -1,
              lineHeight: 38,
            }}
          >
            {memberCount}
          </Text>
          <Text
            style={{
              fontSize: 10,
              fontFamily: fonts.labelBold,
              color: isDark ? "hsl(220,5%,48%)" : "hsl(220,5%,50%)",
              textTransform: "uppercase",
              letterSpacing: 0.8,
              marginTop: 2,
            }}
          >
            Athletes
          </Text>
        </View>
      </View>

      {/* Right column: Youth + Adults stacked */}
      <View style={{ flex: 1, gap: 10 }}>
        <SmallStatTile
          label="Youth"
          value={youthCount}
          icon="school-outline"
          accent={isDark ? "hsl(220,30%,72%)" : "hsl(220,40%,55%)"}
          cardBg={cardBg}
          cardBorder={cardBorder}
        />
        <SmallStatTile
          label="Adults"
          value={adultCount}
          icon="body-outline"
          accent={isDark ? "hsl(160,25%,62%)" : "hsl(160,35%,42%)"}
          cardBg={cardBg}
          cardBorder={cardBorder}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SmallStatTile
// ─────────────────────────────────────────────────────────────────────────────

function SmallStatTile({
  label,
  value,
  icon,
  accent,
  cardBg,
  cardBorder,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  cardBg: string;
  cardBorder: string;
}) {
  const { isDark } = useAppTheme();

  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        padding: 13,
        backgroundColor: cardBg,
        borderColor: cardBorder,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDark ? `${accent}18` : `${accent}14`,
        }}
      >
        <Ionicons name={icon} size={14} color={accent} />
      </View>
      <View>
        <Text
          style={{
            fontSize: 20,
            fontFamily: "ClashDisplay-Bold",
            color: isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,8%)",
            lineHeight: 24,
          }}
        >
          {value}
        </Text>
        <Text
          style={{
            fontSize: 9,
            fontFamily: fonts.labelBold,
            color: isDark ? "hsl(220,5%,48%)" : "hsl(220,5%,50%)",
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LeaderboardPreview — edge-to-edge horizontal scroll
// ─────────────────────────────────────────────────────────────────────────────

function LeaderboardPreview({
  leaderboard,
}: {
  leaderboard: SocialLeaderboardItem[];
}) {
  const { colors, isDark } = useAppTheme();
  const top = leaderboard.slice(0, 8);

  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          paddingHorizontal: 24,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            fontFamily: fonts.labelCaps,
            fontSize: 11,
            letterSpacing: 1.2,
            color: isDark ? "hsl(220,5%,44%)" : "hsl(220,5%,50%)",
            textTransform: "uppercase",
            paddingLeft: 2,
          }}
        >
          Top Performers
        </Text>
        <Pressable
          onPress={() => router.push("/(tabs)/tracking/social" as any)}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text
            style={{
              fontSize: 12,
              fontFamily: fonts.bodyMedium,
              color: colors.accent,
            }}
          >
            See all
          </Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24 }}
      >
        {top.map((item, index) => (
          <View
            key={item.userId}
            style={{ marginRight: index < top.length - 1 ? 10 : 0 }}
          >
            <AthleteCard item={item} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AthleteCard
// ─────────────────────────────────────────────────────────────────────────────

function AthleteCard({ item }: { item: SocialLeaderboardItem }) {
  const { colors, isDark } = useAppTheme();

  const initials = item.name
    .split(" ")
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isTop3 = item.rank <= 3;
  const rankPalette = [
    "hsl(46,88%,50%)",
    "hsl(220,10%,65%)",
    "hsl(30,62%,55%)",
  ];
  const rankColor = isTop3
    ? rankPalette[item.rank - 1]
    : colors.textSecondary;

  const cardBg = isDark ? colors.surfaceHigh : colors.cardElevated;
  const cardBorder = isDark ? colors.borderMid : colors.borderSubtle;

  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        backgroundColor: cardBg,
        borderColor: cardBorder,
        padding: 14,
        alignItems: "center",
        gap: 7,
        width: 86,
      }}
    >
      {/* Rank */}
      <View style={{ position: "absolute", top: 8, right: 9 }}>
        <Text
          style={{
            fontSize: 9,
            fontFamily: fonts.labelBold,
            color: rankColor,
          }}
        >
          #{item.rank}
        </Text>
      </View>

      {/* Avatar */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDark
            ? colors.surfaceHigher
            : colors.backgroundSecondary,
          borderWidth: 1,
          borderColor: cardBorder,
          overflow: "hidden",
          marginTop: 4,
        }}
      >
        {item.avatarUrl ? (
          <Image
            source={{ uri: item.avatarUrl }}
            style={{ width: 44, height: 44 }}
          />
        ) : (
          <Text
            style={{
              fontSize: 15,
              fontFamily: fonts.heading2,
              color: isDark ? "hsl(220,5%,65%)" : "hsl(220,8%,40%)",
            }}
          >
            {initials}
          </Text>
        )}
      </View>

      {/* First name */}
      <Text
        numberOfLines={1}
        style={{
          fontSize: 11,
          fontFamily: fonts.bodyMedium,
          color: isDark ? "hsl(220,5%,80%)" : "hsl(220,8%,22%)",
          textAlign: "center",
          maxWidth: 70,
        }}
      >
        {item.name.split(" ")[0]}
      </Text>

      {/* KM */}
      <Text
        style={{
          fontSize: 13,
          fontFamily: "ClashDisplay-Bold",
          color: isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,8%)",
          letterSpacing: -0.3,
        }}
      >
        {item.kmTotal.toFixed(1)}
        <Text
          style={{
            fontSize: 9,
            fontFamily: fonts.bodyRegular,
            color: colors.textSecondary,
          }}
        >
          {" km"}
        </Text>
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PrimaryActionTile
// ─────────────────────────────────────────────────────────────────────────────

function PrimaryActionTile({
  icon,
  label,
  subtitle,
  accent,
  cardBg,
  cardBorder,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  accent: string;
  cardBg: string;
  cardBorder: string;
  onPress: () => void;
}) {
  const { colors, isDark } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 20,
        borderWidth: 1,
        padding: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: cardBg,
        borderColor: cardBorder,
        opacity: pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          flex: 1,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark ? `${accent}18` : `${accent}14`,
          }}
        >
          <Ionicons name={icon} size={22} color={accent} />
        </View>
        <View style={{ gap: 2, flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontFamily: fonts.heading3,
              color: isDark ? "hsl(220,5%,92%)" : "hsl(220,8%,10%)",
            }}
          >
            {label}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontFamily: fonts.bodyRegular,
              color: colors.textSecondary,
            }}
          >
            {subtitle}
          </Text>
        </View>
      </View>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDark
            ? "rgba(255,255,255,0.06)"
            : "rgba(0,0,0,0.05)",
          marginLeft: 10,
        }}
      >
        <Ionicons
          name="chevron-forward"
          size={13}
          color={isDark ? "hsl(220,5%,55%)" : "hsl(220,5%,55%)"}
        />
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ActionTile
// ─────────────────────────────────────────────────────────────────────────────

function ActionTile({
  icon,
  label,
  accent,
  cardBg,
  cardBorder,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accent: string;
  cardBg: string;
  cardBorder: string;
  onPress: () => void;
}) {
  const { isDark } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        minHeight: 84,
        backgroundColor: cardBg,
        borderColor: cardBorder,
        opacity: pressed ? 0.8 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDark ? `${accent}18` : `${accent}14`,
        }}
      >
        <Ionicons name={icon} size={19} color={accent} />
      </View>
      <Text
        style={{
          fontSize: 12,
          fontFamily: fonts.bodyBold,
          color: isDark ? "hsl(220,5%,80%)" : "hsl(220,8%,20%)",
          textAlign: "center",
          letterSpacing: 0.1,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
