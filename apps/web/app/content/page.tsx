"use client";

import { useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { ContentDialogs, type ContentDialog } from "../../components/admin/content/content-dialogs";
import { ContentTabs, type TestimonialEntry } from "../../components/admin/content/content-tabs";
import {
  useApproveTestimonialSubmissionMutation,
  useRejectTestimonialSubmissionMutation,
  useCreateContentMutation,
  useGetHomeContentQuery,
  useGetTestimonialSubmissionsQuery,
  useUpdateContentMutation,
} from "../../lib/apiSlice";

type HomeDraft = {
  introVideoUrl?: string;
  introVideos?: Array<{ url: string; roles: Array<"team" | "youth" | "adult"> }> | unknown;
  testimonials?: TestimonialEntry[] | string;
  adminStory?: string;
  professionalPhoto?: string;
  professionalPhotos?: string | string[];
  headline?: string;
};

export default function ContentPage() {
  const [createContent, { isLoading }] = useCreateContentMutation();
  const [updateContent] = useUpdateContentMutation();
  const [approveSubmission] = useApproveTestimonialSubmissionMutation();
  const [rejectSubmission] = useRejectTestimonialSubmissionMutation();
  const { data: homeData, refetch: refetchHome } = useGetHomeContentQuery();
  const { data: testimonialSubmissionsData, refetch: refetchSubmissions } =
    useGetTestimonialSubmissionsQuery(undefined, { refetchOnMountOrArgChange: true });
  const [activeDialog, setActiveDialog] = useState<ContentDialog>(null);
  const [error, setError] = useState<string | null>(null);

  const homeItem = (homeData?.items ?? [])[0] ?? null;
  let homeBody: HomeDraft = {};
  if (homeItem?.body && typeof homeItem.body === "string") {
    try {
      homeBody = JSON.parse(homeItem.body) as HomeDraft;
    } catch {
      homeBody = {};
    }
  }
  const homeDraft = homeBody;
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
                introVideos: Array.isArray((homeDraft as any).introVideos)
                  ? (((homeDraft as any).introVideos ?? []) as Array<{
                      url: string;
                      roles: Array<"team" | "youth" | "adult">;
                    }>)
                  : [],
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
                  refetchHome();
                  setActiveDialog("home");
                } catch {
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
                  refetchHome();
                  setActiveDialog("home");
                } catch {
                  setError("Failed to save testimonials");
                }
              }}
              onSaveIntroVideo={async (data) => {
                setError(null);
                const nextDraft = {
                  ...homeDraft,
                  introVideoUrl: data.introVideoUrl,
                  introVideos: data.introVideos,
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
                  refetchHome();
                  setActiveDialog("home");
                } catch {
                  setError("Failed to save intro video");
                }
              }}
              testimonialSubmissions={testimonialSubmissionsData?.items ?? []}
              onApproveTestimonial={async (submissionId) => {
                setError(null);
                try {
                  await approveSubmission({ submissionId }).unwrap();
                  setActiveDialog("home");
                  refetchSubmissions();
                } catch {
                  setError("Failed to approve testimonial");
                }
              }}
              onRejectTestimonial={async (submissionId) => {
                setError(null);
                try {
                  await rejectSubmission({ submissionId }).unwrap();
                  refetchSubmissions();
                } catch {
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
