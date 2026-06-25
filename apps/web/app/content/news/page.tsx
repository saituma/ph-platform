"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Calendar,
  GripVertical,
  Heart,
  Image,
  Link2,
  MessageCircle,
  Newspaper,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";

import { AdminShell } from "../../../components/admin/shell";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { toast } from "../../../lib/toast";
import {
  useCreateContentMutation,
  useDeleteContentMutation,
  useGetNewsQuery,
  usePresignMediaUploadMutation,
  useUpdateContentMutation,
} from "../../../lib/apiSlice";

type NewsMediaItem = {
  url: string;
  type: "image" | "video";
  caption?: string | null;
  posterUrl?: string | null;
};

type NewsItem = {
  id: number;
  title: string;
  content: string;
  body?: string | null;
  category?: string | null;
  type?: string | null;
  date?: string;
  likeCount?: number;
  commentCount?: number;
};

const emptyForm = { title: "", content: "", body: "", category: "" };

function parseNewsBody(raw?: string | null): { text: string; media: NewsMediaItem[] } {
  const fallback = { text: raw ?? "", media: [] as NewsMediaItem[] };
  if (!raw?.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw) as { text?: unknown; body?: unknown; media?: unknown };
    const media = Array.isArray(parsed.media)
      ? parsed.media
          .map((item): NewsMediaItem | null => {
            if (!item || typeof item !== "object") return null;
            const c = item as Partial<NewsMediaItem>;
            const url = typeof c.url === "string" ? c.url.trim() : "";
            if (!url) return null;
            return {
              url,
              type: c.type === "video" ? "video" : "image",
              caption: typeof c.caption === "string" ? c.caption : null,
              posterUrl: typeof c.posterUrl === "string" ? c.posterUrl : null,
            };
          })
          .filter((item): item is NewsMediaItem => Boolean(item))
      : [];
    const text =
      typeof parsed.text === "string"
        ? parsed.text
        : typeof parsed.body === "string"
          ? parsed.body
          : fallback.text;
    return { text, media };
  } catch {
    return fallback;
  }
}

