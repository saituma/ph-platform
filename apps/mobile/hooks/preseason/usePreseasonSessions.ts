import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export type PreseasonSession = {
  id: number;
  dayOfWeek: number;
  category: string;
  title: string;
  description: string;
  durationLabel: string;
  intensityLabel: string;
  focusLabel: string;
  completed: boolean;
};

export type PreseasonWeekTypeSummary = {
  id: number;
  name: string;
};

export function usePreseasonSessions(token: string | null, weekId: number | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.preseason.sessions(weekId!),
    queryFn: () =>
      apiRequest<{ weekType: PreseasonWeekTypeSummary; sessions: PreseasonSession[] }>(
        `/preseason-programme/mobile/weeks/${weekId}/sessions`,
        { token: token! },
      ),
    enabled: Boolean(token) && Boolean(weekId),
    staleTime: 2 * 60 * 1000,
  });

  return {
    weekType: data?.weekType ?? null,
    sessions: data?.sessions ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}
