import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { AdminUser } from "@/types/admin";
import { useAdminMutation } from "./useAdminQuery";
import { parseApiError } from "@/lib/errors";

export function useAdminUsers(token: string | null, canLoad: boolean) {
  const enabled = Boolean(token && canLoad);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (q?: string, forceRefresh = false) => {
      if (!enabled) return;
      setLoading(true);
      setError(null);
      try {
        const query = q ? `&q=${encodeURIComponent(q)}` : "";
        const res = await apiRequest<{ users?: AdminUser[] }>(`/admin/users?limit=50${query}`, {
          token: token!,
          forceRefresh,
          skipCache: forceRefresh,
          suppressStatusCodes: [403],
        });
        setUsers(Array.isArray(res?.users) ? res.users : []);
      } catch (e) {
        setError(parseApiError(e).message);
      } finally {
        setLoading(false);
      }
    },
    [enabled, token],
  );

  const blockMutation = useAdminMutation<{ userId: number; blocked: boolean }, boolean | undefined>(
    useCallback(
      async ({ userId, blocked }) => {
        if (!token) return;
        const res = await apiRequest<{ user?: { isBlocked?: boolean | null } }>(
          `/admin/users/${userId}/block`,
          { method: "POST", token, body: { blocked }, skipCache: true },
        );
        const nextBlocked = Boolean(res?.user?.isBlocked);
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isBlocked: nextBlocked } : u)));
        return nextBlocked;
      },
      [token],
    ),
  );

  const deleteMutation = useAdminMutation<number>(
    useCallback(
      async (userId: number) => {
        if (!token) return;
        await apiRequest(`/admin/users/${userId}`, { method: "DELETE", token, skipCache: true });
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      },
      [token],
    ),
  );

  const tierMutation = useAdminMutation<{ athleteId: number; userId: number; programTier: string }>(
    useCallback(
      async ({ athleteId, userId, programTier }) => {
        if (!token) return;
        const res = await apiRequest<{ athlete?: { currentProgramTier?: string | null } }>(
          "/admin/users/program-tier",
          { method: "POST", token, body: { athleteId, programTier }, skipCache: true },
        );
        const nextTier = res?.athlete?.currentProgramTier ?? programTier;
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, programTier: nextTier } : u)));
      },
      [token],
    ),
  );

  const isBusy = blockMutation.busy || deleteMutation.busy || tierMutation.busy;

  return {
    users,
    loading,
    error,
    isBusy,
    load,
    updateBlockedStatus: (userId: number, blocked: boolean) => blockMutation.run({ userId, blocked }),
    deleteUser: (userId: number) => deleteMutation.run(userId),
    updateProgramTier: (athleteId: number, userId: number, programTier: string) =>
      tierMutation.run({ athleteId, userId, programTier }),
  };
}
