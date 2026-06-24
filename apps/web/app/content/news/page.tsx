"use client";

import { useMemo, useRef, useState } from "react";
import { Image, Link2, Newspaper, Pencil, Plus, Trash2, Upload, Video, X } from "lucide-react";

import { AdminShell } from "../../../components/admin/shell";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
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

const emptyForm = {
  title: "",
  content: "",
  body: "",
  category: "",
};

function parseNewsBody(raw?: string | null): { text: string; media: NewsMediaItem[] } {
  const fallback = { text: raw ?? "", media: [] };
  if (!raw?.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw) as { text?: unknown; body?: unknown; media?: unknown };
    const media = Array.isArray(parsed.media)
      ? parsed.media
          .map((item): NewsMediaItem | null => {
            if (!item || typeof item !== "object") return null;
            const candidate = item as Partial<NewsMediaItem>;
            const url = typeof candidate.url === "string" ? candidate.url.trim() : "";
            const type = candidate.type === "video" ? "video" : "image";
            if (!url) return null;
            return {
              url,
              type,
              caption: typeof candidate.caption === "string" ? candidate.caption : null,
              posterUrl: typeof candidate.posterUrl === "string" ? candidate.posterUrl : null,
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
  const fileRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => (data?.items ?? []) as NewsItem[], [data]);
  const isSaving = isCreating || isUpdating || isUploading;

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
    });
    setMedia(parsed.media);
    setError(null);
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    try {
      const uploaded: NewsMediaItem[] = [];
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
        const uploadRes = await fetch(result.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!uploadRes.ok) throw new Error("Upload failed.");
        uploaded.push({
          url: result.publicUrl,
          type: file.type.startsWith("video/") ? "video" : "image",
          caption: "",
        });
      }
      if (uploaded.length) setMedia((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload media.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addMediaUrl = () => {
    const url = mediaUrl.trim();
    if (!url) return;
    setMedia((prev) => [...prev, { url, type: mediaType, caption: "" }]);
    setMediaUrl("");
    setMediaType("image");
  };

  const save = async () => {
    setError(null);
    const title = form.title.trim();
    const content = form.content.trim();
    if (!title || !content) {
      setError("Title and summary are required.");
      return;
    }
    const payload = {
      title,
      content,
      body:
        form.body.trim() || media.length
          ? JSON.stringify({
              text: form.body.trim(),
              media: media.map((item) => ({
                url: item.url,
                type: item.type,
                caption: item.caption?.trim() || null,
                posterUrl: item.posterUrl?.trim() || null,
              })),
            })
          : undefined,
      category: form.category.trim() || undefined,
      surface: "news",
      type: media.some((item) => item.type === "video")
        ? "video"
        : media.some((item) => item.type === "image")
          ? "image"
          : "article",
    };
    try {
      if (editing) {
        await updateContent({ id: editing.id, data: payload }).unwrap();
      } else {
        await createContent(payload).unwrap();
      }
      reset();
      refetch();
    } catch {
      setError("Could not save news post.");
    }
  };

  const remove = async (id: number) => {
    try {
      await deleteContent({ id }).unwrap();
      if (editing?.id === id) reset();
      refetch();
    } catch {
      setError("Could not delete news post.");
    }
  };

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
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Newspaper className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {editing ? "Edit post" : "Create post"}
              </h2>
              <p className="text-xs text-muted-foreground">Published posts notify app users.</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Title"
            />
            <Input
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              placeholder="Category, e.g. Academy"
            />
            <Textarea
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
              placeholder="Short summary"
            />
            <Textarea
              value={form.body}
              onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
              placeholder="Post text / caption"
              className="min-h-48"
            />

            <div className="rounded-xl border border-border bg-background p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Media</p>
                  <p className="text-xs text-muted-foreground">Upload photos/videos or paste hosted media URLs.</p>
                </div>
                <Button variant="outline" onClick={() => fileRef.current?.click()} loading={isUploading}>
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(event) => void uploadFiles(event.target.files)}
                />
              </div>

              <div className="grid gap-2 md:grid-cols-[110px_1fr_auto]">
                <select
                  value={mediaType}
                  onChange={(event) => setMediaType(event.target.value === "video" ? "video" : "image")}
                  className="h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                >
                  <option value="image">Photo</option>
                  <option value="video">Video</option>
                </select>
                <Input
                  value={mediaUrl}
                  onChange={(event) => setMediaUrl(event.target.value)}
                  placeholder="https://..."
                />
                <Button variant="outline" onClick={addMediaUrl}>
                  <Link2 className="h-4 w-4" />
                  Add
                </Button>
              </div>

              {media.length ? (
                <div className="mt-4 space-y-3">
                  {media.map((item, index) => (
                    <div key={`${item.url}-${index}`} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          {item.type === "video" ? <Video className="h-5 w-5" /> : <Image className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className="truncate text-xs text-muted-foreground">{item.url}</p>
                          <Input
                            value={item.caption ?? ""}
                            onChange={(event) =>
                              setMedia((prev) =>
                                prev.map((row, rowIndex) =>
                                  rowIndex === index ? { ...row, caption: event.target.value } : row,
                                ),
                              )
                            }
                            placeholder="Media caption"
                          />
                        </div>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => setMedia((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
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
              <Button onClick={save} loading={isSaving}>
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

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">Posts</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading news...</p>
          ) : items.length ? (
            <div className="space-y-3">
              {items.map((item) => {
                const parsed = parseNewsBody(item.body);
                return (
                <div key={item.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.category ?? "Uncategorised"} • {item.likeCount ?? 0} likes •{" "}
                        {item.commentCount ?? 0} comments • {parsed.media.length} media
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => edit(item)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        loading={isDeleting}
                        onClick={() => remove(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{item.content}</p>
                </div>
              );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">
              No news posts yet.
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
