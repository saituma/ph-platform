import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/api";
import { isAdminRole } from "@/lib/isAdminRole";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";

type AdminTeam = {
  team: string;
  athleteType: "youth" | "adult";
  memberCount: number;
  guardianCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

function SmallAction({
  label,
  tone,
  onPress,
  disabled,
}: {
  label: string;
  tone: "neutral" | "success" | "danger";
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors, isDark } = useAppTheme();
  const tint =
    tone === "success"
      ? colors.accent
      : tone === "danger"
        ? colors.danger
        : colors.text;
  const bg =
    tone === "success"
      ? isDark
        ? `${colors.accent}18`
        : `${colors.accent}12`
      : tone === "danger"
        ? isDark
          ? `${colors.danger}18`
          : `${colors.danger}10`
        : isDark
          ? "rgba(255,255,255,0.04)"
          : "rgba(15,23,42,0.04)";
  const border =
    tone === "success"
      ? isDark
        ? `${colors.accent}30`
        : `${colors.accent}24`
      : tone === "danger"
        ? isDark
          ? `${colors.danger}30`
          : `${colors.danger}24`
        : isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(15,23,42,0.06)";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 16,
          borderWidth: 1,
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        className="text-[12px] font-outfit-semibold"
        style={{ color: tint }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function AdminTeamsListScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
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
  }, [bootstrapReady, load, teamName, token]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedScrollView onRefresh={() => load(true)}>
        <View className="pt-6 mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3 flex-1 mr-4 overflow-hidden">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <Text
              className="text-3xl font-telma-bold text-app tracking-tight"
              numberOfLines={1}
            >
              Teams
            </Text>
          </View>
        </View>

        <View
          className="rounded-[28px] border p-5 mb-5"
          style={{
            backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
            borderColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(15,23,42,0.06)",
            ...(isDark ? Shadows.none : Shadows.md),
          }}
        >
          <Text className="text-base font-clash font-bold text-app mb-3">
            Create team
          </Text>

          <View className="flex-row gap-2 mb-3">
            {(["youth", "adult"] as const).map((type) => {
              const isSelected = teamType === type;
              return (
                <Pressable
                  key={type}
                  accessibilityRole="button"
                  onPress={() => setTeamType(type)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    alignItems: "center",
                    backgroundColor: isSelected
                      ? colors.accent
                      : isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(15,23,42,0.03)",
                    borderColor: isSelected
                      ? colors.accent
                      : isDark
                        ? "rgba(255,255,255,0.10)"
                        : "rgba(15,23,42,0.08)",
                  }}
                >
                  <Text
                    className="text-[12px] font-outfit-semibold"
                    style={{ color: isSelected ? "#fff" : colors.text }}
                  >
                    {type === "youth" ? "Youth Team" : "Adult Team"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={teamName}
            onChangeText={setTeamName}
            placeholder="Team name"
            autoCapitalize="words"
            className="rounded-2xl border px-4 py-3 font-outfit text-app"
            style={{
              borderColor: isDark
                ? "rgba(255,255,255,0.10)"
                : "rgba(15,23,42,0.08)",
              backgroundColor: isDark
                ? "rgba(255,255,255,0.03)"
                : "rgba(15,23,42,0.03)",
            }}
          />

          <View className="flex-row gap-2 mt-3">
            <SmallAction
              label={createBusy ? "Creating…" : "Create"}
              tone="success"
              onPress={create}
              disabled={createDisabled}
            />
            <SmallAction
              label="Refresh"
              tone="neutral"
              onPress={() => load(true)}
              disabled={!canLoad || loading}
            />
          </View>

          {error ? (
            <Text selectable className="text-sm font-outfit text-red-400 mt-3">
              {error}
            </Text>
          ) : null}

          {!canLoad ? (
            <Text className="text-[12px] font-outfit text-secondary mt-3">
              Waiting for auth bootstrap…
            </Text>
          ) : null}
        </View>

        {loading && teams.length === 0 ? (
          <View className="gap-2">
            <Skeleton width="92%" height={14} />
            <Skeleton width="86%" height={14} />
            <Skeleton width="90%" height={14} />
          </View>
        ) : teams.length === 0 ? (
          <Text className="text-sm font-outfit text-secondary">
            No teams found.
          </Text>
        ) : (
          <View className="gap-3">
            {teams.map((t) => (
              <Pressable
                key={t.team}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: "/admin-teams/[teamName]",
                    params: { teamName: t.team },
                  })
                }
                className="rounded-2xl border px-4 py-3"
                style={{
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(15,23,42,0.03)",
                  borderColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(15,23,42,0.06)",
                }}
              >
                <View className="flex-row items-center gap-2 mb-0.5">
                  <Text
                    className="text-[13px] font-clash font-bold text-app flex-1"
                    numberOfLines={1}
                  >
                    {t.team}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                      backgroundColor: t.athleteType === "adult"
                        ? isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.10)"
                        : isDark ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.10)",
                    }}
                  >
                    <Text
                      className="text-[10px] font-outfit-semibold uppercase tracking-wider"
                      style={{
                        color: t.athleteType === "adult" ? "#818cf8" : "#22c55e",
                      }}
                    >
                      {t.athleteType === "adult" ? "Adult" : "Youth"}
                    </Text>
                  </View>
                </View>
                <Text
                  className="text-[12px] font-outfit text-secondary"
                  numberOfLines={1}
                >
                  {t.memberCount} members
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ThemedScrollView>
    </View>
  );
}
