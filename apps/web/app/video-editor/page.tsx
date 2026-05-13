"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Download,
  Dumbbell,
  Loader2,
  Pause,
  Play,
  Plus,
  Scissors,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";

import { AdminShell } from "../../components/admin/shell";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  useCreateExerciseMutation,
  useCreateMediaUploadUrlMutation,
} from "../../lib/apiSlice";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../components/ui/select";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";

// ─── Types ───────────────────────────────────────────────────────────────────

type ClipStatus = "idle" | "exporting" | "done" | "uploading" | "created";

type Clip = {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  color: string;
  status: ClipStatus;
  exportProgress: number;
  exportedBlob?: Blob;
  exportedUrl?: string;
  createdExerciseName?: string;
};

type DragState = {
  clipId: string;
  handle: "left" | "right" | "body";
  startX: number;
  startTimes: { start: number; end: number };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CLIP_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#f97316", "#06b6d4", "#84cc16",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m}:${String(sec).padStart(2, "0")}.${ms}`;
}

// Singleton ffmpeg instance shared across renders
let _ffmpeg: any = null;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VideoEditorPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoObjectUrl, setVideoObjectUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [createDialog, setCreateDialog] = useState<Clip | null>(null);
  const [exerciseForm, setExerciseForm] = useState({
    name: "", category: "", sets: "", reps: "", time: "", rest: "", cues: "",
  });
  const [isDragOver, setIsDragOver] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = dragState;

  const [createExercise] = useCreateExerciseMutation();
  const [createUploadUrl] = useCreateMediaUploadUrlMutation();

  // ── FFmpeg loading ──────────────────────────────────────────────────────────

  const loadFFmpeg = useCallback(async () => {
    if (_ffmpeg || ffmpegLoading) return;
    setFfmpegLoading(true);
    try {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { toBlobURL } = await import("@ffmpeg/util");
      const ff = new FFmpeg();
      const base = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ff.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
      });
      _ffmpeg = ff;
      setFfmpegReady(true);
    } catch (e) {
      console.error("FFmpeg load failed", e);
    } finally {
      setFfmpegLoading(false);
    }
  }, [ffmpegLoading]);

  // ── File selection ──────────────────────────────────────────────────────────

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith("video/")) return;
      if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
      const url = URL.createObjectURL(file);
      setVideoFile(file);
      setVideoObjectUrl(url);
      setClips([]);
      setSelectedClipId(null);
      setCurrentTime(0);
      setIsPlaying(false);
      void loadFFmpeg();
    },
    [videoObjectUrl, loadFFmpeg],
  );

  // ── Video events ────────────────────────────────────────────────────────────

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => setCurrentTime(video.currentTime);
    const onDuration = () => setDuration(video.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("durationchange", onDuration);
    video.addEventListener("loadedmetadata", onDuration);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("durationchange", onDuration);
      video.removeEventListener("loadedmetadata", onDuration);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [videoObjectUrl]);

  // Stop at clip end when previewing a selected clip
  useEffect(() => {
    if (!selectedClipId || !isPlaying) return;
    const clip = clips.find((c) => c.id === selectedClipId);
    if (clip && currentTime >= clip.endTime) {
      videoRef.current?.pause();
    }
  }, [currentTime, selectedClipId, clips, isPlaying]);

  // ── Timeline drag ────────────────────────────────────────────────────────────

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragRef.current) return;
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect || !duration) return;
      const ratio = (e.clientX - rect.left) / rect.width;
      const t = Math.max(0, Math.min(duration, ratio * duration));
      if (videoRef.current) videoRef.current.currentTime = t;
      setCurrentTime(t);
    },
    [duration],
  );

  const startDrag = useCallback(
    (e: React.MouseEvent, clipId: string, handle: DragState["handle"]) => {
      e.stopPropagation();
      e.preventDefault();
      const clip = clips.find((c) => c.id === clipId);
      if (!clip) return;
      setDragState({
        clipId,
        handle,
        startX: e.clientX,
        startTimes: { start: clip.startTime, end: clip.endTime },
      });
      setSelectedClipId(clipId);
    },
    [clips],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag || !duration) return;
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = e.clientX - drag.startX;
      const dSec = (dx / rect.width) * duration;
      const MIN = 1;
      setClips((prev) =>
        prev.map((c) => {
          if (c.id !== drag.clipId) return c;
          let { start, end } = drag.startTimes;
          if (drag.handle === "left") {
            start = Math.max(0, Math.min(end - MIN, start + dSec));
          } else if (drag.handle === "right") {
            end = Math.min(duration, Math.max(start + MIN, end + dSec));
          } else {
            const len = end - start;
            start = Math.max(0, Math.min(duration - len, start + dSec));
            end = start + len;
          }
          return { ...c, startTime: start, endTime: end };
        }),
      );
    };
    const onUp = () => setDragState(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [duration]);

  // ── Clip management ──────────────────────────────────────────────────────────

  const addClip = () => {
    if (!duration) return;
    const start = currentTime;
    const len = Math.min(30, duration * 0.25);
    const end = Math.min(duration, start + len);
    const color = CLIP_COLORS[clips.length % CLIP_COLORS.length];
    const id = crypto.randomUUID();
    const newClip: Clip = {
      id,
      name: `Clip ${clips.length + 1}`,
      startTime: start,
      endTime: end,
      color,
      status: "idle",
      exportProgress: 0,
    };
    setClips((prev) => [...prev, newClip]);
    setSelectedClipId(id);
  };

  const deleteClip = (id: string) => {
    setClips((prev) => {
      const clip = prev.find((c) => c.id === id);
      if (clip?.exportedUrl) URL.revokeObjectURL(clip.exportedUrl);
      return prev.filter((c) => c.id !== id);
    });
    if (selectedClipId === id) setSelectedClipId(null);
  };

  const renameClip = (id: string, name: string) => {
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  const playClip = (clip: Clip) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = clip.startTime;
    setSelectedClipId(clip.id);
    void videoRef.current.play();
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    isPlaying ? v.pause() : void v.play();
  };

  // ── Export ────────────────────────────────────────────────────────────────────

  const exportClip = async (clipId: string) => {
    if (!_ffmpeg || !videoFile) return;
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;

    setClips((prev) =>
      prev.map((c) => (c.id === clipId ? { ...c, status: "exporting", exportProgress: 0 } : c)),
    );

    try {
      const { fetchFile } = await import("@ffmpeg/util");
      const ff = _ffmpeg;
      const ext = videoFile.name.split(".").pop() || "mp4";
      const inName = `in_${clipId}.${ext}`;
      const outName = `out_${clipId}.mp4`;

      const onProgress = ({ progress }: { progress: number }) => {
        setClips((prev) =>
          prev.map((c) =>
            c.id === clipId ? { ...c, exportProgress: Math.round(progress * 100) } : c,
          ),
        );
      };
      ff.on("progress", onProgress);

      await ff.writeFile(inName, await fetchFile(videoFile));
      await ff.exec([
        "-i", inName,
        "-ss", String(clip.startTime.toFixed(3)),
        "-to", String(clip.endTime.toFixed(3)),
        "-c:v", "libx264",
        "-c:a", "aac",
        "-movflags", "+faststart",
        "-preset", "fast",
        outName,
      ]);

      const data = (await ff.readFile(outName)) as Uint8Array<ArrayBuffer>;
      const blob = new Blob([data], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);

      ff.off("progress", onProgress);
      await ff.deleteFile(inName).catch(() => {});
      await ff.deleteFile(outName).catch(() => {});

      setClips((prev) =>
        prev.map((c) =>
          c.id === clipId
            ? { ...c, status: "done", exportProgress: 100, exportedBlob: blob, exportedUrl: url }
            : c,
        ),
      );
    } catch (err) {
      console.error("Export error:", err);
      setClips((prev) =>
        prev.map((c) => (c.id === clipId ? { ...c, status: "idle", exportProgress: 0 } : c)),
      );
    }
  };

  const downloadClip = (clip: Clip) => {
    if (!clip.exportedUrl) return;
    const a = document.createElement("a");
    a.href = clip.exportedUrl;
    a.download = `${clip.name.replace(/\s+/g, "-")}.mp4`;
    a.click();
  };

  // ── Create exercise from clip ──────────────────────────────────────────────────

  const createExerciseFromClip = async () => {
    if (!createDialog?.exportedBlob || !exerciseForm.name.trim()) return;
    const clip = createDialog;
    const exportedBlob = clip.exportedBlob;
    if (!exportedBlob) return;
    setClips((prev) => prev.map((c) => (c.id === clip.id ? { ...c, status: "uploading" } : c)));
    try {
      const fileName = `${Date.now()}-${clip.name.replace(/\s+/g, "-")}.mp4`;
      const { uploadUrl, publicUrl } = await createUploadUrl({
        folder: "exercise-videos",
        fileName,
        contentType: "video/mp4",
        sizeBytes: exportedBlob.size,
        client: "web",
      }).unwrap();

      await fetch(uploadUrl, {
        method: "PUT",
        body: exportedBlob,
        headers: { "Content-Type": "video/mp4" },
      });

      await createExercise({
        name: exerciseForm.name.trim(),
        category: exerciseForm.category || undefined,
        sets: exerciseForm.sets ? Number(exerciseForm.sets) : undefined,
        reps: exerciseForm.reps ? Number(exerciseForm.reps) : undefined,
        duration: exerciseForm.time ? Number(exerciseForm.time) : undefined,
        restSeconds: exerciseForm.rest ? Number(exerciseForm.rest) : undefined,
        cues: exerciseForm.cues || undefined,
        videoUrl: publicUrl,
      }).unwrap();

      setClips((prev) =>
        prev.map((c) =>
          c.id === clip.id
            ? { ...c, status: "created", createdExerciseName: exerciseForm.name.trim() }
            : c,
        ),
      );
      setCreateDialog(null);
      setExerciseForm({ name: "", category: "", sets: "", reps: "", time: "", rest: "", cues: "" });
    } catch {
      setClips((prev) => prev.map((c) => (c.id === clip.id ? { ...c, status: "done" } : c)));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const pct = (t: number) => (duration ? `${((t / duration) * 100).toFixed(3)}%` : "0%");

  return (
    <AdminShell
      title="Video Editor"
      subtitle="Upload a session recording, cut it into clips, and assign each to an exercise or athlete."
    >
      {!videoObjectUrl ? (
        /* ── Upload area ── */
        <div
          className={`flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border-2 border-dashed transition ${
            isDragOver ? "border-primary bg-primary/5" : "border-border bg-card"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFileSelect(file);
          }}
        >
          <Video className="mb-4 h-14 w-14 text-muted-foreground/40" />
          <p className="text-lg font-semibold text-foreground">Drop a video file here</p>
          <p className="mt-1 text-sm text-muted-foreground">MP4, MOV, WebM — up to any size</p>
          <label className="mt-6 cursor-pointer">
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            />
            <Button type="button">
              <Upload className="mr-2 h-4 w-4" /> Choose file
            </Button>
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Top bar ── */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                URL.revokeObjectURL(videoObjectUrl);
                setVideoObjectUrl("");
                setVideoFile(null);
                setClips([]);
              }}
            >
              <X className="mr-1 h-3.5 w-3.5" /> Change video
            </Button>
            <span className="text-sm text-muted-foreground">{videoFile?.name}</span>
            {ffmpegLoading && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading video processor…
              </span>
            )}
            {ffmpegReady && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-green-600">
                <Check className="h-3.5 w-3.5" /> Ready to export
              </span>
            )}
          </div>

          {/* ── Main layout: player + clips ── */}
          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            {/* Player */}
            <div className="space-y-3">
              <div className="overflow-hidden rounded-2xl border border-border bg-black">
                <video
                  ref={videoRef}
                  src={videoObjectUrl}
                  className="w-full"
                  preload="metadata"
                />
              </div>

              {/* Player controls */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card hover:bg-primary/10"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <span className="font-mono text-sm text-foreground">{fmt(currentTime)}</span>
                <span className="text-sm text-muted-foreground">/</span>
                <span className="font-mono text-sm text-muted-foreground">{fmt(duration)}</span>
                <div className="ml-auto">
                  <Button size="sm" onClick={addClip}>
                    <Scissors className="mr-1.5 h-3.5 w-3.5" /> Mark clip here
                  </Button>
                </div>
              </div>

              {/* ── Timeline ── */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Timeline</p>
                <div
                  ref={timelineRef}
                  className="relative h-16 cursor-crosshair select-none overflow-hidden rounded-xl border border-border bg-secondary/40"
                  onClick={handleTimelineClick}
                >
                  {/* Time ruler ticks */}
                  {duration > 0 && Array.from({ length: Math.min(10, Math.floor(duration / 5)) }).map((_, i) => {
                    const t = ((i + 1) * (duration / Math.min(10, Math.floor(duration / 5))));
                    return (
                      <div
                        key={i}
                        className="absolute top-0 h-2 w-px bg-border"
                        style={{ left: pct(t) }}
                      />
                    );
                  })}

                  {/* Clip segments */}
                  {clips.map((clip) => (
                    <div
                      key={clip.id}
                      className={`absolute top-3 h-10 rounded-md opacity-80 transition-opacity hover:opacity-100 ${
                        selectedClipId === clip.id ? "ring-2 ring-white ring-offset-1" : ""
                      }`}
                      style={{
                        left: pct(clip.startTime),
                        width: `calc(${pct(clip.endTime)} - ${pct(clip.startTime)})`,
                        backgroundColor: clip.color,
                        cursor: dragState?.clipId === clip.id && dragState.handle === "body" ? "grabbing" : "grab",
                      }}
                      onMouseDown={(e) => startDrag(e, clip.id, "body")}
                    >
                      {/* Left handle */}
                      <div
                        className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l-md bg-black/30 hover:bg-black/50"
                        onMouseDown={(e) => startDrag(e, clip.id, "left")}
                      />
                      {/* Right handle */}
                      <div
                        className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r-md bg-black/30 hover:bg-black/50"
                        onMouseDown={(e) => startDrag(e, clip.id, "right")}
                      />
                      {/* Clip label */}
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center truncate px-3 text-[10px] font-semibold text-white drop-shadow">
                        {clip.name}
                      </span>
                    </div>
                  ))}

                  {/* Playhead */}
                  {duration > 0 && (
                    <div
                      className="pointer-events-none absolute top-0 h-full w-0.5 bg-primary"
                      style={{ left: pct(currentTime) }}
                    >
                      <div className="absolute -top-0.5 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary" />
                    </div>
                  )}
                </div>

                {/* Time labels under timeline */}
                <div className="flex justify-between px-1 text-[10px] text-muted-foreground">
                  <span>{fmt(0)}</span>
                  {duration > 0 && <span>{fmt(duration / 2)}</span>}
                  {duration > 0 && <span>{fmt(duration)}</span>}
                </div>
              </div>
            </div>

            {/* ── Clip list ── */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">
                Clips{clips.length > 0 && ` (${clips.length})`}
              </p>

              {clips.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
                  <Scissors className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">
                    Scrub to a point in the video and click "Mark clip here"
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {clips.map((clip) => (
                    <div
                      key={clip.id}
                      className={`rounded-2xl border bg-card p-3 transition ${
                        selectedClipId === clip.id
                          ? "border-primary/50 shadow-sm"
                          : "border-border"
                      }`}
                      onClick={() => setSelectedClipId(clip.id)}
                    >
                      {/* Clip name */}
                      <div className="mb-2 flex items-center gap-2">
                        <div
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: clip.color }}
                        />
                        {editingClipId === clip.id ? (
                          <Input
                            autoFocus
                            className="h-6 flex-1 px-1.5 py-0 text-xs"
                            value={clip.name}
                            onChange={(e) => renameClip(clip.id, e.target.value)}
                            onBlur={() => setEditingClipId(null)}
                            onKeyDown={(e) => { if (e.key === "Enter") setEditingClipId(null); }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <button
                            type="button"
                            className="flex-1 truncate text-left text-xs font-semibold text-foreground hover:text-primary"
                            onDoubleClick={(e) => { e.stopPropagation(); setEditingClipId(clip.id); }}
                          >
                            {clip.name}
                          </button>
                        )}
                        {clip.status === "created" && (
                          <Badge variant="default" className="shrink-0 text-[9px]">
                            <Check className="mr-0.5 h-2.5 w-2.5" /> In library
                          </Badge>
                        )}
                      </div>

                      {/* Timestamps */}
                      <div className="mb-2 flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                        <span>{fmt(clip.startTime)}</span>
                        <span>→</span>
                        <span>{fmt(clip.endTime)}</span>
                        <span className="ml-auto">{fmt(clip.endTime - clip.startTime)}</span>
                      </div>

                      {/* Export progress bar */}
                      {clip.status === "exporting" && (
                        <div className="mb-2 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-1.5 rounded-full bg-primary transition-all"
                            style={{ width: `${clip.exportProgress}%` }}
                          />
                        </div>
                      )}
                      {clip.status === "uploading" && (
                        <div className="mb-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
                        </div>
                      )}
                      {clip.status === "created" && clip.createdExerciseName && (
                        <p className="mb-2 text-[10px] text-muted-foreground">
                          → {clip.createdExerciseName}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="flex items-center gap-1 rounded-lg border border-border bg-secondary/40 px-2 py-1 text-[10px] hover:bg-primary/10"
                          onClick={(e) => { e.stopPropagation(); playClip(clip); }}
                        >
                          <Play className="h-2.5 w-2.5" /> Preview
                        </button>

                        {clip.status === "idle" && (
                          <button
                            type="button"
                            disabled={!ffmpegReady}
                            className="flex items-center gap-1 rounded-lg border border-border bg-secondary/40 px-2 py-1 text-[10px] hover:bg-primary/10 disabled:opacity-40"
                            onClick={(e) => { e.stopPropagation(); void exportClip(clip.id); }}
                          >
                            {ffmpegLoading ? (
                              <><Loader2 className="h-2.5 w-2.5 animate-spin" /> Loading…</>
                            ) : (
                              <><Scissors className="h-2.5 w-2.5" /> Export</>
                            )}
                          </button>
                        )}

                        {clip.status === "exporting" && (
                          <span className="flex items-center gap-1 rounded-lg border border-border bg-secondary/40 px-2 py-1 text-[10px] text-muted-foreground">
                            <Loader2 className="h-2.5 w-2.5 animate-spin" /> {clip.exportProgress}%
                          </span>
                        )}

                        {clip.status === "done" && (
                          <>
                            <button
                              type="button"
                              className="flex items-center gap-1 rounded-lg border border-border bg-secondary/40 px-2 py-1 text-[10px] hover:bg-primary/10"
                              onClick={(e) => { e.stopPropagation(); downloadClip(clip); }}
                            >
                              <Download className="h-2.5 w-2.5" /> Download
                            </button>
                            <button
                              type="button"
                              className="flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2 py-1 text-[10px] text-primary hover:bg-primary/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExerciseForm({
                                  name: clip.name,
                                  category: "", sets: "", reps: "", time: "", rest: "", cues: "",
                                });
                                setCreateDialog(clip);
                              }}
                            >
                              <Dumbbell className="h-2.5 w-2.5" /> Add to library
                            </button>
                          </>
                        )}

                        {clip.status === "created" && (
                          <button
                            type="button"
                            className="flex items-center gap-1 rounded-lg border border-border bg-secondary/40 px-2 py-1 text-[10px] hover:bg-primary/10"
                            onClick={(e) => { e.stopPropagation(); downloadClip(clip); }}
                          >
                            <Download className="h-2.5 w-2.5" /> Download
                          </button>
                        )}

                        <button
                          type="button"
                          className="ml-auto flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] text-destructive hover:bg-destructive/10"
                          onClick={(e) => { e.stopPropagation(); deleteClip(clip.id); }}
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create exercise dialog ── */}
      <Dialog
        open={!!createDialog}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialog(null);
            setExerciseForm({ name: "", category: "", sets: "", reps: "", time: "", rest: "", cues: "" });
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Exercise Library</DialogTitle>
            <DialogDescription>
              This clip will be uploaded as the demo video for the new exercise.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Exercise name *</Label>
              <Input
                autoFocus
                placeholder="e.g. Box Jump"
                value={exerciseForm.name}
                onChange={(e) => setExerciseForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select
                items={[
                  { label: "Select category…", value: "" },
                  ...["Power","Speed","Strength","Conditioning","Agility","Plyometrics",
                      "Mobility","Flexibility","Warmup","Cooldown","Recovery","Core",
                      "Balance","Endurance","Sport-Specific"].map((c) => ({ label: c, value: c })),
                ]}
                value={exerciseForm.category}
                onValueChange={(v) => setExerciseForm((f) => ({ ...f, category: v ?? "" }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectPopup>
                  {[{ label: "Select category…", value: "" },
                    ...["Power","Speed","Strength","Conditioning","Agility","Plyometrics",
                        "Mobility","Flexibility","Warmup","Cooldown","Recovery","Core",
                        "Balance","Endurance","Sport-Specific"].map((c) => ({ label: c, value: c }))
                  ].map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Sets</Label>
                <Input placeholder="3" value={exerciseForm.sets} onChange={(e) => setExerciseForm((f) => ({ ...f, sets: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reps</Label>
                <Input placeholder="10" value={exerciseForm.reps} onChange={(e) => setExerciseForm((f) => ({ ...f, reps: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Time (s)</Label>
                <Input placeholder="30" value={exerciseForm.time} onChange={(e) => setExerciseForm((f) => ({ ...f, time: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Rest (s)</Label>
                <Input placeholder="60" value={exerciseForm.rest} onChange={(e) => setExerciseForm((f) => ({ ...f, rest: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Coaching cues</Label>
              <Textarea
                placeholder="Core tight, drive through heel…"
                value={exerciseForm.cues}
                onChange={(e) => setExerciseForm((f) => ({ ...f, cues: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialog(null)}>Cancel</Button>
              <Button
                disabled={!exerciseForm.name.trim() || createDialog?.status === "uploading"}
                onClick={() => void createExerciseFromClip()}
              >
                {createDialog?.status === "uploading" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</>
                ) : (
                  <><Dumbbell className="mr-2 h-4 w-4" /> Create exercise</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
