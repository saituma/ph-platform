import { useCallback, useState } from "react";
import { apiRequest } from "@/lib/api";
import { OtherItem } from "./useAdminAudienceWorkspace";

export function useAdminOtherContent(token: string | null, canLoad: boolean) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOther = useCallback(async (data: Partial<OtherItem>) => {
    if (!token || !canLoad) return;
    setIsBusy(true);
    setError(null);
    try {
      const res = await apiRequest<{ id: number }>("/training-content-v2/others", {
        method: "POST",
        token,
        body: data,
      });
      return res;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create other content");
      throw e;
    } finally {
      setIsBusy(false);
    }
  }, [token, canLoad]);

  const updateOther = useCallback(async (otherId: number, data: Partial<OtherItem>) => {
    if (!token || !canLoad) return;
    setIsBusy(true);
    setError(null);
    try {
      await apiRequest(`/training-content-v2/others/${otherId}`, {
        method: "PUT",
        token,
        body: data,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update other content");
      throw e;
    } finally {
      setIsBusy(false);
    }
  }, [token, canLoad]);

  const deleteOther = useCallback(async (otherId: number) => {
    if (!token || !canLoad) return;
    setIsBusy(true);
    setError(null);
    try {
      await apiRequest(`/training-content-v2/others/${otherId}`, {
        method: "DELETE",
        token,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete other content");
      throw e;
    } finally {
      setIsBusy(false);
    }
  }, [token, canLoad]);

  return { isBusy, error, createOther, updateOther, deleteOther };
}
