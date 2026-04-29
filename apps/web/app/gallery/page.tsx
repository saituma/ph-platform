"use client";

import { useEffect, useRef, useState } from "react";
import { Link2, Upload, Filter, Trash2, Image, Video } from "lucide-react";

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

function extractInstagramEmbed(url: string): { id: string; type: string } | null {
  const m = url.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  if (!m) return null;
  const [, type, id] = m;
  return { id, type };
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
  const [lightboxItem, setLightboxItem] = useState<any>(null);;

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
                    {t === "upload" ? <Upload size={15} /> : t === "instagram" ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    ) : <Link2 size={15} />}
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
                  <GalleryItemCard
                    key={item.id}
                    item={item}
                    onDelete={() => handleDelete(item.id)}
                    onOpen={setLightboxItem}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Instagram lightbox ── */}
      {lightboxItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxItem(null)}
        >
          <div className="relative w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxItem(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white text-sm font-medium"
            >
              ✕ Close
            </button>
            <InstagramEmbed url={lightboxItem.url ?? ""} />
          </div>
        </div>
      )}
    </AdminShell>
  );
}

/* ── Individual gallery card ── */
function GalleryItemCard({ item, onDelete, onOpen }: { item: any; onDelete: () => void; onOpen: (item: any) => void }) {
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-pink-500" style={{ color: "rgb(236,72,153)" }}>
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
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
              IG
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

        {/* Hover overlay — pointer-events-none when invisible so it doesn't block clicks underneath */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-end justify-start p-2 pointer-events-none group-hover:pointer-events-auto">
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
          >
            <Trash2 size={13} />
          </button>
          {isInstagram && (
            <button
              type="button"
              onClick={() => onOpen(item)}
              className="mt-1 flex items-center justify-center w-7 h-7 rounded-full bg-pink-500 hover:bg-pink-600 text-white transition-colors"
              title="Preview"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          )}
          {item.caption && (
            <p className="text-white text-[10px] text-center line-clamp-2 mt-auto w-full">{item.caption}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Instagram preview (thumbnail → iframe on play) ── */
type IGPreview = { thumbnailUrl: string | null; title: string | null; description: string | null; videoUrl: string | null };

function InstagramEmbed({ url }: { url: string }) {
  const embed = extractInstagramEmbed(url);
  const [preview, setPreview] = useState<IGPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    setPlaying(false);
    fetch(`/api/instagram-preview?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((d) => setPreview(d))
      .catch(() => setPreview(null))
      .finally(() => setLoading(false));
  }, [url]);

  if (!embed) {
    return (
      <div className="bg-card rounded-xl p-6 text-center text-muted-foreground text-sm">
        Could not parse Instagram URL.
      </div>
    );
  }

  const embedSrc = `https://www.instagram.com/${embed.type}/${embed.id}/embed/`;
  const postUrl = `https://www.instagram.com/${embed.type}/${embed.id}/`;

  return (
    <div className="rounded-xl overflow-hidden bg-[#0a0a0a] w-full">
      {playing ? (
        preview?.videoUrl ? (
          <video
            src={preview.videoUrl}
            poster={preview.thumbnailUrl ?? undefined}
            className="w-full block bg-black"
            style={{ maxHeight: 600 }}
            controls
            autoPlay
            playsInline
          />
        ) : (
          <iframe
            src={embedSrc}
            className="w-full border-0 block"
            style={{ height: 600 }}
            allow="encrypted-media; autoplay; clipboard-write; picture-in-picture"
            title="Instagram post"
          />
        )
      ) : (
        <>
          {/* Thumbnail with play button */}
          <div className="relative w-full aspect-square bg-black">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" />
              </div>
            ) : preview?.thumbnailUrl ? (
              <>
                <img
                  src={preview.thumbnailUrl}
                  alt={preview.title ?? "Instagram post"}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/40">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </div>
            )}
            {/* Play button */}
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="absolute inset-0 flex items-center justify-center group/play"
            >
              <div className="w-16 h-16 rounded-full bg-white/90 group-hover/play:bg-white flex items-center justify-center shadow-lg transition-transform group-hover/play:scale-110">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-pink-500 ml-1" style={{ color: "rgb(236,72,153)" }}>
                  <polygon points="5,3 19,12 5,21"/>
                </svg>
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            {preview?.title && (
              <p className="text-white/80 text-xs line-clamp-1 flex-1">{preview.title}</p>
            )}
            <a
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs text-pink-400 hover:text-pink-300 underline underline-offset-2"
            >
              Open on Instagram
            </a>
          </div>
        </>
      )}
    </div>
  );
}
