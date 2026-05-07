import React, { useEffect, useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Search, RefreshCw, Users, User, Shield, ChevronRight, WifiOff } from "lucide-react-native";

import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAdminTeams } from "@/hooks/admin/useAdminTeams";

type Props = {
  controller: ReturnType<typeof useAdminTeams>;
  canLoad: boolean;
};

const CARD_COLORS = ["cardSage", "cardPeach", "cardLavender", "cardMint"] as const;

export function AdminTeamsListSection({ controller, canLoad }: Props) {
  const router = useRouter();
  const p = useAdminPastel();

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
            backgroundColor: p.inputBg,
            borderWidth: 1,
            borderColor: p.inputBorder,
          }}
        >
          <Search size={16} color={p.textSecondary} />
          <TextInput
            style={{
              flex: 1,
              fontFamily: "Outfit-Regular",
              fontSize: 14,
              color: p.textPrimary,
              padding: 0,
            }}
            value={query}
            onChangeText={setQuery}
            placeholder="Search teams..."
            placeholderTextColor={p.textMuted}
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
            backgroundColor: p.accentSoft,
            opacity: pressed || controller.loading ? 0.7 : 1,
          })}
        >
          <RefreshCw size={18} color={p.accent} />
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
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: p.dangerSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <WifiOff size={22} color={p.danger} />
          </View>
          <Text
            style={{
              fontFamily: "Outfit-Medium",
              fontSize: 13,
              color: p.textSecondary,
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
              backgroundColor: p.accentSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Users size={26} color={p.accent} />
          </View>
          <Text
            style={{
              fontFamily: "Outfit-Medium",
              fontSize: 14,
              color: p.textSecondary,
              textAlign: "center",
            }}
          >
            {query ? `No teams match "${query}"` : "No teams yet"}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {filtered.map((team, index) => {
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
            const cardColorKey = CARD_COLORS[index % CARD_COLORS.length];
            const cardBg = p[cardColorKey];

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
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 28,
                  backgroundColor: cardBg,
                  overflow: "hidden",
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                {/* Avatar */}
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 16,
                    backgroundColor: cardBg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "ClashDisplay-Bold",
                      fontSize: 15,
                      color: p.accent,
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
                      color: p.textPrimary,
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
                        borderRadius: 100,
                        backgroundColor: p.inputBg,
                      }}
                    >
                      <User size={10} color={p.textSecondary} />
                      <Text
                        style={{
                          fontFamily: "Outfit-SemiBold",
                          fontSize: 11.5,
                          color: p.textSecondary,
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
                          borderRadius: 100,
                          backgroundColor: p.inputBg,
                        }}
                      >
                        <Shield size={10} color={p.textSecondary} />
                        <Text
                          style={{
                            fontFamily: "Outfit-SemiBold",
                            fontSize: 11.5,
                            color: p.textSecondary,
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
                      borderRadius: 100,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: p.accentSoft,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Outfit-Bold",
                        fontSize: 12,
                        color: p.accent,
                      }}
                    >
                      {peopleCount}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: p.inputBg,
                    }}
                  >
                    <ChevronRight size={14} color={p.textSecondary} />
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
