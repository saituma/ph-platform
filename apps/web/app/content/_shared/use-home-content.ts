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

  const homeItem = (homeData?.items ?? [])[0] ?? null;
  let homeBody: HomeDraft = {};
  if (homeItem?.body && typeof homeItem.body === "string") {
    try { homeBody = JSON.parse(homeItem.body) as HomeDraft; } catch { homeBody = {}; }
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
