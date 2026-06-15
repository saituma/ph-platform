import { useState, useCallback, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/api";

export type PreseasonDaySession = {
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

export type PreseasonExercise = {
  id: number;
  order: number;
  metric: string;
  setsOverride: number | null;
  repsOverride: number | null;
  durationOverride: number | null;
  notes: string | null;
  exercise: {
    id: number;
    name: string;
    category: string | null;
    sets: number | null;
    reps: number | null;
    duration: number | null;
    videoUrl: string | null;
  };
};

export function usePreseasonSessionDetail(token: string | null, daySessionId: number | null) {
  const [daySession, setDaySession] = useState<PreseasonDaySession | null>(null);
  const [exercises, setExercises] = useState<PreseasonExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const hasFetched = useRef(false);

  const refresh = useCallback(
    async (force = false) => {
      if (!token || !daySessionId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ daySession: PreseasonDaySession; exercises: PreseasonExercise[] }>(
          `/preseason-programme/mobile/day-sessions/${daySessionId}`,
          { token, forceRefresh: force },
        );
        setDaySession(res.daySession ?? null);
        const sorted = (res.exercises ?? []).slice().sort((a, b) => a.order - b.order);
        setExercises(sorted);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load session.");
      } finally {
        setLoading(false);
      }
    },
    [token, daySessionId],
  );

  useEffect(() => {
    if (token && daySessionId && !hasFetched.current) {
      hasFetched.current = true;
      refresh();
    }
  }, [token, daySessionId, refresh]);

  const completeSession = useCallback(async () => {
    if (!token || !daySessionId) return null;
    setCompleting(true);
    try {
      const res = await apiRequest<{ completedAt: string; weekComplete: boolean; nextWeekId: number | null }>(
        `/preseason-programme/mobile/day-sessions/${daySessionId}/complete`,
        { method: "POST", token },
      );
      setDaySession((prev) => (prev ? { ...prev, completed: true } : prev));
      return res;
    } catch {
      return null;
    } finally {
      setCompleting(false);
    }
  }, [token, daySessionId]);

  return { daySession, exercises, loading, error, refresh, completeSession, completing };
}
