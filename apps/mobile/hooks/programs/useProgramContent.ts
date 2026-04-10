import { useState, useCallback } from "react";
import { ProgramSectionContent, TrainingContentV2Workspace } from "@/types/programs";
import { ProgramId, getSessionTypesForTab } from "@/constants/program-details";
import { programIdToTier } from "@/lib/planAccess";
import * as programsService from "@/services/programs/programsService";
import { mapPhpPlusTabs, mapMergedSectionContent } from "@/lib/programs/programMapper";

export function useProgramContent(
  token: string | null,
  programId: ProgramId,
  activeAthleteAge: number | null,
  hasAccess: boolean
) {
  const [sectionContent, setSectionContent] = useState<ProgramSectionContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trainingContentV2, setTrainingContentV2] = useState<TrainingContentV2Workspace | null>(null);
  const [trainingIsLoading, setTrainingIsLoading] = useState(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [phpPlusTabs, setPhpPlusTabs] = useState<string[] | null>(null);

  const loadPhpPlusTabs = useCallback(async () => {
    if (programId !== "plus") return;
    try {
      const response = await programsService.fetchPhpPlusTabs();
      setPhpPlusTabs(mapPhpPlusTabs(response.tabs));
    } catch {
      setPhpPlusTabs(null);
    }
  }, [programId]);

  const loadSectionContent = useCallback(
    async (tab: string, force = false) => {
      if (!token || !hasAccess) return;
      
      const types = getSessionTypesForTab(tab);
      if (types.length === 0) {
        setSectionContent([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const tier = programIdToTier(programId);
        
        const responses = await Promise.all(
          types.map((type) =>
            programsService.fetchSectionContent(token, type, tier, activeAthleteAge, force)
          ),
        );
        
        setSectionContent(mapMergedSectionContent(responses));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load program content.");
      } finally {
        setIsLoading(false);
      }
    },
    [token, programId, activeAthleteAge, hasAccess]
  );

  const loadTrainingContentV2 = useCallback(
    async (force = false) => {
      if (!token || !hasAccess) {
        setTrainingContentV2(null);
        setTrainingIsLoading(false);
        setTrainingError(null);
        return;
      }
      setTrainingIsLoading(true);
      setTrainingError(null);
      try {
        const workspace = await programsService.fetchTeamWorkspace(
          token,
          activeAthleteAge,
          force,
        );
        setTrainingContentV2(workspace as any);
      } catch {
        setTrainingContentV2(null);
        setTrainingError("Failed to load training modules.");
      } finally {
        setTrainingIsLoading(false);
      }
    },
    [token, activeAthleteAge, hasAccess],
  );

  return {
    sectionContent,
    isLoading,
    error,
    trainingContentV2,
    trainingIsLoading,
    trainingError,
    phpPlusTabs,
    loadPhpPlusTabs,
    loadTrainingContentV2,
    loadSectionContent,
    setTrainingContentV2,
  };
}
