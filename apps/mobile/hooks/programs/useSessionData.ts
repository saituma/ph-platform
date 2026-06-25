import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export type SessionItem = {
  id: number;
  blockType: string;
  title: string;
  body: string;
  videoUrl?: string | null;
  posterUrl?: string | null;
  durationSec?: number | null;
  allowVideoUpload?: boolean | null;
  order: number;
  metadata?: {
    sets?: number | null;
    reps?: number | null;
    duration?: number | null;
    restSeconds?: number | null;
    steps?: string | null;
    cues?: string | null;
    progression?: string | null;
    regression?: string | null;
    category?: string | null;
    equipment?: string | null;
  } | null;
};

export type ModuleSession = {
  id: number;
  title: string;
  dayLength: number;
  order: number;
  completed: boolean;
  locked: boolean;
  items: SessionItem[];
};

export type Module = {
  id: number;
  title: string;
  order: number;
  locked: boolean;
  sessions: ModuleSession[];
};

export type TrainingContentV2Workspace = {
  modules: Module[];
};

export function useSessionData(token: string | null, age: number | null) {
  const queryClient = useQueryClient();

  const { data: workspace = null, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.programs.sessionData(age),
    queryFn: async () => {
      const ageQ = age !== null ? `?age=${age}` : "";
      return apiRequest<TrainingContentV2Workspace>(
        `/training-content-v2/mobile${ageQ}`,
        { token: token! },
      );
    },
    enabled: Boolean(token),
    staleTime: 2 * 60 * 1000,
  });

  const error = queryError ? (queryError instanceof Error ? queryError.message : "Failed to load session details.") : null;

  const load = useCallback(async (_force = false) => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.programs.sessionData(age) });
    return workspace;
  }, [queryClient, age, workspace]);

  const findModuleAndSession = useCallback((sessionId: number | null, moduleId: number | null) => {
    if (!workspace?.modules) return { module: null, session: null };
    const mod = moduleId
      ? workspace.modules.find(m => m.id === moduleId)
      : workspace.modules.find(m => m.sessions.some(s => s.id === sessionId));
    const sess = mod?.sessions.find(s => s.id === sessionId) ?? null;
    return { module: mod ?? null, session: sess };
  }, [workspace]);

  return { workspace, isLoading, error, load, findModuleAndSession };
}
