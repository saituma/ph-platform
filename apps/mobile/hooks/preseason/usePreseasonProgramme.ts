import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export type PreseasonProgramme = {
  id: number;
  title: string;
  weekCount: number;
};

export type PreseasonWeek = {
  id: number;
  weekNumber: number;
  title: string;
  status: "active" | "locked" | "completed";
  selectedWeekTypeId: number | null;
  completedSessionCount?: number;
  totalSessionCount?: number;
};

export function usePreseasonProgramme(token: string | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.preseason.programme(),
    queryFn: () =>
      apiRequest<{ programme: PreseasonProgramme; weeks: PreseasonWeek[] }>(
        "/preseason-programme/mobile",
        { token: token! },
      ),
    enabled: Boolean(token),
    staleTime: 2 * 60 * 1000,
  });

  return {
    programme: data?.programme ?? null,
    weeks: data?.weeks ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}
