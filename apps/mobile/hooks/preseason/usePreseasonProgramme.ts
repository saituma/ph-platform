import { useState, useCallback, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/api";
import { useSocket } from "@/context/SocketContext";

export type PreseasonProgramme = {
  id: number;
  title: string;
  weekCount: number;
};

export type PreseasonWeek = {
  id: number;
  weekNumber: number;
  title: string;
  status: "active" | "locked" | "completed";
  selectedWeekTypeId: number | null;
};

export function usePreseasonProgramme(token: string | null) {
  const [programme, setProgramme] = useState<PreseasonProgramme | null>(null);
  const [weeks, setWeeks] = useState<PreseasonWeek[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);
  const { socket } = useSocket();

  const refresh = useCallback(
    async (force = false) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ programme: PreseasonProgramme; weeks: PreseasonWeek[] }>(
          "/preseason-programme/mobile",
          { token, forceRefresh: force },
        );
        setProgramme(res.programme ?? null);
        setWeeks(res.weeks ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load programme.");
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (token && !hasFetched.current) {
      hasFetched.current = true;
      refresh();
    }
  }, [token, refresh]);

  useEffect(() => {
    if (!socket || !token) return;
    const onChanged = () => { refresh(true); };
    socket.on("program:changed", onChanged);
    return () => { socket.off("program:changed", onChanged); };
  }, [socket, token, refresh]);

  return { programme, weeks, loading, error, refresh };
}
