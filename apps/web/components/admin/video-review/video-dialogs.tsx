"use client";

import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { useCreateMediaUploadUrlMutation } from "../../../lib/apiSlice";
import { toast } from "../../../lib/toast";

export type VideoReviewDialog = null | "review" | "queue";

type VideoDialogsProps = {
  active: VideoReviewDialog;
  onClose: () => void;
  selectedVideo?: {
    id: number;
    athlete: string;
    topic: string;
    status: string;
    videoUrl?: string | null;
    feedback?: string | null;
    athleteUserId?: number | null;
  } | null;
  queueVideos?: {
    id: number;
    athlete: string;
    topic: string;
    status: string;
  }[];
  onSelectQueueVideo?: (video: { id: number; athlete: string; topic: string; status: string }) => void;
  onSubmitReview?: (feedback: string) => void;
  onSendResponseVideo?: (payload: { athleteUserId: number; mediaUrl: string; uploadId: number }) => Promise<void> | void;
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
      if (recordedPreview) {
        URL.revokeObjectURL(recordedPreview);
        setRecordedPreview(null);
      }
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
    const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
    for (const candidate of candidates) {
      if (MediaRecorder.isTypeSupported(candidate)) {
        return candidate;
      }
    }
    return "";
  };

  const handleStartRecording = async () => {
    setResponseError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setResponseError("Camera access is not supported in this browser.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setResponseError("Recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (livePreviewRef.current) {
        livePreviewRef.current.srcObject = stream;
        await livePreviewRef.current.play().catch(() => null);
      }
      setHasLivePreview(true);
      const mimeType = getRecorderMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
        setRecordedBlob(blob);
        if (recordedPreview) {
          URL.revokeObjectURL(recordedPreview);
        }
        setRecordedPreview(URL.createObjectURL(blob));
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (error: any) {
      setResponseError(error?.message ?? "Unable to access camera.");
      stopRecording();
    }
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
      const result = await createUploadUrl({
        folder: "video-review/coach-response",
        fileName,
        contentType: blob.type || "application/octet-stream",
        sizeBytes: blob.size,
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
        xhr.setRequestHeader("Content-Type", blob.type || "application/octet-stream");
        xhr.send(blob);
      });
      setResponseUrl(result.publicUrl);
    } catch (err: any) {
      setResponseError(err?.message ?? "Upload failed.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handlePick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
    await uploadBlob(recordedBlob, `coach-response-${Date.now()}.${ext}`);
  };

  const handleSendResponse = async () => {
    if (!selectedVideo?.athleteUserId) {
      setResponseError("Athlete profile not found for this upload.");
      return;
    }
    if (!responseUrl) {
      setResponseError("Upload a response video first.");
      return;
    }
    try {
      setResponseError(null);
      await onSendResponseVideo?.({
        athleteUserId: selectedVideo.athleteUserId,
        mediaUrl: responseUrl,
        uploadId: selectedVideo.id,
      });
      toast.success("Response sent", "The athlete will see the video in their messages and program.");
      setResponseUrl(null);
      setRecordedBlob(null);
      if (recordedPreview) {
        URL.revokeObjectURL(recordedPreview);
        setRecordedPreview(null);
      }
    } catch (error: any) {
      setResponseError(error?.message ?? "Failed to send response video.");
      toast.error("Send failed", error?.message ?? "Failed to send response video.");
    }
  };

  return (
    <Dialog open={active !== null} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {active === "review" && "Video Review"}
            {active === "queue" && "Review Queue"}
          </DialogTitle>
          <DialogDescription>
            {selectedVideo ? `${selectedVideo.athlete} • ${selectedVideo.topic}` : "Review uploads in priority order."}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 space-y-4">
          {active === "review" && selectedVideo ? (
            <>
              {selectedVideo.videoUrl ? (
                <video
                  className="aspect-video w-full rounded-2xl border border-border bg-secondary/40 object-cover"
                  src={selectedVideo.videoUrl}
                  controls
                  muted
                />
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/40 text-sm text-muted-foreground">
                  Video Preview
                </div>
              )}
              <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm">
                <span className="font-semibold text-foreground">{selectedVideo.topic}</span>
                <Badge variant={selectedVideo.status === "Priority" ? "primary" : "outline"}>
                  {selectedVideo.status}
                </Badge>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm">
                <span className="font-semibold text-foreground">Notes:</span>{" "}
                <span className="text-muted-foreground">{selectedVideo.topic}</span>
              </div>
              <Textarea
                placeholder="Write coach feedback..."
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
              />
              <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">Coach Response Video</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={handlePick} disabled={isUploading || isRecording}>
                      Upload Video
                    </Button>
                    {isRecording ? (
                      <Button size="sm" variant="destructive" onClick={stopRecording}>
                        Stop Recording
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={handleStartRecording} disabled={isUploading}>
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
                  {responseError ? <p className="text-xs text-destructive">{responseError}</p> : null}
                  {isUploading ? (
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Live Preview</div>
                    <div className="relative">
                      <video
                        ref={livePreviewRef}
                        className="aspect-video w-full rounded-2xl border border-border bg-black/10 object-cover"
                        muted
                        playsInline
                        autoPlay
                      />
                      {!hasLivePreview ? (
                        <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/20 text-xs text-muted-foreground">
                          Start recording to see live camera
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {recordedPreview ? (
                    <div className="space-y-2">
                      <video
                        className="aspect-video w-full rounded-2xl border border-border bg-secondary/40 object-cover"
                        src={recordedPreview}
                        controls
                        muted
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="outline" onClick={handleUploadRecording} disabled={isUploading}>
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
                        className="aspect-video w-full rounded-2xl border border-border bg-secondary/40 object-cover"
                        src={responseUrl}
                        controls
                        muted
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button onClick={handleSendResponse} disabled={isSendingResponse}>
                          {isSendingResponse ? "Sending..." : "Send Response Video"}
                        </Button>
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
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Save Draft
                </Button>
                <Button
                  onClick={() => onSubmitReview?.(feedback)}
                  disabled={isSubmitting || feedback.trim().length === 0}
                >
                  Mark Reviewed
                </Button>
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
                      <p className="font-semibold text-foreground">{video.athlete}</p>
                      <p className="text-xs text-muted-foreground">{video.topic}</p>
                    </div>
                    <Badge variant={video.status === "Priority" ? "primary" : "outline"}>
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
