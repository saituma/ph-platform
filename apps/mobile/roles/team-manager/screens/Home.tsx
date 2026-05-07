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
import {
  Users,
  ChevronRight,
  MessageCircle,
  Megaphone,
  Calendar,
  BarChart3,
  Settings,
  Zap,
} from "lucide-react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import {
  fetchLeaderboard,
  type SocialLeaderboardItem,
} from "@/services/tracking/socialService";
import { fetchRoster, type RosterResponse } from "@/services/teamManager/rosterService";

// ─────────────────────────────────────────────────────────────────────────────
// TeamManagerHomeScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function TeamManagerHomeScreen() {
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();
  const { authTeamMembership, token, appRole } =
    useAppSelector((state) => state.user);

  const [refreshing, setRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<SocialLeaderboardItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [roster, setRoster] = useState<RosterResponse | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const members = useMemo(
    () => (Array.isArray(roster?.members) ? roster!.members! : []),
    [roster],
  );
  const teamName =
    roster?.team?.name?.trim() ||
    authTeamMembership?.team ||
    "Your Team";
  const memberCount = roster?.team?.memberCount ?? members.length;

  const youthCount = useMemo(
    () => members.filter((a) => a.athleteType === "youth").length,
    [members],
  );
  const adultCount = useMemo(
    () => members.filter((a) => a.athleteType === "adult").length,
    [members],
  );
  const activeCount = useMemo(
    () => leaderboard.filter((l) => l.kmTotal > 0).length,
    [leaderboard],
  );
  const teamKm = useMemo(
    () => leaderboard.reduce((s, l) => s + l.kmTotal, 0),
    [leaderboard],
  );

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!token) return;
    try {
      const [rosterRes, leaderboardRes] = await Promise.allSettled([
        fetchRoster(token, forceRefresh),
        fetchLeaderboard(token, { windowDays: 7, limit: 100, useTeamFeed: true }),
      ]);
      if (rosterRes.status === "fulfilled") setRoster(rosterRes.value ?? null);
      if (leaderboardRes.status === "fulfilled") setLeaderboard(leaderboardRes.value?.items ?? []);
    } catch {
      // silent
    } finally {
      setLoaded(true);
    }
  }, [token]);

  useEffect(() => {
    void fetchData();
    const fallback = setTimeout(() => setLoaded(true), 5000);
    return () => clearTimeout(fallback);
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
    await fetchData(true);
    setRefreshing(false);
  }, [fetchData]);

  if (appRole !== "team_manager") return null;

  const participationPct =
    memberCount > 0 ? Math.min((activeCount / memberCount) * 100, 100) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={p.accent}
            colors={[p.accent]}
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
            {/* Team name */}
            <Text
              numberOfLines={1}
              style={{
                fontSize: 36,
                fontFamily: "Outfit-Bold",
                color: p.textPrimary,
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
                  backgroundColor: p.accentSoft,
                  borderRadius: 100,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Users size={11} color={p.textSecondary} />
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Outfit-Regular",
                    color: p.textSecondary,
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
                    backgroundColor: p.successSoft,
                    borderRadius: 100,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: p.accent,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Outfit-Regular",
                      color: p.accent,
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
                      fontFamily: "Outfit-Bold",
                      color: p.textPrimary,
                      letterSpacing: -2,
                      lineHeight: 68,
                    }}
                  >
                    {teamKm.toFixed(1)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 20,
                      fontFamily: "Outfit-Regular",
                      color: p.textSecondary,
                      marginBottom: 6,
                    }}
                  >
                    km
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Outfit-Regular",
                    color: p.textMuted,
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
                        backgroundColor: p.divider,
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          height: "100%",
                          width: `${participationPct}%`,
                          borderRadius: 2,
                          backgroundColor: p.accent,
                        }}
                      />
                    </View>
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Outfit-Regular",
                        color: p.textMuted,
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
              backgroundColor: p.cardWhite,
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
                backgroundColor: p.divider,
                alignSelf: "center",
                marginBottom: 28,
              }}
            />

            {/* Compact stats strip */}
            <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
              <View
                style={{
                  flexDirection: "row",
                  borderRadius: 22,
                  backgroundColor: p.cardSage,
                  overflow: "hidden",
                }}
              >
                <StatPill label="Athletes" value={memberCount} />
                <View style={{ width: 1, backgroundColor: p.divider }} />
                <StatPill label="Youth" value={youthCount} />
                <View style={{ width: 1, backgroundColor: p.divider }} />
                <StatPill label="Adults" value={adultCount} />
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
                <SkeletonBlock height={110} borderRadius={22} />
              </View>
            )}

            {/* Actions list */}
            <View style={{ paddingHorizontal: 20 }}>
              <SectionLabel label="Actions" />
              <View
                style={{
                  borderRadius: 22,
                  backgroundColor: p.cardWhite,
                  overflow: "hidden",
                }}
              >
                <ActionRow
                  icon={Users}
                  label="Roster"
                  subtitle={`${memberCount} athlete${memberCount !== 1 ? "s" : ""}`}
                  accent={p.accent}
                  isFirst
                  onPress={() => router.push("/team-manager/roster")}
                />
                <ActionRow
                  icon={MessageCircle}
                  label="Messages"
                  accent={p.info}
                  onPress={() => router.push("/(tabs)/messages" as any)}
                />
                <ActionRow
                  icon={Megaphone}
                  label="Announcements"
                  accent={p.warning}
                  onPress={() => router.push("/announcements" as any)}
                />
                <ActionRow
                  icon={Calendar}
                  label="Schedule"
                  accent={p.info}
                  onPress={() => router.push("/(tabs)/schedule")}
                />
                <ActionRow
                  icon={BarChart3}
                  label="Stats"
                  accent={p.danger}
                  onPress={() =>
                    router.push("/(tabs)/tracking/social" as any)
                  }
                />
                <ActionRow
                  icon={Settings}
                  label="Team Settings"
                  accent={p.textMuted}
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
  const p = useAdminPastel();
  return (
    <Text
      style={{
        fontFamily: "Outfit-Bold",
        fontSize: 11,
        letterSpacing: 1.2,
        color: p.textMuted,
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
  const p = useAdminPastel();
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
          backgroundColor: p.divider,
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
  const p = useAdminPastel();
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

  return (
    <View style={{ gap: 10 }}>
      <Animated.View
        style={{
          height: 68,
          width: "72%",
          borderRadius: 14,
          backgroundColor: p.divider,
          opacity,
        }}
      />
      <Animated.View
        style={{
          height: 4,
          width: "100%",
          borderRadius: 2,
          backgroundColor: p.divider,
          opacity,
        }}
      />
      <Animated.View
        style={{
          height: 12,
          width: "52%",
          borderRadius: 6,
          backgroundColor: p.divider,
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
}) {
  const p = useAdminPastel();

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
          fontFamily: "Outfit-Bold",
          color: p.textPrimary,
          letterSpacing: -0.5,
          lineHeight: 32,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 10,
          fontFamily: "Outfit-Bold",
          color: p.textMuted,
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
  const p = useAdminPastel();
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
            fontFamily: "Outfit-Bold",
            fontSize: 11,
            letterSpacing: 1.2,
            color: p.textMuted,
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
              fontFamily: "Outfit-Regular",
              color: p.accent,
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
  const p = useAdminPastel();

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
    : p.textMuted;

  return (
    <View
      style={{
        borderRadius: 22,
        backgroundColor: p.cardWhite,
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
            fontFamily: "Outfit-Bold",
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
          backgroundColor: p.accentSoft,
          borderWidth: 1,
          borderColor: p.divider,
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
              fontFamily: "Outfit-Bold",
              color: p.textSecondary,
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
          fontFamily: "Outfit-Regular",
          color: p.textSecondary,
          textAlign: "center",
          maxWidth: 70,
        }}
      >
        {item.name.split(" ")[0]}
      </Text>

      <Text
        style={{
          fontSize: 13,
          fontFamily: "Outfit-Bold",
          color: p.textPrimary,
          letterSpacing: -0.3,
        }}
      >
        {item.kmTotal.toFixed(1)}
        <Text
          style={{
            fontSize: 9,
            fontFamily: "Outfit-Regular",
            color: p.textMuted,
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
  icon: Icon,
  label,
  subtitle,
  accent,
  isFirst,
  onPress,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  subtitle?: string;
  accent: string;
  isFirst?: boolean;
  isLast?: boolean;
  onPress: () => void;
}) {
  const p = useAdminPastel();

  return (
    <View>
      {!isFirst && (
        <View
          style={{
            height: 1,
            backgroundColor: p.divider,
            marginLeft: 66,
          }}
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => ({
          backgroundColor: pressed ? p.accentSoft : "transparent",
        })}
      >
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
              backgroundColor: `${accent}18`,
            }}
          >
            <Icon size={18} color={accent} />
          </View>

          {/* Label + subtitle */}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontFamily: "Outfit-Bold",
                color: p.textPrimary,
              }}
            >
              {label}
            </Text>
            {subtitle !== undefined && (
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Outfit-Regular",
                  color: p.textSecondary,
                  marginTop: 1,
                }}
              >
                {subtitle}
              </Text>
            )}
          </View>

          {/* Chevron */}
          <ChevronRight size={14} color={p.textMuted} />
        </View>
      </Pressable>
    </View>
  );
}
