import { useState, useCallback, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/api";

export type PreseasonSession = {
  id: number;
  dayOfWeek: number;
  category: string;
  title: string;
  description: string;
  durationLabel: string;
  intensityLabel: string;
  focusLabel: string;
  completed: boolean;
};

export type PreseasonWeekTypeSummary = {
  id: number;
  name: string;
};

export function usePreseasonSessions(token: string | null, weekId: number | null) {
  const [weekType, setWeekType] = useState<PreseasonWeekTypeSummary | null>(null);
  const [sessions, setSessions] = useState<PreseasonSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const refresh = useCallback(
    async (force = false) => {
      if (!token || !weekId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ weekType: PreseasonWeekTypeSummary; sessions: PreseasonSession[] }>(
          `/preseason-programme/mobile/weeks/${weekId}/sessions`,
          { token, forceRefresh: force },
        );
        setWeekType(res.weekType ?? null);
        setSessions(res.sessions ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sessions.");
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

  return { weekType, sessions, loading, error, refresh };
}
