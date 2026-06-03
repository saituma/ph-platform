import { useState, useCallback, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/api";
import { useSocket } from "@/context/SocketContext";
import { useAppSelector } from "@/store/hooks";

export type WellbeingLog = {
  id: number;
  userId: number;
  dateKey: string;
  mood: number;
  energy: number;
  pain: number;
  notes: string | null;
  coachFeedback: string | null;
  coachId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type WellbeingLogInput = {
  dateKey: string;
  mood: number;
  energy: number;
  pain: number;
  notes?: string | null;
};

export function useWellbeingData(token: string | null, athleteUserIdOverride?: number | null) {
  const [logs, setLogs] = useState<WellbeingLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useSocket();
  const myUserId = useAppSelector((s) => s.user.profile.id);
  const hasFetched = useRef(false);

  const loadLogs = useCallback(
    async (force = false) => {
      if (!token) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ logs?: WellbeingLog[] }>(
          athleteUserIdOverride != null
            ? `/wellbeing/logs?userId=${athleteUserIdOverride}`
            : "/wellbeing/logs",
          { token, forceRefresh: force },
        );
        setLogs(res.logs ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load wellbeing logs.");
      } finally {
        setIsLoading(false);
      }
    },
    [token, athleteUserIdOverride],
  );

  const saveLog = useCallback(
    async (input: WellbeingLogInput) => {
      if (!token) return null;
      setIsSaving(true);
      try {
        const res = await apiRequest<{ log: WellbeingLog }>("/wellbeing/logs", {
          method: "POST",
          body: input,
          token,
        });
        await loadLogs(true);
        return res.log;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [token, loadLogs],
  );

  const deleteLog = useCallback(
    async (logId: number) => {
      if (!token) return;
      try {
        await apiRequest(`/wellbeing/logs/${logId}`, { method: "DELETE", token });
        await loadLogs(true);
      } catch {
        // silent
      }
    },
    [token, loadLogs],
  );

  useEffect(() => {
    if (token && !hasFetched.current) {
      hasFetched.current = true;
      loadLogs();
    }
  }, [token, loadLogs]);

  useEffect(() => {
    if (!socket || !token) return;
    // Skip our own echo (saveLog already refetched); refresh for others' changes by actor.
    const refresh = (payload?: { actorUserId?: number | string }) => {
      if (payload?.actorUserId != null && myUserId != null && String(payload.actorUserId) === String(myUserId)) {
        return;
      }
      void loadLogs(true);
    };
    socket.on("wellbeing:log:updated", refresh);
    socket.on("wellbeing:log:deleted", refresh);
    return () => {
      socket.off("wellbeing:log:updated", refresh);
      socket.off("wellbeing:log:deleted", refresh);
    };
  }, [socket, token, loadLogs, myUserId]);

  const todayLog = logs.find((l) => {
    const d = new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return l.dateKey === key;
  });

  return { logs, todayLog, isLoading, isSaving, error, loadLogs, saveLog, deleteLog };
}
