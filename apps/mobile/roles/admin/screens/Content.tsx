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
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  View,
  TouchableOpacity,
} from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import {
  Users,
  Award,
  Shield,
  Plus,
  Search,
  ChevronRight,
  X,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import {
  useAdminPastel,
  AdminScreen,
  AdminHeader,
  AdminSegmentedTabs,
  AdminModalContainer,
  AdminModalTitle,
  AdminModalSubtitle,
  AdminButton,
  AdminInput,
  AdminEmptyState,
} from "@/components/admin/AdminUI";

type ViewMode = "youth" | "adult" | "team";

const BASE_AGE_CARDS = Array.from({ length: 12 }, (_, index) => String(index + 7));

type AudienceCard = {
  label: string;
  moduleCount: number;
  otherCount: number;
};

const MODE_TABS: { key: ViewMode; label: string; icon: LucideIcon }[] = [
  { key: "youth", label: "Youth", icon: Users },
  { key: "adult", label: "Adult", icon: Award },
  { key: "team", label: "Team", icon: Shield },
];

const CARD_COLORS = ["cardSage", "cardPeach", "cardLavender", "cardMint"] as const;

export default function AdminContentScreen() {
  const p = useAdminPastel();
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
        >
          <AdminSegmentedTabs
            tabs={MODE_TABS}
            value={viewMode}
            onChange={setViewMode}
          />
        </Animated.View>

        {/* ── Section header (youth/team only) ────────────────────── */}
        {viewMode !== "adult" && (
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(160).duration(360).springify()}
            style={{ paddingHorizontal: 24, marginBottom: 16 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text
                  style={{
                    fontFamily: "Outfit-Bold",
                    fontSize: 22,
                    color: p.textPrimary,
                    letterSpacing: -0.4,
                  }}
                  numberOfLines={1}
                >
                  {headerTitle}
                </Text>
                <Text
                  style={{
                    fontFamily: "Outfit-Regular",
                    fontSize: 13,
                    color: p.textSecondary,
                    marginTop: 2,
                    lineHeight: 18,
                  }}
                  numberOfLines={2}
                >
                  {headerDescription}
                </Text>
              </View>
              <AdminButton
                label={viewMode === "team" ? "Team" : "Group"}
                onPress={() => { setAudienceInput(""); setModalOpen(true); }}
                variant="primary"
                icon={Plus}
                compact
              />
            </View>
          </Animated.View>
        )}

        {/* ── Cards (youth/team only) ────────────────────────────── */}
        {viewMode !== "adult" && (audiencesLoading ? (
          <View style={{ paddingHorizontal: 24, gap: 10 }}>
            <Skeleton width="100%" height={76} borderRadius={28} />
            <Skeleton width="100%" height={76} borderRadius={28} />
            <Skeleton width="100%" height={76} borderRadius={28} />
          </View>
        ) : (
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(210).duration(360).springify()}
            style={{ paddingHorizontal: 24, paddingBottom: 120, gap: 10 }}
          >
            {activeCards.map((card, index) => {
              const displayLabel =
                viewMode === "team" ? card.label : `Age ${card.label}`;
              const routeLabel =
                viewMode === "team" ? `team::${card.label}` : card.label;
              const ModeIcon: LucideIcon =
                viewMode === "team" ? Shield : Users;
              const bgColor = p[CARD_COLORS[index % CARD_COLORS.length]];

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
                    borderRadius: 28,
                    backgroundColor: bgColor,
                  }}
                >
                  {/* Icon */}
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: p.cardWhite,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 14,
                    }}
                  >
                    <ModeIcon size={20} color={p.accent} strokeWidth={2} />
                  </View>

                  {/* Label + chips */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: "Outfit-Bold",
                        fontSize: 17,
                        color: p.textPrimary,
                        letterSpacing: -0.3,
                      }}
                      numberOfLines={1}
                    >
                      {displayLabel}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 5 }}>
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 100,
                          backgroundColor: p.cardWhite,
                        }}
                      >
                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textSecondary }}>
                          {card.moduleCount} modules
                        </Text>
                      </View>
                      {card.otherCount > 0 && (
                        <View
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 100,
                            backgroundColor: p.cardWhite,
                          }}
                        >
                          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textSecondary }}>
                            {card.otherCount} items
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Chevron */}
                  <ChevronRight size={18} color={p.textMuted} strokeWidth={2} />
                </TouchableOpacity>
              );
            })}

            {viewMode === "team" && activeCards.length === 0 && (
              <AdminEmptyState
                icon={Shield}
                title="No team training spaces"
                description="No team training spaces yet. Tap the button above to create one."
                color="mint"
              />
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
                <Text
                  style={{
                    fontFamily: "Outfit-Bold",
                    fontSize: 20,
                    color: p.textPrimary,
                    letterSpacing: -0.3,
                  }}
                  numberOfLines={1}
                >
                  Adult Athletes
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary, marginTop: 2, lineHeight: 18 }}>
                  Assign training programs to adult athletes.
                </Text>
              </View>
            </View>

            <View style={{ marginBottom: 12 }}>
              <AdminInput
                value={athleteSearch}
                onChangeText={setAthleteSearch}
                placeholder="Search athletes..."
                leftIcon={Search}
                onClear={() => setAthleteSearch("")}
              />
            </View>

            {athletesLoading ? (
              <View style={{ gap: 8 }}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} width="100%" height={70} borderRadius={28} />
                ))}
              </View>
            ) : filteredAthletes.length === 0 ? (
              <AdminEmptyState
                icon={Users}
                title={athleteSearch.trim() ? "No matches" : "No adult athletes"}
                description={athleteSearch.trim() ? "No athletes match your search." : "No adult athletes found."}
                color="peach"
              />
            ) : (
              <View style={{ gap: 8 }}>
                {filteredAthletes.map((athlete, index) => {
                  const bgColor = p[CARD_COLORS[index % CARD_COLORS.length]];
                  return (
                    <View
                      key={athlete.id}
                      style={{
                        borderRadius: 28,
                        backgroundColor: bgColor,
                        padding: 16,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: p.textPrimary }}
                            numberOfLines={1}
                          >
                            {athlete.name}
                          </Text>
                          <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                            {athlete.age != null ? (
                              <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, backgroundColor: p.cardWhite }}>
                                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textSecondary }}>
                                  Age {athlete.age}
                                </Text>
                              </View>
                            ) : null}
                            {athlete.currentProgramTier ? (
                              <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, backgroundColor: p.cardWhite }}>
                                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textSecondary }}>
                                  {athlete.currentProgramTier}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                        <AdminButton
                          label="Assign"
                          onPress={() => setAssignModal({ athleteId: athlete.id, athleteName: athlete.name })}
                          variant="primary"
                          compact
                        />
                      </View>
                      {(athlete.assignments ?? []).length > 0 ? (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                          {athlete.assignments!.map((a) => (
                            <View
                              key={a.id}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 5,
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 100,
                                backgroundColor: p.accentSoft,
                              }}
                            >
                              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.accent }}>
                                {a.programName}
                              </Text>
                              <TouchableOpacity onPress={() => handleUnassign(a.id)} hitSlop={6}>
                                <X size={12} color={p.accent} strokeWidth={2.5} />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </Animated.View>
        )}
      </ThemedScrollView>

      {/* ── Assign Program Modal ────────────────────────────────── */}
      <Modal visible={assignModal !== null} transparent animationType="fade">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
        <AdminModalContainer onClose={() => setAssignModal(null)} position="center">
          <AdminModalTitle>Assign Program</AdminModalTitle>
          <AdminModalSubtitle>
            {`Assign a program to ${assignModal?.athleteName ?? "this athlete"}.`}
          </AdminModalSubtitle>
          <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 6 }}>
              {allPrograms.map((prog) => {
                const selected = selectedProgramId === prog.id;
                return (
                  <TouchableOpacity
                    key={prog.id}
                    onPress={() => setSelectedProgramId(prog.id)}
                    activeOpacity={0.8}
                    style={{
                      padding: 14,
                      borderRadius: 20,
                      backgroundColor: selected ? p.accentSoft : p.pageBg,
                      borderWidth: selected ? 1.5 : 0,
                      borderColor: selected ? p.accent : "transparent",
                    }}
                  >
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: selected ? p.accent : p.textPrimary }}>
                      {prog.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
            <View style={{ flex: 1 }}>
              <AdminButton
                label="Cancel"
                onPress={() => { setAssignModal(null); setSelectedProgramId(null); }}
                variant="ghost"
              />
            </View>
            <View style={{ flex: 1 }}>
              <AdminButton
                label="Assign"
                onPress={handleAssign}
                variant="primary"
                disabled={!selectedProgramId || athleteBusy}
                loading={athleteBusy}
              />
            </View>
          </View>
        </AdminModalContainer>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add Audience Modal ───────────────────────────────────── */}
      <Modal visible={modalOpen} transparent animationType="fade">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
        <AdminModalContainer onClose={() => setModalOpen(false)} position="center">
          <AdminModalTitle>
            {viewMode === "team" ? "Add Team Training" : "Add Age Group"}
          </AdminModalTitle>
          <AdminModalSubtitle>
            {viewMode === "team"
              ? "Enter the exact team name to create a training space."
              : "Enter a value like 7, 8, 12, 7-18, or All."}
          </AdminModalSubtitle>

          <AdminInput
            value={audienceInput}
            onChangeText={setAudienceInput}
            placeholder={viewMode === "team" ? "e.g. U14 Elite" : "7, 8, 12, 7-18, All"}
            leftIcon={Plus}
            onClear={() => setAudienceInput("")}
            containerStyle={{ marginBottom: 20 }}
            autoFocus
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AdminButton
                label="Cancel"
                onPress={() => setModalOpen(false)}
                variant="ghost"
              />
            </View>
            <View style={{ flex: 1 }}>
              <AdminButton
                label="Save"
                onPress={handleCreate}
                variant="primary"
                disabled={!audienceInput.trim() || isCreating}
                loading={isCreating}
              />
            </View>
          </View>
        </AdminModalContainer>
        </KeyboardAvoidingView>
      </Modal>
    </AdminScreen>
  );
}
