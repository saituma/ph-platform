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
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  if (appRole !== "team_manager") return null;

  // Hero tint: very subtle lime-tinted background behind the top section
  const heroBg = isDark ? "hsl(148,18%,6%)" : "hsl(148,22%,96%)";
  // surfaceHigh gives visible contrast in both light (#F6F8F6) and dark (#111311)
  const cardBg = colors.surfaceHigh;
  const cardBorder = isDark ? colors.borderMid : colors.borderMid;
  const participationPct =
    memberCount > 0 ? Math.min((activeCount / memberCount) * 100, 100) : 0;

  return (
    // Outer container carries the hero tint — shows behind rounded card corners
    <View style={{ flex: 1, backgroundColor: heroBg }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ── Hero Section ─────────────────────────────── */}
          <View
            style={{
              paddingTop: insets.top + 32,
              paddingHorizontal: 24,
              paddingBottom: 52,
              overflow: "hidden",
            }}
          >
            {/* Ambient glow dot */}
            <View
              style={{
                position: "absolute",
                top: -30,
                right: -40,
                width: 220,
                height: 220,
                borderRadius: 110,
                backgroundColor: isDark
                  ? "rgba(52,199,89,0.07)"
                  : "rgba(22,163,74,0.07)",
              }}
            />

            {/* Team name */}
            <Text
              numberOfLines={1}
              style={{
                fontSize: 36,
                fontFamily: "TelmaBold",
                color: isDark ? "hsl(148,8%,94%)" : "hsl(148,28%,10%)",
                letterSpacing: -0.5,
                lineHeight: 42,
                marginBottom: 10,
              }}
            >
              {teamName}
            </Text>

            {/* Badges */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 32,
                flexWrap: "wrap",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(0,0,0,0.06)",
                  borderRadius: 99,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Ionicons
                  name="people-outline"
                  size={11}
                  color={isDark ? "hsl(148,5%,60%)" : "hsl(148,18%,38%)"}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: fonts.bodyMedium,
                    color: isDark
                      ? "hsl(148,5%,60%)"
                      : "hsl(148,18%,38%)",
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
                    {activeCount} active
                  </Text>
                </View>
              )}
            </View>

            {/* KM stat or skeleton */}
            {loaded ? (
              <View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "baseline",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 64,
                      fontFamily: "ClashDisplay-Bold",
                      color: isDark
                        ? "hsl(148,8%,94%)"
                        : "hsl(148,28%,8%)",
                      letterSpacing: -2,
                      lineHeight: 68,
                    }}
                  >
                    {teamKm.toFixed(1)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 20,
                      fontFamily: fonts.bodyMedium,
                      color: isDark
                        ? "hsl(148,5%,52%)"
                        : "hsl(148,18%,40%)",
                      marginBottom: 6,
                    }}
                  >
                    km
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: fonts.bodyRegular,
                    color: isDark
                      ? "hsl(148,5%,52%)"
                      : "hsl(148,18%,42%)",
                    marginBottom: 14,
                  }}
                >
                  Team distance this week
                </Text>
                {memberCount > 0 && (
                  <View>
                    <View
                      style={{
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.09)"
                          : "rgba(0,0,0,0.09)",
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
                        fontSize: 11,
                        fontFamily: fonts.bodyRegular,
                        color: isDark
                          ? "hsl(148,5%,50%)"
                          : "hsl(148,18%,44%)",
                        marginTop: 7,
                      }}
                    >
                      {activeCount} of {memberCount} athletes ran this week
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <HeroSkeleton />
            )}
          </View>

          {/* ── Floating Content Card ─────────────────────── */}
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              marginTop: -28,
              paddingTop: 12,
              paddingBottom: 56 + insets.bottom,
              minHeight: 560,
            }}
          >
            {/* Drag pill */}
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(0,0,0,0.10)",
                alignSelf: "center",
                marginBottom: 28,
              }}
            />

            {/* Compact stats strip — always visible, data from Redux */}
            <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
              <View
                style={{
                  flexDirection: "row",
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  backgroundColor: cardBg,
                  overflow: "hidden",
                }}
              >
                <StatPill
                  label="Athletes"
                  value={memberCount}
                  accent={colors.accent}
                />
                <View style={{ width: 1, backgroundColor: cardBorder }} />
                <StatPill
                  label="Youth"
                  value={youthCount}
                  accent={isDark ? "hsl(220,30%,72%)" : "hsl(220,40%,55%)"}
                />
                <View style={{ width: 1, backgroundColor: cardBorder }} />
                <StatPill
                  label="Adults"
                  value={adultCount}
                  accent={isDark ? "hsl(160,25%,62%)" : "hsl(160,35%,42%)"}
                />
              </View>
            </View>

            {/* Leaderboard preview */}
            {loaded && leaderboard.length > 0 && (
              <View style={{ marginBottom: 28 }}>
                <LeaderboardPreview leaderboard={leaderboard} />
              </View>
            )}
            {!loaded && (
              <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
                <SkeletonBlock height={110} borderRadius={18} />
              </View>
            )}

            {/* Actions list */}
            <View style={{ paddingHorizontal: 20 }}>
              <SectionLabel label="Actions" />
              <View
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  backgroundColor: cardBg,
                  overflow: "hidden",
                }}
              >
                <ActionRow
                  icon="people-outline"
                  label="Roster"
                  subtitle={`${memberCount} athlete${memberCount !== 1 ? "s" : ""}`}
                  accent={colors.accent}
                  isFirst
                  onPress={() => router.push("/team-manager/roster")}
                />
                <ActionRow
                  icon="chatbubbles-outline"
                  label="Messages"
                  accent={colors.cyan}
                  onPress={() => router.push("/(tabs)/messages" as any)}
                />
                <ActionRow
                  icon="megaphone-outline"
                  label="Announcements"
                  accent={colors.amber}
                  onPress={() => router.push("/announcements" as any)}
                />
                <ActionRow
                  icon="calendar-outline"
                  label="Schedule"
                  accent={colors.purple}
                  onPress={() => router.push("/(tabs)/schedule")}
                />
                <ActionRow
                  icon="analytics-outline"
                  label="Stats"
                  accent={colors.coral}
                  onPress={() =>
                    router.push("/(tabs)/tracking/social" as any)
                  }
                />
                <ActionRow
                  icon="settings-outline"
                  label="Team Settings"
                  accent={colors.textSecondary}
                  isLast
                  onPress={() =>
                    router.push(
                      "/(tabs)/tracking/team-settings" as any,
                    )
                  }
                />
              </View>
            </View>
          </View>

        </Animated.View>
      </ScrollView>
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
        marginBottom: 12,
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
// HeroSkeleton
// ─────────────────────────────────────────────────────────────────────────────

