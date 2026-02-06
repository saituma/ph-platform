"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { Badge } from "../../ui/badge";
import { Select } from "../../ui/select";

export type VideoReviewDialog = null | "review" | "queue";

type VideoDialogsProps = {
  active: VideoReviewDialog;
  onClose: () => void;
  selectedVideo?: { athlete: string; topic: string; status: string } | null;
  onStatusChange?: (status: string) => void;
};

export function VideoDialogs({
  active,
  onClose,
  selectedVideo,
  onStatusChange,
}: VideoDialogsProps) {
  return (
    <Dialog open={active !== null} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {active === "review" && "Video Review"}
            {active === "queue" && "Review Queue"}
          </DialogTitle>
          <DialogDescription>
            {selectedVideo
              ? `${selectedVideo.athlete} • ${selectedVideo.topic}`
              : "UI-only for now."}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 space-y-4">
          {active === "review" && selectedVideo ? (
            <>
              <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/40 text-sm text-muted-foreground">
                Video Preview
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm">
                <span className="font-semibold text-foreground">{selectedVideo.topic}</span>
                <Badge variant={selectedVideo.status === "Priority" ? "primary" : "outline"}>
                  {selectedVideo.status}
                </Badge>
              </div>
              <Select onChange={(event) => onStatusChange?.(event.target.value)}>
                <option>Update status</option>
                <option>Priority</option>
                <option>Awaiting feedback</option>
                <option>Reviewed</option>
              </Select>
              <Textarea placeholder="Write feedback..." />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Save Draft
                </Button>
                <Button onClick={onClose}>Mark Reviewed</Button>
              </div>
            </>
          ) : null}
          {active === "queue" ? (
            <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
              Queue overview will appear here with priority ordering.
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
