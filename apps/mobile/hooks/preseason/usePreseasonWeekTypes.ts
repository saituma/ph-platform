import { useState, useCallback, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/api";

export type PreseasonWeekType = {
  id: number;
  name: string;
  description: string;
  order: number;
};

export function usePreseasonWeekTypes(token: string | null, weekId: number | null) {
  const [weekTypes, setWeekTypes] = useState<PreseasonWeekType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const refresh = useCallback(
    async (force = false) => {
      if (!token || !weekId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ weekTypes: PreseasonWeekType[] }>(
          `/preseason-programme/mobile/weeks/${weekId}/types`,
          { token, forceRefresh: force },
        );
        setWeekTypes(res.weekTypes ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load week types.");
      } finally {
        setLoading(false);
      }
    },
    [token, weekId],
  );

  useEffect(() => {
    if (token && weekId && !hasFetched.current) {
      hasFetched.current = true;
      refresh();
    }
  }, [token, weekId, refresh]);

  const selectWeekType = useCallback(
    async (weekTypeId: number) => {
      if (!token || !weekId) return null;
      try {
        const res = await apiRequest<{ selection: { weekTypeId: number } }>(
          `/preseason-programme/mobile/weeks/${weekId}/select`,
          { method: "POST", token, body: { weekTypeId } },
        );
        return res.selection;
      } catch {
        return null;
      }
    },
    [token, weekId],
  );

  return { weekTypes, loading, error, refresh, selectWeekType };
}
