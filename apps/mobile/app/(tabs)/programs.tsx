import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSelector } from "@/store/hooks";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useRouter } from "expo-router";
import { AgeGate } from "@/components/AgeGate";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { programDetailRouteIdFromTier } from "@/lib/planAccess";
import { ProgramDetailPanel } from "@/components/programs/ProgramDetailPanel";
import { SafeMaskedView } from "@/components/navigation/TransitionStack";
import type { ProgramId } from "@/constants/program-details";

import { useTeamWorkspace } from "@/hooks/programs/useTeamWorkspace";
import { TeamProgramView } from "@/components/programs/TeamProgramView";
import { hasAssignedTeam } from "@/lib/teamMembership";

export default function ProgramsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { isSectionHidden } = useAgeExperience();
  const programTier = useAppSelector((state) => state.user.programTier);
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
  } = useTeamWorkspace(token, activeAthlete?.age ?? null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Non-team: show program detail **inside the Programs tab** (no `router.push` to `programs/[id]`).
   * Pushing the stack route from this screen could run while another tab was visible (pager mounts
   * all pages) or race native tab index — leaving program detail as the root stack screen on cold start.
   */

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
	        edges={["left", "right", "bottom"]}
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

  const programId = programDetailRouteIdFromTier(programTier) as ProgramId;

	  return (
	    <SafeAreaView
	      className="flex-1 bg-app"
	      edges={["left", "right", "bottom"]}
	      style={{ backgroundColor: colors.background }}
	    >
	      <SafeMaskedView style={{ flex: 1 }}>
	        <ProgramDetailPanel
          programId={programId}
          showBack={false}
          onNavigate={(path) => router.push(path as any)}
        />
      </SafeMaskedView>
    </SafeAreaView>
  );
}
