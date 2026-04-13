import { useCallback, useState } from "react";
import { apiRequest } from "@/lib/api";
import { Module, ModuleSession } from "./useAdminAudienceWorkspace";

export function useAdminModules(token: string | null, canLoad: boolean) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createModule = useCallback(async (audienceLabel: string, title: string) => {
    if (!token || !canLoad) return;
    setIsBusy(true);
    setError(null);
    try {
      const res = await apiRequest<{ id: number }>("/training-content-v2/modules", {
        method: "POST",
        token,
        body: { audienceLabel, title },
      });
      return res;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create module");
      throw e;
    } finally {
      setIsBusy(false);
    }
  }, [token, canLoad]);

  const updateModule = useCallback(async (moduleId: number, data: Partial<Module>) => {
    if (!token || !canLoad) return;
    setIsBusy(true);
    setError(null);
    try {
      await apiRequest(`/training-content-v2/modules/${moduleId}`, {
        method: "PUT",
        token,
        body: data,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update module");
      throw e;
    } finally {
      setIsBusy(false);
    }
  }, [token, canLoad]);

  const deleteModule = useCallback(async (moduleId: number) => {
    if (!token || !canLoad) return;
    setIsBusy(true);
    setError(null);
    try {
      await apiRequest(`/training-content-v2/modules/${moduleId}`, {
        method: "DELETE",
        token,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete module");
      throw e;
    } finally {
      setIsBusy(false);
    }
  }, [token, canLoad]);

  const updateLocks = useCallback(async (audienceLabel: string, moduleId: number | null, programTiers: string[]) => {
    if (!token || !canLoad) return;
    setIsBusy(true);
    setError(null);
    try {
      await apiRequest("/training-content-v2/modules/locks", {
        method: "PUT",
        token,
        body: { audienceLabel, moduleId, programTiers },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update locks");
      throw e;
    } finally {
      setIsBusy(false);
    }
  }, [token, canLoad]);

  const cleanupPlaceholders = useCallback(async (audienceLabel: string) => {
    if (!token || !canLoad) return;
    setIsBusy(true);
    setError(null);
    try {
      const res = await apiRequest<{ deletedCount: number }>("/training-content-v2/modules/cleanup-placeholders", {
        method: "POST",
        token,
        body: { audienceLabel },
      });
      return res;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cleanup placeholders");
      throw e;
    } finally {
      setIsBusy(false);
    }
  }, [token, canLoad]);

  return { isBusy, error, createModule, updateModule, deleteModule, updateLocks, cleanupPlaceholders };
}
