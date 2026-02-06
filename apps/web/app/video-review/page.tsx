"use client";

import { useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { VideoDialogs, type VideoReviewDialog } from "../../components/admin/video-review/video-dialogs";
import { VideoFilters } from "../../components/admin/video-review/video-filters";
import { VideoGrid } from "../../components/admin/video-review/video-grid";

const videos = [
  {
    athlete: "Miles Turner",
    topic: "Single-leg hop assessment",
    status: "Awaiting feedback",
  },
  {
    athlete: "Ava Patterson",
    topic: "Acceleration mechanics",
    status: "Priority",
  },
  {
    athlete: "Jordan Miles",
    topic: "Mobility flow",
    status: "Reviewed",
  },
];

export default function VideoReviewPage() {
  const isLoading = false;
  const [activeDialog, setActiveDialog] = useState<VideoReviewDialog>(null);
  const [selectedVideo, setSelectedVideo] = useState<(typeof videos)[number] | null>(null);
  const [activeChip, setActiveChip] = useState<string>("All");
  const [videoState, setVideoState] = useState(videos);
  const chips = ["All", "Priority", "Awaiting", "Reviewed"];

  const filteredVideos = useMemo(() => {
    if (activeChip === "All") return videoState;
    if (activeChip === "Priority") return videoState.filter((video) => video.status === "Priority");
    if (activeChip === "Reviewed") return videoState.filter((video) => video.status === "Reviewed");
    return videoState.filter((video) => video.status !== "Reviewed");
  }, [activeChip, videoState]);

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
        onStatusChange={(status) => {
          if (!selectedVideo) return;
          setVideoState((prev) =>
            prev.map((video) =>
              video.athlete === selectedVideo.athlete
                ? { ...video, status }
                : video
            )
          );
          setSelectedVideo((prev) => (prev ? { ...prev, status } : prev));
        }}
      />
    </AdminShell>
  );
}
