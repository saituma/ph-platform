import {
  AdminScreen,
  AdminHeader,
  AdminBackButton,
  AdminCard,
  AdminButton,
  AdminBadge,
  AdminInput,
  AdminFormField,
  AdminEmptyState,
  AdminLoadingState,
  AdminModalContainer,
  AdminModalTitle,
  AdminModalSubtitle,
  useAdminPastel,
} from "@/components/admin/AdminUI";
import type { AdminCardColor } from "@/constants/theme";
import { Text } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { apiRequest } from "@/lib/api";
import { isAdminRole } from "@/lib/isAdminRole";
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, Switch, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";
import { Users } from "lucide-react-native";

type AdminTeamMember = {
  athleteId: number;
  athleteName: string | null;
  currentProgramTier: string | null;
  age: number | null;
};

type AdminTeamDetail = {
  team: string;
  athleteType: "youth" | "adult";
  minAge: number | null;
  maxAge: number | null;
  summary: {
    memberCount: number;
    guardianCount: number;
    createdAt: string | null;
    updatedAt: string | null;
  };
  members: AdminTeamMember[];
};

const AGE_BANDS = [
  { label: "U10", minAge: 0, maxAge: 9 },
  { label: "U12", minAge: 10, maxAge: 11 },
  { label: "U14", minAge: 12, maxAge: 13 },
  { label: "U16", minAge: 14, maxAge: 15 },
  { label: "U18", minAge: 16, maxAge: 17 },
  { label: "18+", minAge: 18, maxAge: 999 },
];
const BAND_ORDER = [...AGE_BANDS.map((b) => b.label), "Unknown"];

function getAgeBand(age: number | null): string {
  if (age === null) return "Unknown";
  return AGE_BANDS.find((b) => age >= b.minAge && age <= b.maxAge)?.label ?? "Unknown";
}

function groupByAgeBand(members: AdminTeamMember[]) {
  const groups: Record<string, AdminTeamMember[]> = {};
  for (const m of members) {
    const band = getAgeBand(m.age);
    if (!groups[band]) groups[band] = [];
    groups[band].push(m);
  }
  return groups;
}

type AdminUserRow = {
  id?: number;
  role?: string | null;
  athleteId?: number | null;
  athleteName?: string | null;
  athleteTeam?: string | null;
};

