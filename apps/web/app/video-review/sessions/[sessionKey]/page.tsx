"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Send } from "lucide-react";

import { toast } from "../../../../lib/toast";
import { AdminShell } from "../../../../components/admin/shell";
import { SectionHeader } from "../../../../components/admin/section-header";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../../components/ui/card";
import { Textarea } from "../../../../components/ui/textarea";
import {
  useCreateMediaUploadUrlMutation,
  useGetVideoUploadsQuery,
  useReviewVideoUploadMutation,
  useSendMessageMutation,
  useSetProgramSessionCoachResponseMutation,
} from "../../../../lib/apiSlice";

type RawVideoUpload = {
  id: number;
  source?: "video_upload" | "program_completion";
  programSessionCompletionId?: number | null;
  athleteName?: string | null;
  athleteUserId?: number | null;
  guardianUserId?: number | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
  programSectionType?: string | null;
  programSectionTitle?: string | null;
  trainingSessionTitle?: string | null;
  sectionTitle?: string | null;
  videoUrl?: string | null;
  feedback?: string | null;
};

type VideoItem = {
  id: number;
  source: "video_upload" | "program_completion";
  completionId: number | null;
  athlete: string;
  athleteUserId: number | null;
  guardianUserId: number | null;
  status: "Reviewed" | "Awaiting";
  createdAt?: string | null;
  videoUrl?: string | null;
  feedback?: string | null;
  sectionKey: string;
};

function toSessionLabel(item: RawVideoUpload) {
  return item.trainingSessionTitle ?? item.programSectionTitle ?? item.sectionTitle ?? "General Uploads";
}

function toSessionType(item: RawVideoUpload) {
  return item.programSectionType ?? "program";
}

function toSessionKey(item: RawVideoUpload) {
  return `${toSessionType(item)}::${toSessionLabel(item)}`;
}

async function uploadVideoToR2(
  file: File,
  presign: ReturnType<typeof useCreateMediaUploadUrlMutation>[0],
) {
  const result = await presign({
    folder: "video-review/coach-response",
    fileName: `coach-response-${Date.now()}-${file.name}`,
    contentType: file.type || "video/mp4",
    sizeBytes: file.size,
    client: "web",
  }).unwrap();

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error("Upload failed"));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.open("PUT", result.uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
    xhr.send(file);
  });

  return result.publicUrl;
}

export default function VideoReviewSessionDetailPage() {
  const router = useRouter();
  const params = useParams<{ sessionKey: string }>();
  const decodedSessionKey = decodeURIComponent(params.sessionKey);

  const { data, isLoading, refetch } = useGetVideoUploadsQuery();
  const [reviewVideo, { isLoading: isSavingReview }] = useReviewVideoUploadMutation();
  const [setProgramSessionCoachResponse, { isLoading: isSavingProgramReview }] =
    useSetProgramSessionCoachResponseMutation();
  const [sendMessage, { isLoading: isSendingMessage }] = useSendMessageMutation();
  const [createMediaUploadUrl, { isLoading: isPresigning }] = useCreateMediaUploadUrlMutation();

  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<number, string>>({});
  const [uploadingForId, setUploadingForId] = useState<number | null>(null);

  const videos = useMemo<VideoItem[]>(() => {
    const items: RawVideoUpload[] = Array.isArray(data?.items) ? data.items : [];
    return items
      .map((item) => ({
        id: item.id,
        source: item.source ?? "video_upload",
        completionId: item.programSessionCompletionId ?? null,
        athlete: item.athleteName ?? "Athlete",
        athleteUserId: item.athleteUserId ?? null,
        guardianUserId: item.guardianUserId ?? null,
        status: item.reviewedAt ? ("Reviewed" as const) : ("Awaiting" as const),
        createdAt: item.createdAt ?? null,
        videoUrl: item.videoUrl ?? null,
        feedback: item.feedback ?? "",
        sectionKey: toSessionKey(item),
      }))
      .filter((item: VideoItem) => item.sectionKey === decodedSessionKey)
      .sort((a: VideoItem, b: VideoItem) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });
  }, [data, decodedSessionKey]);

  const sessionLabel = decodedSessionKey.split("::")[1] ?? "Session";

  const saveFeedback = async (item: VideoItem) => {
    const feedback = (feedbackDrafts[item.id] ?? item.feedback ?? "").trim();
    if (!feedback) return;
    try {
      if (item.source === "program_completion" && item.completionId) {
        await setProgramSessionCoachResponse({
          completionId: item.completionId,
          coachResponse: feedback,
        }).unwrap();
      } else {
        await reviewVideo({
          uploadId: item.id,
          feedback,
        }).unwrap();
      }
      toast.success("Response sent", "Your feedback has been sent to the athlete.");
      await refetch();
    } catch {
      toast.error("Failed to save", "Could not send your response. Please try again.");
    }
  };

  const sendCoachVideo = async (item: VideoItem, file: File) => {
    setUploadingForId(item.id);
    try {
      const mediaUrl = await uploadVideoToR2(file, createMediaUploadUrl);
      const recipients = [item.athleteUserId, item.guardianUserId].filter(
        (v): v is number => Number.isFinite(v as number),
      );
      await Promise.all(
        recipients.map((userId) =>
          sendMessage({
            userId,
            contentType: "video",
            mediaUrl,
            videoUploadId: item.id,
          }).unwrap(),
        ),
      );
      toast.success("Video sent", "Coach video response sent to the athlete.");
    } catch {
      toast.error("Upload failed", "Could not send the video response. Please try again.");
    } finally {
      setUploadingForId(null);
    }
  };

  return (
    <AdminShell
      title={sessionLabel}
      subtitle="Uploaded videos and coach response."
      actions={
        <Button variant="outline" onClick={() => router.push("/video-review")}>
          Back to Sessions
        </Button>
      }
    >
      <SectionHeader title="Session Videos" description="Inline video player. Respond without leaving this page." />

      <div className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading videos…</p>}
        {!isLoading && videos.length === 0 && (
          <p className="text-sm text-muted-foreground">No videos found for this session.</p>
        )}

        {videos.map((item) => (
          <Card key={`${item.source}-${item.id}`} className="border-border/70">
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-semibold">{item.athlete}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Unknown time"}
                  </p>
                </div>
                <Badge variant={item.status === "Reviewed" ? "default" : "secondary"}>
                  {item.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {item.videoUrl ? (
                <div className="overflow-hidden rounded-xl border bg-black">
                  <video src={item.videoUrl} controls playsInline className="aspect-video w-full" />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No video URL
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Coach Response
                </label>
                <Textarea
                  value={feedbackDrafts[item.id] ?? item.feedback ?? ""}
                  onChange={(e) =>
                    setFeedbackDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                  placeholder="Write coach response..."
                  rows={4}
                />
                <Button
                  onClick={() => saveFeedback(item)}
                  disabled={isSavingReview || isSavingProgramReview}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Save Response
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Upload Coach Video Response
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      void sendCoachVideo(item, file);
                      e.currentTarget.value = "";
                    }}
                  />
                  {(uploadingForId === item.id || isSendingMessage || isPresigning) && (
                    <span className="text-xs text-muted-foreground">Uploading/sending…</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
