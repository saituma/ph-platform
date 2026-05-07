import {
  AdminScreen,
  AdminHeader,
  AdminCard,
  AdminButton,
  AdminBadge,
  AdminFormField,
  AdminChipSelect,
  AdminEmptyState,
  AdminLoadingState,
  useAdminPastel,
} from "@/components/admin/AdminUI";
import type { AdminCardColor } from "@/constants/theme";
import { Text } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { apiRequest } from "@/lib/api";
import { isAdminRole } from "@/lib/isAdminRole";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Users } from "lucide-react-native";

type AdminTeam = {
  team: string;
  athleteType: "youth" | "adult";
  memberCount: number;
  guardianCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

const TEAM_TYPE_OPTIONS: { key: "youth" | "adult"; label: string }[] = [
  { key: "youth", label: "Youth Team" },
  { key: "adult", label: "Adult Team" },
];

export default function AdminTeamsListScreen() {
  const p = useAdminPastel();
  const router = useRouter();
  const { token, appRole, apiUserRole } = useAppSelector((state) => state.user);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

  const canAccess = isAdminRole(apiUserRole) || appRole === "coach";
  if (!canAccess) {
    return <ReplaceOnce href="/(tabs)" />;
  }

  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [teamName, setTeamName] = useState("");
  const [teamType, setTeamType] = useState<"youth" | "adult">("youth");
  const [createBusy, setCreateBusy] = useState(false);

  const load = useCallback(
    async (forceRefresh: boolean) => {
      if (!token || !bootstrapReady) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ teams?: AdminTeam[] }>("/admin/teams", {
          token,
          suppressStatusCodes: [403],
          skipCache: forceRefresh,
          forceRefresh,
        });
        setTeams(Array.isArray(res?.teams) ? res.teams : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load teams");
        setTeams([]);
      } finally {
        setLoading(false);
      }
    },
    [bootstrapReady, token],
  );

  useEffect(() => {
    if (!canLoad) return;
    void load(false);
  }, [canLoad, load]);

  const createDisabled = useMemo(
    () => createBusy || !teamName.trim().length || !canLoad,
    [canLoad, createBusy, teamName],
  );

  const create = useCallback(async () => {
    if (!token || !bootstrapReady) return;
    const trimmed = teamName.trim();
    if (!trimmed) return;

    setCreateBusy(true);
    setError(null);
    try {
      await apiRequest("/admin/teams", {
        method: "POST",
        token,
        body: { teamName: trimmed, athleteType: teamType },
        suppressStatusCodes: [403],
        skipCache: true,
      });
      setTeamName("");
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create team");
    } finally {
      setCreateBusy(false);
    }
  }, [bootstrapReady, load, teamName, teamType, token]);

  return (
    <AdminScreen>
      <ThemedScrollView onRefresh={() => load(true)}>
        <AdminHeader
          title="Teams"
          subtitle={teams.length > 0 ? `${teams.length} team${teams.length !== 1 ? "s" : ""}` : undefined}
        />

        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={{ paddingHorizontal: 24, marginBottom: 20 }}
        >
          <AdminCard color="yellow">
            <Text
              style={{
                fontFamily: "Outfit-ExtraBold",
                fontSize: 18,
                color: p.textPrimary,
                marginBottom: 16,
                letterSpacing: -0.3,
              }}
            >
              Create Team
            </Text>

            <View style={{ marginBottom: 16 }}>
              <AdminChipSelect
                options={TEAM_TYPE_OPTIONS}
                value={teamType}
                onChange={setTeamType}
              />
            </View>

            <AdminFormField
              label="Team Name"
              value={teamName}
              onChangeText={setTeamName}
              placeholder="Enter team name"
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <AdminButton
                label={createBusy ? "Creating..." : "Create"}
                variant="primary"
                compact
                onPress={create}
                disabled={createDisabled}
                loading={createBusy}
              />
              <AdminButton
                label="Refresh"
                variant="ghost"
                compact
                onPress={() => load(true)}
                disabled={!canLoad || loading}
              />
            </View>

            {error ? (
              <Text
                style={{
                  fontFamily: "Outfit-Regular",
                  fontSize: 13,
                  color: p.danger,
                  marginTop: 12,
                }}
              >
                {error}
              </Text>
            ) : null}

            {!canLoad ? (
              <Text
                style={{
                  fontFamily: "Outfit-Regular",
                  fontSize: 12,
                  color: p.textMuted,
                  marginTop: 12,
                }}
              >
                Waiting for auth bootstrap...
              </Text>
            ) : null}
          </AdminCard>
        </Animated.View>

        <View style={{ paddingHorizontal: 24, paddingBottom: 32 }}>
          {loading && teams.length === 0 ? (
            <AdminLoadingState label="Loading teams" />
          ) : teams.length === 0 ? (
            <AdminEmptyState
              icon={Users}
              title="No teams found"
              description="Create your first team above to get started."
            />
          ) : (
            <View style={{ gap: 12 }}>
              {teams.map((t, index) => {
                const cardColor: AdminCardColor =
                  t.athleteType === "youth" ? "sage" : "lavender";
                const badgeColor: AdminCardColor =
                  t.athleteType === "youth" ? "mint" : "peach";

                return (
                  <Animated.View
                    key={t.team}
                    entering={FadeInDown.duration(350).delay(200 + index * 60)}
                  >
                    <AdminCard
                      color={cardColor}
                      onPress={() =>
                        router.push({
                          pathname: "/admin-teams/[teamName]",
                          params: { teamName: t.team },
                        })
                      }
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            style={{
                              fontFamily: "Outfit-Bold",
                              fontSize: 16,
                              color: p.textPrimary,
                            }}
                            numberOfLines={1}
                          >
                            {t.team}
                          </Text>
                          <Text
                            style={{
                              fontFamily: "Outfit-Regular",
                              fontSize: 13,
                              color: p.textSecondary,
                              marginTop: 3,
                            }}
                            numberOfLines={1}
                          >
                            {t.memberCount} member{t.memberCount !== 1 ? "s" : ""}
                          </Text>
                        </View>
                        <AdminBadge color={badgeColor}>
                          {t.athleteType === "youth" ? "Youth" : "Adult"}
                        </AdminBadge>
                      </View>
                    </AdminCard>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </View>
      </ThemedScrollView>
    </AdminScreen>
  );
}
