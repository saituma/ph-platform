import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAdminAudiences } from "@/hooks/admin/useAdminAudiences";
import { useAdminTeams } from "@/hooks/admin/useAdminTeams";
import { useAdminProgramBuilder } from "@/hooks/admin/useAdminProgramBuilder";
import {
  isYouthAgeAudienceLabel,
  isTeamStorageAudienceLabel,
  toTeamStorageAudienceLabel,
  fromTeamStorageAudienceLabel,
  normalizeAudienceLabelInput,
} from "@/lib/training-content-utils";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { Feather } from "@/components/ui/theme-icons";
import { AdminHeader, AdminScreen } from "@/components/admin/AdminUI";

type ViewMode = "youth" | "adult" | "team";

const BASE_AGE_CARDS = Array.from({ length: 12 }, (_, index) => String(index + 7));

type AudienceCard = {
  label: string;
  moduleCount: number;
  otherCount: number;
};

const MODE_TABS: { key: ViewMode; label: string; icon: string }[] = [
  { key: "youth", label: "Youth", icon: "users" },
  { key: "adult", label: "Adult", icon: "award" },
  { key: "team",  label: "Team",  icon: "shield" },
];

export default function AdminContentScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

  const [viewMode, setViewMode] = useState<ViewMode>("youth");
  const [modalOpen, setModalOpen] = useState(false);
  const [audienceInput, setAudienceInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [assignModal, setAssignModal] = useState<{ athleteId: number; athleteName: string } | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [athleteSearch, setAthleteSearch] = useState("");

  const {
    audiences,
    loading: audiencesLoading,
    error: audiencesError,
    load: loadAudiences,
    createAudience,
  } = useAdminAudiences(token, canLoad);

  const {
    teams,
    loading: teamsLoading,
    error: teamsError,
    load: loadTeams,
  } = useAdminTeams(token, canLoad);

  const {
    programs: allPrograms,
    adultAthletes,
    loading: athletesLoading,
    isBusy: athleteBusy,
    loadPrograms,
    loadAdultAthletes,
    assignProgram,
    unassignProgram,
  } = useAdminProgramBuilder(token, canLoad);

  useEffect(() => {
    if (canLoad) loadAudiences();
  }, [canLoad, loadAudiences]);

  useEffect(() => {
    if (viewMode === "adult" && canLoad) {
      loadAdultAthletes();
      loadPrograms();
    }
  }, [viewMode, canLoad, loadAdultAthletes, loadPrograms]);

  useEffect(() => {
    if (viewMode === "team" && canLoad) loadTeams(false);
  }, [viewMode, canLoad, loadTeams]);

  const youthCards = useMemo<AudienceCard[]>(() => {
    const youthAudiences = audiences.filter((a) =>
      isYouthAgeAudienceLabel(a.label, 18)
    );
    const byLabel = new Map(
      youthAudiences.map((a) => [normalizeAudienceLabelInput(a.label), a])
    );
    const primary = BASE_AGE_CARDS.map((label) => {
      const existing = byLabel.get(label);
      return { label, moduleCount: existing?.moduleCount ?? 0, otherCount: existing?.otherCount ?? 0 };
    });
    const additional = youthAudiences
      .filter((a) => !BASE_AGE_CARDS.includes(normalizeAudienceLabelInput(a.label)))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
      .map((a) => ({
        label: normalizeAudienceLabelInput(a.label),
        moduleCount: a.moduleCount,
        otherCount: a.otherCount,
      }));
    return [...primary, ...additional];
  }, [audiences]);

  const teamCards = useMemo<AudienceCard[]>(() => {
    const audienceSummaryByTeamName = new Map(
      audiences
        .filter((a) => isTeamStorageAudienceLabel(a.label))
        .map((a) => [normalizeAudienceLabelInput(fromTeamStorageAudienceLabel(a.label)), a])
    );
    const canonicalTeamNameByNormalized = new Map(
      teams.map((t) => [normalizeAudienceLabelInput(t.team), t.team] as const)
    );
    const allNormalized = new Set<string>([
      ...teams.map((t) => normalizeAudienceLabelInput(t.team)),
      ...Array.from(audienceSummaryByTeamName.keys()),
    ]);
    return [...allNormalized]
      .map((normalized) => {
        const existing = audienceSummaryByTeamName.get(normalized);
        const label = canonicalTeamNameByNormalized.get(normalized) ?? normalized;
        return { label, moduleCount: existing?.moduleCount ?? 0, otherCount: existing?.otherCount ?? 0 };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [audiences, teams]);

  const activeCards = useMemo(() => {
    if (viewMode === "adult") return [];
    if (viewMode === "team") return teamCards;
    return youthCards;
  }, [viewMode, teamCards, youthCards]);

  const handleCreate = async () => {
    if (!audienceInput.trim()) return;
    setIsCreating(true);
    try {
      const label =
        viewMode === "team"
          ? toTeamStorageAudienceLabel(audienceInput)
          : normalizeAudienceLabelInput(audienceInput);
      await createAudience(label);
      setAudienceInput("");
      setModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredAthletes = useMemo(() => {
    if (!athleteSearch.trim()) return adultAthletes;
    const q = athleteSearch.toLowerCase();
    return adultAthletes.filter((a) => a.name?.toLowerCase().includes(q));
  }, [adultAthletes, athleteSearch]);

  const handleAssign = async () => {
    if (!assignModal || !selectedProgramId) return;
    await assignProgram(selectedProgramId, assignModal.athleteId);
    setAssignModal(null);
    setSelectedProgramId(null);
  };

  const handleUnassign = async (assignmentId: number) => {
    Alert.alert("Unassign", "Remove this program assignment?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => unassignProgram(assignmentId) },
    ]);
  };

  const headerTitle =
    viewMode === "adult" ? "Adult Tiers" : viewMode === "team" ? "Team Training" : "Age Groups";

  const headerDescription =
    viewMode === "adult"
      ? "Choose a tier to manage adult modules and other content."
      : viewMode === "team"
        ? "Manage training content posted to specific teams."
        : "Manage modules, sessions, and other content by age range.";

  const cardBg    = isDark ? colors.cardElevated : colors.card;
  const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.06)";
  const chipBg    = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)";
  const iconBg    = isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)";

  return (
    <AdminScreen>
      <ThemedScrollView showsVerticalScrollIndicator={false} onRefresh={() => loadAudiences(true)}>

        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(60).duration(360).springify()}
          style={{ marginBottom: 18 }}
        >
          <AdminHeader
            eyebrow="Training"
            title="Content"
            subtitle="Exercise library and training content"
            tone="info"
          />
        </Animated.View>

        {/* ── Mode tabs ───────────────────────────────────────────── */}
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(110).duration(360).springify()}
          style={{ paddingHorizontal: 24, marginBottom: 24 }}
        >
          <View
            style={{
              flexDirection: "row",
              padding: 5,
              borderRadius: 22,
              borderWidth: 1,
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
              gap: 4,
            }}
          >
            {MODE_TABS.map((tab) => {
              const isActive = viewMode === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setViewMode(tab.key)}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 17,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 6,
                    backgroundColor: isActive ? colors.accent : "transparent",
                  }}
                >
                  <Feather
                    name={tab.icon as any}
                    size={14}
                    color={isActive ? colors.textInverse : colors.textSecondary}
                  />
                  <Text
                    style={{
                      fontFamily: "Outfit-Bold",
                      fontSize: 12,
                      letterSpacing: 0.7,
                      textTransform: "uppercase",
                      color: isActive ? colors.textInverse : colors.textSecondary,
                    }}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Section header (youth/team only) ────────────────────── */}
        {viewMode !== "adult" && (
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(160).duration(360).springify()}
          style={{ paddingHorizontal: 24, marginBottom: 16 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontFamily: "Clash-Bold", fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4 }} numberOfLines={1}>
                {headerTitle}
              </Text>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 }} numberOfLines={2}>
                {headerDescription}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => { setAudienceInput(""); setModalOpen(true); }}
              activeOpacity={0.8}
              style={{
                height: 40,
                paddingHorizontal: 14,
                borderRadius: 14,
                backgroundColor: colors.accent,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
              }}
            >
              <Feather name="plus" size={15} color={colors.textInverse} />
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", color: colors.textInverse }}>
                {viewMode === "team" ? "Team" : "Group"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
        )}

        {/* ── Cards (youth/team only) ────────────────────────────── */}
        {viewMode !== "adult" && (audiencesLoading ? (
          <View style={{ paddingHorizontal: 24, gap: 10 }}>
            <Skeleton width="100%" height={76} borderRadius={20} />
            <Skeleton width="100%" height={76} borderRadius={20} />
            <Skeleton width="100%" height={76} borderRadius={20} />
          </View>
        ) : (
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(210).duration(360).springify()}
            style={{ paddingHorizontal: 24, paddingBottom: 120, gap: 10 }}
          >
            {activeCards.map((card) => {
              const displayLabel =
                viewMode === "team" ? card.label : `Age ${card.label}`;
              const routeLabel =
                viewMode === "team" ? `team::${card.label}` : card.label;
              const modeIcon =
                viewMode === "team" ? "shield" : "user";
              return (
                <TouchableOpacity
                  key={card.label}
                  onPress={() =>
                    router.push({
                      pathname: "/admin-audience-workspace/[audienceLabel]",
                      params: { audienceLabel: routeLabel, mode: viewMode },
                    } as any)
                  }
                  activeOpacity={0.82}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderRadius: 20,
                    borderWidth: 1,
                    backgroundColor: cardBg,
                    borderColor: cardBorder,
                  }}
                >
                  {/* Icon */}
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 13,
                      backgroundColor: iconBg,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 14,
                    }}
                  >
                    <Feather name={modeIcon as any} size={20} color={colors.accent} />
                  </View>

                  {/* Label + chips */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontFamily: "Clash-Bold", fontSize: 17, color: colors.textPrimary, letterSpacing: -0.3 }}
                      numberOfLines={1}
                    >
                      {displayLabel}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 5 }}>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: chipBg }}>
                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: colors.textSecondary }}>
                          {card.moduleCount} modules
                        </Text>
                      </View>
                      {card.otherCount > 0 && (
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: chipBg }}>
                          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: colors.textSecondary }}>
                            {card.otherCount} items
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Chevron */}
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={isDark ? "rgba(255,255,255,0.22)" : "rgba(15,23,42,0.28)"}
                  />
                </TouchableOpacity>
              );
            })}

            {viewMode === "team" && activeCards.length === 0 && (
              <View
                style={{
                  paddingVertical: 64,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)",
                  borderRadius: 20,
                  gap: 10,
                }}
              >
                <Feather name="shield" size={28} color={colors.textSecondary} style={{ opacity: 0.35 }} />
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: colors.textSecondary }}>
                  No team training spaces yet.
                </Text>
              </View>
            )}
          </Animated.View>
        ))}
        {/* ── Adult Athletes Section ─────────────────────────────── */}
        {viewMode === "adult" && (
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(260).duration(360).springify()}
            style={{ paddingHorizontal: 24, marginTop: 24, paddingBottom: 40 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontFamily: "Clash-Bold", fontSize: 20, color: colors.textPrimary, letterSpacing: -0.3 }} numberOfLines={1}>
                  Adult Athletes
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 }}>
                  Assign training programs to adult athletes.
                </Text>
              </View>
            </View>

            <View style={{ marginBottom: 12 }}>
              <View
                style={{
                  minHeight: 40,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 9,
                  paddingHorizontal: 13,
                  borderRadius: 14,
                  borderWidth: 1,
                  backgroundColor: isDark ? "rgba(255,255,255,0.045)" : "rgba(15,23,42,0.035)",
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
                }}
              >
                <Feather name="search" size={15} color={colors.textSecondary} />
                <TextInput
                  value={athleteSearch}
                  onChangeText={setAthleteSearch}
                  placeholder="Search athletes..."
                  placeholderTextColor={colors.placeholder}
                  style={{ flex: 1, padding: 0, fontFamily: "Outfit-Regular", fontSize: 14, color: colors.textPrimary }}
                  cursorColor={colors.accent}
                />
              </View>
            </View>

            {athletesLoading ? (
              <View style={{ gap: 8 }}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={{ height: 70, borderRadius: 16, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)" }} />
                ))}
              </View>
            ) : filteredAthletes.length === 0 ? (
              <View
                style={{
                  paddingVertical: 40,
                  alignItems: "center",
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)",
                  borderRadius: 20,
                }}
              >
                <Feather name="users" size={24} color={colors.textSecondary} style={{ opacity: 0.35, marginBottom: 8 }} />
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: colors.textSecondary }}>
                  {athleteSearch.trim() ? "No athletes match your search." : "No adult athletes found."}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {filteredAthletes.map((athlete) => (
                  <View
                    key={athlete.id}
                    style={{
                      borderRadius: 16,
                      borderWidth: 1,
                      backgroundColor: cardBg,
                      borderColor: cardBorder,
                      padding: 14,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: "Satoshi-Bold", fontSize: 15, color: colors.textPrimary }} numberOfLines={1}>
                          {athlete.name}
                        </Text>
                        <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                          {athlete.age != null ? (
                            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: chipBg }}>
                              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: colors.textSecondary }}>
                                Age {athlete.age}
                              </Text>
                            </View>
                          ) : null}
                          {athlete.currentProgramTier ? (
                            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: chipBg }}>
                              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: colors.textSecondary }}>
                                {athlete.currentProgramTier}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => setAssignModal({ athleteId: athlete.id, athleteName: athlete.name })}
                        activeOpacity={0.8}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 10,
                          backgroundColor: colors.accent,
                        }}
                      >
                        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", color: colors.textInverse }}>
                          Assign
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {(athlete.assignments ?? []).length > 0 ? (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {athlete.assignments!.map((a) => (
                          <View
                            key={a.id}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 8,
                              backgroundColor: isDark ? `${colors.accent}20` : `${colors.accent}14`,
                              borderWidth: 1,
                              borderColor: isDark ? `${colors.accent}3D` : `${colors.accent}29`,
                            }}
                          >
                            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: colors.accent }}>
                              {a.programName}
                            </Text>
                            <TouchableOpacity onPress={() => handleUnassign(a.id)} hitSlop={6}>
                              <Feather name="x" size={12} color={colors.accent} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        )}
      </ThemedScrollView>

      {/* ── Assign Program Modal ────────────────────────────────── */}
      <Modal visible={assignModal !== null} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 }}
          onPress={() => setAssignModal(null)}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 380,
              maxHeight: "70%",
              borderRadius: 28,
              padding: 28,
              backgroundColor: isDark ? "hsl(220,10%,10%)" : "#FFFFFF",
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
            }}
          >
            <Text style={{ fontFamily: "Clash-Bold", fontSize: 20, color: colors.textPrimary, letterSpacing: -0.3, marginBottom: 4 }}>
              Assign Program
            </Text>
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: colors.textSecondary, marginBottom: 18, lineHeight: 18 }}>
              Assign a program to {assignModal?.athleteName ?? "this athlete"}.
            </Text>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 6 }}>
                {allPrograms.map((p) => {
                  const selected = selectedProgramId === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => setSelectedProgramId(p.id)}
                      activeOpacity={0.8}
                      style={{
                        padding: 14,
                        borderRadius: 14,
                        borderWidth: 1,
                        backgroundColor: selected ? (isDark ? `${colors.accent}20` : `${colors.accent}14`) : (isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)"),
                        borderColor: selected ? colors.accent : (isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)"),
                      }}
                    >
                      <Text style={{ fontFamily: "Satoshi-Bold", fontSize: 14, color: selected ? colors.accent : colors.textPrimary }}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              <TouchableOpacity
                onPress={() => { setAssignModal(null); setSelectedProgramId(null); }}
                style={{
                  flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                }}
              >
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.textPrimary, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAssign}
                disabled={!selectedProgramId || athleteBusy}
                style={{
                  flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
                  backgroundColor: colors.accent, opacity: !selectedProgramId || athleteBusy ? 0.6 : 1,
                }}
              >
                {athleteBusy ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.textInverse, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Assign
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ── Add Audience Modal ───────────────────────────────────── */}
      <Modal visible={modalOpen} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 }}
          onPress={() => setModalOpen(false)}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 380,
              borderRadius: 28,
              overflow: "hidden",
              padding: 28,
              backgroundColor: isDark ? "hsl(220,10%,10%)" : "#FFFFFF",
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
            }}
          >
            <Text style={{ fontFamily: "Clash-Bold", fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4, marginBottom: 6 }}>
              {viewMode === "team" ? "Add Team Training" : "Add Age Group"}
            </Text>
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: colors.textSecondary, marginBottom: 24, lineHeight: 18 }}>
              {viewMode === "team"
                ? "Enter the exact team name to create a training space."
                : "Enter a value like 7, 8, 12, 7-18, or All."}
            </Text>

            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                paddingHorizontal: 16,
                height: 52,
                justifyContent: "center",
                marginBottom: 24,
                backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
              }}
            >
              <TextInput
                value={audienceInput}
                onChangeText={setAudienceInput}
                placeholder={viewMode === "team" ? "e.g. U14 Elite" : "7, 8, 12, 7-18, All"}
                placeholderTextColor={colors.placeholder}
                style={{ fontFamily: "Outfit-Regular", fontSize: 16, color: colors.textPrimary }}
                cursorColor={colors.accent}
                autoFocus
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setModalOpen(false)}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                }}
              >
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.textPrimary, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreate}
                disabled={!audienceInput.trim() || isCreating}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.accent,
                  opacity: isCreating ? 0.6 : 1,
                }}
              >
                {isCreating ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.textInverse, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </AdminScreen>
  );
}