function formatDate(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const TOOLBAR = [
  { label: "B", title: "Bold", type: "wrap" as const, prefix: "**", suffix: "**", placeholder: "bold" },
  { label: "I", title: "Italic", type: "wrap" as const, prefix: "_", suffix: "_", placeholder: "italic" },
  { label: "H2", title: "Heading 2", type: "line" as const, prefix: "## ", placeholder: "Heading" },
  { label: "H3", title: "Heading 3", type: "line" as const, prefix: "### ", placeholder: "Heading" },
  { label: "Link", title: "Link", type: "wrap" as const, prefix: "[", suffix: "](https://)", placeholder: "label" },
  { label: "List", title: "Bullet list", type: "line" as const, prefix: "- ", placeholder: "Item" },
  { label: "Quote", title: "Blockquote", type: "line" as const, prefix: "> ", placeholder: "Quote" },
  { label: "Code", title: "Inline code", type: "wrap" as const, prefix: "`", suffix: "`", placeholder: "code" },
] as const;

function applyWrap(el: HTMLTextAreaElement, prefix: string, suffix: string, placeholder: string): string {
  const s = el.selectionStart ?? 0;
  const e = el.selectionEnd ?? 0;
  const text = el.value;
  const selected = text.slice(s, e) || placeholder;
  return text.slice(0, s) + prefix + selected + suffix + text.slice(e);
}

function applyPrefix(el: HTMLTextAreaElement, prefix: string, placeholder: string): string {
  const s = el.selectionStart ?? 0;
  const e = el.selectionEnd ?? 0;
  const text = el.value;
  const selected = text.slice(s, e) || placeholder;
  return text.slice(0, s) + selected.split("\n").map((l) => `${prefix}${l}`).join("\n") + text.slice(e);
}

export default function NewsContentPage() {
  const { data, isLoading, refetch } = useGetNewsQuery();
  const [createContent, { isLoading: isCreating }] = useCreateContentMutation();
  const [updateContent, { isLoading: isUpdating }] = useUpdateContentMutation();
  const [deleteContent, { isLoading: isDeleting }] = useDeleteContentMutation();
  const [presignUpload, { isLoading: isUploading }] = usePresignMediaUploadMutation();

  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [media, setMedia] = useState<NewsMediaItem[]>([]);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [error, setError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [dragMediaIndex, setDragMediaIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NewsItem | null>(null);
  const [search, setSearch] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const items = useMemo(() => (data?.items ?? []) as NewsItem[], [data]);
  const isSaving = isCreating || isUpdating || isUploading;

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category).filter((c): c is string => Boolean(c)))],
    [items],
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        (item.category ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const reset = () => {
    setEditing(null);
    setForm(emptyForm);
    setMedia([]);
    setMediaUrl("");
    setMediaType("image");
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const edit = (item: NewsItem) => {
    const parsed = parseNewsBody(item.body);
    setEditing(item);
    setForm({ title: item.title ?? "", content: item.content ?? "", body: parsed.text, category: item.category ?? "" });
    setMedia(parsed.media);
    setError(null);
  };

  const uploadFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setError(null);
      const uploaded: NewsMediaItem[] = [];
      try {
        for (const file of Array.from(files)) {
          if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
            setError("Only image and video files are supported.");
            continue;
          }
          const result = await presignUpload({
            folder: "news",
            fileName: file.name,
            contentType: file.type,
            sizeBytes: file.size,
            client: "web",
          }).unwrap();
          const res = await fetch(result.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
          if (!res.ok) throw new Error("Upload failed.");
          uploaded.push({ url: result.publicUrl, type: file.type.startsWith("video/") ? "video" : "image", caption: "" });
        }
        if (uploaded.length) {
          setMedia((prev) => [...prev, ...uploaded]);
          toast.success(`${uploaded.length} file${uploaded.length > 1 ? "s" : ""} uploaded`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not upload media.";
        setError(msg);
        toast.error(msg);
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [presignUpload],
  );

  const addMediaUrl = () => {
    const url = mediaUrl.trim();
    if (!url) return;
    setMedia((prev) => [...prev, { url, type: mediaType, caption: "" }]);
    setMediaUrl("");
    setMediaType("image");
  };

  const applyToolbar = (item: (typeof TOOLBAR)[number]) => {
    const el = bodyRef.current;
    if (!el) return;
    const next =
      item.type === "wrap"
        ? applyWrap(el, item.prefix, item.suffix, item.placeholder)
        : applyPrefix(el, item.prefix, item.placeholder);
    setForm((prev) => ({ ...prev, body: next }));
    requestAnimationFrame(() => el.focus());
  };

  const save = async () => {
    setError(null);
    const title = form.title.trim();
    const content = form.content.trim();
    if (!title || !content) {
      const msg = "Title and summary are required.";
      setError(msg);
      toast.error(msg);
      return;
    }
    const hasBody = form.body.trim() || media.length > 0;
    const payload = {
      title,
      content,
      body: hasBody
        ? JSON.stringify({
            text: form.body.trim(),
            media: media.map((m) => ({
              url: m.url,
              type: m.type,
              caption: m.caption?.trim() || null,
              posterUrl: m.posterUrl?.trim() || null,
            })),
          })
        : undefined,
      category: form.category.trim() || undefined,
      surface: "news",
      type: media.some((m) => m.type === "video")
        ? "video"
        : media.some((m) => m.type === "image")
          ? "image"
          : "article",
    };
    try {
      if (editing) {
        await updateContent({ id: editing.id, data: payload }).unwrap();
        toast.success("Post updated");
      } else {
        await createContent(payload).unwrap();
        toast.success("Post published");
      }
      reset();
      refetch();
    } catch {
      const msg = "Could not save news post.";
      setError(msg);
      toast.error(msg);
    }
  };

  const remove = async (item: NewsItem) => {
    try {
      await deleteContent({ id: item.id }).unwrap();
      if (editing?.id === item.id) reset();
      setDeleteTarget(null);
      refetch();
      toast.success("Post deleted");
    } catch {
      toast.error("Could not delete news post.");
    }
  };

  // File drag-and-drop
  const onFileDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingFile(true); };
  const onFileDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingFile(false);
  };
  const onFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    void uploadFiles(e.dataTransfer.files);
  };

  // Media drag-to-reorder
  const onMediaDragStart = (index: number) => setDragMediaIndex(index);
  const onMediaDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (dragMediaIndex === null || dragMediaIndex === targetIndex) return;
    setMedia((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragMediaIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragMediaIndex(targetIndex);
  };
  const onMediaDragEnd = () => setDragMediaIndex(null);

  return (
    <AdminShell
      title="News"
      subtitle="Write updates for the mobile News tab."
      actions={
        <Button onClick={reset} variant="outline">
          <Plus className="h-4 w-4" />
          New post
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* ── Form panel ── */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Newspaper className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{editing ? "Edit post" : "Create post"}</h2>
              <p className="text-xs text-muted-foreground">Published posts notify app users.</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="news-title">Title *</Label>
              <Input
                id="news-title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Post title"
              />
            </div>

            {/* Category with datalist autocomplete */}
            <div className="space-y-1.5">
              <Label htmlFor="news-category">Category</Label>
              <input
                id="news-category"
                list="news-categories"
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="e.g. Academy"
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <datalist id="news-categories">
                {categories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            {/* Summary */}
            <div className="space-y-1.5">
              <Label htmlFor="news-summary">Summary *</Label>
              <p className="text-xs text-muted-foreground">Shown in the news card preview</p>
              <Textarea
                id="news-summary"
                value={form.content}
                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="Short summary (shown in feed)"
              />
            </div>

            {/* Full content with markdown toolbar */}
            <div className="space-y-1.5">
              <Label htmlFor="news-body">Full Content</Label>
              <p className="text-xs text-muted-foreground">Expanded body shown when the reader taps "See more"</p>
              <div className="flex flex-wrap gap-1">
                {TOOLBAR.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    title={item.title}
                    onClick={() => applyToolbar(item)}
                    className="inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded border border-input bg-background px-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <Textarea
                id="news-body"
                ref={bodyRef}
                value={form.body}
                onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                placeholder="Full post content (markdown supported)"
                className="min-h-48 font-mono text-sm"
              />
            </div>

            {/* Media: drag-and-drop zone */}
            <div
              className={`rounded-xl border-2 border-dashed bg-background p-4 transition-colors ${
                isDraggingFile ? "border-primary bg-primary/5" : "border-border"
              }`}
              onDragOver={onFileDragOver}
              onDragLeave={onFileDragLeave}
              onDrop={onFileDrop}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Media</p>
                  <p className="text-xs text-muted-foreground">
                    {isDraggingFile ? "Drop files here…" : "Drag & drop photos/videos, or paste a URL"}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} loading={isUploading}>
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => void uploadFiles(e.target.files)}
                />
              </div>

              <div className="grid gap-2 md:grid-cols-[100px_1fr_auto]">
                <select
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value === "video" ? "video" : "image")}
                  className="h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                >
                  <option value="image">Photo</option>
                  <option value="video">Video</option>
                </select>
                <Input
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-8"
                />
                <Button variant="outline" size="sm" onClick={addMediaUrl}>
                  <Link2 className="h-4 w-4" />
                  Add
                </Button>
              </div>

              {media.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {media.map((item, index) => (
                    <div
                      key={`${item.url}-${index}`}
                      draggable
                      onDragStart={() => onMediaDragStart(index)}
                      onDragOver={(e) => onMediaDragOver(e, index)}
                      onDragEnd={onMediaDragEnd}
                      className={`rounded-lg border border-border bg-card transition-opacity ${
                        dragMediaIndex === index ? "opacity-40" : "opacity-100"
                      }`}
                    >
                      <div className="overflow-hidden rounded-t-lg bg-muted">
                        {item.type === "video" ? (
                          <video src={item.url} controls preload="metadata" className="max-h-32 w-full object-cover" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.url} alt={item.caption ?? "Media"} className="max-h-32 w-full object-cover" loading="lazy" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 p-2">
                        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                          {item.type === "video" ? <Video className="h-3.5 w-3.5" /> : <Image className="h-3.5 w-3.5" />}
                        </div>
                        <Input
                          value={item.caption ?? ""}
                          onChange={(e) =>
                            setMedia((prev) => prev.map((row, i) => (i === index ? { ...row, caption: e.target.value } : row)))
                          }
                          placeholder="Caption (optional)"
                          className="h-7 flex-1 text-xs"
                        />
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => setMedia((prev) => prev.filter((_, i) => i !== index))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex gap-2">
              <Button onClick={() => void save()} loading={isSaving}>
                {editing ? "Save changes" : "Publish"}
              </Button>
              {editing ? (
                <Button onClick={reset} variant="outline">
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        {/* ── Posts list panel ── */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">
              Posts{items.length > 0 ? ` (${items.length})` : ""}
            </h2>
            <div className="relative min-w-0 flex-1 max-w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search posts…"
                className="h-8 pl-7 text-sm"
              />
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading news…</p>
          ) : filteredItems.length > 0 ? (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const parsed = parseNewsBody(item.body);
                return (
                  <div key={item.id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-foreground">{item.title}</h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          {item.date ? (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDate(item.date)}
                            </span>
                          ) : null}
                          {item.category ? (
                            <Badge variant="secondary" size="sm">{item.category}</Badge>
                          ) : null}
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Heart className="h-3 w-3" />
                            {item.likeCount ?? 0}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageCircle className="h-3 w-3" />
                            {item.commentCount ?? 0}
                          </span>
                          {parsed.media.length > 0 ? (
                            <span className="text-xs text-muted-foreground">{parsed.media.length} media</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" variant="outline" onClick={() => edit(item)}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(item)}>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.content}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {search ? "No posts match your search." : "No news posts yet."}
            </div>
          )}
        </section>
      </div>

      {/* ── Delete confirmation dialog ── */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <AlertDialogPopup bottomStickOnMobile={false}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" will be permanently removed and disappear from the app immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button
              variant="destructive"
              loading={isDeleting}
              onClick={() => { if (deleteTarget) void remove(deleteTarget); }}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </AdminShell>
  );
}
