"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { AdminShell } from "../../../../../components/admin/shell";
import { SectionHeader } from "../../../../../components/admin/section-header";
import { Badge } from "../../../../../components/ui/badge";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../../../components/ui/card";
import { VideoDialogs, type VideoReviewDialog } from "../../../../../components/admin/video-review/video-dialogs";
import {
  useGetVideoUploadsQuery,
  useReviewVideoUploadMutation,
  useSendMessageMutation,
} from "../../../../../lib/apiSlice";

type VideoItem = {
  id: number;
  athlete: string;
  athleteUserId: number | null;
  guardianUserId: number | null;
  status: string;
  topic: string;
  sectionId: number | null;
  sectionTitle: string | null;
  sectionType: string | null;
  videoUrl?: string | null;
  notes?: string | null;
  feedback?: string | null;
  createdAt?: string | null;
};

type RawVideoUpload = {
  id: number;
  athleteName?: string | null;
  athleteUserId?: number | null;
  guardianUserId?: number | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
  programSectionContentId?: number | null;
  programSectionTitle?: string | null;
  programSectionType?: string | null;
  videoUrl?: string | null;
  notes?: string | null;
  feedback?: string | null;
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

function parseAthleteParam(value: string) {
  if (value.startsWith("user-")) {
    const id = Number(value.replace("user-", ""));
    return { type: "user" as const, id: Number.isFinite(id) ? id : null };
  }
  if (value.startsWith("name-")) {
    return { type: "name" as const, name: value.replace("name-", "") };
  }
  return { type: "name" as const, name: value };
}

export default function AthleteVideoDetailPage() {
  const params = useParams<{ trainingId: string; athleteId: string }>();
  const trainingParam = parseTrainingParam(params.trainingId);
  const athleteParam = parseAthleteParam(params.athleteId);
  const { data: videosData, isLoading, refetch } = useGetVideoUploadsQuery();
  const [reviewVideo, { isLoading: isSubmitting }] = useReviewVideoUploadMutation();
  const [sendMessage, { isLoading: isSendingResponse }] = useSendMessageMutation();
  const [activeDialog, setActiveDialog] = useState<VideoReviewDialog>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  const videos = useMemo<VideoItem[]>(() => {
    const items: RawVideoUpload[] = Array.isArray(videosData?.items) ? videosData.items : [];
    return items.map((item) => {
      const reviewed = Boolean(item.reviewedAt);
      const status = reviewed ? "Reviewed" : "Awaiting";
      const sectionTitle = item.programSectionTitle ?? null;
      const notes = item.notes ?? null;
      const topic = sectionTitle ?? "Video upload";
      return {
        id: item.id,
        athlete: item.athleteName ?? "Athlete",
        athleteUserId: item.athleteUserId ?? null,
        guardianUserId: item.guardianUserId ?? null,
        status,
        topic,
        sectionId: item.programSectionContentId ?? null,
        sectionTitle,
        sectionType: item.programSectionType ?? "program",
        videoUrl: item.videoUrl ?? null,
        notes,
        feedback: item.feedback ?? null,
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

  const athleteVideos = useMemo(() => {
    if (athleteParam.type === "user") {
      return trainingVideos.filter((video) => video.athleteUserId === athleteParam.id);
    }
    return trainingVideos.filter((video) => video.athlete === athleteParam.name);
  }, [trainingVideos, athleteParam]);

  const trainingTitle = trainingVideos[0]?.sectionTitle ?? "Training detail";
  const athleteName = athleteVideos[0]?.athlete ?? "Athlete";

  return (
    <AdminShell title={athleteName} subtitle={`Uploads for ${trainingTitle}.`}>
      <SectionHeader title="Uploads" description="Click a video to review or send a response." />
      <div className="grid gap-4 lg:grid-cols-2">
        {isLoading && <div className="text-sm text-muted-foreground">Loading uploads…</div>}
        {!isLoading && athleteVideos.length === 0 && (
          <div className="text-sm text-muted-foreground">No uploads for this athlete yet.</div>
        )}
        {athleteVideos.map((video) => (
          <Card key={video.id} className="border-border/70">
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">{trainingTitle}</div>
                  <div className="text-xs text-muted-foreground">
                    {video.createdAt ? new Date(video.createdAt).toLocaleString() : "Unknown time"}
                  </div>
                </div>
                <Badge variant={video.status === "Reviewed" ? "default" : "outline"}>{video.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground line-clamp-2">
                {video.feedback ? `Feedback: ${video.feedback}` : "No feedback yet."}
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedVideo(video);
                  setActiveDialog("review");
                }}
              >
                Review
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <VideoDialogs
        active={activeDialog}
        onClose={() => setActiveDialog(null)}
        selectedVideo={selectedVideo}
        queueVideos={athleteVideos}
        onSelectQueueVideo={(video) => {
          const selected = athleteVideos.find((item) => item.id === video.id) ?? null;
          setSelectedVideo(selected);
          setActiveDialog("review");
        }}
        isSubmitting={isSubmitting}
        onSubmitReview={async (feedback) => {
          if (!selectedVideo) return;
          await reviewVideo({ uploadId: selectedVideo.id, feedback }).unwrap();
          setActiveDialog(null);
          refetch();
        }}
        onSendResponseVideo={async ({ recipientUserIds, mediaUrl, uploadId }) => {
          await Promise.all(
            recipientUserIds.map((userId) =>
              sendMessage({ userId, contentType: "video", mediaUrl, videoUploadId: uploadId }).unwrap(),
            ),
          );
        }}
        isSendingResponse={isSendingResponse}
      />
    </AdminShell>
  );
}
