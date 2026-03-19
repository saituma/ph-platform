"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useGetProgramSectionContentQuery, useGetVideoUploadsQuery } from "../../lib/apiSlice";

const SECTION_TABS = [
  { value: "program", label: "Program" },
  { value: "screening", label: "Movement Screening" },
  { value: "warmup", label: "Warmups" },
  { value: "cooldown", label: "Cool Downs" },
  { value: "stretching", label: "Stretching" },
  { value: "mobility", label: "Mobility" },
  { value: "recovery", label: "Recovery" },
  { value: "offseason", label: "Off Season" },
  { value: "inseason", label: "In Season" },
  { value: "nutrition", label: "Athlete Platform" },
] as const;

type VideoItem = {
  id: number;
  athlete: string;
  status: string;
  sectionId: number | null;
  sectionTitle: string | null;
  sectionType: string | null;
  createdAt?: string | null;
};

type TrainingCard = {
  sectionId: number | null;
  sectionTitle: string;
  sectionType: string;
  count: number;
  awaiting: number;
  lastUploadAt?: string | null;
  hasUploads: boolean;
};

export default function VideoReviewListPage() {
  const router = useRouter();
  const { data: videosData, isLoading } = useGetVideoUploadsQuery();
  const [activeTab, setActiveTab] = useState<string>("program");
  const { data: sectionData, isLoading: isLoadingSections } = useGetProgramSectionContentQuery({
    sectionType: activeTab,
  });

  const videos = useMemo<VideoItem[]>(() => {
    const items = videosData?.items ?? [];
    return items.map((item: any) => {
      const reviewed = Boolean(item.reviewedAt);
      const createdAt = item.createdAt ? new Date(item.createdAt) : null;
      const daysOpen = createdAt ? (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24) : 0;
      const status = reviewed
        ? "Reviewed"
        : daysOpen >= 7
          ? "Priority"
          : "Awaiting";
      return {
        id: item.id,
        athlete: item.athleteName ?? "Athlete",
        status,
        sectionId: item.programSectionContentId ?? null,
        sectionTitle: item.programSectionTitle ?? null,
        sectionType: item.programSectionType ?? "program",
        createdAt: item.createdAt ?? null,
      };
    });
  }, [videosData]);

  const trainings = useMemo<TrainingCard[]>(() => {
    const map = new Map<string, TrainingCard>();
    videos.forEach((video) => {
      const sectionType = video.sectionType ?? "program";
      const sectionTitle = video.sectionTitle ?? "General uploads";
      const sectionId = video.sectionId ?? null;
      const key = sectionId ? `id:${sectionId}` : `general:${sectionType}`;
      const existing = map.get(key);
      const awaiting = video.status === "Reviewed" ? 0 : 1;
      if (!existing) {
        map.set(key, {
          sectionId,
          sectionTitle,
          sectionType,
          count: 1,
          awaiting,
          lastUploadAt: video.createdAt ?? null,
          hasUploads: true,
        });
      } else {
        map.set(key, {
          ...existing,
          count: existing.count + 1,
          awaiting: existing.awaiting + awaiting,
          lastUploadAt:
            video.createdAt && (!existing.lastUploadAt || video.createdAt > existing.lastUploadAt)
              ? video.createdAt
              : existing.lastUploadAt,
          hasUploads: true,
        });
      }
    });
    const uploadRows = Array.from(map.values());
    const sectionItems = (sectionData?.items ?? []) as Array<{
      id: number;
      title: string;
      sectionType: string;
      allowVideoUpload?: boolean | null;
    }>;
    sectionItems
      .filter((item) => Boolean(item.allowVideoUpload))
      .forEach((item) => {
        const key = `id:${item.id}`;
        if (!map.has(key)) {
          map.set(key, {
            sectionId: item.id,
            sectionTitle: item.title || "Training",
            sectionType: item.sectionType || activeTab,
            count: 0,
            awaiting: 0,
            lastUploadAt: null,
            hasUploads: false,
          });
        }
      });
    return Array.from(map.values()).sort((a, b) => {
      if (a.awaiting !== b.awaiting) return b.awaiting - a.awaiting;
      return a.sectionTitle.localeCompare(b.sectionTitle);
    });
  }, [videos, sectionData, activeTab]);

  const filteredTrainings = useMemo(() => {
    return trainings.filter((training) => training.sectionType === activeTab);
  }, [trainings, activeTab]);

  return (
    <AdminShell
      title="Video Review"
      subtitle="Pick a training, then review athlete uploads."
    >
      <SectionHeader title="Training list" description="Each tab shows the trainings with uploaded videos." />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full flex-wrap justify-start gap-2 bg-transparent">
          {SECTION_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="rounded-full px-4">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {(isLoading || isLoadingSections) && (
          <div className="text-sm text-muted-foreground">Loading trainings…</div>
        )}
        {!isLoading && !isLoadingSections && filteredTrainings.length === 0 && (
          <div className="text-sm text-muted-foreground">No uploads in this tab yet.</div>
        )}
        {filteredTrainings.map((training) => (
          <Card key={`${training.sectionType}-${training.sectionId ?? "general"}`} className="border-border/70">
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">{training.sectionTitle}</div>
                  <div className="text-xs text-muted-foreground">{training.count} uploads</div>
                </div>
                {training.awaiting > 0 ? (
                  <Badge variant="accent">{training.awaiting} awaiting</Badge>
                ) : (
                  <Badge>Reviewed</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {training.hasUploads
                  ? `Last upload: ${training.lastUploadAt ? new Date(training.lastUploadAt).toLocaleString() : "Unknown"}`
                  : "No uploads yet"}
              </div>
              <Button
                size="sm"
                onClick={() => {
                  const key = training.sectionId
                    ? `id-${training.sectionId}`
                    : `general-${training.sectionType}`;
                  router.push(`/video-review/${key}`);
                }}
              >
                View training
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
