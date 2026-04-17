import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, ScrollView, RefreshControl } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAppSelector } from "@/store/hooks";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useRouter } from "expo-router";
import { Text } from "@/components/ScaledText";
import { AgeGate } from "@/components/AgeGate";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { normalizeProgramTier } from "@/lib/planAccess";
import { Shadows } from "@/constants/theme";
import { PROGRAM_TIERS } from "@/constants/Programs";

import { useTeamWorkspace } from "@/hooks/programs/useTeamWorkspace";
import { ProgramTierCard } from "@/components/programs/ProgramTierCard";
import { TeamProgramView } from "@/components/programs/TeamProgramView";
import { hasAssignedTeam } from "@/lib/teamMembership";

export default function ProgramsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const { isSectionHidden } = useAgeExperience();
  const {
    token,
    profile,
    athleteUserId,
    managedAthletes,
  } = useAppSelector((state) => state.user);

  const activeAthlete = useMemo(() => {
    return (
      managedAthletes.find(
        (a) => a.id === athleteUserId || a.userId === athleteUserId,
      ) ??
      managedAthletes[0] ??
      null
    );
  }, [athleteUserId, managedAthletes]);

  const isTeamMode = hasAssignedTeam(activeAthlete?.team);

  const {
    workspace,
    activeTab,
    setActiveTab,
    load: loadTeam,
    isLoading: teamLoading,
  } = useTeamWorkspace(token, activeAthlete?.age ?? null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isTeamMode) {
      loadTeam();
    }
  }, [isTeamMode]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (isTeamMode) await loadTeam(true);
    setIsRefreshing(false);
  };

  const tiers = useMemo(
    () =>
      PROGRAM_TIERS.map((t) => ({
        ...t,
        icon: t.id === "php" ? "activity" : t.id === "plus" ? "layers" : "star",
        popular: t.id === "plus",
      })),
    [],
  );

  if (isSectionHidden("programs")) {
    return (
      <AgeGate
        title="Programs locked"
        message="Programs are restricted for this age."
      />
    );
  }

  if (isTeamMode) {
    return (
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: colors.background }}
      >
        <TeamProgramView
          workspace={workspace}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenModule={(id) => router.push(`/programs/module/${id}`)}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          focusName={activeAthlete?.name || profile.name || "Athlete"}
          focusInfo={
            [
              activeAthlete?.age ? `${activeAthlete.age} yrs` : null,
              activeAthlete?.team,
            ].filter(Boolean) as string[]
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="mb-8">
          <Text className="text-sm font-outfit text-accent font-bold uppercase tracking-widest">
            Available Plans
          </Text>
          <Text className="text-4xl font-clash font-bold text-app mt-1">
            Our Programs
          </Text>
          <Text className="text-sm font-outfit text-secondary mt-2">
            Professional coaching and performance tracking.
          </Text>
        </View>

        {tiers.map((tier) => {
          return (
            <ProgramTierCard
              key={tier.id}
              tier={tier}
              onOpen={(id) => router.push(`/programs/${id}`)}
            />
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
