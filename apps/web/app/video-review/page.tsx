"use client";

import { useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { VideoDialogs, type VideoReviewDialog } from "../../components/admin/video-review/video-dialogs";
import { VideoFilters } from "../../components/admin/video-review/video-filters";
import { VideoGrid } from "../../components/admin/video-review/video-grid";
import { useGetVideoUploadsQuery, useReviewVideoUploadMutation } from "../../lib/apiSlice";

type VideoItem = {
  id: number;
  athlete: string;
  topic: string;
  status: string;
  videoUrl?: string | null;
  feedback?: string | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
};

export default function VideoReviewPage() {
  const { data: videosData, isLoading, refetch } = useGetVideoUploadsQuery();
  const [reviewVideo, { isLoading: isSubmitting }] = useReviewVideoUploadMutation();
  const [activeDialog, setActiveDialog] = useState<VideoReviewDialog>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [activeChip, setActiveChip] = useState<string>("All");
  const chips = ["All", "Priority", "Awaiting", "Reviewed"];

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
          : "Awaiting feedback";
      return {
        id: item.id,
        athlete: item.athleteName ?? "Athlete",
        topic: item.notes ?? "Video upload",
        status,
        videoUrl: item.videoUrl ?? null,
        feedback: item.feedback ?? null,
        reviewedAt: item.reviewedAt ?? null,
        createdAt: item.createdAt ?? null,
      };
    });
  }, [videosData]);

  const filteredVideos = useMemo(() => {
    if (activeChip === "All") return videos;
    if (activeChip === "Priority") return videos.filter((video) => video.status === "Priority");
    if (activeChip === "Reviewed") return videos.filter((video) => video.status === "Reviewed");
    return videos.filter((video) => video.status !== "Reviewed");
  }, [activeChip, videos]);

  const queueVideos = useMemo(() => {
    return videos
      .filter((video) => video.status !== "Reviewed")
      .sort((a, b) => {
        if (a.status === b.status) {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        }
        if (a.status === "Priority") return -1;
        if (b.status === "Priority") return 1;
        return 0;
      });
  }, [videos]);

  return (
    <AdminShell
      title="Video Review"
      subtitle="Provide feedback on client uploads."
      actions={<Button onClick={() => setActiveDialog("queue")}>Review Queue</Button>}
    >
      <SectionHeader title="Queue" description="High-priority submissions at the top." />
      <VideoFilters chips={chips} onChipSelect={setActiveChip} />
      <VideoGrid
        videos={filteredVideos}
        isLoading={isLoading}
        onOpen={(video) => {
          setSelectedVideo(video);
          setActiveDialog("review");
        }}
      />

      <VideoDialogs
        active={activeDialog}
        onClose={() => setActiveDialog(null)}
        selectedVideo={selectedVideo}
        queueVideos={queueVideos}
        onSelectQueueVideo={(video) => {
          const selected = videos.find((item) => item.id === video.id) ?? null;
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
      />
    </AdminShell>
  );
}
