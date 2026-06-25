"use client";

import { useRef, useState } from "react";
import { Camera, Film, Loader2, Trash2, Upload } from "lucide-react";
import {
  useCreateMediaUploadUrlMutation,
  useCreateStoryMutation,
  useDeleteStoryMutation,
  useGetStoriesQuery,
} from "@/lib/apiSlice";
import { toast } from "../../../lib/toast";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader } from "../../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Input } from "../../ui/input";
import { ScrollArea } from "../../ui/scroll-area";
import { SectionHeader } from "../section-header";

type StoriesTabProps = {
  formatTime?: (value?: string | null) => string;
};

export function StoriesTab(_props: StoriesTabProps) {
  const { data: storiesData } = useGetStoriesQuery();
  const [createStory, { isLoading: isCreatingStory }] = useCreateStoryMutation();
  const [deleteStory] = useDeleteStoryMutation();
  const [createMediaUploadUrl] = useCreateMediaUploadUrlMutation();

  const [storyTitle, setStoryTitle] = useState("");
  const [storyMediaUrl, setStoryMediaUrl] = useState("");
  const [storyMediaType, setStoryMediaType] = useState<"image" | "video">("image");
  const [storyBadge, setStoryBadge] = useState("");
  const [isUploadingStoryMedia, setIsUploadingStoryMedia] = useState(false);
  const [deleteStoryTarget, setDeleteStoryTarget] = useState<{
    id: number;
    title: string;
  } | null>(null);

  const storyFileRef = useRef<HTMLInputElement | null>(null);

  const storyItems = storiesData?.items ?? [];

  const handleStoryFileUpload = async (file: File) => {
    const isVideo = file.type.startsWith("video/");
    const safeName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    try {
      setIsUploadingStoryMedia(true);
      const presign = await createMediaUploadUrl({
        folder: "stories",
        fileName: safeName,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        client: "web",
      }).unwrap();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error("Upload failed."));
        };
        xhr.onerror = () => reject(new Error("Upload failed."));
        xhr.open("PUT", presign.uploadUrl);
        xhr.setRequestHeader(
          "Content-Type",
          file.type || "application/octet-stream",
        );
        xhr.send(file);
      });

      setStoryMediaUrl(presign.publicUrl);
      setStoryMediaType(isVideo ? "video" : "image");
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setIsUploadingStoryMedia(false);
      if (storyFileRef.current) storyFileRef.current.value = "";
    }
  };

  const handleCreateStory = async () => {
    if (!storyTitle.trim() || !storyMediaUrl.trim()) return;
    try {
      await createStory({
        title: storyTitle.trim(),
        mediaUrl: storyMediaUrl.trim(),
        mediaType: storyMediaType,
        badge: storyBadge.trim() || null,
      }).unwrap();
      setStoryTitle("");
      setStoryMediaUrl("");
      setStoryMediaType("image");
      setStoryBadge("");
      toast.success("Story published");
    } catch {
      toast.error("Failed to publish story");
    }
  };

  const handleDeleteStory = (storyId: number, title: string) => {
    setDeleteStoryTarget({ id: storyId, title });
  };

  const confirmDeleteStory = async () => {
    if (!deleteStoryTarget) return;
    try {
      await deleteStory({ storyId: deleteStoryTarget.id }).unwrap();
      toast.success("Story deleted");
      setDeleteStoryTarget(null);
    } catch {
      toast.error("Failed to delete story");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <SectionHeader
            title="Stories"
            description="Share images or videos that athletes see at the top of their feed."
          />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <Input
                placeholder="Story title"
                value={storyTitle}
                onChange={(e) => setStoryTitle(e.target.value.slice(0, 80))}
                maxLength={80}
              />
              <input
                ref={storyFileRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleStoryFileUpload(file);
                }}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={isUploadingStoryMedia}
                  onClick={() => storyFileRef.current?.click()}
                >
                  {isUploadingStoryMedia ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />{" "}
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 mr-1" /> Upload File
                    </>
                  )}
                </Button>
                <Input
                  placeholder="or paste media URL"
                  value={storyMediaUrl}
                  onChange={(e) => setStoryMediaUrl(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Type:</p>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={storyMediaType === "image" ? "default" : "outline"}
                    onClick={() => setStoryMediaType("image")}
                  >
                    <Camera className="h-3.5 w-3.5 mr-1" /> Image
                  </Button>
                  <Button
                    size="sm"
                    variant={storyMediaType === "video" ? "default" : "outline"}
                    onClick={() => setStoryMediaType("video")}
                  >
                    <Film className="h-3.5 w-3.5 mr-1" /> Video
                  </Button>
                </div>
              </div>
              <Input
                placeholder='Badge (optional, e.g. "NEW")'
                value={storyBadge}
                onChange={(e) => setStoryBadge(e.target.value.slice(0, 20))}
                maxLength={20}
              />
              {storyMediaUrl.trim() && (
                <div className="rounded-lg overflow-hidden border">
                  {storyMediaType === "video" ? (
                    <video
                      src={storyMediaUrl.trim()}
                      className="w-full max-h-[400px] object-contain bg-black/5"
                      muted
                      playsInline
                      controls
                    />
                  ) : (
                    <img
                      src={storyMediaUrl.trim()}
                      alt="Preview"
                      className="w-full max-h-[400px] object-contain bg-black/5"
                    />
                  )}
                </div>
              )}
              <Button
                onClick={() => void handleCreateStory()}
                disabled={
                  isCreatingStory ||
                  isUploadingStoryMedia ||
                  !storyTitle.trim() ||
                  !storyMediaUrl.trim()
                }
              >
                {isCreatingStory ? "Publishing..." : "Publish Story"}
              </Button>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Active Stories</p>
              {storyItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No stories yet.</p>
              ) : (
                <ScrollArea className="h-[260px] pr-2">
                  <div className="space-y-2">
                    {storyItems.map((story) => (
                      <div
                        key={story.id}
                        className="flex items-center gap-3 rounded-lg border p-2"
                      >
                        <img
                          src={story.mediaUrl}
                          alt={story.title}
                          className="w-12 h-12 rounded-md object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {story.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {story.mediaType === "video" && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                Video
                              </Badge>
                            )}
                            {story.badge && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {story.badge}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive shrink-0"
                          onClick={() =>
                            void handleDeleteStory(story.id, story.title)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={deleteStoryTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteStoryTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete story?</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {deleteStoryTarget?.title || "this story"}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteStoryTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDeleteStory()}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
