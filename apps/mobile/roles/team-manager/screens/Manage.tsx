import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { fonts } from "@/constants/theme";
import { fetchRoster, type RosterResponse } from "@/services/teamManager/rosterService";

// ─────────────────────────────────────────────────────────────────────────────
// TeamManagerManageScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function TeamManagerManageScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const { authTeamMembership, appRole, token } = useAppSelector((s) => s.user);
  const bootstrapReady = useAppSelector((s) => s.app.bootstrapReady);

  const [roster, setRoster] = useState<RosterResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const members = useMemo(
    () => (Array.isArray(roster?.members) ? roster!.members! : []),
    [roster],
  );
  const memberCount = roster?.team?.memberCount ?? members.length;
  const youthCount = useMemo(
    () => members.filter((a) => a.athleteType === "youth").length,
    [members],
  );
  const adultCount = useMemo(
    () => members.filter((a) => a.athleteType === "adult").length,
    [members],
  );
  const teamName =
    roster?.team?.name?.trim() || authTeamMembership?.team || "Your Team";

  const loadRoster = useCallback(async (forceRefresh = false) => {
    if (!token || !bootstrapReady) return;
    try {
      const res = await fetchRoster(token, forceRefresh);
      setRoster(res ?? null);
    } catch {
      // silent
    }
  }, [token, bootstrapReady]);

  useEffect(() => {
    if (bootstrapReady) void loadRoster();
  }, [loadRoster, bootstrapReady]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRoster(true);
    setRefreshing(false);
  }, [loadRoster]);

  if (appRole !== "team_manager") return null;

  const heroBg = isDark ? "hsl(148,18%,6%)" : "hsl(148,22%,96%)";
  const cardBg = colors.surfaceHigh;
  const cardBorder = isDark ? colors.borderMid : colors.borderMid;

  return (
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

          {/* ── Hero ─────────────────────────────────────── */}
          <View
            style={{
              paddingTop: insets.top + 32,
              paddingHorizontal: 24,
              paddingBottom: 52,
              overflow: "hidden",
            }}
          >
            {/* Ambient glow */}
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

            {/* Title */}
            <Text
              style={{
                fontSize: 36,
                fontFamily: "TelmaBold",
                color: isDark ? "hsl(148,8%,94%)" : "hsl(148,28%,10%)",
                letterSpacing: -0.5,
                lineHeight: 42,
                marginBottom: 10,
              }}
            >
              Roster
            </Text>

            {/* Team name sub-label */}
            <Text
              numberOfLines={1}
              style={{
                fontSize: 13,
                fontFamily: fonts.bodyMedium,
                color: isDark ? "hsl(148,5%,55%)" : "hsl(148,18%,40%)",
                marginBottom: 16,
              }}
            >
              {teamName}
            </Text>

            {/* Count badges */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <CountBadge
                value={memberCount}
                label="athletes"
                icon="people-outline"
              />
              {youthCount > 0 && (
                <CountBadge
                  value={youthCount}
                  label="youth"
                  icon="school-outline"
                  accent
                />
              )}
              {adultCount > 0 && (
                <CountBadge
                  value={adultCount}
                  label="adults"
                  icon="body-outline"
                />
              )}
            </View>
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
              minHeight: 520,
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

            {/* Athlete avatar strip */}
            {members.length > 0 ? (
              <View style={{ marginBottom: 28 }}>
                <View
                  style={{
                    paddingHorizontal: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
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
                    Athletes
                  </Text>
                  <Pressable
                    onPress={() => router.push("/team-manager/roster")}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: fonts.bodyMedium,
                        color: colors.accent,
                      }}
                    >
                      View all
                    </Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                >
                  {members.slice(0, 10).map((athlete, index) => (
                    <View
                      key={athlete.athleteId ?? index}
                      style={{
                        marginRight:
                          index < Math.min(members.length, 10) - 1
                            ? 10
                            : 0,
                      }}
                    >
                      <AthleteAvatar
                        athlete={{ id: athlete.athleteId, name: athlete.name, profilePicture: athlete.profilePicture }}
                        onPress={() =>
                          athlete.athleteId !== undefined
                            ? router.push(
                                `/team-manager/athlete/${athlete.athleteId}` as any,
                              )
                            : router.push("/team-manager/roster")
                        }
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : (
              /* Empty state */
              <View
                style={{
                  paddingHorizontal: 20,
                  marginBottom: 28,
                }}
              >
                <View
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: cardBorder,
                    backgroundColor: cardBg,
                    padding: 28,
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons
                    name="people-outline"
                    size={32}
                    color={isDark ? "hsl(220,5%,40%)" : "hsl(220,5%,65%)"}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: fonts.bodyBold,
                      color: isDark ? "hsl(220,5%,70%)" : "hsl(220,8%,30%)",
                      textAlign: "center",
                    }}
                  >
                    No athletes yet
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: fonts.bodyRegular,
                      color: colors.textSecondary,
                      textAlign: "center",
                    }}
                  >
                    Athletes will appear here once they join your team.
                  </Text>
                </View>
              </View>
            )}

            {/* ── Manage section ────────────────────────── */}
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <SectionLabel label="Manage" />
              <View
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  backgroundColor: cardBg,
                  overflow: "hidden",
                }}
              >
                <ManageRow
                  icon="people-outline"
                  label="View Roster"
                  subtitle="View and edit athlete profiles"
                  accent={colors.accent}
                  isFirst
                  onPress={() => router.push("/team-manager/roster")}
                />
                <ManageRow
                  icon="person-add-outline"
                  label="Add Athlete"
                  subtitle="Invite a new athlete to your team"
                  accent={colors.cyan}
                  onPress={() => router.push("/team-manager/add-athlete" as any)}
                />
                <ManageRow
                  icon="megaphone-outline"
                  label="Announcements"
                  subtitle="Post updates for your team"
                  accent={colors.amber}
                  onPress={() => router.push("/announcements" as any)}
                />
              </View>
            </View>

            {/* ── Schedule & Stats section ───────────────── */}
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <SectionLabel label="Schedule & Stats" />
              <View
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  backgroundColor: cardBg,
                  overflow: "hidden",
                }}
              >
                <ManageRow
                  icon="calendar-outline"
                  label="Sessions & Events"
                  subtitle="View and manage training sessions"
                  accent={colors.purple}
                  isFirst
                  onPress={() => router.push("/(tabs)/schedule")}
                />
                <ManageRow
                  icon="trophy-outline"
                  label="Leaderboard"
                  subtitle="View rankings and weekly activity"
                  accent={colors.amber}
                  onPress={() =>
                    router.push("/(tabs)/tracking/social" as any)
                  }
                />
                <ManageRow
                  icon="analytics-outline"
                  label="Athlete Activity"
                  subtitle="Monitor runs and performance stats"
                  accent={colors.coral}
                  onPress={() => router.push("/(tabs)/tracking" as any)}
                />
              </View>
            </View>

            {/* ── Settings section ──────────────────────── */}
            <View style={{ paddingHorizontal: 20 }}>
              <SectionLabel label="Settings" />
              <View
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  backgroundColor: cardBg,
                  overflow: "hidden",
                }}
              >
                <ManageRow
                  icon="shield-checkmark-outline"
                  label="Privacy & Visibility"
                  subtitle="Control who can see team activity"
                  accent={colors.purple}
                  isFirst
                  onPress={() =>
                    router.push("/(tabs)/tracking/team-settings" as any)
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
// CountBadge
// ─────────────────────────────────────────────────────────────────────────────

function CountBadge({
  value,
  label,
  icon,
  accent,
}: {
  value: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: boolean;
}) {
  const { colors, isDark } = useAppTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: accent
          ? colors.accentLight
          : isDark
            ? "rgba(255,255,255,0.07)"
            : "rgba(0,0,0,0.06)",
        borderRadius: 99,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: accent ? 1 : 0,
        borderColor: accent ? colors.borderLime : "transparent",
      }}
    >
      <Ionicons
        name={icon}
        size={11}
        color={
          accent
            ? colors.accent
            : isDark
              ? "hsl(148,5%,60%)"
              : "hsl(148,18%,38%)"
        }
      />
      <Text
        style={{
          fontSize: 12,
          fontFamily: fonts.bodyMedium,
          color: accent
            ? colors.accent
            : isDark
              ? "hsl(148,5%,60%)"
              : "hsl(148,18%,38%)",
        }}
      >
        {value} {label}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AthleteAvatar
