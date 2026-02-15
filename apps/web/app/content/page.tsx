"use client";

import { useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { EmptyState } from "../../components/admin/empty-state";
import { SectionHeader } from "../../components/admin/section-header";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { ContentDialogs, type ContentDialog } from "../../components/admin/content/content-dialogs";
import { ContentTabs } from "../../components/admin/content/content-tabs";
import { useCreateContentMutation } from "../../lib/apiSlice";

export default function ContentPage() {
  const hasContent = false;
  const [createContent, { isLoading }] = useCreateContentMutation();
  const [activeDialog, setActiveDialog] = useState<ContentDialog>(null);
  const [error, setError] = useState<string | null>(null);
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
          ) : hasContent ? (
            <ContentTabs
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
                  await createContent(payload).unwrap();
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
              onSaveLegal={() => setActiveDialog("legal")}
            />
          ) : (
            <EmptyState
              title="No content yet"
              description="Start by adding your first page content."
              actionLabel="Add Content"
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
