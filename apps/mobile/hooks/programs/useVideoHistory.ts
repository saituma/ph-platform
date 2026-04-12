import { useState, useCallback, useRef } from "react";
import { apiRequest } from "@/lib/api";
import { VideoItem, CoachResponse } from "@/types/video-upload";

export function useVideoHistory(token: string | null, athleteUserId: number | string | null, sectionContentId?: number | null) {
  const [videoItems, setVideoItems] = useState<VideoItem[]>([]);
  const [coachResponses, setCoachResponses] = useState<CoachResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadVideos = useCallback(async (forceRefresh = false) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const headers = athleteUserId ? { "X-Acting-User-Id": String(athleteUserId) } : undefined;
      const query = sectionContentId ? `?sectionContentId=${sectionContentId}` : "";
      const data = await apiRequest<{ items: VideoItem[] }>(`/videos${query}`, {
        token,
        headers,
        forceRefresh,
      });
      setVideoItems(data.items ?? []);
    } catch {
      setVideoItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, athleteUserId, sectionContentId]);

  const loadCoachResponses = useCallback(async (forceRefresh = false) => {
    if (!token) return;
    try {
      const headers = athleteUserId ? { "X-Acting-User-Id": String(athleteUserId) } : undefined;
      const data = await apiRequest<{ messages: any[] }>("/messages", {
        token,
        headers,
        skipCache: true,
        forceRefresh,
      });
      const items = (data.messages ?? [])
        .filter(msg => msg.contentType === "video" && msg.mediaUrl && Number(msg.videoUploadId))
        .map(msg => ({
          id: String(msg.id),
          mediaUrl: msg.mediaUrl,
          text: msg.content,
          createdAt: msg.createdAt ?? null,
          videoUploadId: Number(msg.videoUploadId),
        }));
      setCoachResponses(items);
    } catch {
      setCoachResponses([]);
    }
  }, [token, athleteUserId]);

  return { videoItems, coachResponses, isLoading, loadVideos, loadCoachResponses, setVideoItems, setCoachResponses };
}
