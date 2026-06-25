import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
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
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useSocket();
  const myUserId = useAppSelector((s) => s.user.profile.id);

  const qk = queryKeys.wellbeing.logs(athleteUserIdOverride);

  const { data: logs = [], isLoading, error: queryError } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const res = await apiRequest<{ logs?: WellbeingLog[] }>(
        athleteUserIdOverride != null
          ? `/wellbeing/logs?userId=${athleteUserIdOverride}`
          : "/wellbeing/logs",
        { token: token! },
      );
      return res.logs ?? [];
    },
    enabled: Boolean(token),
    staleTime: 2 * 60 * 1000,
  });

  const loadLogs = useCallback(
    async (_force = false) => {
      await queryClient.invalidateQueries({ queryKey: qk });
    },
    [queryClient, qk],
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
        await queryClient.invalidateQueries({ queryKey: qk });
        return res.log;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [token, queryClient, qk],
  );

  const deleteLog = useCallback(
    async (logId: number) => {
      if (!token) return;
      try {
        await apiRequest(`/wellbeing/logs/${logId}`, { method: "DELETE", token });
        await queryClient.invalidateQueries({ queryKey: qk });
      } catch {
        // silent
      }
    },
    [token, queryClient, qk],
  );

  useEffect(() => {
    if (!socket || !token) return;
    const refresh = (payload?: { actorUserId?: number | string }) => {
      if (payload?.actorUserId != null && myUserId != null && String(payload.actorUserId) === String(myUserId)) {
        return;
      }
      queryClient.invalidateQueries({ queryKey: qk });
    };
    socket.on("wellbeing:log:updated", refresh);
    socket.on("wellbeing:log:deleted", refresh);
    return () => {
      socket.off("wellbeing:log:updated", refresh);
      socket.off("wellbeing:log:deleted", refresh);
    };
  }, [socket, token, queryClient, qk, myUserId]);

  const combinedError = queryError
    ? (queryError instanceof Error ? queryError.message : "Failed to load wellbeing logs.")
    : error;

  const todayLog = logs.find((l) => {
    const d = new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return l.dateKey === key;
  });

  return { logs, todayLog, isLoading, isSaving, error: combinedError, loadLogs, saveLog, deleteLog };
}
