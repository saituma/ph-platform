"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Heart,
  Image,
  Link2,
  MessageCircle,
  Newspaper,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  Upload,
  User,
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
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from "../../../components/ui/select";
import { Textarea } from "../../../components/ui/textarea";
import { toast } from "../../../lib/toast";
import {
  useCreateContentMutation,
  useDeleteContentMutation,
  useDeleteNewsCommentMutation,
  useGetAdminTeamsQuery,
  useGetNewsPostCommentsQuery,
  useGetNewsPostLikesQuery,
  useGetNewsQuery,
  usePostNewsCommentMutation,
  usePresignMediaUploadMutation,
  useUpdateContentMutation,
} from "../../../lib/apiSlice";

type NewsAudienceType = "all" | "adult" | "youth" | "team" | "all_teams";

const AUDIENCE_ITEMS: { label: string; value: NewsAudienceType }[] = [
  { label: "Everyone", value: "all" },
  { label: "Adult athletes", value: "adult" },
  { label: "Youth athletes", value: "youth" },
  { label: "All teams", value: "all_teams" },
  { label: "Specific team", value: "team" },
];

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
  audienceType?: NewsAudienceType | null;
  audienceTeam?: string | null;
  type?: string | null;
  date?: string;
  likeCount?: number;
  commentCount?: number;
};