// ─────────────────────────────────────────────────────────────────────────────

function AthleteAvatar({
  athlete,
  onPress,
}: {
  athlete: { id?: number; name?: string | null; profilePicture?: string | null };
  onPress: () => void;
}) {
  const { colors, isDark } = useAppTheme();

  const initials = (athlete.name ?? "?")
    .trim()
    .split(/\s+/)
    .map((w: string) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const cardBg = isDark ? colors.surfaceHigh : colors.cardElevated;
  const cardBorder = isDark ? colors.borderMid : colors.borderMid;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.75 : 1,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <View
        style={{
          alignItems: "center",
          gap: 6,
          width: 64,
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: cardBorder,
            overflow: "hidden",
          }}
        >
          {athlete.profilePicture ? (
            <Image
              source={{ uri: athlete.profilePicture }}
              style={{ width: 52, height: 52 }}
            />
          ) : (
            <Text
              style={{
                fontSize: 16,
                fontFamily: "ClashDisplay-Bold",
                color: colors.accent,
              }}
            >
              {initials}
            </Text>
          )}
        </View>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 10,
            fontFamily: fonts.bodyMedium,
            color: isDark ? "hsl(220,5%,72%)" : "hsl(220,8%,28%)",
            textAlign: "center",
            maxWidth: 62,
          }}
        >
          {(athlete.name ?? "Athlete").split(" ")[0]}
        </Text>
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ManageRow
// ─────────────────────────────────────────────────────────────────────────────

function ManageRow({
  icon,
  label,
  subtitle,
  accent,
  isFirst,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  accent: string;
  isFirst?: boolean;
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
        {/* Static layout — flexDirection MUST be in a plain View, not Pressable style fn */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 14,
            gap: 14,
          }}
        >
          {/* Icon */}
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? `${accent}22` : `${accent}18`,
            }}
          >
            <Ionicons name={icon} size={18} color={accent} />
          </View>

          {/* Text */}
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
