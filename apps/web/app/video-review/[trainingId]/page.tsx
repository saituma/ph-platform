"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";

import { AdminShell } from "../../../components/admin/shell";
import { SectionHeader } from "../../../components/admin/section-header";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { useGetVideoUploadsQuery } from "../../../lib/apiSlice";

type VideoItem = {
  id: number;
  athlete: string;
  athleteUserId: number | null;
  status: string;
  sectionId: number | null;
  sectionTitle: string | null;
  sectionType: string | null;
  createdAt?: string | null;
};

type RawVideoUpload = {
  id: number;
  athleteName?: string | null;
  athleteUserId?: number | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
  programSectionContentId?: number | null;
  programSectionTitle?: string | null;
  programSectionType?: string | null;
};

type AthleteCard = {
  id: string;
  name: string;
  uploads: number;
  awaiting: number;
  latestAt?: string | null;
};

function parseTrainingParam(value: string) {
  if (value.startsWith("id-")) {
    const id = Number(value.replace("id-", ""));
    return { type: "id" as const, id: Number.isFinite(id) ? id : null };
  }
  if (value.startsWith("general-")) {
    return { type: "general" as const, sectionType: value.replace("general-", "") };
  }
  return { type: "general" as const, sectionType: "program" };
}

export default function TrainingDetailPage() {
  const router = useRouter();
  const params = useParams<{ trainingId: string }>();
  const trainingParam = parseTrainingParam(params.trainingId);
  const { data: videosData, isLoading } = useGetVideoUploadsQuery();

  const videos = useMemo<VideoItem[]>(() => {
    const items: RawVideoUpload[] = Array.isArray(videosData?.items) ? videosData.items : [];
    return items.map((item) => {
      const reviewed = Boolean(item.reviewedAt);
      const status = reviewed ? "Reviewed" : "Awaiting";
      return {
        id: item.id,
        athlete: item.athleteName ?? "Athlete",
        athleteUserId: item.athleteUserId ?? null,
        status,
        sectionId: item.programSectionContentId ?? null,
        sectionTitle: item.programSectionTitle ?? null,
        sectionType: item.programSectionType ?? "program",
        createdAt: item.createdAt ?? null,
      };
    });
  }, [videosData]);

  const trainingVideos = useMemo(() => {
    if (trainingParam.type === "id") {
      return videos.filter((video) => video.sectionId === trainingParam.id);
    }
    return videos.filter((video) => video.sectionId == null && video.sectionType === trainingParam.sectionType);
  }, [videos, trainingParam]);

  const trainingTitle =
    trainingVideos[0]?.sectionTitle ??
    (trainingParam.type === "general" ? "General uploads" : "Training detail");

  const athletes = useMemo<AthleteCard[]>(() => {
    const map = new Map<string, AthleteCard>();
    trainingVideos.forEach((video) => {
      const id = video.athleteUserId ? `user-${video.athleteUserId}` : `name-${video.athlete}`;
      const existing = map.get(id);
      const awaiting = video.status === "Reviewed" ? 0 : 1;
      if (!existing) {
        map.set(id, {
          id,
          name: video.athlete,
          uploads: 1,
          awaiting,
          latestAt: video.createdAt ?? null,
        });
      } else {
        map.set(id, {
          ...existing,
          uploads: existing.uploads + 1,
          awaiting: existing.awaiting + awaiting,
          latestAt:
            video.createdAt && (!existing.latestAt || video.createdAt > existing.latestAt)
              ? video.createdAt
              : existing.latestAt,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.awaiting !== b.awaiting) return b.awaiting - a.awaiting;
      return a.name.localeCompare(b.name);
    });
  }, [trainingVideos]);

  return (
    <AdminShell title={trainingTitle} subtitle="Select an athlete to review their uploads.">
      <SectionHeader title="Athletes" description="Athletes who uploaded to this training." />
      <div className="grid gap-4 lg:grid-cols-2">
        {isLoading && <div className="text-sm text-muted-foreground">Loading athletes…</div>}
        {!isLoading && athletes.length === 0 && (
          <div className="text-sm text-muted-foreground">No uploads for this training yet.</div>
        )}
        {athletes.map((athlete) => (
          <Card key={athlete.id} className="border-border/70">
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
                Last upload: {athlete.latestAt ? new Date(athlete.latestAt).toLocaleString() : "Unknown"}
              </div>
              <Button
                size="sm"
                onClick={() => router.push(`/video-review/${params.trainingId}/athletes/${athlete.id}`)}
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
