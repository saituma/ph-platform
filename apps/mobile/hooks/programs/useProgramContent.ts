import { useState, useCallback, useMemo } from "react";
import { apiRequest } from "@/lib/api";
import { ProgramSectionContent, TrainingContentV2Workspace } from "@/types/programs";
import { ProgramId, getSessionTypesForTab, normalizeProgramTabLabel, PROGRAM_TABS } from "@/constants/program-details";
import { programIdToTier } from "@/lib/planAccess";

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
  const [phpPlusTabs, setPhpPlusTabs] = useState<string[] | null>(null);

  const loadPhpPlusTabs = useCallback(async () => {
    if (programId !== "plus") return;
    try {
      const response = await apiRequest<{ tabs?: string[] }>(
        `/onboarding/php-plus-tabs?ts=${Date.now()}`,
        { method: "GET", suppressLog: true },
      );
      if (Array.isArray(response.tabs)) {
        setPhpPlusTabs(response.tabs.map((tab) => normalizeProgramTabLabel(String(tab))));
      }
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
        const ageQ = activeAthleteAge !== null ? `&age=${activeAthleteAge}` : "";
        
        const responses = await Promise.all(
          types.map((type) =>
            apiRequest<{ items: ProgramSectionContent[] }>(
              `/program-section-content?sectionType=${encodeURIComponent(String(type))}&programTier=${encodeURIComponent(tier)}${ageQ}`,
              { token, forceRefresh: force },
            ),
          ),
        );
        
        const merged = responses
          .flatMap((res) => res.items ?? [])
          .filter((item) => item && item.id);
          
        merged.sort((a, b) => {
          const orderA = Number.isFinite(a.order) ? (a.order as number) : 9999;
          const orderB = Number.isFinite(b.order) ? (b.order as number) : 9999;
          if (orderA !== orderB) return orderA - orderB;
          return String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""));
        });
        
        setSectionContent(merged);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load program content.");
      } finally {
        setIsLoading(false);
      }
    },
    [token, programId, activeAthleteAge, hasAccess]
  );

  return {
    sectionContent,
    isLoading,
    error,
    trainingContentV2,
    phpPlusTabs,
    loadPhpPlusTabs,
    loadSectionContent,
    setTrainingContentV2,
  };
}
