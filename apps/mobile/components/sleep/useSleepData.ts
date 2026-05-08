import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { useActingUser } from "@/hooks/useActingUser";
import { apiRequest } from "@/lib/api";
import { useSocket } from "@/context/SocketContext";

export interface SleepLog {
  id: number;
  userId: number;
  dateKey: string;
  totalMinutes: number;
  bedTime: string | null;
  wakeTime: string | null;
  quality: number | null;
  deepMinutes: number | null;
  lightMinutes: number | null;
  remMinutes: number | null;
  awakeMinutes: number | null;
  notes: string | null;
  coachFeedback: string | null;
  coachId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SleepLogInput {
  dateKey: string;
  totalMinutes: number;
  bedTime?: string | null;
  wakeTime?: string | null;
  quality?: number | null;
  deepMinutes?: number | null;
  lightMinutes?: number | null;
  remMinutes?: number | null;
  awakeMinutes?: number | null;
  notes?: string | null;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgoKey(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useSleepData(range: "today" | "week" | "month" | "year" | "all" = "month") {
  const { token } = useAppSelector((s) => s.user);
  const { actingUserId } = useActingUser();
  const { socket } = useSocket();

  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      params.set("userId", String(actingUserId || "me"));
      params.set("limit", "90");

      if (range === "today") {
        params.set("from", todayKey());
        params.set("to", todayKey());
      } else if (range === "week") {
        params.set("from", daysAgoKey(7));
      } else if (range === "month") {
        params.set("from", daysAgoKey(30));
      } else if (range === "year") {
        params.set("from", daysAgoKey(365));
      }

      const res = await apiRequest<{ logs: SleepLog[] }>(
        `/sleep/logs?${params.toString()}`,
        { token },
      );
      setLogs(res?.logs ?? []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [token, actingUserId, range]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = () => void fetchData();
    const onDelete = () => void fetchData();
    socket.on("sleep:log:updated", onUpdate);
    socket.on("sleep:log:deleted", onDelete);
    return () => {
      socket.off("sleep:log:updated", onUpdate);
      socket.off("sleep:log:deleted", onDelete);
    };
  }, [socket, fetchData]);

  const saveLog = useCallback(
    async (input: SleepLogInput) => {
      if (!token) return null;
      const res = await apiRequest<{ log: SleepLog }>("/sleep/logs", {
        token,
        method: "POST",
        body: input,
      });
      if (res?.log) {
        setLogs((prev) => {
          const filtered = prev.filter((l) => l.dateKey !== res.log.dateKey);
          return [res.log, ...filtered].sort((a, b) =>
            b.dateKey.localeCompare(a.dateKey),
          );
        });
      }
      return res?.log ?? null;
    },
    [token],
  );

  const deleteLog = useCallback(
    async (logId: number) => {
      if (!token) return;
      await apiRequest(`/sleep/logs/${logId}`, {
        token,
        method: "DELETE",
      });
      setLogs((prev) => prev.filter((l) => l.id !== logId));
    },
    [token],
  );

  const todayLog = logs.find((l) => l.dateKey === todayKey()) ?? null;

  return { logs, todayLog, loading, refetch: fetchData, saveLog, deleteLog };
}
