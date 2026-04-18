"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { useCreateMediaUploadUrlMutation } from "../../../lib/apiSlice";
import { toast } from "../../../lib/toast";

export type VideoReviewDialog = null | "review" | "queue";

type ApiErrorLike = {
  message?: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const e = error as ApiErrorLike;
    if (typeof e.message === "string") return e.message;
  }
  return fallback;
}

type VideoDialogsProps = {
  active: VideoReviewDialog;
  onClose: () => void;
  selectedVideo?: {
    id: number;
    athlete: string;
    topic: string;
    createdAt?: string | null;
    notes?: string | null;
    status: string;
    videoUrl?: string | null;
    feedback?: string | null;
    athleteUserId?: number | null;
    guardianUserId?: number | null;
  } | null;
  queueVideos?: {
    id: number;
    athlete: string;
    topic: string;
    status: string;
  }[];
  onSelectQueueVideo?: (video: {
    id: number;
    athlete: string;
    topic: string;
    status: string;
  }) => void;
  onSubmitReview?: (feedback: string) => void;
  onSendResponseVideo?: (payload: {
    recipientUserIds: number[];
    mediaUrl: string;
    uploadId: number;
  }) => Promise<void> | void;
  isSubmitting?: boolean;
  isSendingResponse?: boolean;
};

