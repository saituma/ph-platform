import { useState, useCallback, useMemo } from "react";
import { apiRequest } from "@/lib/api";

export type SessionItem = {
  id: number;
  blockType: string;
  title: string;
  body: string;
  videoUrl?: string | null;
  allowVideoUpload?: boolean | null;
  order: number;
  metadata?: {
    sets?: number | null;
    reps?: number | null;
    duration?: number | null;
    restSeconds?: number | null;
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
  const [workspace, setWorkspace] = useState<TrainingContentV2Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const ageQ = age !== null ? `?age=${age}` : "";
      const response = await apiRequest<TrainingContentV2Workspace>(`/training-content-v2/mobile${ageQ}`, { token, forceRefresh: force });
      setWorkspace(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load session details.");
    } finally {
      setIsLoading(false);
    }
  }, [token, age]);

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
