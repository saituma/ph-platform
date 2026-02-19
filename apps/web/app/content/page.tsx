"use client";

import { useState } from "react";

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
  useGetLegalContentQuery,
  useGetTestimonialSubmissionsQuery,
  useUpdateContentMutation,
} from "../../lib/apiSlice";

export default function ContentPage() {
  const [createContent, { isLoading }] = useCreateContentMutation();
  const [updateContent] = useUpdateContentMutation();
  const [approveSubmission] = useApproveTestimonialSubmissionMutation();
  const [rejectSubmission] = useRejectTestimonialSubmissionMutation();
  const { data: homeData } = useGetHomeContentQuery();
  const { data: legalData } = useGetLegalContentQuery();
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
  const baseHomeTitle =
    homeItem?.title?.trim() ||
    homeItem?.content?.trim() ||
    homeBody.headline?.trim?.() ||
    "Home";

  const legalItems = legalData?.items ?? [];
  const findLegal = (key: "terms" | "privacy") =>
    legalItems.find((item: any) => String(item.category ?? "").toLowerCase() === key) ||
    legalItems.find((item: any) => String(item.title ?? "").toLowerCase().includes(key));
  const termsItem = findLegal("terms");
  const privacyItem = findLegal("privacy");
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
                introVideoUrl: homeBody.introVideoUrl ?? "",
                testimonials: homeBody.testimonials ?? [],
                adminStory: homeBody.adminStory ?? "",
                professionalPhoto:
                  homeBody.professionalPhoto ??
                  (Array.isArray(homeBody.professionalPhotos)
                    ? homeBody.professionalPhotos[0] ?? ""
                    : typeof homeBody.professionalPhotos === "string"
                      ? homeBody.professionalPhotos
                          .split(/\r?\n|,/)
                          .map((item: string) => item.trim())
                          .filter(Boolean)[0] ?? ""
                      : ""),
              }}
              initialLegal={{
                termsText: termsItem?.body ?? "",
                termsVersion: termsItem?.content ?? "1.0",
                privacyText: privacyItem?.body ?? "",
                privacyVersion: privacyItem?.content ?? "1.0",
              }}
              onSaveProfile={async (data) => {
                setError(null);
                const payload = {
                  title: "Home",
                  content: baseHomeTitle,
                  type: "article",
                  body: JSON.stringify({
                    ...homeBody,
                    adminStory: data.adminStory,
                    professionalPhoto: data.professionalPhoto,
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
                  setActiveDialog("home");
                } catch (err) {
                  setError("Failed to save profile content");
                }
              }}
              onSaveTestimonials={async (data) => {
                setError(null);
                const payload = {
                  title: "Home",
                  content: baseHomeTitle,
                  type: "article",
                  body: JSON.stringify({
                    ...homeBody,
                    testimonials: data.testimonials,
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
                  setActiveDialog("home");
                } catch (err) {
                  setError("Failed to save testimonials");
                }
              }}
              onSaveIntroVideo={async (data) => {
                setError(null);
                const payload = {
                  title: "Home",
                  content: baseHomeTitle,
                  type: "article",
                  body: JSON.stringify({
                    ...homeBody,
                    introVideoUrl: data.introVideoUrl,
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
                  setActiveDialog("home");
                } catch (err) {
                  setError("Failed to save intro video");
                }
              }}
              onSaveLegal={async (data) => {
                setError(null);
                const upsert = async (key: "terms" | "privacy", text: string, version: string) => {
                  const existing =
                    key === "terms" ? termsItem : privacyItem;
                  const payload = {
                    title: key === "terms" ? "Terms & Conditions" : "Privacy Policy",
                    content: version,
                    type: "article",
                    body: text,
                    surface: "legal",
                    category: key,
                  };
                  if (existing?.id) {
                    await updateContent({ id: existing.id, data: payload }).unwrap();
                  } else {
                    await createContent(payload).unwrap();
                  }
                };
                try {
                  await Promise.all([
                    upsert("terms", data.termsText, data.termsVersion || "1.0"),
                    upsert("privacy", data.privacyText, data.privacyVersion || "1.0"),
                  ]);
                  setActiveDialog("legal");
                } catch (err) {
                  setError("Failed to save legal content");
                }
              }}
              onPublishAnnouncement={async (data) => {
                setError(null);
                const payload = {
                  title: data.title,
                  content: data.body.slice(0, 140),
                  type: "article",
                  body: data.body,
                  surface: "announcements",
                };
                try {
                  await createContent(payload).unwrap();
                  setActiveDialog("home");
                } catch (err) {
                  setError("Failed to publish announcement");
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
