"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Camera, Send, Trash2, X } from "lucide-react";

import { AdminShell } from "../../../../../components/admin/shell";
import { SectionHeader } from "../../../../../components/admin/section-header";
import { Badge } from "../../../../../components/ui/badge";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../../../components/ui/card";
import { Textarea } from "../../../../../components/ui/textarea";
import { getOrCreateAdminSocket } from "../../../../../lib/admin-socket";
import {
  useGetAthleteDetailQuery,
  useCreateMediaUploadUrlMutation,
  useGetVideoUploadsQuery,
  useReviewVideoUploadMutation,
  useSendMessageMutation,
  useSetProgramSessionCoachResponseMutation,
} from "../../../../../lib/apiSlice";

type RawVideoUpload = {
  id: number;
  source?: "video_upload" | "program_completion";
  programSessionCompletionId?: number | null;
  athleteId?: number | null;
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
  return item.trainingSessionTitle ?? item.programSectionTitle ?? item.sectionTitle ?? "Session Uploads";
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
  onProgress?: (percent: number) => void,
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
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      onProgress?.(percent);
    };
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

export default function AthleteSessionVideosDetailPage() {
  const router = useRouter();
  const params = useParams<{ athleteId: string; sessionKey: string }>();
  const athleteId = Number(params.athleteId);
  const decodedSessionKey = decodeURIComponent(params.sessionKey);
  const normalizedSessionKey =
    decodedSessionKey === "program::Session Uploads"
      ? "program::General Uploads"
      : decodedSessionKey;

  const { data: athleteDetailData } = useGetAthleteDetailQuery(
    { athleteId },
    { skip: !Number.isFinite(athleteId) || athleteId <= 0 },
  );
  const { data, isLoading, refetch } = useGetVideoUploadsQuery({ limit: 200 });
  const [reviewVideo, { isLoading: isSavingReview }] = useReviewVideoUploadMutation();
  const [setProgramSessionCoachResponse, { isLoading: isSavingProgramReview }] =
    useSetProgramSessionCoachResponseMutation();
  const [sendMessage, { isLoading: isSendingMessage }] = useSendMessageMutation();
  const [createMediaUploadUrl, { isLoading: isPresigning }] = useCreateMediaUploadUrlMutation();

  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<number, string>>({});
  const [uploadingForId, setUploadingForId] = useState<number | null>(null);
  const [recordingForId, setRecordingForId] = useState<number | null>(null);
  const [recordedForId, setRecordedForId] = useState<number | null>(null);
  const [recordedPreviewUrl, setRecordedPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const livePreviewRef = useRef<HTMLVideoElement | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const directCaptureInputRef = useRef<HTMLInputElement | null>(null);
  const [captureTargetItemId, setCaptureTargetItemId] = useState<number | null>(null);
  const [recordingModalForId, setRecordingModalForId] = useState<number | null>(null);
  const [previewModalForId, setPreviewModalForId] = useState<number | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [transferStateById, setTransferStateById] = useState<
    Record<number, { stage: "idle" | "uploading" | "sending" | "done" | "error"; progress: number; sentUrl?: string }>
  >({});
  const [livePatchById, setLivePatchById] = useState<
    Record<number, Partial<Pick<VideoItem, "status" | "feedback" | "createdAt" | "videoUrl">>>
  >({});

  const videos = useMemo<VideoItem[]>(() => {
    const items: RawVideoUpload[] = Array.isArray(data?.items) ? data.items : [];
    return items
      .filter((item) => Number(item.athleteId) === athleteId)
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
      .filter(
        (item) =>
          item.sectionKey === decodedSessionKey ||
          item.sectionKey === normalizedSessionKey,
      )
      .sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });
  }, [data, athleteId, decodedSessionKey]);

  const fallbackVideos = useMemo<VideoItem[]>(() => {
    const athlete = athleteDetailData?.athlete;
    const uploads = Array.isArray(athlete?.videoUploads) ? athlete.videoUploads : [];
    return uploads
      .map((item: any) => {
        const label = item?.sessionTitle ?? "Session Uploads";
        const key = `program::${label}`;
        return {
          id: Number(item.id),
          source: item?.sessionTitle ? ("program_completion" as const) : ("video_upload" as const),
          completionId: item?.sessionTitle ? Number(item.id) : null,
          athlete: athlete?.name ?? "Athlete",
          athleteUserId: athlete?.userId ?? null,
          guardianUserId: null,
          status: item?.reviewedAt ? ("Reviewed" as const) : ("Awaiting" as const),
          createdAt: item?.createdAt ?? null,
          videoUrl: item?.videoUrl ?? null,
          feedback: item?.feedback ?? "",
          sectionKey: key,
        } satisfies VideoItem;
      })
      .filter(
        (item: VideoItem) =>
          item.sectionKey === decodedSessionKey ||
          item.sectionKey === normalizedSessionKey,
      )
      .sort((a: VideoItem, b: VideoItem) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });
  }, [athleteDetailData, decodedSessionKey, normalizedSessionKey]);

  const baseDisplayVideos = videos.length > 0 ? videos : fallbackVideos;
  const displayVideos = useMemo(
    () =>
      baseDisplayVideos.map((item) => ({
        ...item,
        ...(livePatchById[item.id] ?? {}),
      })),
    [baseDisplayVideos, livePatchById],
  );

  useEffect(() => {
    if (recordingModalForId === null) return;
    const stream = streamRef.current;
    const videoEl = livePreviewRef.current;
    if (!stream || !videoEl) return;
    videoEl.srcObject = stream;
    void videoEl.play().catch(() => null);
  }, [recordingModalForId]);

  useEffect(() => {
    const socket = getOrCreateAdminSocket();
    const refresh = () => void refetch();
    const onVideoReviewed = (payload: any) => {
      const id = Number(payload?.id);
      if (!Number.isFinite(id)) return;
      setLivePatchById((prev) => ({
        ...prev,
        [id]: {
          status: "Reviewed",
          feedback:
            typeof payload?.feedback === "string" ? payload.feedback : prev[id]?.feedback,
        },
      }));
    };
    const onCoachResponse = (payload: any) => {
      const completionId = Number(payload?.completionId);
      if (!Number.isFinite(completionId)) return;
      setLivePatchById((prev) => ({
        ...prev,
        [completionId]: {
          status: "Reviewed",
          feedback:
            typeof payload?.coachResponse === "string"
              ? payload.coachResponse
              : prev[completionId]?.feedback,
        },
      }));
    };
    socket.on("video:new", refresh);
    socket.on("video:reviewed", onVideoReviewed);
    socket.on("program:session:submitted", refresh);
    socket.on("program:session:coach-response", onCoachResponse);
    socket.on("connect", refresh);
    return () => {
      socket.off("video:new", refresh);
      socket.off("video:reviewed", onVideoReviewed);
      socket.off("program:session:submitted", refresh);
      socket.off("program:session:coach-response", onCoachResponse);
      socket.off("connect", refresh);
    };
  }, [refetch]);

  const athleteName = displayVideos[0]?.athlete ?? `Athlete #${athleteId}`;
  const sessionLabel = decodedSessionKey.split("::")[1] ?? "Session";

  const saveFeedback = async (item: VideoItem) => {
    const feedback = (feedbackDrafts[item.id] ?? item.feedback ?? "").trim();
    if (!feedback) return;
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
    await refetch();
  };

  const sendCoachVideo = async (item: VideoItem, file: File) => {
    setUploadingForId(item.id);
    setSendError(null);
    setTransferStateById((prev) => ({
      ...prev,
      [item.id]: { stage: "uploading", progress: 0 },
    }));
    try {
      const mediaUrl = await uploadVideoToR2(file, createMediaUploadUrl, (progress) => {
        setTransferStateById((prev) => ({
          ...prev,
          [item.id]: { ...(prev[item.id] ?? { stage: "uploading", progress: 0 }), stage: "uploading", progress },
        }));
      });
      setTransferStateById((prev) => ({
        ...prev,
        [item.id]: { ...(prev[item.id] ?? { progress: 100 }), stage: "sending", progress: 100 },
      }));
      const recipients = [item.athleteUserId, item.guardianUserId].filter(
        (v): v is number => Number.isFinite(v as number),
      );
      if (recipients.length === 0) {
        throw new Error("No recipient account linked to this athlete.");
      }
      await Promise.all(
        recipients.map((userId) =>
          sendMessage({
            userId,
            contentType: "video",
            mediaUrl,
            ...(item.source === "video_upload" ? { videoUploadId: item.id } : {}),
          }).unwrap(),
        ),
      );
      setTransferStateById((prev) => ({
        ...prev,
        [item.id]: { stage: "done", progress: 100, sentUrl: mediaUrl },
      }));
      setPreviewModalForId(null);
    } catch (error: any) {
      setSendError(error?.data?.error || error?.message || "Failed to send captured video.");
      setTransferStateById((prev) => ({
        ...prev,
        [item.id]: { ...(prev[item.id] ?? { progress: 0 }), stage: "error", progress: prev[item.id]?.progress ?? 0 },
      }));
    } finally {
      setUploadingForId(null);
    }
  };

  const startCameraRecording = async (itemId: number) => {
    setCameraError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not available in this browser.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setCameraError("Video recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (livePreviewRef.current) {
        livePreviewRef.current.srcObject = stream;
        await livePreviewRef.current.play().catch(() => null);
      }
      chunksRef.current = [];
      const preferredMimeTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ];
      const mimeType = preferredMimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        setRecordedBlob(blob);
        if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl);
        setRecordedPreviewUrl(URL.createObjectURL(blob));
        setRecordedForId(itemId);
        setPreviewModalForId(itemId);
      };
      recorder.start();
      setRecordingForId(itemId);
      setRecordingModalForId(itemId);
    } catch (error: any) {
      setCameraError(error?.message || "Unable to start camera recording.");
    }
  };

  const stopCameraRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (livePreviewRef.current) {
      livePreviewRef.current.srcObject = null;
    }
    setRecordingForId(null);
    setRecordingModalForId(null);
  };

  const cancelCameraRecording = () => {
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
    } catch {
      // no-op
    }
    recorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (livePreviewRef.current) {
      livePreviewRef.current.srcObject = null;
    }
    setRecordingForId(null);
    setRecordingModalForId(null);
  };

  const removeRecordedVideo = () => {
    setRecordedBlob(null);
    setRecordedForId(null);
    if (recordedPreviewUrl) {
      URL.revokeObjectURL(recordedPreviewUrl);
    }
    setRecordedPreviewUrl(null);
    setPreviewModalForId(null);
  };

  const sendRecordedVideo = async (item: VideoItem) => {
    if (!recordedBlob) return;
    const file = new File([recordedBlob], `coach-response-${Date.now()}.webm`, {
      type: recordedBlob.type || "video/webm",
    });
    await sendCoachVideo(item, file);
  };

  const handleDirectCaptureFile = async (file: File | null) => {
    if (!file || !captureTargetItemId) return;
    const target = displayVideos.find((v) => v.id === captureTargetItemId);
    if (!target) return;
    await sendCoachVideo(target, file);
  };

  return (
    <AdminShell
      title={athleteName}
      subtitle={`Session: ${sessionLabel}`}
      actions={
        <Button variant="outline" onClick={() => router.push(`/athletes/${athleteId}`)}>
          Back to Athlete
        </Button>
      }
    >
      <SectionHeader title="Session Videos" description="Review and respond here. No separate communication page." />

      <div className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading videos…</p>}
        {!isLoading && displayVideos.length === 0 && (
          <p className="text-sm text-muted-foreground">No videos found for this session.</p>
        )}
        {sendError && (
          <p className="text-sm text-red-500">{sendError}</p>
        )}

        {displayVideos.map((item) => (
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
                {transferStateById[item.id]?.stage === "uploading" && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Uploading... {transferStateById[item.id]?.progress ?? 0}%
                    </p>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${transferStateById[item.id]?.progress ?? 0}%` }}
                      />
                    </div>
                  </div>
                )}
                {transferStateById[item.id]?.stage === "sending" && (
                  <p className="text-xs text-muted-foreground">Upload complete. Sending to athlete...</p>
                )}
                {transferStateById[item.id]?.stage === "done" && transferStateById[item.id]?.sentUrl && (
                  <div className="rounded-md border bg-muted/40 p-2">
                    <p className="text-xs text-green-600">Coach video sent successfully.</p>
                    <video
                      src={transferStateById[item.id]?.sentUrl}
                      controls
                      playsInline
                      className="mt-2 h-24 rounded-md border bg-black"
                    />
                  </div>
                )}
                {transferStateById[item.id]?.stage === "error" && (
                  <p className="text-xs text-red-500">Upload/send failed. Please try again.</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => void startCameraRecording(item.id)}>
                    <Camera className="mr-2 h-4 w-4" />
                    Capture from Camera
                  </Button>
                  {recordedForId === item.id && recordedPreviewUrl && (
                    <>
                      <Button type="button" onClick={() => setPreviewModalForId(item.id)}>
                        Preview Captured Video
                      </Button>
                      <Button type="button" variant="destructive" onClick={removeRecordedVideo}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Captured Video
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCaptureTargetItemId(item.id);
                      directCaptureInputRef.current?.click();
                    }}
                  >
                    Use Device Camera
                  </Button>
                </div>
                {cameraError && (
                  <p className="text-xs text-red-500">{cameraError}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {recordingModalForId !== null && (
        <div className="fixed inset-0 z-50 bg-black">
          <div className="absolute inset-0">
            <video ref={livePreviewRef} muted playsInline className="h-full w-full object-cover" />
          </div>
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <p className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
              Recording in progress
            </p>
            <Button type="button" variant="outline" className="bg-white/90" onClick={cancelCameraRecording}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
          <div className="absolute bottom-6 left-0 right-0 flex justify-center">
            <Button type="button" className="rounded-full px-8" onClick={stopCameraRecording}>
              Stop Recording
            </Button>
          </div>
        </div>
      )}

      {previewModalForId !== null && recordedPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Preview Captured Video</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewModalForId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <video src={recordedPreviewUrl} controls playsInline className="aspect-video w-full rounded-xl bg-black" />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={
                  uploadingForId === previewModalForId ||
                  transferStateById[previewModalForId]?.stage === "uploading" ||
                  transferStateById[previewModalForId]?.stage === "sending"
                }
                onClick={() => {
                  const item = displayVideos.find((v) => v.id === previewModalForId);
                  if (!item) return;
                  void sendRecordedVideo(item);
                }}
              >
                {transferStateById[previewModalForId]?.stage === "uploading"
                  ? `Uploading ${transferStateById[previewModalForId]?.progress ?? 0}%`
                  : transferStateById[previewModalForId]?.stage === "sending"
                    ? "Sending..."
                    : "Send Captured Video"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setPreviewModalForId(null)}>
                Close Preview
              </Button>
              <Button type="button" variant="destructive" onClick={removeRecordedVideo}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Captured Video
              </Button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={directCaptureInputRef}
        type="file"
        accept="video/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          void handleDirectCaptureFile(file);
          e.currentTarget.value = "";
        }}
      />
    </AdminShell>
  );
}
