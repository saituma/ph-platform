"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Dumbbell,
  Keyboard,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  SkipForward,
  Upload,
  Video,
  Volume2,
  VolumeX,
  X,
  Zap,
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
import { toast } from "@/lib/toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClipStatus = "idle" | "exporting" | "done" | "uploading" | "created" | "error";
type ExportMode = "fast" | "precise";

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

type Draft = {
  fileName: string;
  fileSize: number;
  clips: Array<{ id: string; name: string; startTime: number; endTime: number; color: string }>;
  savedAt: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CLIP_COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ec4899","#f97316","#06b6d4","#84cc16"];
const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
const CATEGORIES = [
  "Power","Speed","Strength","Conditioning","Agility","Plyometrics",
  "Mobility","Flexibility","Warmup","Cooldown","Recovery","Core",
  "Balance","Endurance","Sport-Specific",
];
const DRAFT_KEY = "ph-video-editor-draft";

let _ffmpeg: any = null;
let _ffmpegBusy: Promise<void> = Promise.resolve();
const VIDEO_SIZE_LIMIT_MB = 500;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(s: number, showMs = true) {
  if (!isFinite(s)) return "0:00.0";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return showMs ? `${m}:${String(sec).padStart(2, "0")}.${ms}` : `${m}:${String(sec).padStart(2, "0")}`;
}

async function captureFrames(video: HTMLVideoElement, count: number): Promise<string[]> {
  const canvas = document.createElement("canvas");
  canvas.width = 160; canvas.height = 90;
  const ctx = canvas.getContext("2d")!;
  const dur = video.duration;
  const saved = video.currentTime;
  const frames: string[] = [];
  for (let i = 0; i < count; i++) {
    video.currentTime = (i / count) * dur;
    await new Promise<void>((res) => {
      const fn = () => { video.removeEventListener("seeked", fn); res(); };
      video.addEventListener("seeked", fn);
    });
    ctx.drawImage(video, 0, 0, 160, 90);
    frames.push(canvas.toDataURL("image/jpeg", 0.6));
  }
  video.currentTime = saved;
  return frames;
}

async function buildWaveform(file: File, samples: number): Promise<number[]> {
  if (file.size > 300 * 1024 * 1024) return [];
  try {
    const ctx = new OfflineAudioContext(1, 1, 44100);
    const buf = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(buf);
    const data = decoded.getChannelData(0);
    const blockSize = Math.floor(data.length / samples);
    return Array.from({ length: samples }, (_, i) => {
      let max = 0;
      for (let j = 0; j < blockSize; j++) max = Math.max(max, Math.abs(data[i * blockSize + j]));
      return max;
    });
  } catch { return []; }
}

function saveDraft(file: File, clips: Clip[]) {
  if (!clips.length) return;
  const draft: Draft = {
    fileName: file.name,
    fileSize: file.size,
    clips: clips.map(({ id, name, startTime, endTime, color }) => ({ id, name, startTime, endTime, color })),
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function loadDraft(): Draft | null {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch { return null; }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VideoEditorPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const [history, setHistory] = useState<Clip[][]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [createDialog, setCreateDialog] = useState<Clip | null>(null);
  const [previewClip, setPreviewClip] = useState<Clip | null>(null);
  const [exerciseForm, setExerciseForm] = useState({ name: "", category: "", sets: "", reps: "", time: "", rest: "", cues: "" });
  const [isDragOver, setIsDragOver] = useState(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [zoom, setZoom] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>("fast");
  const [batchExporting, setBatchExporting] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = dragState;

  const [createExercise] = useCreateExerciseMutation();
  const [createUploadUrl] = useCreateMediaUploadUrlMutation();

  // ── Draft ───────────────────────────────────────────────────────────────────

  // Auto-save clips to localStorage whenever they change
  useEffect(() => {
    if (videoFile && clips.length > 0) saveDraft(videoFile, clips);
  }, [clips, videoFile]);

  // Warn before closing if there are unsaved clips
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasWork = clips.some((c) => c.status === "idle" || c.status === "done");
      if (hasWork) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [clips]);

  // Check for saved draft on mount
  useEffect(() => {
    const d = loadDraft();
    if (d && d.clips.length > 0) setDraft(d);
  }, []);

  const restoreDraft = (d: Draft) => {
    const restored: Clip[] = d.clips.map((c) => ({
      ...c, status: "idle" as ClipStatus, exportProgress: 0,
    }));
    setClips(restored);
    setDraft(null);
    localStorage.removeItem(DRAFT_KEY);
  };

  const dismissDraft = () => { setDraft(null); localStorage.removeItem(DRAFT_KEY); };

  // ── Undo ────────────────────────────────────────────────────────────────────

  const pushHistory = (prev: Clip[]) => setHistory((h) => [...h.slice(-19), prev]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setClips(prev);
      return h.slice(0, -1);
    });
  }, []);

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
      toast.error("Failed to load video encoder. Check your network or disable ad-blockers.");
    }
    finally { setFfmpegLoading(false); }
  }, [ffmpegLoading]);

  // ── File select ─────────────────────────────────────────────────────────────

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("video/")) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(file));
    setVideoFile(file);
    setClips([]); setHistory([]); setSelectedClipId(null);
    setCurrentTime(0); setIsPlaying(false);
    setThumbnails([]); setWaveform([]); setZoom(1);
    void loadFFmpeg();
    void buildWaveform(file, 200).then(setWaveform);
  }, [videoUrl, loadFFmpeg]);

  // ── Video events ────────────────────────────────────────────────────────────

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime);
    const onDur = () => { setDuration(v.duration || 0); void captureFrames(v, 24).then(setThumbnails); };
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

  useEffect(() => {
    if (!selectedClipId || !isPlaying) return;
    const clip = clips.find((c) => c.id === selectedClipId);
    if (clip && currentTime >= clip.endTime) videoRef.current?.pause();
  }, [currentTime, selectedClipId, clips, isPlaying]);

  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = playbackRate; }, [playbackRate]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const v = videoRef.current;
      switch (e.key) {
        case " ": e.preventDefault(); v && (isPlaying ? v.pause() : void v.play()); break;
        case "ArrowLeft": e.preventDefault(); if (v) v.currentTime = Math.max(0, v.currentTime - (e.shiftKey ? 5 : 1/30)); break;
        case "ArrowRight": e.preventDefault(); if (v) v.currentTime = Math.min(duration, v.currentTime + (e.shiftKey ? 5 : 1/30)); break;
        case "Delete": case "Backspace": if (selectedClipId) deleteClip(selectedClipId); break;
        case "s": case "S": splitAtPlayhead(); break;
        case "m": case "M": addClip(); break;
        case "d": case "D": if (selectedClipId) duplicateClip(selectedClipId); break;
        case "z": if (e.metaKey || e.ctrlKey) { e.preventDefault(); undo(); } break;
        case "l": case "L": if (v) v.currentTime = Math.min(duration, v.currentTime + 5); break;
        case "?": setShowShortcuts((p) => !p); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPlaying, selectedClipId, duration, undo]);

  // ── Timeline drag ────────────────────────────────────────────────────────────

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragRef.current) return;
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || !duration) return;
    const t = Math.max(0, Math.min(duration, ((e.clientX - rect.left) / rect.width) * duration));
    if (videoRef.current) videoRef.current.currentTime = t;
    setCurrentTime(t);
  }, [duration]);

  const startDrag = useCallback((e: React.MouseEvent, clipId: string, handle: DragState["handle"]) => {
    e.stopPropagation(); e.preventDefault();
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;
    setDragState({ clipId, handle, startX: e.clientX, startTimes: { start: clip.startTime, end: clip.endTime } });
    setSelectedClipId(clipId);
  }, [clips]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag || !duration) return;
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dSec = ((e.clientX - drag.startX) / rect.width) * duration;
      const MIN = 0.5;
      setClips((prev) => prev.map((c) => {
        if (c.id !== drag.clipId) return c;
        let { start, end } = drag.startTimes;
        if (drag.handle === "left") start = Math.max(0, Math.min(end - MIN, start + dSec));
        else if (drag.handle === "right") end = Math.min(duration, Math.max(start + MIN, end + dSec));
        else { const len = end - start; start = Math.max(0, Math.min(duration - len, start + dSec)); end = start + len; }
        return { ...c, startTime: start, endTime: end };
      }));
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
    setClips((p) => {
      pushHistory(p);
      return [...p, { id, name: `Clip ${p.length + 1}`, startTime: start, endTime: end,
        color: CLIP_COLORS[p.length % CLIP_COLORS.length], status: "idle", exportProgress: 0 }];
    });
    setSelectedClipId(id);
  };

  const splitAtPlayhead = () => {
    if (!selectedClipId || !duration) return;
    const clip = clips.find((c) => c.id === selectedClipId);
    if (!clip || currentTime <= clip.startTime || currentTime >= clip.endTime) return;
    const idB = crypto.randomUUID();
    setClips((p) => {
      pushHistory(p);
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

  const duplicateClip = (id: string) => {
    const clip = clips.find((c) => c.id === id);
    if (!clip) return;
    const newId = crypto.randomUUID();
    setClips((p) => {
      pushHistory(p);
      const idx = p.findIndex((c) => c.id === id);
      const copy: Clip = { ...clip, id: newId, name: `${clip.name} copy`,
        status: "idle", exportProgress: 0, exportedBlob: undefined, exportedUrl: undefined };
      const updated = [...p];
      updated.splice(idx + 1, 0, copy);
      return updated;
    });
    setSelectedClipId(newId);
  };

  const deleteClip = (id: string) => {
    setClips((p) => {
      pushHistory(p);
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

  const togglePlay = () => { const v = videoRef.current; if (!v) return; isPlaying ? v.pause() : void v.play(); };
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
  const handleTimelineWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(1, Math.min(20, z * (e.deltaY < 0 ? 1.15 : 0.87))));
  };

  // ── Export ────────────────────────────────────────────────────────────────────

  const exportClip = (clipId: string, mode: ExportMode = exportMode): Promise<void> => {
    const work = _ffmpegBusy.then(async () => {
      if (!_ffmpeg || !videoFile) return;
      const clip = clips.find((c) => c.id === clipId);
      if (!clip) return;

      if (videoFile.size > VIDEO_SIZE_LIMIT_MB * 1024 * 1024) {
        toast.error(`Source file exceeds ${VIDEO_SIZE_LIMIT_MB} MB. Export is not supported for files this large.`);
        return;
      }

      setClips((p) => p.map((c) => (c.id === clipId ? { ...c, status: "exporting", exportProgress: 0 } : c)));
      const { fetchFile } = await import("@ffmpeg/util");
      const ff = _ffmpeg;
      const ext = videoFile.name.split(".").pop() || "mp4";
      const inName = `in_${clipId}.${ext}`;
      const outName = `out_${clipId}.mp4`;
      const onProg = ({ progress }: { progress: number }) =>
        setClips((p) => p.map((c) => (c.id === clipId ? { ...c, exportProgress: Math.round(progress * 100) } : c)));
      ff.on("progress", onProg);
      try {
        await ff.writeFile(inName, await fetchFile(videoFile));

        const reEncodeArgs = [
          "-i", inName,
          "-ss", clip.startTime.toFixed(3),
          "-to", clip.endTime.toFixed(3),
          "-c:v", "libx264", "-crf", "22", "-preset", "fast",
          "-c:a", "aac", "-movflags", "+faststart",
          outName,
        ];

        if (mode === "fast") {
          try {
            // Stream copy — near-instant, cuts at nearest keyframe
            await ff.exec([
              "-ss", clip.startTime.toFixed(3),
              "-to", clip.endTime.toFixed(3),
              "-i", inName,
              "-c", "copy",
              "-avoid_negative_ts", "make_zero",
              outName,
            ]);
          } catch {
            // Fast mode failed (e.g. HEVC/fragmented MP4) — fall back to re-encode
            toast.info("Fast export failed for this format; retrying with Quality mode…");
            await ff.deleteFile(outName).catch(() => {});
            await ff.exec(reEncodeArgs);
          }
        } else {
          // Re-encode — frame-accurate, slower
          await ff.exec(reEncodeArgs);
        }

        const data = await ff.readFile(outName);
        const blob = new Blob([data as BlobPart], { type: "video/mp4" });
        const url = URL.createObjectURL(blob);
        await ff.deleteFile(inName).catch(() => {});
        await ff.deleteFile(outName).catch(() => {});
        setClips((p) => p.map((c) =>
          c.id === clipId ? { ...c, status: "done", exportProgress: 100, exportedBlob: blob, exportedUrl: url } : c,
        ));
      } catch (err) {
        console.error(err);
        setClips((p) => p.map((c) => (c.id === clipId ? { ...c, status: "error", exportProgress: 0 } : c)));
        toast.error(`Export failed for "${clip.name}". Try again or switch export mode.`);
        // Discard the wedged instance so the next export starts clean
        _ffmpeg = null;
        setFfmpegReady(false);
        void loadFFmpeg();
      } finally {
        try { ff.off("progress", onProg); } catch {}
        await ff.deleteFile(inName).catch(() => {});
        await ff.deleteFile(outName).catch(() => {});
      }
    });
    _ffmpegBusy = work.catch(() => {});
    return work;
  };

  const exportAll = async () => {
    if (!ffmpegReady || batchExporting) return;
    setBatchExporting(true);
    const idle = clips.filter((c) => c.status === "idle");
    for (const clip of idle) await exportClip(clip.id);
    setBatchExporting(false);
  };

  const downloadClip = (clip: Clip) => {
    if (!clip.exportedUrl) return;
    const a = document.createElement("a");
    a.href = clip.exportedUrl;
    a.download = `${clip.name.replace(/\s+/g, "-")}.mp4`;
    a.click();
  };

  // ── Create exercise ────────────────────────────────────────────────────────

  const createExerciseFromClip = async () => {
    if (!createDialog?.exportedBlob || !exerciseForm.name.trim()) return;
    const clip = createDialog;
    const blob = clip.exportedBlob!;
    setClips((p) => p.map((c) => (c.id === clip.id ? { ...c, status: "uploading" } : c)));
    try {
      const fileName = `${Date.now()}-${clip.name.replace(/\s+/g, "-")}.mp4`;
      const { uploadUrl, publicUrl } = await createUploadUrl({
        folder: "exercise-videos", fileName, contentType: "video/mp4", sizeBytes: blob.size, client: "web",
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

  // ── Render helpers ────────────────────────────────────────────────────────────

  const pct = (t: number) => `${((t / (duration || 1)) * 100).toFixed(4)}%`;
  const idleCount = clips.filter((c) => c.status === "idle").length;

  // ─────────────────────────────────────────────────────────────────────────────
  // UPLOAD SCREEN
  // ─────────────────────────────────────────────────────────────────────────────

  if (!videoUrl) {
    return (
      <AdminShell title="Video Editor" subtitle="Upload a session recording, cut it into clips, and add them to the exercise library.">
        <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />

        {/* Draft restore banner */}
        {draft && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Unsaved draft found</p>
              <p className="text-xs text-muted-foreground">
                {draft.clips.length} clip{draft.clips.length !== 1 ? "s" : ""} from <span className="font-medium">{draft.fileName}</span>
                {" · "}saved {new Date(draft.savedAt).toLocaleTimeString()}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => restoreDraft(draft)}>Restore</Button>
            <button type="button" onClick={dismissDraft} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div
          className={`flex min-h-[65vh] flex-col items-center justify-center rounded-2xl border-2 border-dashed transition ${
            isDragOver ? "border-primary bg-primary/5" : "border-border bg-card"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setIsDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFileSelect(f);
          }}
        >
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <Video className="h-10 w-10 text-primary" />
          </div>
          <p className="text-xl font-bold text-foreground">Drop your video here</p>
          <p className="mt-2 text-sm text-muted-foreground">MP4, MOV, WebM — any size</p>
          <div className="mt-8 flex items-center gap-3">
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Choose file
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Press <kbd className="rounded border border-border bg-secondary px-1.5 text-[10px]">?</kbd> for keyboard shortcuts
          </p>
        </div>
      </AdminShell>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EDITOR
  // ─────────────────────────────────────────────────────────────────────────────

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
          {ffmpegReady && <span className="flex items-center gap-1.5 text-xs text-green-600"><Check className="h-3.5 w-3.5" /> Ready</span>}
          {history.length > 0 && (
            <Button variant="ghost" size="sm" onClick={undo} title="Undo (Ctrl+Z)">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowShortcuts(true)}>
            <Keyboard className="mr-1.5 h-3.5 w-3.5" /> Shortcuts
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            URL.revokeObjectURL(videoUrl); setVideoUrl(""); setVideoFile(null); setClips([]); setHistory([]);
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

            {/* Transport bar */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <button type="button" onClick={() => stepFrame(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={togglePlay}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow hover:bg-primary/90">
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
              </button>
              <button type="button" onClick={() => stepFrame(1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary">
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="font-mono text-sm tabular-nums text-foreground">{fmt(currentTime)}</span>
              <span className="text-muted-foreground">/</span>
              <span className="font-mono text-sm tabular-nums text-muted-foreground">{fmt(duration)}</span>
              <div className="flex-1" />
              {/* Speed */}
              <div className="flex items-center gap-0.5">
                {SPEED_OPTIONS.map((s) => (
                  <button key={s} type="button"
                    className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium transition ${
                      playbackRate === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setPlaybackRate(s)}>{s}×</button>
                ))}
              </div>
              <button type="button" onClick={toggleMute}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary">
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <div className="h-5 w-px bg-border" />
              <button type="button" onClick={addClip}
                className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
                title="Mark clip (M)">
                <Scissors className="h-3.5 w-3.5" /> Mark
              </button>
              <button type="button" onClick={splitAtPlayhead} disabled={!selectedClipId}
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-40"
                title="Split at playhead (S)">
                <SkipForward className="h-3.5 w-3.5" /> Split
              </button>
            </div>
          </div>

          {/* ── Clips panel ── */}
          <div className="flex flex-col gap-3">
            {/* Panel header */}
            <div className="flex items-center gap-2">
              <p className="flex-1 text-sm font-semibold text-foreground">
                Clips {clips.length > 0 && <span className="text-muted-foreground">({clips.length})</span>}
              </p>
              {/* Export mode toggle */}
              <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5 text-[11px]">
                <button type="button"
                  className={`flex items-center gap-1 rounded-md px-2 py-1 font-medium transition ${exportMode === "fast" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setExportMode("fast")}
                  title="Stream copy — near-instant, cuts at keyframe">
                  <Zap className="h-3 w-3" /> Fast
                </button>
                <button type="button"
                  className={`flex items-center gap-1 rounded-md px-2 py-1 font-medium transition ${exportMode === "precise" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setExportMode("precise")}
                  title="Re-encode — slower, frame-accurate">
                  <Clock className="h-3 w-3" /> Precise
                </button>
              </div>
              {/* Export all */}
              {idleCount > 1 && (
                <Button size="sm" variant="outline" disabled={!ffmpegReady || batchExporting} onClick={exportAll}>
                  {batchExporting
                    ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Exporting…</>
                    : <><Scissors className="mr-1.5 h-3.5 w-3.5" /> All ({idleCount})</>}
                </Button>
              )}
            </div>

            {/* Export mode hint */}
            <p className="text-[10px] text-muted-foreground -mt-2">
              {exportMode === "fast"
                ? "⚡ Fast: stream copy, near-instant. Cut point ≈ nearest keyframe."
                : "🎯 Precise: re-encode, frame-accurate. Takes longer."}
            </p>

            {/* Clip list */}
            <div className="flex-1 space-y-2 overflow-y-auto">
              {clips.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                  <Scissors className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-foreground">No clips yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Press <kbd className="rounded border border-border bg-secondary px-1">M</kbd> to mark a clip
                  </p>
                </div>
              ) : clips.map((clip) => (
                <div key={clip.id}
                  className={`cursor-pointer rounded-2xl border bg-card p-3 transition ${
                    selectedClipId === clip.id ? "border-primary/60 ring-1 ring-primary/20" : "border-border hover:border-primary/30"
                  }`}
                  onClick={() => setSelectedClipId(clip.id)}
                >
                  {/* Name row */}
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
                    <button type="button" className="ml-1 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteClip(clip.id); }}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Mini progress bar */}
                  <div className="relative mb-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="absolute h-full rounded-full"
                      style={{ left: pct(clip.startTime), width: `calc(${pct(clip.endTime)} - ${pct(clip.startTime)})`, backgroundColor: clip.color }} />
                    <div className="absolute h-full w-0.5 bg-primary/70" style={{ left: pct(currentTime) }} />
                  </div>

                  {/* Timestamps */}
                  <div className="mb-2.5 flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                    <span>{fmt(clip.startTime)}</span><span>→</span><span>{fmt(clip.endTime)}</span>
                    <span className="ml-auto font-semibold text-foreground">{fmt(clip.endTime - clip.startTime)}</span>
                  </div>

                  {/* Export progress */}
                  {clip.status === "exporting" && (
                    <div className="mb-2.5">
                      <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
                        <span>{exportMode === "fast" ? "⚡ Exporting (fast)…" : "Exporting…"}</span>
                        <span>{clip.exportProgress}%</span>
                      </div>
                      <div className="overflow-hidden rounded-full bg-secondary">
                        <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${clip.exportProgress}%` }} />
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
                    <button type="button" onClick={(e) => { e.stopPropagation(); duplicateClip(clip.id); }}
                      className="flex items-center gap-1 rounded-lg border border-border bg-secondary/60 px-2 py-1 text-[10px] hover:bg-primary/10"
                      title="Duplicate (D)">
                      <Copy className="h-2.5 w-2.5" /> Dupe
                    </button>

                    {(clip.status === "idle" || clip.status === "error") && (
                      <button type="button" disabled={!ffmpegReady}
                        onClick={(e) => { e.stopPropagation(); void exportClip(clip.id); }}
                        className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] disabled:opacity-40 ${
                          clip.status === "error"
                            ? "border-red-400/60 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            : "border-border bg-secondary/60 hover:bg-primary/10"
                        }`}>
                        {ffmpegLoading
                          ? <><Loader2 className="h-2.5 w-2.5 animate-spin" /> Loading…</>
                          : clip.status === "error"
                          ? <><RotateCcw className="h-2.5 w-2.5" /> Retry</>
                          : <><Scissors className="h-2.5 w-2.5" /> Export</>}
                      </button>
                    )}

                    {(clip.status === "done" || clip.status === "created") && (
                      <>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setPreviewClip(clip); }}
                          className="flex items-center gap-1 rounded-lg border border-border bg-secondary/60 px-2 py-1 text-[10px] hover:bg-primary/10">
                          <Play className="h-2.5 w-2.5" /> Play clip
                        </button>
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
            <span className="ml-auto text-[10px] text-muted-foreground">Scroll wheel to zoom · Drag to trim</span>
          </div>

          <div className="overflow-x-auto rounded-xl" onWheel={handleTimelineWheel}>
            <div style={{ width: `${zoom * 100}%`, minWidth: "100%" }}>
              {/* Ruler */}
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

              {/* Track */}
              <div ref={timelineRef}
                className="relative h-24 cursor-crosshair select-none overflow-hidden rounded-xl bg-[#111]"
                onClick={handleTimelineClick}
              >
                {/* Thumbnails */}
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
                      points={waveform.map((v, i) => `${(i / waveform.length) * 100}%,${50 - v * 40}%`).join(" ")}
                      fill="none" stroke="#10b981" strokeWidth="1" />
                    <polyline
                      points={waveform.map((v, i) => `${(i / waveform.length) * 100}%,${50 + v * 40}%`).join(" ")}
                      fill="none" stroke="#10b981" strokeWidth="1" />
                  </svg>
                )}

                {/* Clips */}
                {clips.map((clip) => (
                  <div key={clip.id}
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
                    <div className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l-lg bg-black/30 hover:bg-black/60"
                      onMouseDown={(e) => startDrag(e, clip.id, "left")} />
                    <div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r-lg bg-black/30 hover:bg-black/60"
                      onMouseDown={(e) => startDrag(e, clip.id, "right")} />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center truncate px-3 text-[11px] font-bold text-white drop-shadow-md">
                      {clip.name}
                    </span>
                  </div>
                ))}

                {/* Playhead */}
                {duration > 0 && (
                  <div className="pointer-events-none absolute top-0 z-10 h-full w-0.5 bg-white/90 shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                    style={{ left: pct(currentTime) }}>
                    <div className="absolute -top-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white shadow-md" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Exported clip preview dialog ── */}
      <Dialog open={!!previewClip} onOpenChange={(open) => { if (!open) setPreviewClip(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewClip?.name}</DialogTitle>
            <DialogDescription>
              {previewClip && `${fmt(previewClip.startTime)} → ${fmt(previewClip.endTime)} · Duration: ${fmt(previewClip.endTime - previewClip.startTime)}`}
            </DialogDescription>
          </DialogHeader>
          {previewClip?.exportedUrl && (
            <video src={previewClip.exportedUrl} controls autoPlay className="w-full rounded-xl bg-black" />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => previewClip && downloadClip(previewClip)}>
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
            {previewClip?.status === "done" && (
              <Button onClick={() => {
                if (!previewClip) return;
                setExerciseForm({ name: previewClip.name, category: "", sets: "", reps: "", time: "", rest: "", cues: "" });
                setCreateDialog(previewClip);
                setPreviewClip(null);
              }}>
                <Dumbbell className="mr-2 h-4 w-4" /> Add to library
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Shortcuts dialog ── */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Keyboard Shortcuts</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            {[
              ["Space", "Play / Pause"],
              ["M", "Mark clip at playhead"],
              ["S", "Split selected clip"],
              ["D", "Duplicate selected clip"],
              ["Delete", "Delete selected clip"],
              ["← / →", "Step ±1 frame"],
              ["Shift + ← / →", "Jump ±5 seconds"],
              ["L", "Jump forward 5s"],
              ["Ctrl+Z", "Undo"],
              ["?", "Toggle shortcuts"],
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
      <Dialog open={!!createDialog} onOpenChange={(open) => {
        if (!open) { setCreateDialog(null); setExerciseForm({ name: "", category: "", sets: "", reps: "", time: "", rest: "", cues: "" }); }
      }}>
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
              {(["Sets","Reps","Time (s)","Rest (s)"] as const).map((label, i) => {
                const key = ["sets","reps","time","rest"][i] as keyof typeof exerciseForm;
                return (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs">{label}</Label>
                    <Input placeholder={["3","10","30","60"][i]} value={exerciseForm[key]}
                      onChange={(e) => setExerciseForm((f) => ({ ...f, [key]: e.target.value }))} />
                  </div>
                );
              })}
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
