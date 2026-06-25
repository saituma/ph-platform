import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { TrainingAchievement } from "@/components/programs/AchievementsStrip";

type ProgramStatsData = {
  stats: {
    exerciseCompletions: number;
    sessionRuns: number;
    trainingDays: number;
  };
  achievements: TrainingAchievement[];
};

export function useProgramStats(token: string | null) {
  const queryClient = useQueryClient();

  const { data: progress = null } = useQuery({
    queryKey: queryKeys.programs.stats(),
    queryFn: () =>
      apiRequest<ProgramStatsData>("/training-progress", { token: token! }),
    enabled: Boolean(token),
    staleTime: 2 * 60 * 1000,
  });

  const loadProgress = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.programs.stats() });
  }, [queryClient]);

  return { progress, loadProgress };
}
