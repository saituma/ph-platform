"use client";

import { useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { ContentDialogs, type ContentDialog } from "../../components/admin/content/content-dialogs";
import { ContentTabs } from "../../components/admin/content/content-tabs";
import { useCreateContentMutation, useGetHomeContentQuery, useGetLegalContentQuery, useUpdateContentMutation } from "../../lib/apiSlice";

export default function ContentPage() {
  const [createContent, { isLoading }] = useCreateContentMutation();
  const [updateContent] = useUpdateContentMutation();
  const { data: homeData } = useGetHomeContentQuery();
  const { data: legalData } = useGetLegalContentQuery();
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
                headline: homeBody.headline ?? homeItem?.content ?? homeItem?.title ?? "",
                description: homeBody.description ?? "",
                welcome: homeBody.welcome ?? "",
                introVideoUrl: homeBody.introVideoUrl ?? "",
                testimonials: homeBody.testimonials ?? "",
                heroImageUrl: homeBody.heroImageUrl ?? "",
                tier: homeItem?.programTier ?? "all",
              }}
              initialLegal={{
                termsText: termsItem?.body ?? "",
                termsVersion: termsItem?.content ?? "1.0",
                privacyText: privacyItem?.body ?? "",
                privacyVersion: privacyItem?.content ?? "1.0",
              }}
              onSaveHome={async (data) => {
                setError(null);
                const payload = {
                  title: "Home",
                  content: data.headline,
                  type: "article",
                  body: JSON.stringify({
                    description: data.description,
                    welcome: data.welcome,
                    introVideoUrl: data.introVideoUrl,
                    testimonials: data.testimonials,
                    heroImageUrl: data.heroImageUrl,
                  }),
                  surface: "home",
                  programTier: data.tier === "all" ? undefined : data.tier,
                };
                try {
                  if (homeItem?.id) {
                    await updateContent({ id: homeItem.id, data: payload }).unwrap();
                  } else {
                    await createContent(payload).unwrap();
                  }
                  setActiveDialog("home");
                } catch (err) {
                  setError("Failed to save home content");
                }
              }}
              onPublishParent={async (data) => {
                setError(null);
                const payload = {
                  title: data.title,
                  content: data.body.slice(0, 140),
                  type: "article",
                  body: data.body,
                  surface: "parent_platform",
                  category: data.category,
                  programTier: data.tier === "all" ? undefined : data.tier,
                };
                try {
                  await createContent(payload).unwrap();
                  setActiveDialog("parent");
                } catch (err) {
                  setError("Failed to publish parent article");
                }
              }}
              onSavePrograms={() => setActiveDialog("programs")}
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