function HeroSkeleton() {
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
    outputRange: [0.2, 0.45],
  });

  const bg = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";

  return (
    <View style={{ gap: 10 }}>
      <Animated.View
        style={{
          height: 68,
          width: "72%",
          borderRadius: 14,
          backgroundColor: bg,
          opacity,
        }}
      />
      <Animated.View
        style={{
          height: 4,
          width: "100%",
          borderRadius: 2,
          backgroundColor: bg,
          opacity,
        }}
      />
      <Animated.View
        style={{
          height: 12,
          width: "52%",
          borderRadius: 6,
          backgroundColor: bg,
          opacity,
        }}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatPill — one third of the compact stats strip
// ─────────────────────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  const { isDark } = useAppTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 8,
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontFamily: "ClashDisplay-Bold",
          color: isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,8%)",
          letterSpacing: -0.5,
          lineHeight: 32,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 10,
          fontFamily: fonts.labelBold,
          color: isDark ? "hsl(220,5%,46%)" : "hsl(220,5%,52%)",
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginTop: 3,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LeaderboardPreview
// ─────────────────────────────────────────────────────────────────────────────

function LeaderboardPreview({
  leaderboard,
}: {
  leaderboard: SocialLeaderboardItem[];
}) {
  const { colors, isDark } = useAppTheme();
  const top = leaderboard.slice(0, 8);

  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          paddingHorizontal: 20,
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
        contentContainerStyle={{ paddingHorizontal: 20 }}
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
// ActionRow — full-width list row with divider
// ─────────────────────────────────────────────────────────────────────────────

function ActionRow({
  icon,
  label,
  subtitle,
  accent,
  isFirst,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  accent: string;
  isFirst?: boolean;
  isLast?: boolean;
  onPress: () => void;
}) {
  const { colors, isDark } = useAppTheme();

  return (
    <View>
      {!isFirst && (
        <View
          style={{
            height: 1,
            backgroundColor: isDark ? colors.borderSubtle : colors.borderMid,
            marginLeft: 66,
          }}
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => ({
          backgroundColor: pressed
            ? isDark
              ? "rgba(255,255,255,0.04)"
              : "rgba(0,0,0,0.03)"
            : "transparent",
        })}
      >
        {/* Static layout View — flexDirection must NOT be in the Pressable style function */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: subtitle !== undefined ? 13 : 15,
            gap: 14,
          }}
        >
          {/* Icon pill */}
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? `${accent}22` : `${accent}18`,
            }}
          >
            <Ionicons name={icon} size={18} color={accent} />
          </View>

          {/* Label + subtitle */}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontFamily: fonts.bodyBold,
                color: isDark ? "hsl(220,5%,92%)" : "hsl(220,8%,10%)",
              }}
            >
              {label}
            </Text>
            {subtitle !== undefined && (
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: fonts.bodyRegular,
                  color: colors.textSecondary,
                  marginTop: 1,
                }}
              >
                {subtitle}
              </Text>
            )}
          </View>

          {/* Chevron */}
          <Ionicons
            name="chevron-forward"
            size={14}
            color={isDark ? "hsl(220,5%,36%)" : "hsl(220,5%,65%)"}
          />
        </View>
      </Pressable>
    </View>
  );
}
