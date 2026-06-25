import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { VideoItem, CoachResponse } from "@/types/video-upload";

export function useVideoHistory(token: string | null, athleteUserId: number | string | null, sectionContentId?: number | null) {
  const queryClient = useQueryClient();
  const headers = athleteUserId ? { "X-Acting-User-Id": String(athleteUserId) } : undefined;

  const videosQuery = useQuery({
    queryKey: queryKeys.programs.videos(sectionContentId ?? null),
    queryFn: async () => {
      const query = sectionContentId ? `?sectionContentId=${sectionContentId}` : "";
      const data = await apiRequest<{ items: VideoItem[] }>(`/videos${query}`, {
        token: token!,
        headers,
      });
      return data.items ?? [];
    },
    enabled: Boolean(token),
    staleTime: 2 * 60 * 1000,
  });

  const responsesQuery = useQuery({
    queryKey: queryKeys.programs.coachResponses(),
    queryFn: async () => {
      const data = await apiRequest<{ messages: any[] }>("/messages?includeVideoResponses=1", {
        token: token!,
        headers,
      });
      return (data.messages ?? [])
        .filter((msg: any) => msg.contentType === "video" && msg.mediaUrl && Number(msg.videoUploadId))
        .map((msg: any) => ({
          id: String(msg.id),
          mediaUrl: msg.mediaUrl,
          text: msg.content,
          createdAt: msg.createdAt ?? null,
          videoUploadId: Number(msg.videoUploadId),
        })) as CoachResponse[];
    },
    enabled: Boolean(token),
    staleTime: 2 * 60 * 1000,
  });

  const loadVideos = useCallback(async (_forceRefresh = false) => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.programs.videos(sectionContentId ?? null) });
  }, [queryClient, sectionContentId]);

  const loadCoachResponses = useCallback(async (_forceRefresh = false) => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.programs.coachResponses() });
  }, [queryClient]);

  const setVideoItems = useCallback((updater: VideoItem[] | ((prev: VideoItem[]) => VideoItem[])) => {
    queryClient.setQueryData<VideoItem[]>(
      queryKeys.programs.videos(sectionContentId ?? null),
      (old) => typeof updater === "function" ? updater(old ?? []) : updater,
    );
  }, [queryClient, sectionContentId]);

  const setCoachResponses = useCallback((updater: CoachResponse[] | ((prev: CoachResponse[]) => CoachResponse[])) => {
    queryClient.setQueryData<CoachResponse[]>(
      queryKeys.programs.coachResponses(),
      (old) => typeof updater === "function" ? updater(old ?? []) : updater,
    );
  }, [queryClient]);

  return {
    videoItems: videosQuery.data ?? [],
    coachResponses: responsesQuery.data ?? [],
    isLoading: videosQuery.isLoading,
    loadVideos,
    loadCoachResponses,
    setVideoItems,
    setCoachResponses,
  };
}
