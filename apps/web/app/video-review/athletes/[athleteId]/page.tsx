"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { AdminShell } from "../../../../components/admin/shell";
import { SectionHeader } from "../../../../components/admin/section-header";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../../components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../../../../components/ui/tabs";
import { VideoDialogs, type VideoReviewDialog } from "../../../../components/admin/video-review/video-dialogs";
import { useGetVideoUploadsQuery, useReviewVideoUploadMutation, useSendMessageMutation } from "../../../../lib/apiSlice";

const SECTION_TABS = [
  { value: "all", label: "All" },
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
  athleteUserId: number | null;
  status: string;
  topic: string;
  sectionType: string;
  videoUrl?: string | null;
  notes?: string | null;
  feedback?: string | null;
  createdAt?: string | null;
};

type RawVideoUpload = {
  id: number;
  athleteId?: number | null;
  athleteName?: string | null;
  athleteUserId?: number | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
  programSectionType?: string | null;
  programSectionTitle?: string | null;
  videoUrl?: string | null;
  notes?: string | null;
  feedback?: string | null;
};

export default function AthleteVideoHistoryPage() {
  const router = useRouter();
  const params = useParams<{ athleteId: string }>();
  const searchParams = useSearchParams();
  const athleteId = Number(params.athleteId);
  const initialTab = searchParams.get("tab") ?? "all";
  const [activeTab, setActiveTab] = useState<string>(SECTION_TABS.some((t) => t.value === initialTab) ? initialTab : "all");

  const { data: videosData, isLoading, refetch } = useGetVideoUploadsQuery();
  const [reviewVideo, { isLoading: isSubmitting }] = useReviewVideoUploadMutation();
  const [sendMessage, { isLoading: isSendingResponse }] = useSendMessageMutation();
  const [activeDialog, setActiveDialog] = useState<VideoReviewDialog>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  const videos = useMemo<VideoItem[]>(() => {
    const items: RawVideoUpload[] = Array.isArray(videosData?.items) ? videosData.items : [];
    return items
      .filter((item) => Number(item.athleteId) === athleteId)
      .map((item) => {
        const reviewed = Boolean(item.reviewedAt);
        const status = reviewed ? "Reviewed" : "Awaiting";
        const sectionType = item.programSectionType ?? "program";
        const sectionTitle = item.programSectionTitle ?? null;
        const topic = sectionTitle ?? "Video upload";
        return {
          id: item.id,
          athlete: item.athleteName ?? "Athlete",
          athleteUserId: item.athleteUserId ?? null,
          status,
          topic,
          sectionType,
          videoUrl: item.videoUrl ?? null,
          notes: item.notes ?? null,
          feedback: item.feedback ?? null,
          createdAt: item.createdAt ?? null,
        };
      });
  }, [videosData, athleteId]);

  const athleteName = videos[0]?.athlete ?? `Athlete #${Number.isFinite(athleteId) ? athleteId : "?"}`;

  const filteredVideos = useMemo(() => {
    if (activeTab === "all") return videos;
    return videos.filter((v) => v.sectionType === activeTab);
  }, [activeTab, videos]);

  return (
    <AdminShell
      title={athleteName}
      subtitle="Upload history + coach responses."
      actions={
        <Button variant="outline" onClick={() => router.push("/video-review")}>
          Back
        </Button>
      }
    >
      <SectionHeader title="Uploads" description="Click a video to review, respond, and mark as reviewed." />

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
        {isLoading && <div className="text-sm text-muted-foreground">Loading uploads…</div>}
        {!isLoading && filteredVideos.length === 0 && (
          <div className="text-sm text-muted-foreground">No uploads in this view yet.</div>
        )}
        {filteredVideos.map((video) => (
          <Card key={video.id} className="border-border/70">
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">{video.topic}</div>
                  <div className="text-xs text-muted-foreground">
                    {video.createdAt ? new Date(video.createdAt).toLocaleString() : "Unknown time"}
                  </div>
                </div>
                <Badge variant={video.status === "Reviewed" ? "default" : "accent"}>{video.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="min-w-0 text-xs text-muted-foreground line-clamp-2">
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
        queueVideos={filteredVideos}
        onSelectQueueVideo={(video) => {
          const selected = filteredVideos.find((item) => item.id === video.id) ?? null;
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
