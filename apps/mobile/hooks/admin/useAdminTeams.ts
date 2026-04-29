import { useCallback, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";

export type AdminTeamSummary = {
  id: number;
  team: string;
  memberCount: number;
  guardianCount: number;
  createdAt: string;
  updatedAt: string;
};

export function useAdminTeams(token: string | null, canLoad: boolean) {
  const [teams, setTeams] = useState<AdminTeamSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Single-flight: dedupe overlapping calls (initial mount + manual refresh tap).
  const inFlightRef = useRef(false);

  const load = useCallback(
    async (forceRefresh: boolean) => {
      if (!token || !canLoad) return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ teams?: AdminTeamSummary[] }>(
          "/admin/teams",
          {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          },
        );
        setTeams(Array.isArray(res?.teams) ? res.teams : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load teams");
        setTeams([]);
      } finally {
        setLoading(false);
        inFlightRef.current = false;
      }
    },
    [canLoad, token],
  );

  return { teams, loading, error, load };
}

