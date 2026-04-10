import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { TrainingContentV2Workspace } from "@/types/billing";

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
      const ageQ = age != null ? `?age=${age}` : "";
      const response = await apiRequest<TrainingContentV2Workspace>(
        `/training-content-v2/mobile${ageQ}`,
        { token, forceRefresh: force }
      );
      const tabs = Array.isArray(response?.tabs) && response.tabs.length ? response.tabs : ["Modules"];
      setWorkspace({ ...response, tabs });
      setActiveTab(prev => tabs.includes(prev) ? prev : tabs[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load team program.");
    } finally {
      setIsLoading(false);
    }
  }, [token, age]);

  return { workspace, activeTab, setActiveTab, isLoading, error, load };
}
