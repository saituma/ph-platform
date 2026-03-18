"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { VideoDialogs, type VideoReviewDialog } from "../../components/admin/video-review/video-dialogs";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { useGetVideoUploadsQuery, useReviewVideoUploadMutation, useSendMessageMutation } from "../../lib/apiSlice";

type VideoItem = {
  id: number;
  athlete: string;
  topic: string;
  status: string;
  sectionTitle?: string | null;
  videoUrl?: string | null;
  feedback?: string | null;
  athleteUserId?: number | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
};

export default function VideoReviewPage() {
  const { data: videosData, isLoading, refetch } = useGetVideoUploadsQuery();
  const [reviewVideo, { isLoading: isSubmitting }] = useReviewVideoUploadMutation();
  const [sendMessage, { isLoading: isSendingResponse }] = useSendMessageMutation();
  const [activeDialog, setActiveDialog] = useState<VideoReviewDialog>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>("");
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");

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
      const sectionTitle = item.programSectionTitle ?? null;
      const baseTopic = item.notes ?? "Video upload";
      const topic = sectionTitle ? `${sectionTitle} • ${baseTopic}` : baseTopic;
      return {
        id: item.id,
        athlete: item.athleteName ?? "Athlete",
        topic,
        status,
        sectionTitle,
        videoUrl: item.videoUrl ?? null,
        feedback: item.feedback ?? null,
        athleteUserId: item.athleteUserId ?? null,
        reviewedAt: item.reviewedAt ?? null,
        createdAt: item.createdAt ?? null,
      };
    });
  }, [videosData]);

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

  const trainings = useMemo(() => {
    const map = new Map<
      string,
      { id: string; title: string; count: number; priority: number; hasAwaiting: boolean }
    >();
    videos.forEach((video) => {
      const id = video.sectionTitle ? `${video.sectionTitle}` : "general";
      const title = video.sectionTitle ? video.sectionTitle : "General uploads";
      const existing = map.get(id);
      const priority = video.status === "Priority" ? 2 : video.status === "Awaiting feedback" ? 1 : 0;
      const hasAwaiting = video.status !== "Reviewed";
      if (!existing) {
        map.set(id, { id, title, count: 1, priority, hasAwaiting });
      } else {
        map.set(id, {
          ...existing,
          count: existing.count + 1,
          priority: Math.max(existing.priority, priority),
          hasAwaiting: existing.hasAwaiting || hasAwaiting,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.title.localeCompare(b.title);
    });
  }, [videos]);

  const selectedTraining = trainings.find((item) => item.id === selectedTrainingId) ?? null;

  const trainingVideos = useMemo(() => {
    if (!selectedTraining) return [];
    return videos.filter((video) => {
      const id = video.sectionTitle ? `${video.sectionTitle}` : "general";
      return id === selectedTraining.id;
    });
  }, [selectedTraining, videos]);

  const athletes = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number; awaiting: number }>();
    trainingVideos.forEach((video) => {
      const id = `${video.athleteUserId ?? video.athlete}`;
      const existing = map.get(id);
      const awaiting = video.status !== "Reviewed" ? 1 : 0;
      if (!existing) {
        map.set(id, { id, name: video.athlete, count: 1, awaiting });
      } else {
        map.set(id, {
          ...existing,
          count: existing.count + 1,
          awaiting: existing.awaiting + awaiting,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.awaiting !== b.awaiting) return b.awaiting - a.awaiting;
      return a.name.localeCompare(b.name);
    });
  }, [trainingVideos]);

  const selectedAthlete = athletes.find((athlete) => athlete.id === selectedAthleteId) ?? null;

  const athleteVideos = useMemo(() => {
    if (!selectedAthlete) return [];
    return trainingVideos.filter((video) => `${video.athleteUserId ?? video.athlete}` === selectedAthlete.id);
  }, [selectedAthlete, trainingVideos]);

  useEffect(() => {
    if (!selectedTrainingId && trainings.length) {
      setSelectedTrainingId(trainings[0].id);
    }
  }, [selectedTrainingId, trainings]);

  useEffect(() => {
    if (!selectedTraining) return;
    if (!selectedAthleteId || !athletes.find((athlete) => athlete.id === selectedAthleteId)) {
      setSelectedAthleteId(athletes[0]?.id ?? "");
    }
  }, [selectedTraining, selectedAthleteId, athletes]);

  return (
    <AdminShell
      title="Video Review"
      subtitle="Provide feedback on client uploads."
      actions={<Button onClick={() => setActiveDialog("queue")}>Review Queue</Button>}
    >
      <SectionHeader title="Training uploads" description="Pick a training, then an athlete, then review their videos." />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr_1.5fr]">
        <Card className="border-border/70 bg-card/40">
          <CardHeader className="space-y-1">
            <div className="text-sm font-semibold text-muted-foreground">Trainings</div>
            <div className="text-xs text-muted-foreground">All sections with uploads.</div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <div className="text-sm text-muted-foreground">Loading trainings…</div>}
            {!isLoading && trainings.length === 0 && (
              <div className="text-sm text-muted-foreground">No uploads yet.</div>
            )}
            {trainings.map((training) => (
              <button
                key={training.id}
                type="button"
                onClick={() => setSelectedTrainingId(training.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                  training.id === selectedTrainingId
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border/60 bg-background/40 hover:border-primary/30"
                }`}
              >
                <div>
                  <div className="font-medium">{training.title}</div>
                  <div className="text-xs text-muted-foreground">{training.count} uploads</div>
                </div>
                {training.hasAwaiting ? <Badge variant="secondary">Awaiting</Badge> : <Badge>Reviewed</Badge>}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/40">
          <CardHeader className="space-y-1">
            <div className="text-sm font-semibold text-muted-foreground">Athletes</div>
            <div className="text-xs text-muted-foreground">Based on the selected training.</div>
          </CardHeader>
          <CardContent className="space-y-2">
            {!selectedTraining && <div className="text-sm text-muted-foreground">Select a training.</div>}
            {selectedTraining && athletes.length === 0 && (
              <div className="text-sm text-muted-foreground">No athletes yet.</div>
            )}
            {athletes.map((athlete) => (
              <button
                key={athlete.id}
                type="button"
                onClick={() => setSelectedAthleteId(athlete.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                  athlete.id === selectedAthleteId
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border/60 bg-background/40 hover:border-primary/30"
                }`}
              >
                <div>
                  <div className="font-medium">{athlete.name}</div>
                  <div className="text-xs text-muted-foreground">{athlete.count} uploads</div>
                </div>
                {athlete.awaiting > 0 ? <Badge variant="secondary">{athlete.awaiting} awaiting</Badge> : <Badge>Reviewed</Badge>}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/40">
          <CardHeader className="space-y-1">
            <div className="text-sm font-semibold text-muted-foreground">Videos</div>
            <div className="text-xs text-muted-foreground">
              {selectedTraining?.title ?? "Select a training"} · {selectedAthlete?.name ?? "Select an athlete"}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedAthlete && <div className="text-sm text-muted-foreground">Select an athlete.</div>}
            {selectedAthlete && athleteVideos.length === 0 && (
              <div className="text-sm text-muted-foreground">No uploads for this athlete yet.</div>
            )}
            {athleteVideos.map((video) => (
              <button
                key={video.id}
                type="button"
                onClick={() => {
                  setSelectedVideo(video);
                  setActiveDialog("review");
                }}
                className="flex w-full flex-col gap-2 rounded-2xl border border-border/60 bg-background/50 px-4 py-3 text-left shadow-sm transition hover:border-primary/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{video.topic}</div>
                  <Badge variant={video.status === "Reviewed" ? "default" : "secondary"}>{video.status}</Badge>
                </div>
                {video.feedback && (
                  <div className="text-xs text-muted-foreground line-clamp-2">Feedback: {video.feedback}</div>
                )}
                <div className="text-xs text-muted-foreground">
                  {video.createdAt ? new Date(video.createdAt).toLocaleString() : "Unknown time"}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

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
        onSendResponseVideo={async ({ athleteUserId, mediaUrl, uploadId }) => {
          await sendMessage({ userId: athleteUserId, contentType: "video", mediaUrl, videoUploadId: uploadId }).unwrap();
        }}
        isSendingResponse={isSendingResponse}
      />
    </AdminShell>
  );
}
