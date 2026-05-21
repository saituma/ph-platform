"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Footprints, Send } from "lucide-react";

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

type RunConfig = {
  runType?: string;
  distanceMeters?: number;
  surface?: string;
  targetPace?: string;
  intervals?: Array<{ distanceMeters?: number; durationSeconds?: number; restSeconds?: number; targetPace?: string }>;
} | null;

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
  notes?: string | null;
  feedback?: string | null;
  runConfig?: RunConfig;
  exerciseName?: string | null;
  exerciseCategory?: string | null;
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
  notes?: string | null;
  feedback?: string | null;
  sectionKey: string;
  runConfig?: RunConfig;
  exerciseName?: string | null;
  exerciseCategory?: string | null;
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

function isImageUrl(url: string) {
  const clean = url.split("?")[0].toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|heic|heif)$/.test(clean);
}

function formatDistance(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

function formatRunType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function uploadVideoToR2(
  file: File,
  presign: ReturnType<typeof useCreateMediaUploadUrlMutation>[0],
) {
  const result = await presign({
    folder: "training-videos",
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
        notes: item.notes ?? null,
        feedback: item.feedback ?? "",
        sectionKey: toSessionKey(item),
        runConfig: item.runConfig ?? null,
        exerciseName: item.exerciseName ?? null,
        exerciseCategory: item.exerciseCategory ?? null,
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

        {videos.map((item) => {
          const isRun = item.exerciseCategory === "cardio_run" || !!item.runConfig;
          const rc = item.runConfig;
          return (
          <Card key={`${item.source}-${item.id}`} className={`border-border/70 ${isRun ? "border-orange-500/40" : ""}`}>
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isRun && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-600">
                        <Footprints className="h-3 w-3" />
                        Run
                      </span>
                    )}
                    <p className="text-base font-semibold">{item.athlete}</p>
                  </div>
                  {item.exerciseName && (
                    <p className="text-xs text-muted-foreground">{item.exerciseName}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Unknown time"}
                  </p>
                </div>
                <Badge variant={item.status === "Reviewed" ? "default" : "secondary"}>
                  {item.status}
                </Badge>
              </div>

              {isRun && rc && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {rc.runType && (
                    <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                      {formatRunType(rc.runType)}
                    </span>
                  )}
                  {rc.distanceMeters && (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {formatDistance(rc.distanceMeters)}
                    </span>
                  )}
                  {rc.surface && (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground capitalize">
                      {rc.surface}
                    </span>
                  )}
                  {rc.targetPace && (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {rc.targetPace} /km
                    </span>
                  )}
                </div>
              )}

              {isRun && rc?.intervals && rc.intervals.length > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-900/40 dark:bg-orange-950/20">
                  <p className="mb-1.5 text-xs font-semibold text-orange-700 dark:text-orange-400">
                    Intervals ({rc.intervals.length})
                  </p>
                  <div className="space-y-1">
                    {rc.intervals.map((iv, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground flex gap-3">
                        <span>#{idx + 1}</span>
                        {iv.distanceMeters && <span>{formatDistance(iv.distanceMeters)}</span>}
                        {iv.durationSeconds && <span>{Math.floor(iv.durationSeconds / 60)}:{String(iv.durationSeconds % 60).padStart(2, "0")}</span>}
                        {iv.restSeconds && <span>Rest {iv.restSeconds}s</span>}
                        {iv.targetPace && <span>{iv.targetPace}/km</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {item.notes && (
                <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground italic">
                  "{item.notes}"
                </div>
              )}

              {item.videoUrl ? (
                isImageUrl(item.videoUrl) ? (
                  <div className="overflow-hidden rounded-xl border">
                    <img
                      src={item.videoUrl}
                      alt={`${item.athlete}'s run photo`}
                      className="w-full max-h-[480px] object-contain bg-black"
                    />
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border bg-black">
                    <video src={item.videoUrl} controls playsInline className="aspect-video w-full" />
                  </div>
                )
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No media uploaded
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
          );
        })}
      </div>
    </AdminShell>
  );
}
