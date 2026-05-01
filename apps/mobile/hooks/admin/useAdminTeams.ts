import { useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { useAdminQuery } from "./useAdminQuery";

export type AdminTeamSummary = {
  id: number;
  team: string;
  memberCount: number;
  guardianCount: number;
  createdAt: string;
  updatedAt: string;
};

export function useAdminTeams(token: string | null, canLoad: boolean) {
  const fetcher = useCallback(
    (forceRefresh: boolean) =>
      apiRequest<{ teams?: AdminTeamSummary[] }>("/admin/teams", {
        token,
        suppressStatusCodes: [403],
        skipCache: forceRefresh,
        forceRefresh,
      }).then((res) => (Array.isArray(res?.teams) ? res.teams : [])),
    [token],
  );

  const { data: teams, loading, error, load } = useAdminQuery(
    fetcher,
    [] as AdminTeamSummary[],
    Boolean(token) && canLoad,
  );

  return { teams, loading, error, load };
}
