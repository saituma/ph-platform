"use client";

import { useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { EmptyState } from "../../components/admin/empty-state";
import { SectionHeader } from "../../components/admin/section-header";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { ContentDialogs, type ContentDialog } from "../../components/admin/content/content-dialogs";
import { ContentTabs } from "../../components/admin/content/content-tabs";

export default function ContentPage() {
  const hasContent = true;
  const isLoading = false;
  const [activeDialog, setActiveDialog] = useState<ContentDialog>(null);
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
              onSaveHome={() => setActiveDialog("home")}
              onPublishParent={() => setActiveDialog("parent")}
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

      <ContentDialogs active={activeDialog} onClose={() => setActiveDialog(null)} />
    </AdminShell>
  );
}
