import React, { useEffect, useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAdminTeams } from "@/hooks/admin/useAdminTeams";

type Props = {
  controller: ReturnType<typeof useAdminTeams>;
  canLoad: boolean;
};

const TEAM_ACCENT = "#34C759";

export function AdminTeamsListSection({ controller, canLoad }: Props) {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!canLoad) return;
    void controller.load(false);
  }, [canLoad, controller.load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return controller.teams;
    return controller.teams.filter((t) =>
      String(t.team ?? "")
        .toLowerCase()
        .includes(q),
    );
  }, [controller.teams, query]);

  const inputBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)";
  const inputBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const cardBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.025)";
  const cardBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";

  return (
    <View style={{ gap: 14 }}>
      {/* ── Search + Refresh ─────────────────────────────────── */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 16,
            backgroundColor: inputBg,
            borderWidth: 1,
            borderColor: inputBorder,
          }}
        >
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={{
              flex: 1,
              fontFamily: "Outfit-Regular",
              fontSize: 14,
              color: colors.textPrimary,
              padding: 0,
            }}
            value={query}
            onChangeText={setQuery}
            placeholder="Search teams..."
            placeholderTextColor={colors.placeholder}
            returnKeyType="search"
          />
        </View>
        <Pressable
          onPress={() => void controller.load(true)}
          disabled={controller.loading}
          style={({ pressed }) => ({
            paddingHorizontal: 14,
            justifyContent: "center",
            alignItems: "center",
            borderRadius: 16,
            backgroundColor: isDark
              ? `${TEAM_ACCENT}22`
              : `${TEAM_ACCENT}14`,
            borderWidth: 1,
            borderColor: isDark
              ? `${TEAM_ACCENT}40`
              : `${TEAM_ACCENT}28`,
            opacity: pressed || controller.loading ? 0.7 : 1,
          })}
        >
          <Ionicons name="refresh" size={18} color={TEAM_ACCENT} />
        </Pressable>
      </View>

      {/* ── List / Skeletons / Empty / Error ─────────────────── */}
      {controller.loading && controller.teams.length === 0 ? (
        <View style={{ gap: 8 }}>
          <Skeleton width="100%" height={72} />
          <Skeleton width="100%" height={72} />
          <Skeleton width="100%" height={72} />
        </View>
      ) : controller.error ? (
        <View
          style={{
            paddingVertical: 32,
            alignItems: "center",
            gap: 10,
          }}
        >
          <Ionicons name="cloud-offline-outline" size={28} color={colors.textSecondary} />
          <Text
            style={{
              fontFamily: "Outfit-Medium",
              fontSize: 13,
              color: colors.textSecondary,
              textAlign: "center",
            }}
          >
            {controller.error}
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View
          style={{
            paddingVertical: 48,
            alignItems: "center",
            gap: 10,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: isDark
                ? `${TEAM_ACCENT}1A`
                : `${TEAM_ACCENT}14`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="people" size={26} color={TEAM_ACCENT} />
          </View>
          <Text
            style={{
              fontFamily: "Outfit-Medium",
              fontSize: 14,
              color: colors.textSecondary,
              textAlign: "center",
            }}
          >
            {query ? `No teams match "${query}"` : "No teams yet"}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {filtered.map((team) => {
            const initials =
              String(team.team ?? "")
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => (w[0] ?? "").toUpperCase())
                .join("") || "T";
            const athleteCount = Number(team.memberCount) || 0;
            const guardianCount = Number(team.guardianCount) || 0;
            const peopleCount = athleteCount + guardianCount;
            return (
              <Pressable
                key={team.id ?? team.team}
                onPress={() =>
                  router.push(`/admin-teams/${encodeURIComponent(team.team)}`)
                }
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingLeft: 6,
                  paddingRight: 14,
                  paddingVertical: 12,
                  borderRadius: 18,
                  backgroundColor: pressed
                    ? isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(15,23,42,0.05)"
                    : cardBg,
                  borderWidth: 1,
                  borderColor: pressed
                    ? isDark
                      ? `${TEAM_ACCENT}55`
                      : `${TEAM_ACCENT}40`
                    : cardBorder,
                  overflow: "hidden",
                  transform: [{ scale: pressed ? 0.997 : 1 }],
                })}
              >
                {/* Accent strip */}
                <View
                  style={{
                    width: 3,
                    alignSelf: "stretch",
                    borderRadius: 2,
                    backgroundColor: TEAM_ACCENT,
                    marginVertical: 2,
                    marginLeft: 2,
                  }}
                />

                {/* Avatar */}
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    backgroundColor: isDark
                      ? `${TEAM_ACCENT}26`
                      : `${TEAM_ACCENT}18`,
                    borderWidth: 1,
                    borderColor: isDark
                      ? `${TEAM_ACCENT}4D`
                      : `${TEAM_ACCENT}33`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "ClashDisplay-Bold",
                      fontSize: 15,
                      color: TEAM_ACCENT,
                      letterSpacing: 0.3,
                    }}
                  >
                    {initials}
                  </Text>
                </View>

                {/* Title + meta */}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      fontFamily: "ClashDisplay-Bold",
                      fontSize: 15.5,
                      color: colors.textPrimary,
                      letterSpacing: -0.2,
                    }}
                    numberOfLines={1}
                  >
                    {team.team}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 5,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 999,
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(15,23,42,0.05)",
                      }}
                    >
                      <Ionicons
                        name="person"
                        size={10}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={{
                          fontFamily: "Outfit-SemiBold",
                          fontSize: 11.5,
                          color: colors.textSecondary,
                        }}
                      >
                        {athleteCount} athlete{athleteCount === 1 ? "" : "s"}
                      </Text>
                    </View>
                    {guardianCount > 0 && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 999,
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(15,23,42,0.05)",
                        }}
                      >
                        <Ionicons
                          name="shield-checkmark"
                          size={10}
                          color={colors.textSecondary}
                        />
                        <Text
                          style={{
                            fontFamily: "Outfit-SemiBold",
                            fontSize: 11.5,
                            color: colors.textSecondary,
                          }}
                        >
                          {guardianCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Total pill + chevron */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View
                    style={{
                      minWidth: 30,
                      paddingHorizontal: 9,
                      paddingVertical: 4,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isDark
                        ? `${TEAM_ACCENT}1F`
                        : `${TEAM_ACCENT}12`,
                      borderWidth: 1,
                      borderColor: isDark
                        ? `${TEAM_ACCENT}33`
                        : `${TEAM_ACCENT}22`,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Outfit-Bold",
                        fontSize: 12,
                        color: TEAM_ACCENT,
                      }}
                    >
                      {peopleCount}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(15,23,42,0.05)",
                    }}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={colors.textSecondary}
                    />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
