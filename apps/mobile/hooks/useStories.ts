import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAppSelector } from "@/store/hooks";

export type Story = {
  id: number;
  title: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  badge?: string | null;
  order: number;
  isActive: boolean;
  viewed: boolean;
  createdAt: string;
  updatedAt: string;
};

export function useStories() {
  const token = useAppSelector((s) => s.user.token);

  return useQuery({
    queryKey: queryKeys.stories.all(),
    queryFn: () =>
      apiRequest<{ items: Story[] }>("/stories", { token: token! }),
    enabled: !!token,
    staleTime: 60_000,
    select: (data) => data.items ?? [],
  });
}

export async function markStoryViewedApi(storyId: number, token: string) {
  return apiRequest<{ ok: boolean }>(`/stories/${storyId}/view`, {
    method: "POST",
    token,
  });
}
