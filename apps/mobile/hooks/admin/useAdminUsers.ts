import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { AdminUser } from "@/types/admin";

export function useAdminUsers(token: string | null, canLoad: boolean) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(async (forceRefresh = false) => {
    if (!token || !canLoad) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ users?: AdminUser[] }>("/admin/users?limit=50", {
        token,
        forceRefresh,
        skipCache: forceRefresh,
        suppressStatusCodes: [403],
      });
      setUsers(Array.isArray(res?.users) ? res.users : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [token, canLoad]);

  const updateBlockedStatus = useCallback(async (userId: number, blocked: boolean) => {
    if (!token) return;
    setIsBusy(true);
    try {
      const res = await apiRequest<{ user?: { isBlocked?: boolean | null } }>(
        `/admin/users/${userId}/block`,
        { method: "POST", token, body: { blocked }, skipCache: true }
      );
      const nextBlocked = Boolean(res?.user?.isBlocked);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBlocked: nextBlocked } : u));
      return nextBlocked;
    } finally {
      setIsBusy(false);
    }
  }, [token]);

  const deleteUser = useCallback(async (userId: number) => {
    if (!token) return;
    setIsBusy(true);
    try {
      await apiRequest(`/admin/users/${userId}`, { method: "DELETE", token, skipCache: true });
      setUsers(prev => prev.filter(u => u.id !== userId));
    } finally {
      setIsBusy(false);
    }
  }, [token]);

  const updateProgramTier = useCallback(async (athleteId: number, userId: number, programTier: string) => {
    if (!token) return;
    setIsBusy(true);
    try {
      const res = await apiRequest<{ athlete?: { currentProgramTier?: string | null } }>(
        "/admin/users/program-tier",
        { method: "POST", token, body: { athleteId, programTier }, skipCache: true }
      );
      const nextTier = res?.athlete?.currentProgramTier ?? programTier;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, programTier: nextTier } : u));
    } finally {
      setIsBusy(false);
    }
  }, [token]);

  return { users, loading, error, isBusy, load, updateBlockedStatus, deleteUser, updateProgramTier };
}
