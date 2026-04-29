"use client";
import { useCreateContentMutation, useGetHomeContentQuery, useUpdateContentMutation } from "../../../lib/apiSlice";

export type HomeDraft = {
  introVideoUrl?: string;
  introVideos?: Array<{ url: string; roles: Array<"team" | "youth" | "adult"> }>;
  testimonials?: unknown;
  adminStory?: string;
  professionalPhoto?: string;
  professionalPhotos?: string | string[];
  headline?: string;
};

export function useHomeContent() {
  const [createContent] = useCreateContentMutation();
  const [updateContent] = useUpdateContentMutation();
  const { data: homeData, refetch: refetchHome } = useGetHomeContentQuery();

  const allItems = (homeData?.items ?? []) as Array<{ id?: number; body?: unknown; title?: string; content?: string; programTier?: unknown }>;
  const homeItem = allItems[0] ?? null;
  // Merge body JSON across every home row (oldest first → newest wins) so fields
  // saved in older rows (e.g. intro video) remain visible alongside the newest.
  let homeBody: HomeDraft = {};
  for (const item of [...allItems].reverse()) {
    if (item?.body && typeof item.body === "string") {
      try {
        const parsed = JSON.parse(item.body) as HomeDraft;
        homeBody = { ...homeBody, ...parsed };
      } catch {
        // ignore malformed rows
      }
    }
  }
  const baseHomeTitle = homeItem?.title?.trim() || homeItem?.content?.trim() || (homeBody.headline as string | undefined)?.trim() || "Home";

  const saveHome = async (nextDraft: HomeDraft) => {
    const payload = { title: "Home", content: baseHomeTitle, type: "article", body: JSON.stringify(nextDraft), surface: "home", programTier: homeItem?.programTier ?? undefined };
    if (homeItem?.id) {
      await updateContent({ id: homeItem.id, data: payload }).unwrap();
    } else {
      await createContent(payload).unwrap();
    }
    refetchHome();
  };

  return { homeItem, homeBody, saveHome, refetchHome };
}
