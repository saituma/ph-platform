import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router } from "expo-router";
import {
  Users,
  UserPlus,
  Megaphone,
  Calendar,
  Trophy,
  BarChart3,
  ShieldCheck,
  ChevronRight,
  GraduationCap,
  User,
} from "lucide-react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { fetchRoster, type RosterResponse } from "@/services/teamManager/rosterService";

// ─────────────────────────────────────────────────────────────────────────────
// TeamManagerManageScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function TeamManagerManageScreen() {
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();
  const { authTeamMembership, appRole, token } = useAppSelector((s) => s.user);

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
    if (!token) return;
    try {
      const res = await fetchRoster(token, forceRefresh);
      setRoster(res ?? null);
    } catch {
      // silent
    }
  }, [token]);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

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

          {/* ── Hero ─────────────────────────────────────── */}
          <View
            style={{
              paddingTop: insets.top + 32,
              paddingHorizontal: 24,
              paddingBottom: 52,
              overflow: "hidden",
            }}
          >
            {/* Title */}
            <Text
              style={{
                fontSize: 36,
                fontFamily: "Outfit-Bold",
                color: p.textPrimary,
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
                fontFamily: "Outfit-Regular",
                color: p.textSecondary,
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
                marginBottom: 20,
              }}
            >
              <CountBadge value={memberCount} label="athletes" icon={Users} />
              {youthCount > 0 && (
                <CountBadge value={youthCount} label="youth" icon={GraduationCap} accent />
              )}
              {adultCount > 0 && (
                <CountBadge value={adultCount} label="adults" icon={User} />
              )}
            </View>

            {/* ── Add Athlete CTA ── */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => router.push("/team-manager/add-athlete" as any)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 7,
                  backgroundColor: p.accent,
                  paddingHorizontal: 18,
                  paddingVertical: 11,
                  borderRadius: 100,
                  opacity: pressed ? 0.82 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <UserPlus size={15} color={p.buttonPrimaryText} />
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Outfit-Bold",
                    color: p.buttonPrimaryText,
                  }}
                >
                  Add Athlete
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/team-manager/roster")}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 7,
                  backgroundColor: p.accentSoft,
                  paddingHorizontal: 18,
                  paddingVertical: 11,
                  borderRadius: 100,
                  opacity: pressed ? 0.72 : 1,
                })}
              >
                <Users size={15} color={p.textSecondary} />
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Outfit-Bold",
                    color: p.textSecondary,
                  }}
                >
                  View All
                </Text>
              </Pressable>
            </View>
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
              minHeight: 520,
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
                      fontFamily: "Outfit-Bold",
                      fontSize: 11,
                      letterSpacing: 1.2,
                      color: p.textMuted,
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
                        fontFamily: "Outfit-Regular",
                        color: p.accent,
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
                    borderRadius: 22,
                    backgroundColor: p.cardSage,
                    padding: 28,
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Users size={32} color={p.textMuted} />
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Outfit-Bold",
                      color: p.textPrimary,
                      textAlign: "center",
                    }}
                  >
                    No athletes yet
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Outfit-Regular",
                      color: p.textSecondary,
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
                  borderRadius: 22,
                  backgroundColor: p.cardWhite,
                  overflow: "hidden",
                }}
              >
                <ManageRow
                  icon={Users}
                  label="View Roster"
                  subtitle="View and edit athlete profiles"
                  accent={p.accent}
                  isFirst
                  onPress={() => router.push("/team-manager/roster")}
                />
                <ManageRow
                  icon={UserPlus}
                  label="Add Athlete"
                  subtitle="Invite a new athlete to your team"
                  accent={p.info}
                  onPress={() => router.push("/team-manager/add-athlete" as any)}
                />
                <ManageRow
                  icon={Megaphone}
                  label="Announcements"
                  subtitle="Post updates for your team"
                  accent={p.warning}
                  onPress={() => router.push("/announcements" as any)}
                />
              </View>
            </View>

            {/* ── Schedule & Stats section ───────────────── */}
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <SectionLabel label="Schedule & Stats" />
              <View
                style={{
                  borderRadius: 22,
                  backgroundColor: p.cardWhite,
                  overflow: "hidden",
                }}
              >
                <ManageRow
                  icon={Calendar}
                  label="Sessions & Events"
                  subtitle="View and manage training sessions"
                  accent={p.info}
                  isFirst
                  onPress={() => router.push("/team-manager/sessions" as any)}
                />
                <ManageRow
                  icon={Trophy}
                  label="Leaderboard"
                  subtitle="View rankings and weekly activity"
                  accent={p.warning}
                  onPress={() => router.push("/team-manager/leaderboard" as any)}
                />
                <ManageRow
                  icon={BarChart3}
                  label="Athlete Activity"
                  subtitle="Monitor runs and performance stats"
                  accent={p.danger}
                  onPress={() => router.push("/team-manager/activity" as any)}
                />
              </View>
            </View>

            {/* ── Settings section ──────────────────────── */}
            <View style={{ paddingHorizontal: 20 }}>
              <SectionLabel label="Settings" />
              <View
                style={{
                  borderRadius: 22,
                  backgroundColor: p.cardWhite,
                  overflow: "hidden",
                }}
              >
                <ManageRow
                  icon={ShieldCheck}
                  label="Privacy & Visibility"
                  subtitle="Control who can see team activity"
                  accent={p.info}
                  isFirst
                  onPress={() => router.push("/team-manager/settings" as any)}
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
// CountBadge
// ─────────────────────────────────────────────────────────────────────────────

function CountBadge({
  value,
  label,
  icon: Icon,
  accent,
}: {
  value: number;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  accent?: boolean;
}) {
  const p = useAdminPastel();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: accent ? p.successSoft : p.accentSoft,
        borderRadius: 100,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      <Icon
        size={11}
        color={accent ? p.accent : p.textSecondary}
      />
      <Text
        style={{
          fontSize: 12,
          fontFamily: "Outfit-Regular",
          color: accent ? p.accent : p.textSecondary,
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
  const p = useAdminPastel();

  const initials = (athlete.name ?? "?")
    .trim()
    .split(/\s+/)
    .map((w: string) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
            backgroundColor: p.cardSage,
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
                fontFamily: "Outfit-Bold",
                color: p.accent,
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
            fontFamily: "Outfit-Regular",
            color: p.textSecondary,
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
  icon: Icon,
  label,
  subtitle,
  accent,
  isFirst,
  onPress,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  subtitle: string;
  accent: string;
  isFirst?: boolean;
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
              backgroundColor: `${accent}18`,
            }}
          >
            <Icon size={18} color={accent} />
          </View>

          {/* Text */}
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
          </View>

          {/* Chevron */}
          <ChevronRight size={14} color={p.textMuted} />
        </View>
      </Pressable>
    </View>
  );
}
