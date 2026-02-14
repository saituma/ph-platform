"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";

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
  } | null;
  queueVideos?: {
    id: number;
    athlete: string;
    topic: string;
    status: string;
  }[];
  onSelectQueueVideo?: (video: { id: number; athlete: string; topic: string; status: string }) => void;
  onSubmitReview?: (feedback: string) => void;
  isSubmitting?: boolean;
};

export function VideoDialogs({
  active,
  onClose,
  selectedVideo,
  queueVideos = [],
  onSelectQueueVideo,
  onSubmitReview,
  isSubmitting = false,
}: VideoDialogsProps) {
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (active === "review" && selectedVideo) {
      setFeedback(selectedVideo.feedback ?? "");
    }
  }, [active, selectedVideo]);
  return (
    <Dialog open={active !== null} onOpenChange={onClose}>
      <DialogContent>
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
