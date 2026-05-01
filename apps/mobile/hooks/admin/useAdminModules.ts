import { useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { useAdminMutation } from "./useAdminQuery";
import { Module } from "./useAdminAudienceWorkspace";

export function useAdminModules(token: string | null, canLoad: boolean) {
  const { run: createModule, busy: b1, error: e1 } = useAdminMutation(
    useCallback(
      async (params: { audienceLabel: string; title: string }) => {
        if (!token || !canLoad) return;
        return apiRequest<{ id: number }>("/training-content-v2/modules", {
          method: "POST",
          token,
          body: params,
        });
      },
      [token, canLoad],
    ),
  );

  const { run: updateModule, busy: b2, error: e2 } = useAdminMutation(
    useCallback(
      async (params: { moduleId: number; data: Partial<Module> }) => {
        if (!token || !canLoad) return;
        await apiRequest(`/training-content-v2/modules/${params.moduleId}`, {
          method: "PUT",
          token,
          body: params.data,
        });
      },
      [token, canLoad],
    ),
  );

  const { run: deleteModule, busy: b3, error: e3 } = useAdminMutation(
    useCallback(
      async (moduleId: number) => {
        if (!token || !canLoad) return;
        await apiRequest(`/training-content-v2/modules/${moduleId}`, {
          method: "DELETE",
          token,
        });
      },
      [token, canLoad],
    ),
  );

  const { run: updateLocks, busy: b4, error: e4 } = useAdminMutation(
    useCallback(
      async (params: { audienceLabel: string; moduleId: number | null; programTiers: string[] }) => {
        if (!token || !canLoad) return;
        await apiRequest("/training-content-v2/modules/locks", {
          method: "PUT",
          token,
          body: params,
        });
      },
      [token, canLoad],
    ),
  );

  const { run: cleanupPlaceholders, busy: b5, error: e5 } = useAdminMutation(
    useCallback(
      async (audienceLabel: string) => {
        if (!token || !canLoad) return;
        return apiRequest<{ deletedCount: number }>("/training-content-v2/modules/cleanup-placeholders", {
          method: "POST",
          token,
          body: { audienceLabel },
        });
      },
      [token, canLoad],
    ),
  );

  return {
    isBusy: b1 || b2 || b3 || b4 || b5,
    error: e1 ?? e2 ?? e3 ?? e4 ?? e5,
    createModule: (audienceLabel: string, title: string) => createModule({ audienceLabel, title }),
    updateModule: (moduleId: number, data: Partial<Module>) => updateModule({ moduleId, data }),
    deleteModule,
    updateLocks: (audienceLabel: string, moduleId: number | null, programTiers: string[]) =>
      updateLocks({ audienceLabel, moduleId, programTiers }),
    cleanupPlaceholders,
  };
}
