import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchHomeContent } from "@/services/home/homeService";
import { queryKeys } from "@/lib/queryKeys";

export type WelcomeHeroState = "loading" | "ready" | "fallback" | "error";

export function useHomeContent(token: string | null, bootstrapReady: boolean) {
  const queryClient = useQueryClient();

  const { data: homeContent = null, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.home.content(),
    queryFn: () => fetchHomeContent(token!),
    enabled: Boolean(token) && bootstrapReady,
    staleTime: 5 * 60 * 1000,
  });

  const error = queryError
    ? (queryError instanceof Error ? queryError.message : "Failed to load home content")
    : null;

  const load = useCallback(
    async (_forceRefresh = false) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.home.content() });
    },
    [queryClient],
  );

  const welcomeHeroState = ((): WelcomeHeroState => {
    if (isLoading && !homeContent && !error) return "loading";
    if (error) return "error";
    if (homeContent?.welcome || homeContent?.headline) return "ready";
    return "fallback";
  })();

  return {
    homeContent,
    error,
    isLoading,
    load,
    welcomeHeroState,
  };
}
