"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useGetVideoUploadsQuery } from "../../lib/apiSlice";

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
  athleteId: number | null;
  athlete: string;
  status: string;
  sectionId: number | null;
  sectionTitle: string | null;
  sectionType: string | null;
  createdAt?: string | null;
};

type AthleteCard = {
  athleteId: number;
  name: string;
  awaiting: number;
  uploads: number;
  lastUploadAt?: string | null;
};

export default function VideoReviewListPage() {
  const router = useRouter();
  const { data: videosData, isLoading } = useGetVideoUploadsQuery();
  const [activeTab, setActiveTab] = useState<string>("program");

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
        athleteId: item.athleteId ?? null,
        athlete: item.athleteName ?? "Athlete",
        status,
        sectionId: item.programSectionContentId ?? null,
        sectionTitle: item.programSectionTitle ?? null,
        sectionType: item.programSectionType ?? "program",
        createdAt: item.createdAt ?? null,
      };
    });
  }, [videosData]);

  const athletes = useMemo<AthleteCard[]>(() => {
    const map = new Map<number, AthleteCard>();
    videos.forEach((video) => {
      if (!video.athleteId) return;
      const existing = map.get(video.athleteId);
      const awaiting = video.status === "Reviewed" ? 0 : 1;
      if (!existing) {
        map.set(video.athleteId, {
          athleteId: video.athleteId,
          name: video.athlete,
          awaiting,
          uploads: 1,
          lastUploadAt: video.createdAt ?? null,
        });
      } else {
        map.set(video.athleteId, {
          ...existing,
          awaiting: existing.awaiting + awaiting,
          uploads: existing.uploads + 1,
          lastUploadAt:
            video.createdAt && (!existing.lastUploadAt || video.createdAt > existing.lastUploadAt)
              ? video.createdAt
              : existing.lastUploadAt,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.awaiting !== b.awaiting) return b.awaiting - a.awaiting;
      return (b.lastUploadAt ? new Date(b.lastUploadAt).getTime() : 0) - (a.lastUploadAt ? new Date(a.lastUploadAt).getTime() : 0);
    });
  }, [videos]);

  const filteredAthletes = useMemo(() => {
    return athletes.filter((athlete) => {
      const hasInTab = videos.some(
        (video) =>
          video.athleteId === athlete.athleteId &&
          (video.sectionType ?? "program") === activeTab
      );
      return hasInTab;
    });
  }, [athletes, videos, activeTab]);

  return (
    <AdminShell
      title="Video Review"
      subtitle="Pick an athlete, then review their upload history."
    >
      <SectionHeader title="Athletes" description="Each tab shows athletes who uploaded videos for that section." />
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
        {isLoading && <div className="text-sm text-muted-foreground">Loading athletes…</div>}
        {!isLoading && filteredAthletes.length === 0 && (
          <div className="text-sm text-muted-foreground">No uploads in this tab yet.</div>
        )}
        {filteredAthletes.map((athlete) => (
          <Card key={athlete.athleteId} className="border-border/70">
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">{athlete.name}</div>
                  <div className="text-xs text-muted-foreground">{athlete.uploads} uploads</div>
                </div>
                {athlete.awaiting > 0 ? (
                  <Badge variant="accent">{athlete.awaiting} awaiting</Badge>
                ) : (
                  <Badge>Reviewed</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Last upload: {athlete.lastUploadAt ? new Date(athlete.lastUploadAt).toLocaleString() : "Unknown"}
              </div>
              <Button
                size="sm"
                onClick={() => {
                  router.push(`/video-review/athletes/${athlete.athleteId}?tab=${encodeURIComponent(activeTab)}`);
                }}
              >
                View athlete
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
