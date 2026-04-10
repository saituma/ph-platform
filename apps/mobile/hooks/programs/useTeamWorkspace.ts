import { useState, useCallback } from "react";
import { TrainingContentV2Workspace } from "@/types/billing";
import * as programsService from "@/services/programs/programsService";
import { mapTeamWorkspace } from "@/lib/programs/programMapper";

export function useTeamWorkspace(token: string | null, age: number | null) {
  const [workspace, setWorkspace] = useState<TrainingContentV2Workspace | null>(null);
  const [activeTab, setActiveTab] = useState<string>("Modules");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await programsService.fetchTeamWorkspace(token, age, force);
      const mapped = mapTeamWorkspace(response);
      setWorkspace(mapped);
      setActiveTab(prev => mapped.tabs.includes(prev) ? prev : mapped.tabs[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load team program.");
    } finally {
      setIsLoading(false);
    }
  }, [token, age]);

  return { workspace, activeTab, setActiveTab, isLoading, error, load };
}
