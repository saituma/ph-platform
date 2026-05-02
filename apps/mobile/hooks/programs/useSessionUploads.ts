import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/api";

export function useSessionUploads(token: string | null, athleteUserId: number | string | null) {
  const [uploadsBySectionId, setUploadsBySectionId] = useState<Record<number, any[]>>({});
  const [hasUploadedBySectionId, setHasUploadedBySectionId] = useState<Record<number, boolean>>({});

  const loadUploadsForSection = useCallback(async (sectionContentId: number, force = false) => {
    if (!token) return;
    try {
      const headers = athleteUserId ? { "X-Acting-User-Id": String(athleteUserId) } : undefined;
      const data = await apiRequest<{ items: any[] }>(`/videos?sectionContentId=${sectionContentId}`, {
        token,
        headers,
        forceRefresh: force,
      });
      const items = data.items ?? [];
      setHasUploadedBySectionId(prev => ({ ...prev, [sectionContentId]: items.length > 0 }));
      setUploadsBySectionId(prev => ({ ...prev, [sectionContentId]: items }));
    } catch (err) {
      console.warn("[useSessionUploads] loadUploadsForSection failed", err);
    }
  }, [token, athleteUserId]);

  return { uploadsBySectionId, hasUploadedBySectionId, loadUploadsForSection };
}
