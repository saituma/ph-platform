import { useCallback, useState } from "react";
import { apiRequest } from "@/lib/api";
import { ModuleSession, SessionItem } from "./useAdminAudienceWorkspace";

export function useAdminSessions(token: string | null, canLoad: boolean) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async (moduleId: number, title: string) => {
    if (!token || !canLoad) return;
    setIsBusy(true);
    setError(null);
    try {
      const res = await apiRequest<{ id: number }>("/training-content-v2/sessions", {
        method: "POST",
        token,
        body: { moduleId, title },
      });
      return res;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create session");
      throw e;
    } finally {
      setIsBusy(false);
    }
  }, [token, canLoad]);

  const updateSession = useCallback(async (sessionId: number, data: Partial<ModuleSession>) => {
    if (!token || !canLoad) return;
    setIsBusy(true);
    setError(null);
    try {
      await apiRequest(`/training-content-v2/sessions/${sessionId}`, {
        method: "PUT",
        token,
        body: data,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update session");
      throw e;
    } finally {
      setIsBusy(false);
    }
  }, [token, canLoad]);

  const deleteSession = useCallback(async (sessionId: number) => {
    if (!token || !canLoad) return;
    setIsBusy(true);
    setError(null);
    try {
      await apiRequest(`/training-content-v2/sessions/${sessionId}`, {
        method: "DELETE",
        token,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete session");
      throw e;
    } finally {
      setIsBusy(false);
    }
  }, [token, canLoad]);

  const createItem = useCallback(async (sessionId: number, data: Partial<SessionItem>) => {
    if (!token || !canLoad) return;
    setIsBusy(true);
    setError(null);
    try {
      const res = await apiRequest<{ id: number }>("/training-content-v2/items", {
        method: "POST",
        token,
        body: { ...data, sessionId },
      });
      return res;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create item");
      throw e;
    } finally {
      setIsBusy(false);
    }
  }, [token, canLoad]);

  const updateItem = useCallback(async (itemId: number, data: Partial<SessionItem>) => {
    if (!token || !canLoad) return;
    setIsBusy(true);
    setError(null);
    try {
      await apiRequest(`/training-content-v2/items/${itemId}`, {
        method: "PUT",
        token,
        body: data,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update item");
      throw e;
    } finally {
      setIsBusy(false);
    }
  }, [token, canLoad]);

  const deleteItem = useCallback(async (itemId: number) => {
    if (!token || !canLoad) return;
    setIsBusy(true);
    setError(null);
    try {
      await apiRequest(`/training-content-v2/items/${itemId}`, {
        method: "DELETE",
        token,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete item");
      throw e;
    } finally {
      setIsBusy(false);
    }
  }, [token, canLoad]);

  return { isBusy, error, createSession, updateSession, deleteSession, createItem, updateItem, deleteItem };
}
