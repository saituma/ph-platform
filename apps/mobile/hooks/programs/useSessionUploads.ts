import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export function useSessionUploads(token: string | null, athleteUserId: number | string | null) {
  const queryClient = useQueryClient();
  const [uploadsBySectionId, setUploadsBySectionId] = useState<Record<number, any[]>>({});
  const [hasUploadedBySectionId, setHasUploadedBySectionId] = useState<Record<number, boolean>>({});

  const loadUploadsForSection = useCallback(async (sectionContentId: number, _force = false) => {
    if (!token) return;
    try {
      const cached = queryClient.getQueryData<{ items: any[] }>(queryKeys.programs.uploads(sectionContentId));
      if (cached && !_force) {
        const items = cached.items ?? [];
        setHasUploadedBySectionId(prev => ({ ...prev, [sectionContentId]: items.length > 0 }));
        setUploadsBySectionId(prev => ({ ...prev, [sectionContentId]: items }));
        return;
      }

      const headers = athleteUserId ? { "X-Acting-User-Id": String(athleteUserId) } : undefined;
      const data = await apiRequest<{ items: any[] }>(`/videos?sectionContentId=${sectionContentId}`, {
        token,
        headers,
      });
      const items = data.items ?? [];
      queryClient.setQueryData(queryKeys.programs.uploads(sectionContentId), data);
      setHasUploadedBySectionId(prev => ({ ...prev, [sectionContentId]: items.length > 0 }));
      setUploadsBySectionId(prev => ({ ...prev, [sectionContentId]: items }));
    } catch (err) {
      console.warn("[useSessionUploads] loadUploadsForSection failed", err);
    }
  }, [token, athleteUserId, queryClient]);

  return { uploadsBySectionId, hasUploadedBySectionId, loadUploadsForSection };
}
