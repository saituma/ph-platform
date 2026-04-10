import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { TrainingAchievement } from "@/components/programs/AchievementsStrip";

export function useProgramStats(token: string | null) {
  const [progress, setProgress] = useState<{
    stats: {
      exerciseCompletions: number;
      sessionRuns: number;
      trainingDays: number;
    };
    achievements: TrainingAchievement[];
  } | null>(null);

  const loadProgress = useCallback(async () => {
    if (!token) {
      setProgress(null);
      return;
    }
    try {
      const data = await apiRequest<{
        stats: {
          exerciseCompletions: number;
          sessionRuns: number;
          trainingDays: number;
        };
        achievements: TrainingAchievement[];
      }>("/training-progress", { token, forceRefresh: true });
      setProgress({
        stats: data.stats,
        achievements: data.achievements,
      });
    } catch {
      setProgress(null);
    }
  }, [token]);

  return { progress, loadProgress };
}
