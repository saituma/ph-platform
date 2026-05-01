import { useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { useAdminMutation } from "./useAdminQuery";
import { ModuleSession, SessionItem } from "./useAdminAudienceWorkspace";

export function useAdminSessions(token: string | null, canLoad: boolean) {
  const { run: createSession, busy: b1, error: e1 } = useAdminMutation(
    useCallback(
      async (params: { moduleId: number; title: string }) => {
        if (!token || !canLoad) return;
        return apiRequest<{ id: number }>("/training-content-v2/sessions", {
          method: "POST",
          token,
          body: params,
        });
      },
      [token, canLoad],
    ),
  );

  const { run: updateSession, busy: b2, error: e2 } = useAdminMutation(
    useCallback(
      async (params: { sessionId: number; data: Partial<ModuleSession> }) => {
        if (!token || !canLoad) return;
        await apiRequest(`/training-content-v2/sessions/${params.sessionId}`, {
          method: "PUT",
          token,
          body: params.data,
        });
      },
      [token, canLoad],
    ),
  );

  const { run: deleteSession, busy: b3, error: e3 } = useAdminMutation(
    useCallback(
      async (sessionId: number) => {
        if (!token || !canLoad) return;
        await apiRequest(`/training-content-v2/sessions/${sessionId}`, {
          method: "DELETE",
          token,
        });
      },
      [token, canLoad],
    ),
  );

  const { run: createItem, busy: b4, error: e4 } = useAdminMutation(
    useCallback(
      async (params: { sessionId: number; data: Partial<SessionItem> }) => {
        if (!token || !canLoad) return;
        return apiRequest<{ id: number }>("/training-content-v2/items", {
          method: "POST",
          token,
          body: { ...params.data, sessionId: params.sessionId },
        });
      },
      [token, canLoad],
    ),
  );

  const { run: updateItem, busy: b5, error: e5 } = useAdminMutation(
    useCallback(
      async (params: { itemId: number; data: Partial<SessionItem> }) => {
        if (!token || !canLoad) return;
        await apiRequest(`/training-content-v2/items/${params.itemId}`, {
          method: "PUT",
          token,
          body: params.data,
        });
      },
      [token, canLoad],
    ),
  );

  const { run: deleteItem, busy: b6, error: e6 } = useAdminMutation(
    useCallback(
      async (itemId: number) => {
        if (!token || !canLoad) return;
        await apiRequest(`/training-content-v2/items/${itemId}`, {
          method: "DELETE",
          token,
        });
      },
      [token, canLoad],
    ),
  );

  return {
    isBusy: b1 || b2 || b3 || b4 || b5 || b6,
    error: e1 ?? e2 ?? e3 ?? e4 ?? e5 ?? e6,
    createSession: (moduleId: number, title: string) => createSession({ moduleId, title }),
    updateSession: (sessionId: number, data: Partial<ModuleSession>) => updateSession({ sessionId, data }),
    deleteSession,
    createItem: (sessionId: number, data: Partial<SessionItem>) => createItem({ sessionId, data }),
    updateItem: (itemId: number, data: Partial<SessionItem>) => updateItem({ itemId, data }),
    deleteItem,
  };
}
