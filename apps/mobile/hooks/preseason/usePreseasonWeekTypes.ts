import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export type PreseasonWeekType = {
  id: number;
  name: string;
  description: string;
  order: number;
};

export function usePreseasonWeekTypes(token: string | null, weekId: number | null) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.preseason.weekTypes(weekId!),
    queryFn: () =>
      apiRequest<{ weekTypes?: PreseasonWeekType[]; items?: PreseasonWeekType[] }>(
        `/preseason-programme/mobile/weeks/${weekId}/types`,
        { token: token! },
      ),
    enabled: Boolean(token) && Boolean(weekId),
    staleTime: 5 * 60 * 1000,
    select: (res) => res.weekTypes ?? res.items ?? [],
  });

  const selectMutation = useMutation({
    mutationFn: (weekTypeId: number) =>
      apiRequest<{ selection?: { weekTypeId: number }; item?: { weekTypeId: number } }>(
        `/preseason-programme/mobile/weeks/${weekId}/select`,
        { method: "POST", token, body: { weekTypeId } },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.preseason.programme() });
      queryClient.invalidateQueries({ queryKey: queryKeys.preseason.sessions(weekId!) });
    },
  });

  return {
    weekTypes: data ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    selectWeekType: selectMutation.mutateAsync,
    selecting: selectMutation.isPending ? (selectMutation.variables as number) : null,
    selectError: selectMutation.error instanceof Error ? selectMutation.error.message : null,
  };
}
