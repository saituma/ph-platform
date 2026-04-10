import { useState, useCallback, useEffect, useMemo } from "react";
import { apiRequest } from "@/lib/api";

export type AdminTeamDetail = {
  team: string;
  summary: {
    memberCount: number;
    guardianCount: number;
    createdAt: string | null;
    updatedAt: string | null;
  };
  members: {
    athleteId: number;
    athleteName: string | null;
    currentProgramTier: string | null;
  }[];
};

export type AdminUserRow = {
  id?: number;
  role?: string | null;
  athleteId?: number | null;
  athleteName?: string | null;
  athleteTeam?: string | null;
};

export function useAdminTeamController(token: string | null, bootstrapReady: boolean, teamName: string) {
  const [detail, setDetail] = useState<AdminTeamDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<AdminUserRow[]>([]);

  const [selected, setSelected] = useState<{
    athleteId: number;
    athleteName: string | null;
    athleteTeam: string | null;
  } | null>(null);

  const [includeOtherTeams, setIncludeOtherTeams] = useState(false);
  const [moveConfirm, setMoveConfirm] = useState("");

  const [attachBusy, setAttachBusy] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  const load = useCallback(
    async (forceRefresh: boolean) => {
      if (!token || !bootstrapReady || !teamName) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiRequest<AdminTeamDetail>(
          `/admin/teams/${encodeURIComponent(teamName)}`,
          {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          },
        );
        setDetail(res ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load team details");
        setDetail(null);
      } finally {
        setIsLoading(false);
      }
    },
    [bootstrapReady, teamName, token],
  );

  useEffect(() => {
    if (token && bootstrapReady) void load(false);
  }, [bootstrapReady, load, token]);

  useEffect(() => {
    if (!assignOpen) {
      setSearchQuery("");
      setResults([]);
      setSearchError(null);
      setSelected(null);
      setIncludeOtherTeams(false);
      setMoveConfirm("");
      setAttachBusy(false);
      setAttachError(null);
    }
  }, [assignOpen]);

  const search = useCallback(async () => {
    if (!token || !bootstrapReady) return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchError("Type at least 2 characters to search");
      setResults([]);
      return;
    }

    setSearching(true);
    setSearchError(null);
    try {
      const res = await apiRequest<{ users?: AdminUserRow[] }>(
        `/admin/users?q=${encodeURIComponent(q)}&limit=30`,
        { token, suppressStatusCodes: [403], skipCache: true },
      );
      const users = Array.isArray(res?.users) ? res.users : [];
      setResults(users.filter((u) => typeof u.athleteId === "number"));
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [bootstrapReady, searchQuery, token]);

  const selectedIsMove = useMemo(() => {
    if (!selected) return false;
    return Boolean(selected.athleteTeam && selected.athleteTeam !== teamName);
  }, [selected, teamName]);

  const canAssign = useMemo(() => {
    if (!selected || attachBusy || !token) return false;
    if (!selectedIsMove) return true;
    return includeOtherTeams && moveConfirm.trim().toUpperCase() === "MOVE";
  }, [attachBusy, includeOtherTeams, moveConfirm, selected, selectedIsMove, token]);

  const assign = useCallback(async () => {
    if (!token || !bootstrapReady || !teamName || !selected) return;

    const isMove = selectedIsMove;
    if (isMove && (!includeOtherTeams || moveConfirm.trim().toUpperCase() !== "MOVE")) return;

    setAttachBusy(true);
    setAttachError(null);
    try {
      await apiRequest(
        `/admin/teams/${encodeURIComponent(teamName)}/athletes/${selected.athleteId}/attach`,
        {
          method: "POST",
          token,
          body: isMove ? { allowMoveFromOtherTeam: true } : {},
          suppressStatusCodes: [403],
          skipCache: true,
        },
      );
      setAssignOpen(false);
      await load(true);
    } catch (e) {
      setAttachError(e instanceof Error ? e.message : "Failed to assign athlete");
    } finally {
      setAttachBusy(false);
    }
  }, [bootstrapReady, includeOtherTeams, load, moveConfirm, selected, selectedIsMove, teamName, token]);

  return {
    detail,
    isLoading,
    error,
    load,
    assignState: {
      isOpen: assignOpen, setOpen: setAssignOpen,
      query: searchQuery, setQuery: setSearchQuery,
      isSearching: searching, searchError,
      results,
      selected, setSelected,
      includeOtherTeams, setIncludeOtherTeams,
      moveConfirm, setMoveConfirm,
      isBusy: attachBusy, error: attachError,
      isMove: selectedIsMove,
      canAssign,
      search,
      assign,
    }
  };
}
