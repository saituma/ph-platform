import { useCallback, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { Story } from "@/hooks/useStories";

type StoryInput = {
  title: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  badge?: string | null;
  order?: number | null;
  isActive?: boolean | null;
};

export function useAdminStories(token: string | null, enabled: boolean) {
  const [items, setItems] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const loadingRef = useRef(false);

  const load = useCallback(
    async (force = false) => {
      if (!token || !enabled) return;
      if (loadingRef.current && !force) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ items: Story[] }>("/content/stories", {
          token,
          forceRefresh: true,
        });
        setItems(res.items ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load stories");
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [token, enabled],
  );

  const create = useCallback(
    async (input: StoryInput) => {
      if (!token) return;
      setIsBusy(true);
      try {
        await apiRequest<{ item: Story }>("/content/stories", {
          token,
          method: "POST",
          body: input,
        });
        await load(true);
      } finally {
        setIsBusy(false);
      }
    },
    [token, load],
  );

  const remove = useCallback(
    async (storyId: number) => {
      if (!token) return;
      setIsBusy(true);
      try {
        await apiRequest<{ ok: boolean }>(`/content/stories/${storyId}`, {
          token,
          method: "DELETE",
        });
        await load(true);
      } finally {
        setIsBusy(false);
      }
    },
    [token, load],
  );

  return { items, loading, error, isBusy, load, create, remove };
}
