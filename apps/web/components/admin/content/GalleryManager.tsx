"use client";

import { useRef, useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  useGetGalleryItemsQuery,
  useCreateContentMutation,
  useDeleteContentMutation,
  usePresignMediaUploadMutation,
} from "../../../lib/apiSlice";

type UploadState = "idle" | "uploading" | "saving" | "done" | "error";

const PRESET_TAGS = ["Training", "Competition", "Team", "Behind the Scenes", "Recovery"];

export function GalleryManager() {
  const { data, refetch, isLoading } = useGetGalleryItemsQuery();
  const [createContent] = useCreateContentMutation();
  const [deleteContent] = useDeleteContentMutation();
  const [presignUpload] = usePresignMediaUploadMutation();

  const [caption, setCaption] = useState("");
  const [tag, setTag] = useState("");
  const [customTag, setCustomTag] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; type: "photo" | "video" } | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const fileRef = useRef<HTMLInputElement>(null);

  const items = data?.items ?? [];

  // Collect all unique tags from existing items
  const allTags = ["All", ...Array.from(new Set(items.map((i: any) => i.tag).filter(Boolean)))];
  const filteredItems = activeFilter === "All" ? items : items.filter((i: any) => i.tag === activeFilter);

  const resolvedTag = tag === "__custom__" ? customTag.trim() : tag;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.type.startsWith("video/") ? "video" : "photo";
    setPreview({ url: URL.createObjectURL(file), type });
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { setErrorMsg("Please select a file."); return; }

    setErrorMsg(null);
    setUploadState("uploading");

    try {
      const mediaType: "photo" | "video" = file.type.startsWith("video/") ? "video" : "photo";

      const presignResult = await presignUpload({
        folder: "gallery",
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        client: "web",
      }).unwrap();

      const uploadRes = await fetch(presignResult.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error("Upload to storage failed");

      setUploadState("saving");
      await createContent({
        title: caption || file.name,
        content: caption || file.name,
        type: mediaType === "video" ? "video" : "image",
        surface: "home",
        category: "gallery",
        body: JSON.stringify({
          url: presignResult.publicUrl,
          thumbnail: null,
          caption: caption || null,
          mediaType,
          tag: resolvedTag || null,
        }),
      }).unwrap();

      setUploadState("done");
      setCaption("");
      setTag("");
      setCustomTag("");
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      refetch();
      setTimeout(() => setUploadState("idle"), 1500);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Upload failed. Please try again.");
      setUploadState("error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this item from the gallery?")) return;
    try {
      await deleteContent({ id }).unwrap();
      refetch();
    } catch {
      setErrorMsg("Failed to delete item.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Upload form */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h3 className="text-sm font-semibold text-foreground">Add to Gallery</h3>

        <div className="space-y-2">
          <Label htmlFor="gallery-file">Photo or Video</Label>
          <Input
            id="gallery-file"
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">Accepts JPG, PNG, GIF, MP4, MOV, WEBM</p>
        </div>

        {preview && (
          <div className="w-40 rounded-lg overflow-hidden border border-border">
            {preview.type === "video" ? (
              <video src={preview.url} className="w-full h-auto" muted playsInline />
            ) : (
              <img src={preview.url} alt="Preview" className="w-full h-auto" />
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="gallery-caption">Caption <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input
            id="gallery-caption"
            placeholder="e.g. Sprint session, Training day..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Category <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(tag === t ? "" : t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  tag === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/60 hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setTag(tag === "__custom__" ? "" : "__custom__")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                tag === "__custom__"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/60 hover:text-foreground"
              }`}
            >
              + Custom
            </button>
          </div>

          {tag === "__custom__" && (
            <Input
              placeholder="Enter category name..."
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              className="mt-2 max-w-xs"
              autoFocus
            />
          )}

          {resolvedTag && (
            <p className="text-xs text-muted-foreground">
              Will be tagged as: <span className="font-semibold text-foreground">{resolvedTag}</span>
            </p>
          )}
        </div>

        {errorMsg && (
          <p className="text-sm text-red-500">{errorMsg}</p>
        )}

        <Button
          onClick={handleUpload}
          disabled={uploadState === "uploading" || uploadState === "saving"}
          className="w-full sm:w-auto"
        >
          {uploadState === "uploading"
            ? "Uploading..."
            : uploadState === "saving"
              ? "Saving..."
              : uploadState === "done"
                ? "Saved!"
                : "Add to Gallery"}
        </Button>
      </div>

      {/* Gallery grid */}
      <div>
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">
            Gallery ({items.length} {items.length === 1 ? "item" : "items"})
          </h3>

          {/* Tag filter pills */}
          {allTags.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveFilter(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    activeFilter === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/60 hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {activeFilter === "All"
              ? "No gallery items yet. Upload your first photo or video above."
              : `No items in "${activeFilter}".`}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredItems.map((item: any) => (
              <div key={item.id} className="group relative rounded-lg overflow-hidden border border-border bg-card aspect-square">
                {item.mediaType === "video" ? (
                  <video
                    src={item.url}
                    poster={item.thumbnail ?? undefined}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={item.caption}
                    className="w-full h-full object-cover"
                  />
                )}

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                  {item.tag && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/80 text-primary-foreground px-2 py-0.5 rounded-full">
                      {item.tag}
                    </span>
                  )}
                  {item.caption && (
                    <p className="text-white text-xs text-center line-clamp-2">{item.caption}</p>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs h-7"
                    onClick={() => handleDelete(item.id)}
                  >
                    Remove
                  </Button>
                </div>

                {item.mediaType === "video" && (
                  <div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                    Video
                  </div>
                )}

                {item.tag && (
                  <div className="absolute bottom-1.5 right-1.5 bg-primary/80 text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full">
                    {item.tag}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
