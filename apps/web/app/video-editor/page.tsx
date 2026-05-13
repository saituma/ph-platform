"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Dumbbell,
  Keyboard,
  Loader2,
  Pause,
  Play,
  Scissors,
  SkipBack,
  SkipForward,
  Trash2,
  Upload,
  Video,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
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

// ─── Types ────────────────────────────────────────────────────────────────────

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
  "#3b82f6","#10b981","#f59e0b","#8b5cf6",
  "#ec4899","#f97316","#06b6d4","#84cc16",
];

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
const CATEGORIES = [
  "Power","Speed","Strength","Conditioning","Agility","Plyometrics",
  "Mobility","Flexibility","Warmup","Cooldown","Recovery","Core",
  "Balance","Endurance","Sport-Specific",
];

let _ffmpeg: any = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(s: number, showMs = true) {
  if (!isFinite(s)) return "0:00.0";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return showMs
    ? `${m}:${String(sec).padStart(2, "0")}.${ms}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

async function captureFrames(video: HTMLVideoElement, count: number): Promise<string[]> {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 90;
  const ctx = canvas.getContext("2d")!;
  const dur = video.duration;
  const saved = video.currentTime;
  const frames: string[] = [];
  for (let i = 0; i < count; i++) {
    video.currentTime = (i / count) * dur;
    await new Promise<void>((res) => {
      const onSeeked = () => { video.removeEventListener("seeked", onSeeked); res(); };
      video.addEventListener("seeked", onSeeked);
    });
    ctx.drawImage(video, 0, 0, 160, 90);
    frames.push(canvas.toDataURL("image/jpeg", 0.6));
  }
  video.currentTime = saved;
  return frames;
}

async function buildWaveform(file: File, samples: number): Promise<number[]> {
  if (file.size > 300 * 1024 * 1024) return []; // skip >300MB
  try {
    const ctx = new OfflineAudioContext(1, 1, 44100);
    const buf = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(buf);
    const data = decoded.getChannelData(0);
    const blockSize = Math.floor(data.length / samples);
    const waveform: number[] = [];
    for (let i = 0; i < samples; i++) {
      let max = 0;
      for (let j = 0; j < blockSize; j++) max = Math.max(max, Math.abs(data[i * blockSize + j]));
      waveform.push(max);
    }
    return waveform;
  } catch {
    return [];
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VideoEditorPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
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
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [zoom, setZoom] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [exportQuality, setExportQuality] = useState<"fast" | "normal" | "high">("normal");

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = dragState;

  const [createExercise] = useCreateExerciseMutation();
  const [createUploadUrl] = useCreateMediaUploadUrlMutation();

  // ── FFmpeg ──────────────────────────────────────────────────────────────────

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

  // ── File select ─────────────────────────────────────────────────────────────

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith("video/")) return;
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoUrl(URL.createObjectURL(file));
      setVideoFile(file);
      setClips([]);
      setSelectedClipId(null);
      setCurrentTime(0);
      setIsPlaying(false);
      setThumbnails([]);
      setWaveform([]);
      setZoom(1);
      void loadFFmpeg();
      void buildWaveform(file, 200).then(setWaveform);
    },
    [videoUrl, loadFFmpeg],
  );

  // ── Video events ────────────────────────────────────────────────────────────

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime);
    const onDur = () => {
      setDuration(v.duration || 0);
      void captureFrames(v, 24).then(setThumbnails);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onDur);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onDur);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [videoUrl]);

  // Stop at clip end
  useEffect(() => {
    if (!selectedClipId || !isPlaying) return;
    const clip = clips.find((c) => c.id === selectedClipId);
    if (clip && currentTime >= clip.endTime) videoRef.current?.pause();
  }, [currentTime, selectedClipId, clips, isPlaying]);

  // Sync playback rate
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const v = videoRef.current;
      switch (e.key) {
        case " ":
          e.preventDefault();
          v && (isPlaying ? v.pause() : v.play());
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (v) v.currentTime = Math.max(0, v.currentTime - (e.shiftKey ? 5 : 1 / 30));
          break;
        case "ArrowRight":
          e.preventDefault();
          if (v) v.currentTime = Math.min(duration, v.currentTime + (e.shiftKey ? 5 : 1 / 30));
          break;
        case "Delete":
        case "Backspace":
          if (selectedClipId) deleteClip(selectedClipId);
          break;
        case "s":
        case "S":
          splitAtPlayhead();
          break;
        case "m":
        case "M":
          addClip();
          break;
        case "j":
        case "J":
          if (v) { v.playbackRate = -1; /* note: browsers may not support */ v.currentTime -= 5; }
          break;
        case "l":
        case "L":
          if (v) v.currentTime += 5;
          break;
        case "?":
          setShowShortcuts((p) => !p);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPlaying, selectedClipId, duration]);

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
      setDragState({ clipId, handle, startX: e.clientX, startTimes: { start: clip.startTime, end: clip.endTime } });
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
      const dSec = ((e.clientX - drag.startX) / rect.width) * duration;
      const MIN = 0.5;
      setClips((prev) =>
        prev.map((c) => {
          if (c.id !== drag.clipId) return c;
          let { start, end } = drag.startTimes;
          if (drag.handle === "left") start = Math.max(0, Math.min(end - MIN, start + dSec));
          else if (drag.handle === "right") end = Math.min(duration, Math.max(start + MIN, end + dSec));
          else {
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
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [duration]);

  // ── Clip operations ──────────────────────────────────────────────────────────

  const addClip = () => {
    if (!duration) return;
    const start = currentTime;
    const end = Math.min(duration, start + Math.min(30, duration * 0.25));
    const id = crypto.randomUUID();
    setClips((p) => [
      ...p,
      { id, name: `Clip ${p.length + 1}`, startTime: start, endTime: end,
        color: CLIP_COLORS[p.length % CLIP_COLORS.length], status: "idle", exportProgress: 0 },
    ]);
    setSelectedClipId(id);
  };

  const splitAtPlayhead = () => {
    if (!selectedClipId || !duration) return;
    const clip = clips.find((c) => c.id === selectedClipId);
    if (!clip || currentTime <= clip.startTime || currentTime >= clip.endTime) return;
    const idB = crypto.randomUUID();
    setClips((p) => {
      const idx = p.findIndex((c) => c.id === selectedClipId);
      const updated = [...p];
      updated[idx] = { ...clip, endTime: currentTime };
      updated.splice(idx + 1, 0, {
        ...clip, id: idB, name: `${clip.name}b`,
        startTime: currentTime, endTime: clip.endTime,
        color: CLIP_COLORS[(idx + 1) % CLIP_COLORS.length],
        status: "idle", exportProgress: 0,
        exportedBlob: undefined, exportedUrl: undefined,
      });
      return updated;
    });
    setSelectedClipId(idB);
  };

  const deleteClip = (id: string) => {
    setClips((p) => {
      const c = p.find((x) => x.id === id);
      if (c?.exportedUrl) URL.revokeObjectURL(c.exportedUrl);
      return p.filter((x) => x.id !== id);
    });
    if (selectedClipId === id) setSelectedClipId(null);
  };

  const renameClip = (id: string, name: string) =>
    setClips((p) => p.map((c) => (c.id === id ? { ...c, name } : c)));

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

  const stepFrame = (dir: 1 | -1) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(duration, v.currentTime + dir * (1 / 30)));
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // ── Timeline zoom ────────────────────────────────────────────────────────────

  const handleTimelineWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(1, Math.min(20, z * (e.deltaY < 0 ? 1.15 : 0.87))));
  };

  // ── Export ────────────────────────────────────────────────────────────────────

  const exportClip = async (clipId: string) => {
    if (!_ffmpeg || !videoFile) return;
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;
    setClips((p) => p.map((c) => (c.id === clipId ? { ...c, status: "exporting", exportProgress: 0 } : c)));
    try {
      const { fetchFile } = await import("@ffmpeg/util");
      const ff = _ffmpeg;
      const ext = videoFile.name.split(".").pop() || "mp4";
      const inName = `in_${clipId}.${ext}`;
      const outName = `out_${clipId}.mp4`;
      const preset = exportQuality === "fast" ? "ultrafast" : exportQuality === "high" ? "slow" : "fast";
      const crf = exportQuality === "fast" ? "28" : exportQuality === "high" ? "18" : "23";
      const onProg = ({ progress }: { progress: number }) =>
        setClips((p) => p.map((c) => (c.id === clipId ? { ...c, exportProgress: Math.round(progress * 100) } : c)));
      ff.on("progress", onProg);
      await ff.writeFile(inName, await fetchFile(videoFile));
      await ff.exec([
        "-i", inName,
        "-ss", clip.startTime.toFixed(3),
        "-to", clip.endTime.toFixed(3),
        "-c:v", "libx264", "-crf", crf, "-preset", preset,
        "-c:a", "aac", "-movflags", "+faststart",
        outName,
      ]);
      const data = await ff.readFile(outName);
      const blob = new Blob([data as BlobPart], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      ff.off("progress", onProg);
      await ff.deleteFile(inName).catch(() => {});
      await ff.deleteFile(outName).catch(() => {});
      setClips((p) => p.map((c) =>
        c.id === clipId ? { ...c, status: "done", exportProgress: 100, exportedBlob: blob, exportedUrl: url } : c,
      ));
    } catch (err) {
      console.error(err);
      setClips((p) => p.map((c) => (c.id === clipId ? { ...c, status: "idle", exportProgress: 0 } : c)));
    }
  };

  const downloadClip = (clip: Clip) => {
    if (!clip.exportedUrl) return;
    const a = document.createElement("a");
    a.href = clip.exportedUrl;
    a.download = `${clip.name.replace(/\s+/g, "-")}.mp4`;
    a.click();
  };

  // ── Create exercise ───────────────────────────────────────────────────────────

  const createExerciseFromClip = async () => {
    if (!createDialog?.exportedBlob || !exerciseForm.name.trim()) return;
    const clip = createDialog;
    const blob = clip.exportedBlob!;
    setClips((p) => p.map((c) => (c.id === clip.id ? { ...c, status: "uploading" } : c)));
    try {
      const fileName = `${Date.now()}-${clip.name.replace(/\s+/g, "-")}.mp4`;
      const { uploadUrl, publicUrl } = await createUploadUrl({
        folder: "exercise-videos", fileName, contentType: "video/mp4",
        sizeBytes: blob.size, client: "web",
      }).unwrap();
      await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": "video/mp4" } });
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
      setClips((p) => p.map((c) =>
        c.id === clip.id ? { ...c, status: "created", createdExerciseName: exerciseForm.name.trim() } : c,
      ));
      setCreateDialog(null);
      setExerciseForm({ name: "", category: "", sets: "", reps: "", time: "", rest: "", cues: "" });
    } catch {
      setClips((p) => p.map((c) => (c.id === clip.id ? { ...c, status: "done" } : c)));
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────────

  const pct = (t: number) => `${((t / (duration || 1)) * 100).toFixed(4)}%`;
  const playheadLeft = pct(currentTime);

  // ── Render ────────────────────────────────────────────────────────────────────

  if (!videoUrl) {
    return (
      <AdminShell title="Video Editor" subtitle="Upload a session recording, cut it into clips, and add them to the exercise library.">
        <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
        <div
          className={`flex min-h-[70vh] flex-col items-center justify-center rounded-2xl border-2 border-dashed transition ${
            isDragOver ? "border-primary bg-primary/5" : "border-border bg-card"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFileSelect(f);
          }}
        >
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <Video className="h-10 w-10 text-primary" />
          </div>
          <p className="text-xl font-bold text-foreground">Drop your video here</p>
          <p className="mt-2 text-sm text-muted-foreground">MP4, MOV, WebM — any size</p>
          <Button className="mt-8" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Choose file
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            Press <kbd className="rounded border border-border bg-secondary px-1 text-[10px]">?</kbd> anytime for keyboard shortcuts
          </p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Video Editor"
      subtitle={videoFile?.name ?? ""}
      actions={
        <div className="flex items-center gap-2">
          {ffmpegLoading && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading processor…
            </span>
          )}
          {ffmpegReady && (
            <span className="flex items-center gap-1.5 text-xs text-green-600">
              <Check className="h-3.5 w-3.5" /> Ready
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowShortcuts(true)}>
            <Keyboard className="mr-1.5 h-3.5 w-3.5" /> Shortcuts
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            URL.revokeObjectURL(videoUrl); setVideoUrl(""); setVideoFile(null); setClips([]);
          }}>
            <X className="mr-1.5 h-3.5 w-3.5" /> Change video
          </Button>
        </div>
      }
    >
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />

      <div className="space-y-4">
        {/* ── Main: player + clips ── */}
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          {/* Player */}
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl bg-black shadow-xl">
              <video ref={videoRef} src={videoUrl} className="w-full" preload="metadata" />
            </div>

            {/* Transport controls */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              {/* Frame step back */}
              <button type="button" onClick={() => stepFrame(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary">
                <ChevronLeft className="h-4 w-4" />
              </button>
              {/* Play/pause */}
              <button type="button" onClick={togglePlay}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow hover:bg-primary/90">
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
              </button>
              {/* Frame step forward */}
              <button type="button" onClick={() => stepFrame(1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary">
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Time */}
              <span className="font-mono text-sm text-foreground">{fmt(currentTime)}</span>
              <span className="text-muted-foreground">/</span>
              <span className="font-mono text-sm text-muted-foreground">{fmt(duration)}</span>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Speed */}
              <div className="flex items-center gap-1">
                {SPEED_OPTIONS.map((s) => (
                  <button key={s} type="button"
                    className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium transition ${
                      playbackRate === s
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setPlaybackRate(s)}
                  >{s}×</button>
                ))}
              </div>

              {/* Volume */}
              <button type="button" onClick={toggleMute}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary">
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>

              {/* Divider */}
              <div className="h-5 w-px bg-border" />

              {/* Clip actions */}
              <button type="button" onClick={addClip}
                className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
                title="Mark clip (M)">
                <Scissors className="h-3.5 w-3.5" /> Mark
              </button>
              <button type="button" onClick={splitAtPlayhead}
                disabled={!selectedClipId}
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-40"
                title="Split at playhead (S)">
                <SkipForward className="h-3.5 w-3.5" /> Split
              </button>
            </div>
          </div>

          {/* ── Clips panel ── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                Clips {clips.length > 0 && <span className="text-muted-foreground">({clips.length})</span>}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Quality:</span>
                {(["fast","normal","high"] as const).map((q) => (
                  <button key={q} type="button"
                    className={`rounded-md px-2 py-0.5 capitalize transition ${
                      exportQuality === q ? "bg-primary text-primary-foreground" : "hover:text-foreground"
                    }`}
                    onClick={() => setExportQuality(q)}
                  >{q}</button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto">
              {clips.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                  <Scissors className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-foreground">No clips yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Scrub to a point and press <kbd className="rounded border border-border bg-secondary px-1">M</kbd></p>
                </div>
              ) : clips.map((clip) => (
                <div key={clip.id}
                  className={`cursor-pointer rounded-2xl border bg-card p-3 transition ${
                    selectedClipId === clip.id ? "border-primary/60 shadow-sm ring-1 ring-primary/20" : "border-border hover:border-primary/30"
                  }`}
                  onClick={() => setSelectedClipId(clip.id)}
                >
                  {/* Header */}
                  <div className="mb-2 flex items-center gap-2">
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: clip.color }} />
                    {editingClipId === clip.id ? (
                      <Input autoFocus className="h-6 flex-1 px-1.5 text-xs"
                        value={clip.name}
                        onChange={(e) => renameClip(clip.id, e.target.value)}
                        onBlur={() => setEditingClipId(null)}
                        onKeyDown={(e) => { if (e.key === "Enter") setEditingClipId(null); }}
                        onClick={(e) => e.stopPropagation()} />
                    ) : (
                      <button type="button" className="flex-1 truncate text-left text-xs font-semibold text-foreground hover:text-primary"
                        onDoubleClick={(e) => { e.stopPropagation(); setEditingClipId(clip.id); }}>
                        {clip.name}
                      </button>
                    )}
                    {clip.status === "created" && (
                      <Badge variant="default" className="shrink-0 text-[9px]">
                        <Check className="mr-0.5 h-2.5 w-2.5" /> In library
                      </Badge>
                    )}
                    <button type="button"
                      className="ml-1 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteClip(clip.id); }}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Mini timeline bar */}
                  <div className="relative mb-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="absolute h-full rounded-full"
                      style={{
                        left: pct(clip.startTime),
                        width: `calc(${pct(clip.endTime)} - ${pct(clip.startTime)})`,
                        backgroundColor: clip.color,
                      }} />
                    <div className="absolute h-full w-0.5 bg-primary/70" style={{ left: playheadLeft }} />
                  </div>

                  {/* Time info */}
                  <div className="mb-2.5 flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                    <span>{fmt(clip.startTime)}</span>
                    <span>→</span>
                    <span>{fmt(clip.endTime)}</span>
                    <span className="ml-auto font-semibold text-foreground">{fmt(clip.endTime - clip.startTime)}</span>
                  </div>

                  {/* Export progress */}
                  {clip.status === "exporting" && (
                    <div className="mb-2.5">
                      <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
                        <span>Exporting…</span><span>{clip.exportProgress}%</span>
                      </div>
                      <div className="overflow-hidden rounded-full bg-secondary">
                        <div className="h-1.5 rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${clip.exportProgress}%` }} />
                      </div>
                    </div>
                  )}
                  {clip.status === "uploading" && (
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Uploading to library…
                    </div>
                  )}
                  {clip.status === "created" && clip.createdExerciseName && (
                    <p className="mb-2 text-[10px] text-green-600">→ {clip.createdExerciseName}</p>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-1">
                    <button type="button" onClick={(e) => { e.stopPropagation(); playClip(clip); }}
                      className="flex items-center gap-1 rounded-lg border border-border bg-secondary/60 px-2 py-1 text-[10px] hover:bg-primary/10">
                      <Play className="h-2.5 w-2.5" /> Preview
                    </button>

                    {clip.status === "idle" && (
                      <button type="button" disabled={!ffmpegReady}
                        onClick={(e) => { e.stopPropagation(); void exportClip(clip.id); }}
                        className="flex items-center gap-1 rounded-lg border border-border bg-secondary/60 px-2 py-1 text-[10px] hover:bg-primary/10 disabled:opacity-40">
                        {ffmpegLoading
                          ? <><Loader2 className="h-2.5 w-2.5 animate-spin" /> Loading…</>
                          : <><Scissors className="h-2.5 w-2.5" /> Export</>}
                      </button>
                    )}

                    {(clip.status === "done" || clip.status === "created") && (
                      <>
                        <button type="button" onClick={(e) => { e.stopPropagation(); downloadClip(clip); }}
                          className="flex items-center gap-1 rounded-lg border border-border bg-secondary/60 px-2 py-1 text-[10px] hover:bg-primary/10">
                          <Download className="h-2.5 w-2.5" /> Download
                        </button>
                        {clip.status === "done" && (
                          <button type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExerciseForm({ name: clip.name, category: "", sets: "", reps: "", time: "", rest: "", cues: "" });
                              setCreateDialog(clip);
                            }}
                            className="flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2 py-1 text-[10px] text-primary hover:bg-primary/20">
                            <Dumbbell className="h-2.5 w-2.5" /> Add to library
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {clips.length > 0 && (
              <button type="button" onClick={addClip}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary">
                <Scissors className="h-3.5 w-3.5" /> Mark another clip
              </button>
            )}
          </div>
        </div>

        {/* ── Timeline ── */}
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          {/* Timeline toolbar */}
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold text-muted-foreground">Timeline</p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setZoom((z) => Math.max(1, z / 1.5))}
                className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-secondary">
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="w-10 text-center text-xs text-muted-foreground">{zoom.toFixed(1)}×</span>
              <button type="button" onClick={() => setZoom((z) => Math.min(20, z * 1.5))}
                className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-secondary">
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="ml-auto text-[10px] text-muted-foreground">Scroll wheel to zoom · Drag clips to trim</span>
          </div>

          {/* Scrollable timeline */}
          <div ref={timelineScrollRef} className="overflow-x-auto rounded-xl" onWheel={handleTimelineWheel}>
            <div style={{ width: `${zoom * 100}%`, minWidth: "100%" }}>

              {/* Time ruler */}
              <div className="relative h-5 select-none">
                {duration > 0 && (() => {
                  const step = Math.max(1, Math.ceil(duration / (zoom * 10)));
                  return Array.from({ length: Math.floor(duration / step) + 1 }, (_, i) => {
                    const t = i * step;
                    if (t > duration) return null;
                    return (
                      <div key={t} className="absolute flex flex-col items-start" style={{ left: pct(t) }}>
                        <div className="h-2 w-px bg-border" />
                        <span className="whitespace-nowrap pl-0.5 font-mono text-[9px] text-muted-foreground">{fmt(t, false)}</span>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Track area */}
              <div
                ref={timelineRef}
                className="relative h-24 cursor-crosshair select-none overflow-hidden rounded-xl bg-[#111]"
                onClick={handleTimelineClick}
              >
                {/* Thumbnail strip */}
                {thumbnails.length > 0 && (
                  <div className="absolute inset-0 flex opacity-40">
                    {thumbnails.map((src, i) => (
                      <img key={i} src={src} alt="" className="h-full flex-1 object-cover" />
                    ))}
                  </div>
                )}

                {/* Waveform */}
                {waveform.length > 0 && (
                  <svg className="absolute inset-0 h-full w-full opacity-50" preserveAspectRatio="none">
                    <polyline
                      points={waveform.map((v, i) => {
                        const x = (i / waveform.length) * 100;
                        const y = 50 - v * 40;
                        return `${x}%,${y}%`;
                      }).join(" ")}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1"
                    />
                    <polyline
                      points={waveform.map((v, i) => {
                        const x = (i / waveform.length) * 100;
                        const y = 50 + v * 40;
                        return `${x}%,${y}%`;
                      }).join(" ")}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1"
                    />
                  </svg>
                )}

                {/* Clip segments */}
                {clips.map((clip) => (
                  <div
                    key={clip.id}
                    className={`absolute top-4 h-16 rounded-lg transition-opacity ${
                      selectedClipId === clip.id ? "ring-2 ring-white/80" : "opacity-75 hover:opacity-100"
                    }`}
                    style={{
                      left: pct(clip.startTime),
                      width: `calc(${pct(clip.endTime)} - ${pct(clip.startTime)})`,
                      backgroundColor: clip.color + "cc",
                      cursor: dragState?.clipId === clip.id && dragState.handle === "body" ? "grabbing" : "grab",
                    }}
                    onMouseDown={(e) => startDrag(e, clip.id, "body")}
                  >
                    {/* Left handle */}
                    <div className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l-lg bg-black/30 hover:bg-black/60"
                      onMouseDown={(e) => startDrag(e, clip.id, "left")} />
                    {/* Right handle */}
                    <div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r-lg bg-black/30 hover:bg-black/60"
                      onMouseDown={(e) => startDrag(e, clip.id, "right")} />
                    {/* Label */}
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center truncate px-3 text-[11px] font-bold text-white drop-shadow-md">
                      {clip.name}
                    </span>
                  </div>
                ))}

                {/* Playhead */}
                {duration > 0 && (
                  <div className="pointer-events-none absolute top-0 z-10 h-full w-0.5 bg-white/90 shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                    style={{ left: playheadLeft }}>
                    <div className="absolute -top-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white shadow-md" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Shortcuts dialog ── */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {[
              ["Space", "Play / Pause"],
              ["M", "Mark clip at playhead"],
              ["S", "Split selected clip"],
              ["Delete", "Delete selected clip"],
              ["← / →", "Step ±1 frame"],
              ["Shift + ← / →", "Jump ±5 seconds"],
              ["L", "Jump forward 5s"],
              ["?", "Toggle this panel"],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{desc}</span>
                <kbd className="shrink-0 rounded border border-border bg-secondary px-2 py-0.5 font-mono text-[11px]">{key}</kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Create exercise dialog ── */}
      <Dialog open={!!createDialog} onOpenChange={(open) => { if (!open) { setCreateDialog(null); setExerciseForm({ name: "", category: "", sets: "", reps: "", time: "", rest: "", cues: "" }); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Exercise Library</DialogTitle>
            <DialogDescription>This clip will be uploaded as the demo video for the new exercise.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Exercise name *</Label>
              <Input autoFocus placeholder="e.g. Box Jump" value={exerciseForm.name}
                onChange={(e) => setExerciseForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select
                items={[{ label: "Select category…", value: "" }, ...CATEGORIES.map((c) => ({ label: c, value: c }))]}
                value={exerciseForm.category}
                onValueChange={(v) => setExerciseForm((f) => ({ ...f, category: v ?? "" }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectPopup>
                  {[{ label: "Select category…", value: "" }, ...CATEGORIES.map((c) => ({ label: c, value: c }))].map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[["Sets","sets","3"],["Reps","reps","10"],["Time (s)","time","30"],["Rest (s)","rest","60"]].map(([label, key, ph]) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <Input placeholder={ph} value={(exerciseForm as any)[key]}
                    onChange={(e) => setExerciseForm((f) => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Coaching cues</Label>
              <Textarea placeholder="Core tight, drive through heel…" value={exerciseForm.cues}
                onChange={(e) => setExerciseForm((f) => ({ ...f, cues: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialog(null)}>Cancel</Button>
              <Button disabled={!exerciseForm.name.trim() || createDialog?.status === "uploading"}
                onClick={() => void createExerciseFromClip()}>
                {createDialog?.status === "uploading"
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</>
                  : <><Dumbbell className="mr-2 h-4 w-4" /> Create exercise</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
