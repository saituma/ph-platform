import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAdminAudiences } from "@/hooks/admin/useAdminAudiences";
import { useAdminTeams } from "@/hooks/admin/useAdminTeams";
import {
  PROGRAM_TIERS,
  isYouthAgeAudienceLabel,
  isAdultStorageAudienceLabel,
  isTeamStorageAudienceLabel,
  toTeamStorageAudienceLabel,
  fromTeamStorageAudienceLabel,
  fromStorageAudienceLabel,
  normalizeAudienceLabelInput,
} from "@/lib/training-content-utils";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@/components/ui/theme-icons";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

type ViewMode = "youth" | "adult" | "team";

const BASE_AGE_CARDS = Array.from({ length: 12 }, (_, index) => String(index + 7));
const ADULT_TIER_CARDS = PROGRAM_TIERS.map((tier) => tier.label);

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
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

  const [viewMode, setViewMode] = useState<ViewMode>("youth");
  const [modalOpen, setModalOpen] = useState(false);
  const [audienceInput, setAudienceInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);

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

  useEffect(() => {
    if (canLoad) loadAudiences();
  }, [canLoad, loadAudiences]);

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

  const adultTierCards = useMemo<AudienceCard[]>(() => {
    const byLabel = new Map(
      audiences
        .filter((a) => isAdultStorageAudienceLabel(a.label))
        .map((a) => [fromStorageAudienceLabel(a.label), a])
    );
    return ADULT_TIER_CARDS.map((label) => {
      const existing = byLabel.get(label);
      return { label, moduleCount: existing?.moduleCount ?? 0, otherCount: existing?.otherCount ?? 0 };
    });
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
    if (viewMode === "adult") return adultTierCards;
    if (viewMode === "team") return teamCards;
    return youthCards;
  }, [viewMode, adultTierCards, teamCards, youthCards]);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ThemedScrollView showsVerticalScrollIndicator={false} onRefresh={() => loadAudiences(true)}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(60).duration(360).springify()}
          style={{ paddingTop: 40, paddingHorizontal: 24, marginBottom: 28 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <View style={{ width: 5, height: 36, borderRadius: 3, backgroundColor: colors.accent }} />
            <View>
              <Text style={{ fontFamily: "Telma-Bold", fontSize: 44, color: colors.textPrimary, letterSpacing: -1, lineHeight: 48 }}>
                Content
              </Text>
            </View>
          </View>
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: colors.textSecondary, marginTop: 4, marginLeft: 17 }}>
            Exercise library & training content.
          </Text>
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

        {/* ── Section header ──────────────────────────────────────── */}
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
            {viewMode !== "adult" && (
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
            )}
          </View>
        </Animated.View>

        {/* ── Cards ───────────────────────────────────────────────── */}
        {audiencesLoading ? (
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
                viewMode === "adult" ? card.label :
                viewMode === "team"  ? card.label :
                `Age ${card.label}`;
              const routeLabel =
                viewMode === "adult" ? `adult::${card.label}` :
                viewMode === "team"  ? `team::${card.label}` :
                card.label;
              const modeIcon =
                viewMode === "team" ? "shield" :
                viewMode === "adult" ? "award" :
                "user";
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
        )}
      </ThemedScrollView>

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
    </SafeAreaView>
  );
}