const emptyForm = {
  title: "",
  content: "",
  body: "",
  category: "",
  audienceType: "all" as NewsAudienceType,
  audienceTeam: "",
};

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
  const { data: adminTeamsData } = useGetAdminTeamsQuery();
  const teams = useMemo(() => adminTeamsData?.teams ?? [], [adminTeamsData]);
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
  const [engagementFor, setEngagementFor] = useState<number | null>(null);

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
    setForm({
      title: item.title ?? "",
      content: item.content ?? "",
      body: parsed.text,
      category: item.category ?? "",
      audienceType: item.audienceType ?? "all",
      audienceTeam: item.audienceTeam ?? "",
    });
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
    if (form.audienceType === "team" && !form.audienceTeam.trim()) {
      const msg = "Choose a team for this audience.";
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
      newsAudienceType: form.audienceType,
      newsAudienceTeam: form.audienceType === "team" ? form.audienceTeam.trim() : undefined,
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

            {/* Audience targeting */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Audience</Label>
                <Select
                  items={AUDIENCE_ITEMS}
                  value={form.audienceType}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, audienceType: (v as NewsAudienceType) ?? "all" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {AUDIENCE_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </div>
              {form.audienceType === "team" ? (
                <div className="space-y-1.5">
                  <Label>Team</Label>
                  <Select
                    items={teams.map((t) => ({ label: t.team, value: t.team }))}
                    value={form.audienceTeam}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, audienceTeam: v ?? "" }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a team" />
                    </SelectTrigger>
                    <SelectPopup>
                      {teams.map((t) => (
                        <SelectItem key={t.team} value={t.team}>
                          {t.team}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </div>
              ) : null}
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
                  <div key={item.id} className="rounded-xl border border-border bg-background">
                    <div className="p-4">
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
                            {item.audienceType && item.audienceType !== "all" ? (
                              <Badge variant="outline" size="sm">
                                {item.audienceType === "team"
                                  ? item.audienceTeam || "Team"
                                  : AUDIENCE_ITEMS.find((a) => a.value === item.audienceType)?.label}
                              </Badge>
                            ) : null}
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

                      {/* Engagement toggle row */}
                      <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
                        <button
                          type="button"
                          onClick={() => setEngagementFor(engagementFor === item.id ? null : item.id)}
                          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          <Heart className="h-3.5 w-3.5" />
                          {item.likeCount ?? 0} {(item.likeCount ?? 0) === 1 ? "like" : "likes"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEngagementFor(engagementFor === item.id ? null : item.id)}
                          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {item.commentCount ?? 0} {(item.commentCount ?? 0) === 1 ? "comment" : "comments"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEngagementFor(engagementFor === item.id ? null : item.id)}
                          className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {engagementFor === item.id ? (
                            <><ChevronUp className="h-3.5 w-3.5" /> Hide</>
                          ) : (
                            <><ChevronDown className="h-3.5 w-3.5" /> View details</>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Engagement panel */}
                    {engagementFor === item.id ? (
                      <PostEngagementPanel contentId={item.id} />
                    ) : null}
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

type CommentItem = {
  commentId: number;
  userId: number;
  name: string;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
  canDelete: boolean;
};

type LikeItem = {
  userId: number;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
};

function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function initials(name: string | null | undefined) {
  const parts = String(name ?? "?").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function PostEngagementPanel({ contentId }: { contentId: number }) {
  const [tab, setTab] = useState<"likes" | "comments">("comments");
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ commentId: number; name: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: likesData, isLoading: likesLoading } = useGetNewsPostLikesQuery(contentId);
  const { data: commentsData, isLoading: commentsLoading } = useGetNewsPostCommentsQuery(contentId, { pollingInterval: 10000 });
  const [postComment, { isLoading: posting }] = usePostNewsCommentMutation();
  const [deleteComment, { isLoading: deletingComment }] = useDeleteNewsCommentMutation();

  const likes = (likesData?.items ?? []) as LikeItem[];
  const comments = (commentsData?.items ?? []) as CommentItem[];

  // Group replies under their parent using @name prefix matching.
  const threads = useMemo(() => {
    const nameToIdx = new Map<string, number>();
    const result: Array<{ comment: CommentItem; replies: CommentItem[] }> = [];
    for (const comment of comments) {
      let attached = false;
      if (comment.content.startsWith("@")) {
        // Find the longest-matching commenter name after @
        let bestIdx = -1;
        let bestLen = 0;
        for (const [name, idx] of nameToIdx) {
          const prefix = `@${name}`;
          if (
            comment.content.startsWith(prefix) &&
            (comment.content.length === prefix.length || /[\s,]/.test(comment.content[prefix.length])) &&
            prefix.length > bestLen
          ) {
            bestLen = prefix.length;
            bestIdx = idx;
          }
        }
        if (bestIdx !== -1) {
          result[bestIdx].replies.push(comment);
          attached = true;
        }
      }
      if (!attached) {
        const idx = result.length;
        result.push({ comment, replies: [] });
        nameToIdx.set(comment.name, idx);
      }
    }
    return result;
  }, [comments]);

  const toggleReplies = (commentId: number) =>
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      next.has(commentId) ? next.delete(commentId) : next.add(commentId);
      return next;
    });

  const startReply = (name: string, commentId: number) => {
    setReplyTo({ commentId, name });
    // Expand that thread so the reply will be visible
    setExpandedReplies((prev) => { const n = new Set(prev); n.add(commentId); return n; });
    setCommentText("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const cancelReply = () => {
    setReplyTo(null);
    setCommentText("");
  };

  const submitComment = async () => {
    const text = commentText.trim();
    if (!text || posting) return;
    const content = replyTo ? `@${replyTo.name} ${text}` : text;
    try {
      await postComment({ contentId, content }).unwrap();
      setCommentText("");
      setReplyTo(null);
    } catch {
      // handled by RTK
    }
  };

  return (
    <div className="border-t border-border bg-muted/30">
      {/* Tab strip */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setTab("comments")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
            tab === "comments"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Comments ({comments.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("likes")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
            tab === "likes"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Heart className="h-3.5 w-3.5" />
          Liked by ({likes.length})
        </button>
      </div>

      {tab === "comments" ? (
        <div className="p-4">
          {commentsLoading ? (
            <p className="text-xs text-muted-foreground">Loading comments…</p>
          ) : threads.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">No comments yet. Be the first.</p>
          ) : (
            <div className="mb-4 space-y-4">
              {threads.map(({ comment: parent, replies }) => {
                const repliesExpanded = expandedReplies.has(parent.commentId);
                return (
                  <div key={parent.commentId}>
                    {/* Parent comment */}
                    <div className="flex items-start gap-2.5">
                      {parent.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={parent.avatarUrl} alt={parent.name} className="h-7 w-7 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {initials(parent.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground">{parent.name}</span>
                          <span className="text-[10px] text-muted-foreground">{relativeTime(parent.createdAt)}</span>
                          {parent.canDelete ? (
                            <button
                              type="button"
                              disabled={deletingComment}
                              onClick={() => void deleteComment({ commentId: parent.commentId, contentId })}
                              className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-foreground leading-relaxed">{parent.content}</p>
                        <button
                          type="button"
                          onClick={() => startReply(parent.name, parent.commentId)}
                          className="mt-1 text-[10px] font-semibold text-muted-foreground hover:text-primary transition-colors"
                        >
                          Reply
                        </button>
                      </div>
                    </div>

                    {/* Replies toggle — Instagram style */}
                    {replies.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleReplies(parent.commentId)}
                        className="mt-2 ml-9 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="h-px w-5 bg-border inline-block" />
                        {repliesExpanded
                          ? "Hide replies"
                          : `View ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
                        <ChevronDown className={`h-3 w-3 transition-transform ${repliesExpanded ? "rotate-180" : ""}`} />
                      </button>
                    )}

                    {/* Expanded replies */}
                    {repliesExpanded && (
                      <div className="mt-2 ml-9 space-y-3 border-l-2 border-border/50 pl-3">
                        {replies.map((reply) => {
                          const mention = `@${parent.name}`;
                          const hasMention = reply.content.startsWith(mention) && (reply.content.length === mention.length || /[\s,]/.test(reply.content[mention.length]));
                          const body = hasMention ? reply.content.slice(mention.length).trimStart() : reply.content;
                          return (
                            <div key={reply.commentId} className="flex items-start gap-2">
                              {reply.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={reply.avatarUrl} alt={reply.name} className="h-6 w-6 shrink-0 rounded-full object-cover" />
                              ) : (
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-[9px] font-bold text-sky-600">
                                  {initials(reply.name)}
                                </div>
                              )}
                              <div className="min-w-0 flex-1 rounded-xl bg-sky-500/5 px-3 py-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-semibold text-foreground">{reply.name}</span>
                                  <span className="text-[10px] text-muted-foreground">{relativeTime(reply.createdAt)}</span>
                                  {reply.canDelete ? (
                                    <button
                                      type="button"
                                      disabled={deletingComment}
                                      onClick={() => void deleteComment({ commentId: reply.commentId, contentId })}
                                      className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  ) : null}
                                </div>
                                <p className="mt-0.5 text-[11px] text-foreground leading-relaxed">
                                  {hasMention && (
                                    <span className="font-semibold text-sky-500">{mention}{" "}</span>
                                  )}
                                  {body}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => startReply(parent.name, parent.commentId)}
                                  className="mt-1 text-[10px] font-semibold text-muted-foreground hover:text-primary transition-colors"
                                >
                                  Reply
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Admin comment / reply input */}
          <div className="space-y-1.5">
            {replyTo && (
              <div className="flex items-center gap-1.5 rounded-md bg-primary/5 px-2.5 py-1.5">
                <span className="text-[11px] text-muted-foreground">
                  Replying to <span className="font-semibold text-primary">@{replyTo.name}</span>
                </span>
                <button
                  type="button"
                  onClick={cancelReply}
                  className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                  title="Cancel reply"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5">
                <input
                  ref={inputRef}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { cancelReply(); return; }
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submitComment(); }
                  }}
                  placeholder={replyTo ? `Reply to @${replyTo.name}…` : "Add a comment as admin…"}
                  className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  disabled={!commentText.trim() || posting}
                  onClick={() => void submitComment()}
                  className="text-primary disabled:opacity-40 hover:text-primary/80 transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4">
          {likesLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : likes.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">No likes yet.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {likes.map((like) => (
                <div key={like.userId} className="flex items-center gap-2">
                  {like.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={like.avatarUrl}
                      alt={like.name}
                      className="h-7 w-7 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {initials(like.name)}
                    </div>
                  )}
                  <span className="text-xs font-medium text-foreground">{like.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
