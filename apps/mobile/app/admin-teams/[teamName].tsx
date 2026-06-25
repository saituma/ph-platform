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
import { Users, ChevronRight } from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

type AdminTeamMember = {
  athleteId: number;
  athleteName: string | null;
  currentProgramTier: string | null;
  age: number | null;
  sessionsCompleted: number | null;
  modulesCompleted: number | null;
  isSponsored: boolean | null;
  trainingPerWeek: number | null;
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

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function MemberRow({
  member,
  onPress,
}: {
  member: AdminTeamMember;
  onPress: () => void;
}) {
  const p = useAdminPastel();
  const initials = getInitials(member.athleteName);
  const ageStr = member.age != null ? `${member.age}y` : null;
  const tierStr = member.currentProgramTier || null;
  const sessions = member.sessionsCompleted ?? 0;
  const modules = member.modulesCompleted ?? 0;
  const statsStr = `${sessions} sessions · ${modules} modules`;
  const subtitle = [ageStr, tierStr].filter(Boolean).join(" · ");

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: p.inputBg,
        borderRadius: 20,
        padding: 14,
        opacity: pressed ? 0.85 : 1,
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
          backgroundColor: p.accentSoft,
          marginRight: 12,
        }}
      >
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.accent }}>
          {initials}
        </Text>
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 14,
              color: p.textPrimary,
              flexShrink: 1,
            }}
            numberOfLines={1}
          >
            {member.athleteName ?? `Athlete #${member.athleteId}`}
          </Text>
          {member.isSponsored ? (
            <View
              style={{
                backgroundColor: p.accentSoft,
                borderRadius: 999,
                paddingHorizontal: 7,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 10, color: p.accent }}>
                Sponsored
              </Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text
            style={{
              fontFamily: "Outfit-Regular",
              fontSize: 12,
              color: p.textSecondary,
            }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
        <Text
          style={{
            fontFamily: "Outfit-Regular",
            fontSize: 11,
            color: p.textMuted,
          }}
          numberOfLines={1}
        >
          {statsStr}
        </Text>
      </View>

      <ChevronRight size={16} color={p.textMuted} />
    </Pressable>
  );
}

function StatBox({ value, label }: { value: string | number; label: string }) {
  const p = useAdminPastel();
  return (
    <View
      style={{
        flex: 1,
        minWidth: 80,
        backgroundColor: p.pageBg,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 12,
        gap: 4,
      }}
    >
      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 20, color: p.textPrimary }}>
        {value}
      </Text>
      <Text
        style={{
          fontFamily: "Outfit-SemiBold",
          fontSize: 10,
          color: p.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export default function AdminTeamDetailScreen() {
  const p = useAdminPastel();
  const router = useRouter();
  const { token, appRole, apiUserRole } = useAppSelector((state) => state.user);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);

  const canAccess = isAdminRole(apiUserRole) || appRole === "coach";
  const canLoad = Boolean(token && bootstrapReady && canAccess);

  const params = useLocalSearchParams<{ teamName?: string }>();
  const teamName = asString(params.teamName);

  const queryClient = useQueryClient();

  const {
    data: detail = null,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.admin.teamDetail(teamName),
    queryFn: async () => {
      const res = await apiRequest<AdminTeamDetail>(
        `/admin/teams/${encodeURIComponent(teamName)}`,
        {
          token: token!,
          suppressStatusCodes: [403],
          forceRefresh: true,
        },
      );
      return res ?? null;
    },
    enabled: canLoad && !!teamName,
  });

  const error = queryError ? (queryError as Error).message ?? "Failed to load team details" : null;

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

  const navigateToAthlete = useCallback(
    (athleteId: number) => {
      router.push(`/team-manager/athlete/${athleteId}` as any);
    },
    [router],
  );

  const search = useCallback(async () => {
    if (!token || !bootstrapReady || !canAccess) return;
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
  }, [bootstrapReady, canAccess, searchQuery, token]);

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
    if (!token || !bootstrapReady || !canAccess) return;
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.teamDetail(teamName) });
    } catch (e) {
      setAttachError(
        e instanceof Error ? e.message : "Failed to assign athlete",
      );
    } finally {
      setAttachBusy(false);
    }
  }, [
    bootstrapReady,
    canAccess,
    includeOtherTeams,
    moveConfirm,
    queryClient,
    selected,
    selectedIsMove,
    teamName,
    token,
  ]);

  if (!canAccess) {
    return <ReplaceOnce href="/(tabs)" />;
  }

  const ageRangeStr =
    detail?.minAge != null && detail?.maxAge != null
      ? `${detail.minAge}–${detail.maxAge}`
      : detail?.minAge != null
        ? `${detail.minAge}+`
        : "—";

  return (
    <AdminScreen>
      <AdminHeader
        title={teamName || "Team"}
        subtitle={`${members.length} member${members.length !== 1 ? "s" : ""}`}
        right={<AdminBackButton onPress={() => router.back()} />}
      />

      <ThemedScrollView onRefresh={() => void refetch()}>
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

          {/* Team summary card */}
          {detail ? (
            <Animated.View entering={FadeInDown.duration(400).delay(150)}>
              <AdminCard color="sage">
                <Text
                  style={{
                    fontFamily: "Outfit-ExtraBold",
                    fontSize: 15,
                    color: p.textPrimary,
                    marginBottom: 12,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                  }}
                >
                  Team Overview
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <StatBox value={members.length} label="Members" />
                  <StatBox
                    value={athleteType === "youth" ? "Youth" : "Adult"}
                    label="Type"
                  />
                  <StatBox value={ageRangeStr} label="Age Range" />
                </View>
                {detail.summary.createdAt ? (
                  <Text
                    style={{
                      fontFamily: "Outfit-Regular",
                      fontSize: 12,
                      color: p.textMuted,
                      marginTop: 10,
                    }}
                  >
                    Created {fmtDate(detail.summary.createdAt)}
                  </Text>
                ) : null}
              </AdminCard>
            </Animated.View>
          ) : null}

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
                        </View>

                        <View style={{ gap: 8 }}>
                          {ageBandGroups[band].map((m) => (
                            <MemberRow
                              key={m.athleteId}
                              member={m}
                              onPress={() => navigateToAthlete(m.athleteId)}
                            />
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
                    >
                      <MemberRow
                        member={m}
                        onPress={() => navigateToAthlete(m.athleteId)}
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

          <AdminInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search athletes by name"
            onClear={() => setSearchQuery("")}
          />

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
