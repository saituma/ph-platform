"use client";

import { useEffect, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { ContentDialogs, type ContentDialog } from "../../components/admin/content/content-dialogs";
import { ContentTabs } from "../../components/admin/content/content-tabs";
import {
  useApproveTestimonialSubmissionMutation,
  useRejectTestimonialSubmissionMutation,
  useCreateContentMutation,
  useGetHomeContentQuery,
  useGetStoriesQuery,
  useGetTestimonialSubmissionsQuery,
  useReplaceStoriesMutation,
  useUpdateContentMutation,
} from "../../lib/apiSlice";

export default function ContentPage() {
  const [createContent, { isLoading }] = useCreateContentMutation();
  const [updateContent] = useUpdateContentMutation();
  const [replaceStories] = useReplaceStoriesMutation();
  const [approveSubmission] = useApproveTestimonialSubmissionMutation();
  const [rejectSubmission] = useRejectTestimonialSubmissionMutation();
  const { data: homeData, refetch: refetchHome } = useGetHomeContentQuery();
  const { data: storiesData, refetch: refetchStories } = useGetStoriesQuery();
  const { data: testimonialSubmissionsData, refetch: refetchSubmissions } =
    useGetTestimonialSubmissionsQuery(undefined, { refetchOnMountOrArgChange: true });
  const [activeDialog, setActiveDialog] = useState<ContentDialog>(null);
  const [error, setError] = useState<string | null>(null);

  const homeItem = (homeData?.items ?? [])[0] ?? null;
  let homeBody: any = {};
  if (homeItem?.body && typeof homeItem.body === "string") {
    try {
      homeBody = JSON.parse(homeItem.body);
    } catch {
      homeBody = {};
    }
  }
  const [homeDraft, setHomeDraft] = useState<any>({});
  useEffect(() => {
    setHomeDraft(homeBody ?? {});
  }, [homeItem?.id, homeItem?.body]);
  const baseHomeTitle =
    homeItem?.title?.trim() ||
    homeItem?.content?.trim() ||
    homeBody.headline?.trim?.() ||
    "Home";

  return (
    <AdminShell title="Content" subtitle="Manage every page in the mobile app.">
      <Card>
        <CardHeader>
          <SectionHeader
            title="Content Manager"
            description="Control what appears in the mobile app."
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-56" />
              <div className="grid gap-4 lg:grid-cols-2">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
          ) : (
            <ContentTabs
              initialHome={{
                introVideoUrl: homeDraft.introVideoUrl ?? "",
                testimonials: homeDraft.testimonials ?? [],
                adminStory: homeDraft.adminStory ?? "",
                professionalPhoto:
                  homeDraft.professionalPhoto ??
                  (Array.isArray(homeDraft.professionalPhotos)
                    ? homeDraft.professionalPhotos[0] ?? ""
                    : typeof homeDraft.professionalPhotos === "string"
                      ? homeDraft.professionalPhotos
                          .split(/\r?\n|,/)
                          .map((item: string) => item.trim())
                          .filter(Boolean)[0] ?? ""
                      : ""),
                stories: storiesData?.items ?? [],
              }}
              onSaveProfile={async (data) => {
                setError(null);
                const nextDraft = {
                  ...homeDraft,
                  adminStory: data.adminStory,
                  professionalPhoto: data.professionalPhoto,
                };
                const payload = {
                  title: "Home",
                  content: baseHomeTitle,
                  type: "article",
                  body: JSON.stringify({
                    ...nextDraft,
                  }),
                  surface: "home",
                  programTier: homeItem?.programTier ?? undefined,
                };
                try {
                  if (homeItem?.id) {
                    await updateContent({ id: homeItem.id, data: payload }).unwrap();
                  } else {
                    await createContent(payload).unwrap();
                  }
                  setHomeDraft(nextDraft);
                  refetchHome();
                  setActiveDialog("home");
                } catch (err) {
                  setError("Failed to save profile content");
                }
              }}
              onSaveTestimonials={async (data) => {
                setError(null);
                const nextDraft = { ...homeDraft, testimonials: data.testimonials };
                const payload = {
                  title: "Home",
                  content: baseHomeTitle,
                  type: "article",
                  body: JSON.stringify({
                    ...nextDraft,
                  }),
                  surface: "home",
                  programTier: homeItem?.programTier ?? undefined,
                };
                try {
                  if (homeItem?.id) {
                    await updateContent({ id: homeItem.id, data: payload }).unwrap();
                  } else {
                    await createContent(payload).unwrap();
                  }
                  setHomeDraft(nextDraft);
                  refetchHome();
                  setActiveDialog("home");
                } catch (err) {
                  setError("Failed to save testimonials");
                }
              }}
              onSaveIntroVideo={async (data) => {
                setError(null);
                const nextDraft = { ...homeDraft, introVideoUrl: data.introVideoUrl };
                const payload = {
                  title: "Home",
                  content: baseHomeTitle,
                  type: "article",
                  body: JSON.stringify({
                    ...nextDraft,
                  }),
                  surface: "home",
                  programTier: homeItem?.programTier ?? undefined,
                };
                try {
                  if (homeItem?.id) {
                    await updateContent({ id: homeItem.id, data: payload }).unwrap();
                  } else {
                    await createContent(payload).unwrap();
                  }
                  setHomeDraft(nextDraft);
                  refetchHome();
                  setActiveDialog("home");
                } catch (err) {
                  setError("Failed to save intro video");
                }
              }}
              onSaveStories={async (data) => {
                setError(null);
                try {
                  await replaceStories({ stories: data.stories }).unwrap();
                  refetchStories();
                  setActiveDialog("home");
                } catch (err) {
                  setError("Failed to save stories");
                }
              }}
              testimonialSubmissions={testimonialSubmissionsData?.items ?? []}
              onApproveTestimonial={async (submissionId) => {
                setError(null);
                try {
                  await approveSubmission({ submissionId }).unwrap();
                  setActiveDialog("home");
                  refetchSubmissions();
                } catch (err) {
                  setError("Failed to approve testimonial");
                }
              }}
              onRejectTestimonial={async (submissionId) => {
                setError(null);
                try {
                  await rejectSubmission({ submissionId }).unwrap();
                  refetchSubmissions();
                } catch (err) {
                  setError("Failed to reject testimonial");
                }
              }}
            />
          )}
        </CardContent>
      </Card>

      {error ? (
        <div className="mt-4 rounded-2xl border border-border bg-secondary/40 p-3 text-sm text-red-500">
          {error}
        </div>
      ) : null}
      <ContentDialogs active={activeDialog} onClose={() => setActiveDialog(null)} />
    </AdminShell>
  );
}
