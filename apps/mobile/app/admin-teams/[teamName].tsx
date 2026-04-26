import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/api";
import { isAdminRole } from "@/lib/isAdminRole";
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, Switch, View } from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";

type AdminTeamDetail = {
  team: string;
  summary: {
    memberCount: number;
    guardianCount: number;
    createdAt: string | null;
    updatedAt: string | null;
  };
  members: {
    athleteId: number;
    athleteName: string | null;
    currentProgramTier: string | null;
  }[];
};

type AdminUserRow = {
  id?: number;
  role?: string | null;
  athleteId?: number | null;
  athleteName?: string | null;
  athleteTeam?: string | null;
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

function asString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function AdminTeamDetailScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const { token, appRole, apiUserRole } = useAppSelector((state) => state.user);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

  const canAccess = isAdminRole(apiUserRole) || appRole === "coach";
  if (!canAccess) {
    return <ReplaceOnce href="/(tabs)" />;
  }

  const params = useLocalSearchParams<{ teamName?: string }>();
  const teamName = asString(params.teamName);

  const [detail, setDetail] = useState<AdminTeamDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<AdminUserRow[]>([]);

  const [selected, setSelected] = useState<{
    athleteId: number;
    athleteName: string | null;
    athleteTeam: string | null;
  } | null>(null);

  const [includeOtherTeams, setIncludeOtherTeams] = useState(false);
  const [moveConfirm, setMoveConfirm] = useState("");

  const [attachBusy, setAttachBusy] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  const load = useCallback(
    async (forceRefresh: boolean) => {
      if (!token || !bootstrapReady) return;
      if (!teamName) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<AdminTeamDetail>(
          `/admin/teams/${encodeURIComponent(teamName)}`,
          {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          },
        );
        setDetail(res ?? null);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to load team details",
        );
        setDetail(null);
      } finally {
        setLoading(false);
      }
    },
    [bootstrapReady, teamName, token],
  );

  useEffect(() => {
    if (!canLoad) return;
    void load(false);
  }, [canLoad, load]);

  useEffect(() => {
    if (!assignOpen) return;
    setSearchQuery("");
    setResults([]);
    setSearchError(null);
    setSelected(null);
    setIncludeOtherTeams(false);
    setMoveConfirm("");
    setAttachBusy(false);
    setAttachError(null);
  }, [assignOpen]);

  const members = detail?.members ?? [];

  const search = useCallback(async () => {
    if (!token || !bootstrapReady) return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchError("Type at least 2 characters to search");
      setResults([]);
      return;
    }

    setSearching(true);
    setSearchError(null);
    try {
      const res = await apiRequest<{ users?: AdminUserRow[] }>(
        `/admin/users?q=${encodeURIComponent(q)}&limit=30`,
        {
          token,
          suppressStatusCodes: [403],
          skipCache: true,
        },
      );
      const users = Array.isArray(res?.users) ? res.users : [];
      setResults(users.filter((u) => typeof u.athleteId === "number"));
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [bootstrapReady, searchQuery, token]);

  const selectedIsMove = useMemo(() => {
    if (!selected) return false;
    return Boolean(selected.athleteTeam && selected.athleteTeam !== teamName);
  }, [selected, teamName]);

  const canSelectAthlete = useCallback(
    (athleteTeam: string | null) => {
      if (!athleteTeam) return true;
      if (athleteTeam === teamName) return false; // already in team
      if (includeOtherTeams) return true;
      return false;
    },
    [includeOtherTeams, teamName],
  );

  const canAssign = useMemo(() => {
    if (!selected) return false;
    if (attachBusy) return false;
    if (!canLoad) return false;
    if (!selectedIsMove) return true;
    return includeOtherTeams && moveConfirm.trim() === "MOVE";
  }, [
    attachBusy,
    canLoad,
    includeOtherTeams,
    moveConfirm,
    selected,
    selectedIsMove,
  ]);

  const assign = useCallback(async () => {
    if (!token || !bootstrapReady) return;
    if (!teamName) return;
    if (!selected) return;

    const isMove = selectedIsMove;
    if (isMove) {
      if (!includeOtherTeams || moveConfirm.trim() !== "MOVE") return;
    }

    setAttachBusy(true);
    setAttachError(null);
    try {
      await apiRequest(
        `/admin/teams/${encodeURIComponent(teamName)}/athletes/${selected.athleteId}/attach`,
        {
          method: "POST",
          token,
          body: isMove ? { allowMoveFromOtherTeam: true } : {},
          suppressStatusCodes: [403],
          skipCache: true,
        },
      );
      setAssignOpen(false);
      await load(true);
    } catch (e) {
      setAttachError(
        e instanceof Error ? e.message : "Failed to assign athlete",
      );
    } finally {
      setAttachBusy(false);
    }
  }, [
    bootstrapReady,
    includeOtherTeams,
    load,
    moveConfirm,
    selected,
    selectedIsMove,
    teamName,
    token,
  ]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedScrollView onRefresh={() => load(true)}>
        <View className="pt-6 mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3 flex-1 mr-4 overflow-hidden">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <Text
              className="text-2xl font-telma-bold text-app tracking-tight"
              numberOfLines={1}
            >
              {teamName || "Team"}
            </Text>
          </View>
          <SmallAction
            label="Assign"
            tone="success"
            onPress={() => setAssignOpen(true)}
            disabled={!canLoad || !teamName}
          />
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
          <Text className="text-base font-clash font-bold text-app mb-2">
            Members
          </Text>
          {error ? (
            <Text selectable className="text-sm font-outfit text-red-400">
              {error}
            </Text>
          ) : null}

          {!canLoad ? (
            <Text className="text-sm font-outfit text-secondary">
              Waiting for auth bootstrap…
            </Text>
          ) : loading && !detail ? (
            <View className="gap-2">
              <Skeleton width="70%" height={16} />
              <Skeleton width="55%" height={16} />
            </View>
          ) : members.length === 0 ? (
            <Text className="text-sm font-outfit text-secondary">
              No members yet.
            </Text>
          ) : (
            <View className="gap-3">
              {members.map((m) => (
                <View
                  key={m.athleteId}
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
                  <Text
                    className="text-[13px] font-clash font-bold text-app"
                    numberOfLines={1}
                  >
                    {m.athleteName ?? `Athlete #${m.athleteId}`}
                  </Text>
                  {m.currentProgramTier ? (
                    <Text
                      className="text-[12px] font-outfit text-secondary"
                      numberOfLines={1}
                    >
                      {m.currentProgramTier}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </ThemedScrollView>

      <Modal
        visible={assignOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAssignOpen(false)}
      >
        <View
          className="flex-1 justify-end"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => setAssignOpen(false)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.55)",
            }}
          />

          <View
            className="rounded-t-[28px] border px-5 pt-5 pb-6"
            style={{
              backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
              borderColor: isDark
                ? "rgba(255,255,255,0.10)"
                : "rgba(15,23,42,0.08)",
              ...(isDark ? Shadows.none : Shadows.md),
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-clash font-bold text-app">
                Assign athlete
              </Text>
              <SmallAction
                label="Close"
                tone="neutral"
                onPress={() => setAssignOpen(false)}
              />
            </View>

            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search athletes"
              autoCapitalize="none"
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
                label={searching ? "Searching…" : "Search"}
                tone="neutral"
                onPress={search}
                disabled={!canLoad || searching}
              />
              <SmallAction
                label={attachBusy ? "Assigning…" : "Assign"}
                tone="success"
                onPress={assign}
                disabled={!canAssign}
              />
            </View>

            {searchError ? (
              <Text
                selectable
                className="text-sm font-outfit text-red-400 mt-3"
              >
                {searchError}
              </Text>
            ) : null}

            {attachError ? (
              <Text
                selectable
                className="text-sm font-outfit text-red-400 mt-2"
              >
                {attachError}
              </Text>
            ) : null}

            <View className="flex-row items-center justify-between mt-4">
              <View className="flex-1 mr-3">
                <Text className="text-[13px] font-outfit-semibold text-app">
                  Include athletes from other teams
                </Text>
                <Text className="text-[12px] font-outfit text-secondary">
                  Required for moving athletes (type MOVE)
                </Text>
              </View>
              <Switch
                value={includeOtherTeams}
                onValueChange={setIncludeOtherTeams}
                trackColor={{
                  false: isDark
                    ? "rgba(255,255,255,0.15)"
                    : "rgba(15,23,42,0.15)",
                  true: `${colors.accent}70`,
                }}
                thumbColor={includeOtherTeams ? colors.accent : undefined}
              />
            </View>

            {includeOtherTeams ? (
              <View className="mt-3">
                <Text className="text-[12px] font-outfit text-secondary mb-2">
                  Type MOVE to confirm cross-team move
                </Text>
                <TextInput
                  value={moveConfirm}
                  onChangeText={setMoveConfirm}
                  placeholder="MOVE"
                  autoCapitalize="characters"
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
              </View>
            ) : null}

            {selected ? (
              <View
                className="mt-4 rounded-2xl border px-4 py-3"
                style={{
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(15,23,42,0.03)",
                  borderColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(15,23,42,0.06)",
                }}
              >
                <Text className="text-[12px] font-outfit text-secondary">
                  Selected
                </Text>
                <Text
                  className="text-[13px] font-clash font-bold text-app"
                  numberOfLines={1}
                >
                  {selected.athleteName ?? `Athlete #${selected.athleteId}`}
                </Text>
                <Text
                  className="text-[12px] font-outfit text-secondary"
                  numberOfLines={1}
                >
                  {selected.athleteTeam
                    ? `Current team: ${selected.athleteTeam}`
                    : "Unassigned"}
                  {selectedIsMove ? " (MOVE)" : ""}
                </Text>
              </View>
            ) : null}

            {results.length ? (
              <View className="mt-4 gap-2">
                {results.map((u) => {
                  const athleteId =
                    typeof u.athleteId === "number" ? u.athleteId : null;
                  if (!athleteId) return null;
                  const athleteTeam = u.athleteTeam ?? null;
                  const alreadyInTeam = Boolean(
                    athleteTeam && athleteTeam === teamName,
                  );
                  const canSelect =
                    !alreadyInTeam && canSelectAthlete(athleteTeam);
                  return (
                    <Pressable
                      key={athleteId}
                      accessibilityRole="button"
                      disabled={!canSelect}
                      onPress={() =>
                        setSelected({
                          athleteId,
                          athleteName: u.athleteName ?? null,
                          athleteTeam,
                        })
                      }
                      className="rounded-2xl border px-4 py-3"
                      style={({ pressed }) => ({
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(15,23,42,0.03)",
                        borderColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(15,23,42,0.06)",
                        opacity: !canSelect ? 0.45 : pressed ? 0.85 : 1,
                      })}
                    >
                      <Text
                        className="text-[13px] font-clash font-bold text-app"
                        numberOfLines={1}
                      >
                        {u.athleteName ?? `Athlete #${athleteId}`}
                      </Text>
                      <Text
                        className="text-[12px] font-outfit text-secondary"
                        numberOfLines={2}
                      >
                        {alreadyInTeam
                          ? "Already in this team"
                          : athleteTeam
                            ? `Current team: ${athleteTeam}`
                            : "Unassigned"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
