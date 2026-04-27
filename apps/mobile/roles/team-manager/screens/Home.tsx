import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, View } from "react-native";
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

export default function TeamManagerHomeScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const { authTeamMembership, managedAthletes, token, appRole } =
    useAppSelector((state) => state.user);

  const [refreshing, setRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<SocialLeaderboardItem[]>([]);
  const [loaded, setLoaded] = useState(false);

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

  const cardBg = isDark ? "hsl(220, 8%, 12%)" : colors.card;
  const cardBorder = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(15,23,42,0.06)";
  const labelColor = isDark ? "hsl(220, 5%, 55%)" : "hsl(220, 5%, 45%)";

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  if (appRole !== "team_manager") return null;

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
        {/* Title */}
        <View style={{ paddingTop: 40, marginBottom: 24, paddingHorizontal: 24 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 6,
            }}
          >
            <View
              style={{
                height: 32,
                width: 6,
                borderRadius: 99,
                backgroundColor: colors.accent,
              }}
            />
            <Text
              numberOfLines={1}
              style={{
                fontSize: 44,
                fontFamily: "TelmaBold",
                color: isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,10%)",
                letterSpacing: -0.5,
              }}
            >
              Team
            </Text>
          </View>
          <Text
            numberOfLines={2}
            style={{
              fontSize: 15,
              fontFamily: "Outfit",
              color: labelColor,
              lineHeight: 22,
            }}
          >
            {teamName}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24, gap: 12 }}>
          {/* Stats row */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <StatTile
              label="Athletes"
              value={String(memberCount)}
              icon="people-outline"
              accent={colors.accent}
              isDark={isDark}
              cardBg={cardBg}
              cardBorder={cardBorder}
            />
            <StatTile
              label="Youth"
              value={String(youthCount)}
              icon="school-outline"
              accent={isDark ? "hsl(220,30%,70%)" : "hsl(220,40%,55%)"}
              isDark={isDark}
              cardBg={cardBg}
              cardBorder={cardBorder}
            />
            <StatTile
              label="Adults"
              value={String(adultCount)}
              icon="body-outline"
              accent={isDark ? "hsl(160,25%,60%)" : "hsl(160,35%,42%)"}
              isDark={isDark}
              cardBg={cardBg}
              cardBorder={cardBorder}
            />
          </View>

          {/* Team activity summary */}
          {loaded && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <StatTile
                label="Team KM"
                value={teamKm.toFixed(1)}
                icon="speedometer-outline"
                accent={colors.accent}
                isDark={isDark}
                cardBg={cardBg}
                cardBorder={cardBorder}
              />
              <StatTile
                label="Active"
                value={String(activeCount)}
                icon="flash-outline"
                accent={isDark ? "hsl(155,30%,55%)" : "hsl(155,40%,40%)"}
                isDark={isDark}
                cardBg={cardBg}
                cardBorder={cardBorder}
              />
            </View>
          )}

          {!loaded && (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          )}

          {/* Quick Actions */}
          <Text
            style={{
              fontFamily: fonts.bodyBold,
              fontSize: 11,
              letterSpacing: 1.2,
              color: labelColor,
              textTransform: "uppercase",
              paddingLeft: 4,
              marginTop: 4,
            }}
          >
            Quick Actions
          </Text>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <QuickActionTile
              icon="people-outline"
              label="Roster"
              accent={colors.accent}
              isDark={isDark}
              cardBg={cardBg}
              cardBorder={cardBorder}
              onPress={() => router.push("/team-manager/roster")}
            />
            <QuickActionTile
              icon="chatbubbles-outline"
              label="Messages"
              accent={isDark ? "hsl(200,25%,60%)" : "hsl(200,40%,45%)"}
              isDark={isDark}
              cardBg={cardBg}
              cardBorder={cardBorder}
              onPress={() => router.push("/(tabs)/messages" as any)}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <QuickActionTile
              icon="calendar-outline"
              label="Schedule"
              accent={isDark ? "hsl(270,25%,65%)" : "hsl(270,35%,50%)"}
              isDark={isDark}
              cardBg={cardBg}
              cardBorder={cardBorder}
              onPress={() => router.push("/(tabs)/schedule")}
            />
            <QuickActionTile
              icon="analytics-outline"
              label="Stats"
              accent={isDark ? "hsl(40,30%,60%)" : "hsl(40,45%,45%)"}
              isDark={isDark}
              cardBg={cardBg}
              cardBorder={cardBorder}
              onPress={() =>
                router.push("/(tabs)/tracking/social" as any)
              }
            />
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <QuickActionTile
              icon="megaphone-outline"
              label="Announcements"
              accent={isDark ? "hsl(30,30%,60%)" : "hsl(30,45%,45%)"}
              isDark={isDark}
              cardBg={cardBg}
              cardBorder={cardBorder}
              onPress={() => router.push("/announcements" as any)}
            />
            <QuickActionTile
              icon="settings-outline"
              label="Team Settings"
              accent={labelColor}
              isDark={isDark}
              cardBg={cardBg}
              cardBorder={cardBorder}
              onPress={() =>
                router.push("/(tabs)/tracking/team-settings" as any)
              }
            />
          </View>
        </View>
      </ThemedScrollView>
    </View>
  );
}

// ── StatTile ───────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  icon,
  accent,
  isDark,
  cardBg,
  cardBorder,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  isDark: boolean;
  cardBg: string;
  cardBorder: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 20,
        borderWidth: 1,
        padding: 14,
        gap: 8,
        backgroundColor: cardBg,
        borderColor: cardBorder,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDark ? `${accent}18` : `${accent}14`,
        }}
      >
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <Text
        style={{
          fontSize: 28,
          fontFamily: "ClashDisplay-Bold",
          color: isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,10%)",
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 11,
          fontFamily: fonts.bodyBold,
          color: isDark ? "hsl(220,5%,50%)" : "hsl(220,5%,48%)",
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ── QuickActionTile ────────────────────────────────────────────────────────

function QuickActionTile({
  icon,
  label,
  accent,
  isDark,
  cardBg,
  cardBorder,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accent: string;
  isDark: boolean;
  cardBg: string;
  cardBorder: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        minHeight: 88,
        backgroundColor: cardBg,
        borderColor: cardBorder,
        opacity: pressed ? 0.8 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDark ? `${accent}18` : `${accent}14`,
        }}
      >
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <Text
        style={{
          fontSize: 13,
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
