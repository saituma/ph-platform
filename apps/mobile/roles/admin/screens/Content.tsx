import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Shadows } from "@/constants/theme";
import { useAdminAudiences, AudienceSummary } from "@/hooks/admin/useAdminAudiences";
import { useAdminTeams, AdminTeamSummary } from "@/hooks/admin/useAdminTeams";
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

export default function AdminContentScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
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
    if (canLoad) {
      loadAudiences();
    }
  }, [canLoad, loadAudiences]);

  useEffect(() => {
    if (viewMode === "team" && canLoad) {
      loadTeams(false);
    }
  }, [viewMode, canLoad, loadTeams]);

  const youthCards = useMemo<AudienceCard[]>(() => {
    const youthAudiences = audiences.filter((audience) =>
      isYouthAgeAudienceLabel(audience.label, 18)
    );
    const byLabel = new Map(
      youthAudiences.map((audience) => [
        normalizeAudienceLabelInput(audience.label),
        audience,
      ])
    );

    const primary = BASE_AGE_CARDS.map((label) => {
      const existing = byLabel.get(label);
      return {
        label,
        moduleCount: existing?.moduleCount ?? 0,
        otherCount: existing?.otherCount ?? 0,
      };
    });

    const additional = youthAudiences
      .filter(
        (audience) =>
          !BASE_AGE_CARDS.includes(normalizeAudienceLabelInput(audience.label))
      )
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
      .map((audience) => ({
        label: normalizeAudienceLabelInput(audience.label),
        moduleCount: audience.moduleCount,
        otherCount: audience.otherCount,
      }));

    return [...primary, ...additional];
  }, [audiences]);

  const adultTierCards = useMemo<AudienceCard[]>(() => {
    const byLabel = new Map(
      audiences
        .filter((audience) => isAdultStorageAudienceLabel(audience.label))
        .map((audience) => [fromStorageAudienceLabel(audience.label), audience])
    );
    return ADULT_TIER_CARDS.map((label) => {
      const existing = byLabel.get(label);
      return {
        label,
        moduleCount: existing?.moduleCount ?? 0,
        otherCount: existing?.otherCount ?? 0,
      };
    });
  }, [audiences]);

  const teamCards = useMemo<AudienceCard[]>(() => {
    const audienceSummaryByTeamName = new Map(
      audiences
        .filter((audience) => isTeamStorageAudienceLabel(audience.label))
        .map((audience) => [
          normalizeAudienceLabelInput(fromTeamStorageAudienceLabel(audience.label)),
          audience,
        ])
    );

    const canonicalTeamNameByNormalized = new Map(
      teams.map((team) => [normalizeAudienceLabelInput(team.team), team.team] as const)
    );

    const allNormalizedTeamNames = new Set<string>([
      ...teams.map((team) => normalizeAudienceLabelInput(team.team)),
      ...Array.from(audienceSummaryByTeamName.keys()),
    ]);

    return [...allNormalizedTeamNames]
      .map((normalized) => {
        const existing = audienceSummaryByTeamName.get(normalized);
        const label = canonicalTeamNameByNormalized.get(normalized) ?? normalized;
        return {
          label,
          moduleCount: existing?.moduleCount ?? 0,
          otherCount: existing?.otherCount ?? 0,
        };
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

  const cardStyle = {
    backgroundColor: isDark ? colors.cardElevated : colors.card,
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
    borderRadius: 32,
    ...(isDark ? Shadows.none : Shadows.md),
  };

  const headerTitle =
    viewMode === "adult"
      ? "Adult Tiers"
      : viewMode === "team"
        ? "Team Training"
        : "Age Groups";

  const headerDescription =
    viewMode === "adult"
      ? "Choose a tier to manage adult modules and other content."
      : viewMode === "team"
        ? "Manage training content posted to specific teams."
        : "Manage modules, sessions, and other content by age range.";

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView showsVerticalScrollIndicator={false} onRefresh={() => loadAudiences(true)}>
        {/* Header */}
        <View className="pt-10 mb-8 px-6">
          <View className="flex-row items-center gap-3 mb-2">
            <View className="h-8 w-1.5 rounded-full bg-accent" />
            <Text className="text-5xl font-telma-bold text-app tracking-tight">
              Content
            </Text>
          </View>
          <Text className="text-base font-outfit text-textSecondary leading-relaxed">
            Exercise library & training content.
          </Text>
        </View>

        {/* Tab Switcher */}
        <View className="px-6 mb-8">
          <View 
            className="flex-row p-1.5 rounded-[26px] border"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
            }}
          >
            {(["youth", "adult", "team"] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => setViewMode(mode)}
                className="flex-1 h-12 rounded-[20px] items-center justify-center"
                style={{
                  backgroundColor: viewMode === mode ? colors.accent : "transparent",
                }}
              >
                <Text 
                  className="font-outfit-bold text-[13px] uppercase tracking-wider"
                  style={{ color: viewMode === mode ? colors.textInverse : colors.textSecondary }}
                >
                  {mode}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section Header */}
        <View className="px-6 mb-8">
          <Text className="text-2xl font-clash font-bold text-app mb-2">{headerTitle}</Text>
          <Text className="text-sm font-outfit text-textSecondary leading-relaxed mb-6">
            {headerDescription}
          </Text>
          {viewMode !== "adult" && (
            <TouchableOpacity
              onPress={() => {
                setAudienceInput("");
                setModalOpen(true);
              }}
              activeOpacity={0.8}
              className="h-14 rounded-2xl bg-accent flex-row items-center justify-center gap-2 shadow-sm"
            >
              <Feather name="plus" size={20} color={colors.textInverse} />
              <Text className="font-outfit-bold text-[14px] uppercase tracking-wider" style={{ color: colors.textInverse }}>
                {viewMode === "team" ? "Add Team Training" : "Add Age Group"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Grid of Cards */}
        {audiencesLoading ? (
          <View className="px-6 gap-4">
            <Skeleton width="100%" height={100} borderRadius={32} />
            <Skeleton width="100%" height={100} borderRadius={32} />
          </View>
        ) : (
          <View className="px-6 pb-32 flex-row flex-wrap gap-4">
            {activeCards.map((card) => (
              <TouchableOpacity
                key={card.label}
                onPress={() => {
                  const label = viewMode === "adult" 
                    ? `adult::${card.label}`
                    : viewMode === "team"
                      ? `team::${card.label}`
                      : card.label;
                  
                  router.push({
                    pathname: "/admin-audience-workspace/[audienceLabel]",
                    params: { audienceLabel: label, mode: viewMode }
                  } as any);
                }}
                activeOpacity={0.9}
                className="w-[47%] border p-6"
                style={cardStyle}
              >
                <Text className="text-xl font-clash font-bold text-app mb-1" numberOfLines={1}>
                  {viewMode === "adult" ? card.label : viewMode === "team" ? card.label : `Age ${card.label}`}
                </Text>
                <Text className="text-[11px] font-outfit text-textSecondary uppercase tracking-wider">
                  {card.moduleCount} modules
                </Text>
                <Text className="text-[11px] font-outfit text-textSecondary uppercase tracking-wider mt-0.5">
                  {card.otherCount} items
                </Text>
              </TouchableOpacity>
            ))}
            {viewMode === "team" && activeCards.length === 0 && (
              <View className="w-full py-20 items-center justify-center border border-dashed border-app/20 rounded-[32px]">
                <Text className="text-textSecondary font-outfit italic text-base">No teams yet.</Text>
              </View>
            )}
          </View>
        )}
      </ThemedScrollView>

      {/* Add Audience Modal */}
      <Modal visible={modalOpen} transparent animationType="fade">
        <Pressable 
          className="flex-1 bg-black/60 items-center justify-center p-6"
          onPress={() => setModalOpen(false)}
        >
          <View 
            className="w-full max-w-sm rounded-[32px] overflow-hidden p-8"
            style={{ backgroundColor: isDark ? "#161628" : "#FFFFFF" }}
          >
            <Text className="text-2xl font-clash font-bold text-app mb-2">
              {viewMode === "team" ? "Add Team Training" : "Add Age Group"}
            </Text>
            <Text className="text-sm font-outfit text-textSecondary mb-6 leading-relaxed">
              {viewMode === "team"
                ? "Enter the exact name of the team to create a training space for them."
                : "Enter a value like 7, 8, 12, 7-18, or All."}
            </Text>

            <View 
              className="rounded-2xl border px-5 h-14 justify-center mb-8"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
              }}
            >
              <TextInput
                value={audienceInput}
                onChangeText={setAudienceInput}
                placeholder={viewMode === "team" ? "e.g. U14 Elite" : "7, 8, 12, 7-18, All"}
                placeholderTextColor={colors.placeholder}
                className="text-[16px] font-outfit text-app"
                cursorColor={colors.accent}
                autoFocus
              />
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity 
                onPress={() => setModalOpen(false)}
                className="flex-1 h-12 rounded-xl bg-secondary/10 items-center justify-center"
              >
                <Text className="text-sm font-outfit-bold text-app uppercase tracking-wider">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleCreate}
                disabled={!audienceInput.trim() || isCreating}
                className="flex-1 h-12 rounded-xl bg-accent items-center justify-center"
                style={{ opacity: isCreating ? 0.6 : 1 }}
              >
                {isCreating ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <Text className="text-sm font-outfit-bold text-app uppercase tracking-wider" style={{ color: colors.textInverse }}>
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
