"use client";

import { useRef, useState } from "react";
import { Instagram, Link2, Upload, Filter, Trash2, Image, Video } from "lucide-react";

import { AdminShell } from "../../components/admin/shell";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { SectionHeader } from "../../components/admin/section-header";
import {
  useGetGalleryItemsQuery,
  useCreateContentMutation,
  useDeleteContentMutation,
  usePresignMediaUploadMutation,
} from "../../lib/apiSlice";

type PostType = "upload" | "link" | "instagram";
type UploadState = "idle" | "uploading" | "saving" | "done" | "error";

const PRESET_TAGS = ["Training", "Competition", "Team", "Behind the Scenes", "Recovery"];

function extractInstagramId(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return m?.[1] ?? null;
}

function isInstagramUrl(url: string) {
  return /instagram\.com\/(p|reel|tv)\//.test(url);
}

export default function GalleryPage() {
  const { data, refetch, isLoading } = useGetGalleryItemsQuery();
  const [createContent] = useCreateContentMutation();
  const [deleteContent] = useDeleteContentMutation();
  const [presignUpload] = usePresignMediaUploadMutation();

  // form state
  const [postType, setPostType] = useState<PostType>("upload");
  const [caption, setCaption] = useState("");
  const [tag, setTag] = useState("");
  const [customTag, setCustomTag] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; type: "photo" | "video" } | null>(null);

  // filter state
  const [activeFilter, setActiveFilter] = useState("All");

  const fileRef = useRef<HTMLInputElement>(null);

  const items: any[] = data?.items ?? [];
  const allTags = ["All", ...Array.from(new Set(items.map((i) => i.tag).filter(Boolean)))];
  const filtered = activeFilter === "All" ? items : items.filter((i) => i.tag === activeFilter);

  const resolvedTag = tag === "__custom__" ? customTag.trim() : tag;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview({ url: URL.createObjectURL(file), type: file.type.startsWith("video/") ? "video" : "photo" });
  };

  // Auto-detect instagram when pasting link
  const handleLinkChange = (val: string) => {
    setLinkUrl(val);
    if (isInstagramUrl(val)) setPostType("instagram");
  };

  const handleUpload = async () => {
    setErrorMsg(null);

    if (postType === "upload") {
      const file = fileRef.current?.files?.[0];
      if (!file) { setErrorMsg("Please select a file."); return; }

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
            postType: "upload",
            url: presignResult.publicUrl,
            thumbnail: null,
            caption: caption || null,
            mediaType,
            tag: resolvedTag || null,
          }),
        }).unwrap();
      } catch (err: any) {
        setErrorMsg(err?.message ?? "Upload failed.");
        setUploadState("error");
        return;
      }
    } else {
      // link or instagram
      if (!linkUrl.trim()) { setErrorMsg("Please enter a URL."); return; }

      const instagramId = postType === "instagram" ? extractInstagramId(linkUrl) : null;
      if (postType === "instagram" && !instagramId) {
        setErrorMsg("Could not parse Instagram post ID. Use a link like instagram.com/p/ABC123/");
        return;
      }

      setUploadState("saving");
      try {
        await createContent({
          title: caption || linkUrl,
          content: caption || linkUrl,
          type: "article",
          surface: "home",
          category: "gallery",
          body: JSON.stringify({
            postType,
            url: linkUrl.trim(),
            instagramId: instagramId ?? null,
            caption: caption || null,
            mediaType: postType === "instagram" ? "instagram" : "link",
            tag: resolvedTag || null,
          }),
        }).unwrap();
      } catch (err: any) {
        setErrorMsg(err?.message ?? "Failed to save.");
        setUploadState("error");
        return;
      }
    }

    setUploadState("done");
    setCaption("");
    setTag("");
    setCustomTag("");
    setLinkUrl("");
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    refetch();
    setTimeout(() => setUploadState("idle"), 1500);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this gallery item?")) return;
    try {
      await deleteContent({ id }).unwrap();
      refetch();
    } catch {
      setErrorMsg("Failed to delete.");
    }
  };

  const isBusy = uploadState === "uploading" || uploadState === "saving";

  return (
    <AdminShell title="Gallery" subtitle="Photos, videos, links & Instagram posts shown on the landing page.">
      <div className="space-y-8">

        {/* ── Add item card ── */}
        <Card>
          <CardHeader>
            <SectionHeader title="Add to Gallery" description="Upload media, paste a link, or add an Instagram post." />
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Type selector */}
            <div className="flex gap-2 flex-wrap">
              {(["upload", "link", "instagram"] as PostType[]).map((t) => {
                const Icon = t === "upload" ? Upload : t === "instagram" ? Instagram : Link2;
                const label = t === "upload" ? "Upload media" : t === "instagram" ? "Instagram" : "External link";
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPostType(t)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      postType === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Upload */}
            {postType === "upload" && (
              <div className="space-y-3">
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
                  <div className="w-36 rounded-lg overflow-hidden border border-border">
                    {preview.type === "video"
                      ? <video src={preview.url} className="w-full h-auto" muted playsInline />
                      : <img src={preview.url} alt="Preview" className="w-full h-auto" />}
                  </div>
                )}
              </div>
            )}

            {/* Link / Instagram */}
            {(postType === "link" || postType === "instagram") && (
              <div className="space-y-2">
                <Label htmlFor="gallery-url">
                  {postType === "instagram" ? "Instagram Post / Reel URL" : "Link URL"}
                </Label>
                <Input
                  id="gallery-url"
                  placeholder={
                    postType === "instagram"
                      ? "https://www.instagram.com/p/ABC123xyz/"
                      : "https://example.com/article"
                  }
                  value={linkUrl}
                  onChange={(e) => handleLinkChange(e.target.value)}
                />
                {postType === "instagram" && linkUrl && extractInstagramId(linkUrl) && (
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                    ✓ Post ID detected: {extractInstagramId(linkUrl)}
                  </p>
                )}
                {postType === "instagram" && (
                  <p className="text-xs text-muted-foreground">
                    Supports posts, reels, and TV links. Will be embedded on the landing page.
                  </p>
                )}
              </div>
            )}

            {/* Caption */}
            <div className="space-y-2">
              <Label htmlFor="gallery-caption">
                Caption <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="gallery-caption"
                placeholder="e.g. Sprint session, Training day..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>

            {/* Category tags */}
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
                  className="max-w-xs"
                  autoFocus
                />
              )}
              {resolvedTag && (
                <p className="text-xs text-muted-foreground">
                  Tagged as: <span className="font-semibold text-foreground">{resolvedTag}</span>
                </p>
              )}
            </div>

            {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}

            <Button onClick={handleUpload} disabled={isBusy} className="w-full sm:w-auto">
              {uploadState === "uploading" ? "Uploading..." : uploadState === "saving" ? "Saving..." : uploadState === "done" ? "Saved!" : "Add to Gallery"}
            </Button>
          </CardContent>
        </Card>

        {/* ── Gallery grid ── */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionHeader
                title={`Gallery (${items.length} ${items.length === 1 ? "item" : "items"})`}
                description="All published gallery content."
              />
              {allTags.length > 1 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Filter size={13} className="text-muted-foreground shrink-0" />
                  {allTags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActiveFilter(t)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        activeFilter === t
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/60"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {items.length === 0 ? "No gallery items yet. Add your first one above." : `No items in "${activeFilter}".`}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filtered.map((item) => (
                  <GalleryItemCard key={item.id} item={item} onDelete={() => handleDelete(item.id)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

/* ── Individual gallery card ── */
function GalleryItemCard({ item, onDelete }: { item: any; onDelete: () => void }) {
  const mediaType: string = item.mediaType ?? "photo";
  const isInstagram = mediaType === "instagram";
  const isLink = mediaType === "link";
  const instagramId = item.instagramId ?? extractInstagramId(item.url ?? "");

  return (
    <div className="group relative rounded-lg overflow-hidden border border-border bg-card">
      {/* Thumbnail area */}
      <div className="aspect-square relative flex items-center justify-center bg-muted/30">
        {isInstagram ? (
          <div className="flex flex-col items-center gap-1 p-2 text-center">
            <Instagram size={24} className="text-pink-500" />
            <p className="text-[10px] text-muted-foreground font-medium leading-tight line-clamp-2">
              {instagramId ? `Post: ${instagramId}` : item.url}
            </p>
          </div>
        ) : isLink ? (
          <div className="flex flex-col items-center gap-1 p-2 text-center">
            <Link2 size={24} className="text-blue-500" />
            <p className="text-[10px] text-muted-foreground font-medium leading-tight break-all line-clamp-3">
              {item.url}
            </p>
          </div>
        ) : mediaType === "video" ? (
          <video
            src={item.url}
            poster={item.thumbnail ?? undefined}
            className="w-full h-full object-cover absolute inset-0"
            muted
            playsInline
          />
        ) : (
          <img
            src={item.url}
            alt={item.caption ?? ""}
            className="w-full h-full object-cover absolute inset-0"
          />
        )}

        {/* Type badge */}
        <div className="absolute top-1.5 left-1.5">
          {isInstagram && (
            <span className="flex items-center gap-1 bg-pink-500/90 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full">
              <Instagram size={8} /> IG
            </span>
          )}
          {isLink && (
            <span className="flex items-center gap-1 bg-blue-500/90 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full">
              <Link2 size={8} /> Link
            </span>
          )}
          {mediaType === "video" && (
            <span className="flex items-center gap-1 bg-black/70 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
              <Video size={8} /> Video
            </span>
          )}
          {mediaType === "photo" && (
            <span className="flex items-center gap-1 bg-black/70 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
              <Image size={8} /> Photo
            </span>
          )}
        </div>

        {/* Tag badge */}
        {item.tag && (
          <div className="absolute bottom-1.5 right-1.5 bg-primary/80 text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full">
            {item.tag}
          </div>
        )}

        {/* Hover delete */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-end justify-start p-2">
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
          >
            <Trash2 size={13} />
          </button>
          {item.caption && (
            <p className="text-white text-[10px] text-center line-clamp-2 mt-auto w-full">{item.caption}</p>
          )}
        </div>
      </div>
    </div>
  );
}
