import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { AdminUser } from "@/types/admin";
import { useAdminMutation } from "./useAdminQuery";
import { parseApiError } from "@/lib/errors";

export function useAdminUsers(token: string | null, canLoad: boolean) {
  const enabled = Boolean(token && canLoad);
  const queryClient = useQueryClient();
  const queryKey = ["admin-users", token] as const;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await apiRequest<{ users?: AdminUser[] }>("/admin/users?limit=200", {
        token: token!,
        suppressStatusCodes: [403],
      });
      return Array.isArray(res?.users) ? res.users : [];
    },
    staleTime: 3 * 60 * 1000,
    enabled,
  });

  const users = data ?? [];
  const loading = isLoading;
  const errorMsg = error instanceof Error ? parseApiError(error).message : null;

  const load = useCallback(
    (_q?: string, _forceRefresh?: boolean) => {
      void refetch();
    },
    [refetch],
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
        queryClient.setQueryData(["admin-users", token], (prev: AdminUser[] | undefined) =>
          prev?.map((u) => (u.id === userId ? { ...u, isBlocked: nextBlocked } : u)),
        );
        return nextBlocked;
      },
      [token, queryClient],
    ),
  );

  const deleteMutation = useAdminMutation<number>(
    useCallback(
      async (userId: number) => {
        if (!token) return;
        await apiRequest(`/admin/users/${userId}`, { method: "DELETE", token, skipCache: true });
        queryClient.setQueryData(["admin-users", token], (prev: AdminUser[] | undefined) =>
          prev?.filter((u) => u.id !== userId),
        );
      },
      [token, queryClient],
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
        queryClient.setQueryData(["admin-users", token], (prev: AdminUser[] | undefined) =>
          prev?.map((u) => (u.id === userId ? { ...u, programTier: nextTier } : u)),
        );
      },
      [token, queryClient],
    ),
  );

  const isBusy = blockMutation.busy || deleteMutation.busy || tierMutation.busy;

  return {
    users,
    loading,
    error: errorMsg,
    isBusy,
    load,
    updateBlockedStatus: (userId: number, blocked: boolean) => blockMutation.run({ userId, blocked }),
    deleteUser: (userId: number) => deleteMutation.run(userId),
    updateProgramTier: (athleteId: number, userId: number, programTier: string) =>
      tierMutation.run({ athleteId, userId, programTier }),
  };
}