export function VideoDialogs({
  active,
  onClose,
  selectedVideo,
  queueVideos = [],
  onSelectQueueVideo,
  onSubmitReview,
  onSendResponseVideo,
  isSubmitting = false,
  isSendingResponse = false,
}: VideoDialogsProps) {
  const [feedback, setFeedback] = useState("");
  const [createUploadUrl] = useCreateMediaUploadUrlMutation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const livePreviewRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [responseUrl, setResponseUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedPreview, setRecordedPreview] = useState<string | null>(null);
  const [responseError, setResponseError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [hasLivePreview, setHasLivePreview] = useState(false);

  useEffect(() => {
    if (active === "review" && selectedVideo) {
      setFeedback(selectedVideo.feedback ?? "");
    }
  }, [active, selectedVideo]);

  useEffect(() => {
    if (active === "review") {
      setResponseError(null);
      setResponseUrl(null);
      setRecordedBlob(null);
      setRecordedPreview((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous);
        }
        return null;
      });
    }
  }, [active, selectedVideo?.id]);

  useEffect(() => {
    return () => {
      if (recordedPreview) {
        URL.revokeObjectURL(recordedPreview);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [recordedPreview]);

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (livePreviewRef.current) {
      livePreviewRef.current.srcObject = null;
    }
    setIsRecording(false);
    setHasLivePreview(false);
  };

  const getRecorderMimeType = () => {
    if (typeof MediaRecorder === "undefined") return "";
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    for (const candidate of candidates) {
      if (MediaRecorder.isTypeSupported(candidate)) {
        return candidate;
      }
    }
    return "";
  };

  const handleStartRecording = async () => {
    setResponseError(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setResponseError("Camera access is not supported in this browser.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setResponseError("Recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (livePreviewRef.current) {
        livePreviewRef.current.srcObject = stream;
        await livePreviewRef.current.play().catch(() => null);
      }
      setHasLivePreview(true);
      const mimeType = getRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, {
          type: recorder.mimeType || "video/webm",
        });
        setRecordedBlob(blob);
        if (recordedPreview) {
          URL.revokeObjectURL(recordedPreview);
        }
        setRecordedPreview(URL.createObjectURL(blob));
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (error: unknown) {
      setResponseError(getErrorMessage(error, "Unable to access camera."));
      stopRecording();
    }
  };

  const makeUniqueName = (originalName: string) => {
    const uploadPart = selectedVideo?.id
      ? `upload-${selectedVideo.id}`
      : "upload";
    const parts = originalName.split(".");
    const ext = parts.length > 1 ? parts.pop() : "mp4";
    const base = parts.join(".") || "coach-response";
    const safeBase = base
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    const timestamp = Date.now();
    return `${safeBase || "coach-response"}-${uploadPart}-${timestamp}.${ext}`;
  };

  const uploadBlob = async (blob: Blob, fileName: string) => {
    const maxSizeMb = 200;
    if (blob.size > maxSizeMb * 1024 * 1024) {
      setResponseError(`Video must be smaller than ${maxSizeMb}MB.`);
      return;
    }
    try {
      setIsUploading(true);
      setUploadProgress(0);
      const uniqueName = makeUniqueName(fileName);
	      const result = await createUploadUrl({
	        folder: "video-review/coach-response",
	        fileName: uniqueName,
	        contentType: blob.type || "application/octet-stream",
	        sizeBytes: blob.size,
	        client: "web",
	      }).unwrap();
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const next = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(next);
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error("Failed to upload video."));
          }
        };
        xhr.onerror = () => reject(new Error("Failed to upload video."));
        xhr.open("PUT", result.uploadUrl);
        xhr.setRequestHeader(
          "Content-Type",
          blob.type || "application/octet-stream",
        );
        xhr.send(blob);
      });
      setResponseUrl(result.publicUrl);
    } catch (err: unknown) {
      setResponseError(getErrorMessage(err, "Upload failed."));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handlePick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setResponseError(null);
    await uploadBlob(file, file.name);
  };

  const handleUploadRecording = async () => {
    if (!recordedBlob) {
      setResponseError("Record a video first.");
      return;
    }
    const mimeType = recordedBlob.type || "video/webm";
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const uploadPart = selectedVideo?.id
      ? `upload-${selectedVideo.id}`
      : "upload";
    await uploadBlob(
      recordedBlob,
      `coach-response-${uploadPart}-${Date.now()}.${ext}`,
    );
  };

  const handleMarkReviewed = async () => {
    const hasFeedback = feedback.trim().length > 0;
    const hasResponse = Boolean(responseUrl);
    if (!hasFeedback && !hasResponse) {
      setResponseError("Add feedback or upload a response video.");
      return;
    }

    const recipientUserIds = new Set<number>();
    if (selectedVideo?.athleteUserId) recipientUserIds.add(selectedVideo.athleteUserId);
    if (selectedVideo?.guardianUserId) recipientUserIds.add(selectedVideo.guardianUserId);
    if (hasResponse && recipientUserIds.size === 0) {
      setResponseError("No recipient user account found for this upload.");
      return;
    }
    try {
      setResponseError(null);
      if (hasResponse) {
        await onSendResponseVideo?.({
          recipientUserIds: Array.from(recipientUserIds),
          mediaUrl: responseUrl!,
          uploadId: selectedVideo!.id,
        });
      }
      const fallbackFeedback = hasFeedback
        ? feedback.trim()
        : "Coach sent a response video.";
      if (onSubmitReview) {
        await onSubmitReview(fallbackFeedback);
      }
      toast.success(
        "Marked reviewed",
        hasResponse
          ? "Response video sent to the athlete."
          : "Feedback submitted.",
      );
      setResponseUrl(null);
      setRecordedBlob(null);
      if (recordedPreview) {
        URL.revokeObjectURL(recordedPreview);
        setRecordedPreview(null);
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Failed to mark reviewed.");
      setResponseError(message);
      toast.error("Review failed", message);
    }
  };

  return (
    <Dialog open={active !== null} onOpenChange={onClose}>
      <DialogContent
        className={
          active === "review"
            ? "max-h-[92vh] max-w-6xl overflow-y-auto border-zinc-800 bg-zinc-950 p-0 text-zinc-50 lg:overflow-hidden"
            : "max-h-[85vh] overflow-y-auto"
        }
      >
        {active !== "review" ? (
          <DialogHeader>
            <DialogTitle>{active === "queue" && "Review Queue"}</DialogTitle>
            <DialogDescription>
              {selectedVideo
                ? `${selectedVideo.athlete} • ${selectedVideo.topic}`
                : "Review uploads in priority order."}
            </DialogDescription>
          </DialogHeader>
        ) : null}
        <div className={active === "review" ? "" : "mt-6 space-y-4"}>
          {active === "review" && selectedVideo ? (
            <>
              <div className="border-b border-zinc-800 bg-zinc-950/95 px-6 py-4">
                <DialogHeader className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <DialogTitle className="text-xl font-semibold text-white">
                      {selectedVideo.topic}
                    </DialogTitle>
                    <Badge
                      variant="outline"
                      className="border-zinc-700 bg-zinc-900 text-zinc-200"
                    >
                      {selectedVideo.status}
                    </Badge>
                  </div>
                  <DialogDescription className="text-sm text-zinc-400">
                    {selectedVideo.athlete}
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="grid gap-0 lg:h-[calc(92vh-88px)] lg:overflow-hidden lg:grid-cols-[minmax(0,1.2fr)_380px]">
                <div className="flex min-h-0 items-center justify-center bg-black p-4 sm:p-6">
                  {selectedVideo.videoUrl ? (
                    <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
                      <div className="aspect-video bg-black">
                        <video
                          className="h-full w-full bg-black object-contain"
                          src={selectedVideo.videoUrl}
                          controls
                          playsInline
                          preload="metadata"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex aspect-video w-full max-w-4xl items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900 text-sm text-zinc-400">
                      Video Preview
                    </div>
                  )}
                </div>
                <div className="min-h-0 overflow-y-auto border-t border-zinc-800 bg-zinc-950/80 p-5 lg:border-l lg:border-t-0">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-zinc-100">
                          Upload Details
                        </span>
                        <Badge
                          variant="outline"
                          className="border-zinc-700 bg-zinc-950 text-zinc-300"
                        >
                          {selectedVideo.status}
                        </Badge>
                      </div>
                      <div className="mt-3 space-y-2 text-zinc-300">
                        <p>
                          {selectedVideo.createdAt
                            ? new Date(selectedVideo.createdAt).toLocaleString()
                            : "Unknown time"}
                        </p>
                        <p>
                          {selectedVideo.notes?.trim?.()
                            ? selectedVideo.notes
                            : "No notes provided."}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-4 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-zinc-100">
                          Coach Feedback
                        </span>
                      </div>
                      <Textarea
                        placeholder="Write coach feedback..."
                        value={feedback}
                        onChange={(event) => setFeedback(event.target.value)}
                        className="mt-3 min-h-24 border-zinc-700 bg-zinc-950 text-zinc-100 placeholder:text-zinc-500"
                      />
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-4 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-zinc-100">
                          Coach Response Video
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handlePick}
                            disabled={isUploading || isRecording}
                          >
                            Upload Video
                          </Button>
                          {isRecording ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={stopRecording}
                            >
                              Stop Recording
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleStartRecording}
                              disabled={isUploading}
                            >
                              Record Video
                            </Button>
                          )}
                        </div>
                      </div>
                      <input
                        ref={inputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="mt-3 space-y-3">
                        {responseError ? (
                          <p className="text-xs text-red-400">
                            {responseError}
                          </p>
                        ) : null}
                        {isUploading ? (
                          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        ) : null}
                        <div className="space-y-2">
                          <div className="text-xs text-zinc-500">
                            Live Preview
                          </div>
                          <div className="relative">
                            <video
                              ref={livePreviewRef}
                              className="aspect-video w-full rounded-2xl border border-zinc-800 bg-black object-cover"
                              muted
                              playsInline
                              autoPlay
                            />
                            {!hasLivePreview ? (
                              <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/70 text-xs text-zinc-500">
                                Start recording to see live camera
                              </div>
                            ) : null}
                          </div>
                        </div>
                        {recordedPreview ? (
                          <div className="space-y-2">
                            <video
                              className="aspect-video w-full rounded-2xl border border-zinc-800 bg-black object-contain"
                              src={recordedPreview}
                              controls
                              muted
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleUploadRecording}
                                disabled={isUploading}
                              >
                                Upload Recording
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setRecordedBlob(null);
                                  if (recordedPreview) {
                                    URL.revokeObjectURL(recordedPreview);
                                  }
                                  setRecordedPreview(null);
                                }}
                              >
                                Remove Recording
                              </Button>
                            </div>
                          </div>
                        ) : null}
                        {responseUrl ? (
                          <div className="space-y-2">
                            <video
                              className="aspect-video w-full rounded-2xl border border-zinc-800 bg-black object-contain"
                              src={responseUrl}
                              controls
                              muted
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  setResponseUrl(null);
                                }}
                              >
                                Remove Upload
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <Input
                      placeholder="Status"
                      value={`Status: ${selectedVideo.status}`}
                      readOnly
                      className="border-zinc-700 bg-zinc-950 text-zinc-100"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={onClose}>
                        Save Draft
                      </Button>
                      <Button
                        onClick={handleMarkReviewed}
                        disabled={
                          isSubmitting ||
                          isSendingResponse ||
                          (feedback.trim().length === 0 && !responseUrl)
                        }
                      >
                        Mark Reviewed
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
          {active === "queue" ? (
            <div className="space-y-2">
              {queueVideos.length === 0 ? (
                <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
                  No pending videos in the queue.
                </div>
              ) : (
                queueVideos.map((video) => (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => onSelectQueueVideo?.(video)}
                    className="flex w-full items-center justify-between rounded-2xl border border-border bg-secondary/30 px-4 py-3 text-left text-sm transition hover:border-primary/40 hover:bg-secondary/50"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">
                        {video.athlete}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {video.topic}
                      </p>
                    </div>
                    <Badge
                      variant={
                        video.status === "Priority" ? "primary" : "outline"
                      }
                    >
                      {video.status}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