function asString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function AdminTeamDetailScreen() {
  const p = useAdminPastel();
  const router = useRouter();
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
  const athleteType = detail?.athleteType ?? "youth";
  const ageBandGroups = useMemo(() => groupByAgeBand(members), [members]);

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
      if (athleteTeam === teamName) return false;
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
    <AdminScreen>
      <AdminHeader
        title={teamName || "Team"}
        subtitle={`${members.length} member${members.length !== 1 ? "s" : ""}`}
        right={<AdminBackButton onPress={() => router.back()} />}
      />

      <ThemedScrollView onRefresh={() => load(true)}>
        <View style={{ paddingHorizontal: 24, gap: 16 }}>
          {/* Team type badge + assign button */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(100)}
            style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <AdminBadge color={athleteType === "youth" ? "mint" : "lavender"}>
              {athleteType === "adult" ? "Adult Team" : "Youth Team"}
            </AdminBadge>
            <View style={{ flex: 1 }} />
            <AdminButton
              label="Assign Athlete"
              variant="primary"
              compact
              onPress={() => setAssignOpen(true)}
              disabled={!canLoad || !teamName}
            />
          </Animated.View>

          {/* Members card */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <AdminCard color="white">
              <Text
                style={{
                  fontFamily: "Outfit-ExtraBold",
                  fontSize: 17,
                  color: p.textPrimary,
                  marginBottom: 14,
                }}
              >
                Members
              </Text>

              {error ? (
                <Text
                  selectable
                  style={{
                    fontFamily: "Outfit-Regular",
                    fontSize: 14,
                    color: p.danger,
                  }}
                >
                  {error}
                </Text>
              ) : null}

              {!canLoad ? (
                <Text
                  style={{
                    fontFamily: "Outfit-Regular",
                    fontSize: 14,
                    color: p.textSecondary,
                  }}
                >
                  Waiting for auth bootstrap...
                </Text>
              ) : loading && !detail ? (
                <AdminLoadingState label="Loading members" />
              ) : members.length === 0 ? (
                <AdminEmptyState
                  icon={Users}
                  title="No members yet"
                  description="Assign athletes to this team using the button above."
                  color="mint"
                />
              ) : athleteType === "youth" ? (
                <View style={{ gap: 20 }}>
                  {BAND_ORDER.filter((band) => ageBandGroups[band]?.length).map(
                    (band, bandIdx) => (
                      <Animated.View
                        key={band}
                        entering={FadeInDown.duration(350).delay(250 + bandIdx * 80)}
                      >
                        {/* Band header */}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 10,
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <AdminBadge color="sage">
                              {band}
                            </AdminBadge>
                            <Text
                              style={{
                                fontFamily: "Outfit-Regular",
                                fontSize: 12,
                                color: p.textMuted,
                              }}
                            >
                              {ageBandGroups[band].length} athlete
                              {ageBandGroups[band].length !== 1 ? "s" : ""}
                            </Text>
                          </View>
                          <AdminButton
                            label={`Post to ${band}`}
                            variant="secondary"
                            compact
                            onPress={() => {/* navigate to post screen for this age group */}}
                          />
                        </View>

                        {/* Band members */}
                        <View style={{ gap: 8 }}>
                          {ageBandGroups[band].map((m) => (
                            <View
                              key={m.athleteId}
                              style={{
                                backgroundColor: p.inputBg,
                                borderRadius: 20,
                                padding: 16,
                              }}
                            >
                              <Text
                                style={{
                                  fontFamily: "Outfit-Bold",
                                  fontSize: 14,
                                  color: p.textPrimary,
                                }}
                                numberOfLines={1}
                              >
                                {m.athleteName ?? `Athlete #${m.athleteId}`}
                              </Text>
                              <Text
                                style={{
                                  fontFamily: "Outfit-Regular",
                                  fontSize: 12,
                                  color: p.textSecondary,
                                  marginTop: 2,
                                }}
                              >
                                {m.age != null ? `Age ${m.age}` : "Age unknown"}
                                {m.currentProgramTier ? ` · ${m.currentProgramTier}` : ""}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </Animated.View>
                    ),
                  )}
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {members.map((m, idx) => (
                    <Animated.View
                      key={m.athleteId}
                      entering={FadeInDown.duration(300).delay(200 + idx * 50)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: p.inputBg,
                        borderRadius: 20,
                        padding: 16,
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text
                          style={{
                            fontFamily: "Outfit-Bold",
                            fontSize: 14,
                            color: p.textPrimary,
                          }}
                          numberOfLines={1}
                        >
                          {m.athleteName ?? `Athlete #${m.athleteId}`}
                        </Text>
                        {m.currentProgramTier ? (
                          <Text
                            style={{
                              fontFamily: "Outfit-Regular",
                              fontSize: 12,
                              color: p.textSecondary,
                              marginTop: 2,
                            }}
                            numberOfLines={1}
                          >
                            {m.currentProgramTier}
                          </Text>
                        ) : null}
                      </View>
                      <AdminButton
                        label="Post"
                        variant="secondary"
                        compact
                        onPress={() => {/* navigate to post screen for this athlete */}}
                      />
                    </Animated.View>
                  ))}
                </View>
              )}
            </AdminCard>
          </Animated.View>
        </View>
      </ThemedScrollView>

      {/* Assign Athlete Modal */}
      <Modal
        visible={assignOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAssignOpen(false)}
      >
        <AdminModalContainer onClose={() => setAssignOpen(false)} position="bottom">
          <AdminModalTitle>Assign Athlete</AdminModalTitle>
          <AdminModalSubtitle>{`Search for athletes and assign them to ${teamName || "this team"}.`}</AdminModalSubtitle>

          {/* Search input */}
          <AdminInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search athletes by name"
            onClear={() => setSearchQuery("")}
          />

          {/* Action buttons */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <AdminButton
              label={searching ? "Searching..." : "Search"}
              variant="secondary"
              compact
              onPress={search}
              disabled={!canLoad || searching}
              loading={searching}
            />
            <AdminButton
              label={attachBusy ? "Assigning..." : "Assign"}
              variant="primary"
              compact
              onPress={assign}
              disabled={!canAssign}
              loading={attachBusy}
            />
          </View>

          {/* Errors */}
          {searchError ? (
            <Text
              selectable
              style={{
                fontFamily: "Outfit-Regular",
                fontSize: 13,
                color: p.danger,
                marginTop: 12,
              }}
            >
              {searchError}
            </Text>
          ) : null}

          {attachError ? (
            <Text
              selectable
              style={{
                fontFamily: "Outfit-Regular",
                fontSize: 13,
                color: p.danger,
                marginTop: 8,
              }}
            >
              {attachError}
            </Text>
          ) : null}

          {/* Include other teams toggle */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 20,
            }}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text
                style={{
                  fontFamily: "Outfit-Bold",
                  fontSize: 13,
                  color: p.textPrimary,
                }}
              >
                Include athletes from other teams
              </Text>
              <Text
                style={{
                  fontFamily: "Outfit-Regular",
                  fontSize: 12,
                  color: p.textSecondary,
                  marginTop: 2,
                }}
              >
                Required for moving athletes (type MOVE)
              </Text>
            </View>
            <Switch
              value={includeOtherTeams}
              onValueChange={setIncludeOtherTeams}
              trackColor={{
                false: p.inputBg,
                true: p.accentSoft,
              }}
              thumbColor={includeOtherTeams ? p.accent : p.cardWhite}
            />
          </View>

          {/* MOVE confirmation input */}
          {includeOtherTeams ? (
            <View style={{ marginTop: 14 }}>
              <AdminFormField
                label="Confirm Move"
                value={moveConfirm}
                onChangeText={setMoveConfirm}
                placeholder="Type MOVE to confirm"
              />
            </View>
          ) : null}

          {/* Selected athlete card */}
          {selected ? (
            <AdminCard color="sage" style={{ marginTop: 16 }} padding={16}>
              <Text
                style={{
                  fontFamily: "Outfit-Regular",
                  fontSize: 11,
                  color: p.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Selected
              </Text>
              <Text
                style={{
                  fontFamily: "Outfit-Bold",
                  fontSize: 15,
                  color: p.textPrimary,
                  marginTop: 4,
                }}
                numberOfLines={1}
              >
                {selected.athleteName ?? `Athlete #${selected.athleteId}`}
              </Text>
              <Text
                style={{
                  fontFamily: "Outfit-Regular",
                  fontSize: 12,
                  color: p.textSecondary,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {selected.athleteTeam
                  ? `Current team: ${selected.athleteTeam}`
                  : "Unassigned"}
                {selectedIsMove ? " (MOVE)" : ""}
              </Text>
            </AdminCard>
          ) : null}

          {/* Search results */}
          {results.length ? (
            <View style={{ gap: 8, marginTop: 16 }}>
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
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? p.accentSoft : p.inputBg,
                      borderRadius: 20,
                      padding: 16,
                      opacity: !canSelect ? 0.45 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    })}
                  >
                    <Text
                      style={{
                        fontFamily: "Outfit-Bold",
                        fontSize: 14,
                        color: p.textPrimary,
                      }}
                      numberOfLines={1}
                    >
                      {u.athleteName ?? `Athlete #${athleteId}`}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Outfit-Regular",
                        fontSize: 12,
                        color: p.textSecondary,
                        marginTop: 2,
                      }}
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
        </AdminModalContainer>
      </Modal>
    </AdminScreen>
  );
}
