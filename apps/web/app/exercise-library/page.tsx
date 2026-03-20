"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import { ParentCourseMediaUpload } from "../../components/parent/config/parent-course-media-upload";

const PROGRAM_SECTION_API_BASE = "/api/backend/program-section-content";

const SESSION_TYPES = [
  { value: "program", label: "Session Program" },
  { value: "warmup", label: "Warmups" },
  { value: "cooldown", label: "Cool Downs" },
  { value: "stretching", label: "Stretching & Foam Rolling" },
  { value: "screening", label: "Movement Screening" },
  { value: "mobility", label: "Mobility" },
  { value: "recovery", label: "Recovery" },
  { value: "offseason", label: "Off Session Program" },
  { value: "inseason", label: "In Session Program" },
  { value: "nutrition", label: "Athlete Platform" },
] as const;

const SESSION_TYPE_LABEL = Object.fromEntries(
  SESSION_TYPES.map((item) => [item.value, item.label])
) as Record<string, string>;

/** Where this bucket appears in the mobile app (Programs flow). */
const SECTION_MOBILE_HINT: Record<string, string> = {
  program: "Mobile: Programs → Program tab — week/session list & Start session.",
  warmup: "Mobile: Programs → Warm-up tab.",
  cooldown: "Mobile: Programs → Cool-down tab.",
  stretching: "Mobile: Programs → Stretching & foam rolling (Plus).",
  screening: "Mobile: Programs → Movement screening (Premium).",
  mobility: "Mobile: Programs → Mobility.",
  recovery: "Mobile: Programs → Recovery.",
  offseason: "Mobile: Programs → Off-season program.",
  inseason: "Mobile: Programs → In-season program.",
  nutrition: "Mobile: flows using this section type (e.g. nutrition/diary).",
};

const PRIMARY_SECTION_VALUES = new Set(["program", "warmup", "cooldown"]);
const PRIMARY_SESSION_TYPES = SESSION_TYPES.filter((t) => PRIMARY_SECTION_VALUES.has(t.value));
const MORE_SESSION_TYPES = SESSION_TYPES.filter((t) => !PRIMARY_SECTION_VALUES.has(t.value));

type ExerciseMetadata = {
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSeconds?: number | null;
  steps?: string | null;
  cues?: string | null;
  progression?: string | null;
  regression?: string | null;
  category?: string | null;
  equipment?: string | null;
  weekNumber?: number | null;
  sessionNumber?: number | null;
  sessionLabel?: string | null;
};

type ProgramSectionContent = {
  id: number;
  sectionType: string;
  title: string;
  body: string;
  ageList?: number[] | null;
  videoUrl?: string | null;
  allowVideoUpload?: boolean | null;
  metadata?: ExerciseMetadata | null;
  order?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

const getCsrfToken = () => {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("csrfToken="))
      ?.split("=")[1] ?? ""
  );
};

// ── Media URL helpers ──────────────────────────────────────────────

function getMediaSourceType(url: string): "youtube" | "vimeo" | "loom" | "drive" | "streamable" | "direct" {
  try {
    const lower = url.toLowerCase();
    if (lower.includes("youtube.com/watch") || lower.includes("youtu.be/")) return "youtube";
    if (lower.includes("vimeo.com/")) return "vimeo";
    if (lower.includes("loom.com/share/")) return "loom";
    if (lower.includes("drive.google.com/")) return "drive";
    if (lower.includes("streamable.com/")) return "streamable";
  } catch { /* invalid url */ }
  return "direct";
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  } catch { return null; }
}

function getVimeoEmbedUrl(url: string): string | null {
  try {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}` : null;
  } catch { return null; }
}

function getLoomEmbedUrl(url: string): string | null {
  try {
    const match = url.match(/loom\.com\/share\/([\w-]+)/);
    return match ? `https://www.loom.com/embed/${match[1]}` : null;
  } catch { return null; }
}

function getStreamableEmbedUrl(url: string): string | null {
  try {
    const match = url.match(/streamable\.com\/(\w+)/);
    return match ? `https://streamable.com/e/${match[1]}` : null;
  } catch { return null; }
}

function MediaPreview({ url }: { url: string }) {
  const sourceType = getMediaSourceType(url);

  if (sourceType === "youtube") {
    const embedUrl = getYouTubeEmbedUrl(url);
    if (embedUrl) {
      return (
        <iframe
          className="aspect-video w-full rounded-2xl border border-border"
          src={embedUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video"
        />
      );
    }
  }

  if (sourceType === "vimeo") {
    const embedUrl = getVimeoEmbedUrl(url);
    if (embedUrl) {
      return (
        <iframe
          className="aspect-video w-full rounded-2xl border border-border"
          src={embedUrl}
          allow="autoplay; fullscreen"
          allowFullScreen
          title="Vimeo video"
        />
      );
    }
  }

  if (sourceType === "loom") {
    const embedUrl = getLoomEmbedUrl(url);
    if (embedUrl) {
      return (
        <iframe
          className="aspect-video w-full rounded-2xl border border-border"
          src={embedUrl}
          allowFullScreen
          title="Loom video"
        />
      );
    }
  }

  if (sourceType === "streamable") {
    const embedUrl = getStreamableEmbedUrl(url);
    if (embedUrl) {
      return (
        <iframe
          className="aspect-video w-full rounded-2xl border border-border"
          src={embedUrl}
          allowFullScreen
          title="Streamable video"
        />
      );
    }
  }

  if (sourceType === "drive") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm text-primary hover:bg-secondary/50"
      >
        <svg className="h-5 w-5" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066DA"/>
          <path d="M43.65 25.15L29.9 1.35C28.55 2.15 27.4 3.25 26.6 4.65L1.2 48.2c-.8 1.4-1.2 2.95-1.2 4.5h27.5l16.15-27.55z" fill="#00AC47"/>
          <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 57.2c.8-1.4 1.2-2.95 1.2-4.5H59.85L53.1 66.85l-9.45 9.95h26.6c1.35 0 2.7-.35 3.9-1z" fill="#EA4335"/>
          <path d="M43.65 25.15L57.4 1.35C56.05.55 54.5 0 52.8 0H34.5c-1.7 0-3.25.55-4.6 1.35l13.75 23.8z" fill="#00832D"/>
          <path d="M59.85 52.7h27.5L73.6 76.5c.8-1.4 1.2-2.95 1.2-4.5L59.85 52.7z" fill="#2684FC"/>
          <path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25.15l16.2 27.55H87.3c0-1.55-.4-3.1-1.2-4.5L73.4 26.5z" fill="#FFBA00"/>
        </svg>
        <span>Open in Google Drive</span>
        <span className="text-xs text-muted-foreground">↗</span>
      </a>
    );
  }

  return (
    <video
      className="aspect-video w-full rounded-2xl border border-border bg-secondary/40 object-cover"
      src={url}
      controls
      muted
    />
  );
}

function MediaBadge({ url }: { url: string }) {
  const sourceType = getMediaSourceType(url);
  const labels: Record<string, string> = {
    youtube: "YouTube",
    vimeo: "Vimeo",
    loom: "Loom",
    drive: "Google Drive",
    streamable: "Streamable",
    direct: "Video",
  };
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
      {labels[sourceType] ?? "Media"}
    </span>
  );
}

// ── API functions ──────────────────────────────────────────────

async function fetchProgramSectionContent(sectionType: string) {
  const res = await fetch(
    `${PROGRAM_SECTION_API_BASE}?sectionType=${encodeURIComponent(sectionType)}`,
    { credentials: "include" }
  );
  if (!res.ok) {
    throw new Error("Failed to load program section content.");
  }
  const data = await res.json();
  return (data.items ?? []) as ProgramSectionContent[];
}

async function createProgramSectionContent(payload: {
  sectionType: string;
  ageList?: number[] | null;
  title: string;
  body: string;
  videoUrl?: string | null;
  allowVideoUpload?: boolean | null;
  metadata?: ExerciseMetadata | null;
  order?: number | null;
}) {
  const res = await fetch(PROGRAM_SECTION_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(getCsrfToken() ? { "x-csrf-token": getCsrfToken() } : {}),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Failed to create section content.");
  }
  const data = await res.json();
  return data.item as ProgramSectionContent;
}

async function updateProgramSectionContent(id: number, payload: {
  sectionType: string;
  ageList?: number[] | null;
  title: string;
  body: string;
  videoUrl?: string | null;
  allowVideoUpload?: boolean | null;
  metadata?: ExerciseMetadata | null;
  order?: number | null;
}) {
  const res = await fetch(`${PROGRAM_SECTION_API_BASE}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(getCsrfToken() ? { "x-csrf-token": getCsrfToken() } : {}),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Failed to update section content.");
  }
  const data = await res.json();
  return data.item as ProgramSectionContent;
}

async function deleteProgramSectionContent(id: number) {
  const res = await fetch(`${PROGRAM_SECTION_API_BASE}/${id}`, {
    method: "DELETE",
    headers: getCsrfToken() ? { "x-csrf-token": getCsrfToken() } : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to delete section content.");
  }
}

// ── Main component ──────────────────────────────────────────────

function ExerciseLibraryPageInner() {
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<string>("program");
  const [items, setItems] = useState<ProgramSectionContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [moreSectionsOpen, setMoreSectionsOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ageInput, setAgeInput] = useState("");
  const [ageList, setAgeList] = useState<number[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [order, setOrder] = useState("1");
  const [allowVideoUpload, setAllowVideoUpload] = useState(false);

  // Exercise metadata state
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [duration, setDuration] = useState("");
  const [restSeconds, setRestSeconds] = useState("");
  const [steps, setSteps] = useState("");
  const [cues, setCues] = useState("");
  const [progression, setProgression] = useState("");
  const [regression, setRegression] = useState("");
  const [category, setCategory] = useState("");
  const [equipment, setEquipment] = useState("");
  const [weekNumber, setWeekNumber] = useState("");
  const [sessionNumber, setSessionNumber] = useState("");
  const [sessionLabel, setSessionLabel] = useState("");
  const [showExerciseFields, setShowExerciseFields] = useState(true);

  const loadItems = async (sectionType = activeSection) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProgramSectionContent(sectionType);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load section content.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && SESSION_TYPES.some((item) => item.value === tab)) {
      setActiveSection(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    void loadItems(activeSection);
  }, [activeSection]);

  useEffect(() => {
    if (MORE_SESSION_TYPES.some((t) => t.value === activeSection)) {
      setMoreSectionsOpen(true);
    }
  }, [activeSection]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setAgeInput("");
    setAgeList([]);
    setVideoUrl(null);
    setExternalUrl("");
    setOrder("1");
    setAllowVideoUpload(false);
    setSets("");
    setReps("");
    setDuration("");
    setRestSeconds("");
    setSteps("");
    setCues("");
    setProgression("");
    setRegression("");
    setCategory("");
    setEquipment("");
    setWeekNumber("");
    setSessionNumber("");
    setSessionLabel("");
    setShowExerciseFields(true);
  };

  const buildMetadata = (): ExerciseMetadata | null => {
    const meta: ExerciseMetadata = {};
    if (sets.trim()) meta.sets = Number(sets);
    if (reps.trim()) meta.reps = Number(reps);
    if (duration.trim()) meta.duration = Number(duration);
    if (restSeconds.trim()) meta.restSeconds = Number(restSeconds);
    if (steps.trim()) meta.steps = steps.trim();
    if (cues.trim()) meta.cues = cues.trim();
    if (progression.trim()) meta.progression = progression.trim();
    if (regression.trim()) meta.regression = regression.trim();
    if (category.trim()) meta.category = category.trim();
    if (equipment.trim()) meta.equipment = equipment.trim();
    if (weekNumber.trim()) {
      const w = Number(weekNumber);
      if (Number.isFinite(w)) meta.weekNumber = w;
    }
    if (sessionNumber.trim()) {
      const s = Number(sessionNumber);
      if (Number.isFinite(s)) meta.sessionNumber = s;
    }
    if (sessionLabel.trim()) meta.sessionLabel = sessionLabel.trim();
    return Object.keys(meta).length > 0 ? meta : null;
  };

  const resolvedVideoUrl = videoUrl || (externalUrl.trim() || null);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        sectionType: activeSection,
        title: title.trim(),
        body: body.trim(),
        ageList: ageList.length ? ageList : null,
        videoUrl: resolvedVideoUrl,
        metadata: buildMetadata(),
        order: order.trim() ? Number(order) : null,
        allowVideoUpload,
      };

      if (editingId) {
        const updated = await updateProgramSectionContent(editingId, payload);
        setItems((prev) => prev.map((item) => (item.id === editingId ? updated : item)));
      } else {
        const created = await createProgramSectionContent(payload);
        setItems((prev) => [created, ...prev]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save section content.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: ProgramSectionContent) => {
    setEditingId(item.id);
    setTitle(item.title ?? "");
    setBody(item.body ?? "");
    setAgeInput("");
    setAgeList(Array.isArray(item.ageList) ? item.ageList : []);

    const url = item.videoUrl ?? null;
    if (url && getMediaSourceType(url) !== "direct") {
      setVideoUrl(null);
      setExternalUrl(url);
    } else {
      setVideoUrl(url);
      setExternalUrl("");
    }

    setOrder(item.order ? String(item.order) : "1");
    setAllowVideoUpload(Boolean(item.allowVideoUpload));

    // Populate exercise fields
    const meta = (item.metadata ?? {}) as ExerciseMetadata;
    setSets(meta.sets != null ? String(meta.sets) : "");
    setReps(meta.reps != null ? String(meta.reps) : "");
    setDuration(meta.duration != null ? String(meta.duration) : "");
    setRestSeconds(meta.restSeconds != null ? String(meta.restSeconds) : "");
    setSteps(meta.steps ?? "");
    setCues(meta.cues ?? "");
    setProgression(meta.progression ?? "");
    setRegression(meta.regression ?? "");
    setCategory(meta.category ?? "");
    setEquipment(meta.equipment ?? "");
    setWeekNumber(meta.weekNumber != null ? String(meta.weekNumber) : "");
    setSessionNumber(meta.sessionNumber != null ? String(meta.sessionNumber) : "");
    setSessionLabel(meta.sessionLabel ?? "");

    setShowExerciseFields(true);
  };

  const handleAddAge = () => {
    const parsed = Number(ageInput);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    const normalized = Math.floor(parsed);
    setAgeList((prev) => {
      if (prev.includes(normalized)) return prev;
      return [...prev, normalized].sort((a, b) => a - b);
    });
    setAgeInput("");
  };

  const handleRemoveAge = (age: number) => {
    setAgeList((prev) => prev.filter((item) => item !== age));
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("Delete this content entry?");
    if (!confirmed) return;
    setIsSaving(true);
    setError(null);
    try {
      await deleteProgramSectionContent(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete section content.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyExternalUrl = () => {
    if (!externalUrl.trim()) return;
    setVideoUrl(null);
  };

  const orderedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const orderA = Number.isFinite(a.order) ? (a.order as number) : 9999;
      const orderB = Number.isFinite(b.order) ? (b.order as number) : 9999;
      if (orderA !== orderB) return orderA - orderB;
      return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
    });
  }, [items]);

  const mobileHint =
    SECTION_MOBILE_HINT[activeSection] ?? "Published to the mobile app for enrolled athletes.";

  return (
    <AdminShell
      title="Training content"
      subtitle="What athletes see under Programs in the mobile app."
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm">
          <p className="font-semibold text-foreground">Coach quick path</p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Most days:</span> use{" "}
              <strong className="text-foreground">Main program</strong>, <strong className="text-foreground">Warmups</strong>, and{" "}
              <strong className="text-foreground">Cool downs</strong> below.
            </li>
            <li>
              <span className="font-medium text-foreground">Tiers & templates:</span>{" "}
              <Link href="/programs" className="text-primary underline-offset-4 hover:underline">
                Programs
              </Link>
            </li>
            <li>
              <span className="font-medium text-foreground">One athlete (e.g. Premium):</span>{" "}
              <Link href="/users" className="text-primary underline-offset-4 hover:underline">
                Users
              </Link>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Section type
            </p>
            <Tabs value={activeSection} onValueChange={setActiveSection}>
              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-[11px] font-medium text-muted-foreground">Start here (daily)</p>
                  <TabsList className="flex h-auto w-full flex-wrap gap-2 bg-transparent p-0">
                    {PRIMARY_SESSION_TYPES.map((sessionType) => (
                      <TabsTrigger
                        key={sessionType.value}
                        value={sessionType.value}
                        className="rounded-full border border-border bg-background px-3 py-2 text-xs data-[state=active]:border-primary data-[state=active]:bg-primary/10"
                      >
                        {sessionType.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setMoreSectionsOpen((o) => !o)}
                    className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                  >
                    {moreSectionsOpen ? "▼ Hide" : "▶ More section types"} (Plus / Premium / other)
                  </button>
                  {moreSectionsOpen ? (
                    <TabsList className="mt-2 flex h-auto w-full flex-wrap gap-2 bg-transparent p-0">
                      {MORE_SESSION_TYPES.map((sessionType) => (
                        <TabsTrigger
                          key={sessionType.value}
                          value={sessionType.value}
                          className="rounded-full border border-border bg-background px-3 py-1.5 text-xs data-[state=active]:border-primary data-[state=active]:bg-primary/10"
                        >
                          {sessionType.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  ) : null}
                </div>
              </div>
            </Tabs>
            <p className="text-xs leading-relaxed text-muted-foreground">{mobileHint}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* ── Left: Form ── */}
        <Card>
          <CardHeader>
            <SectionHeader
              title={`${SESSION_TYPE_LABEL[activeSection] ?? "Program"}`}
              description={mobileHint}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {activeSection === "screening" ? "Screening Name" : "Course / Module Title"}
              </label>
              <Input
                placeholder={activeSection === "screening" ? "Screening name (e.g. Squat screen)" : "Course title or module name"}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Module Notes
              </label>
              <Textarea
                className="min-h-[140px]"
                placeholder="Outline the module steps or coaching notes..."
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </div>

            {/* ── Exercise Details (collapsible) ── */}
            <div className="rounded-2xl border border-border bg-secondary/20 p-4">
              <button
                type="button"
                className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                onClick={() => setShowExerciseFields(!showExerciseFields)}
              >
                <span>Exercise Details</span>
                <span className="text-lg leading-none">{showExerciseFields ? "−" : "+"}</span>
              </button>

              {showExerciseFields && (
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-border/80 bg-background/50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Week & session (mobile grouping)
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Same week + session # groups rows into one session in the app (e.g. Week 1, Session A).
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Week
                        </label>
                        <Input
                          type="number"
                          min={1}
                          placeholder="e.g. 1"
                          value={weekNumber}
                          onChange={(e) => setWeekNumber(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Session # (1=A, 2=B…)
                        </label>
                        <Input
                          type="number"
                          min={1}
                          placeholder="e.g. 1"
                          value={sessionNumber}
                          onChange={(e) => setSessionNumber(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Session label (optional)
                        </label>
                        <Input
                          placeholder="e.g. Lower body"
                          value={sessionLabel}
                          onChange={(e) => setSessionLabel(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sets / Reps / Duration / Rest grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sets</label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="e.g. 3"
                        value={sets}
                        onChange={(e) => setSets(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reps</label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="e.g. 12"
                        value={reps}
                        onChange={(e) => setReps(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Duration (sec)</label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="e.g. 30"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rest (sec)</label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="e.g. 60"
                        value={restSeconds}
                        onChange={(e) => setRestSeconds(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Category / Equipment */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
                      <Input
                        placeholder="e.g. Strength, Speed"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Equipment</label>
                      <Input
                        placeholder="e.g. Resistance band, Cones"
                        value={equipment}
                        onChange={(e) => setEquipment(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Cues */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Coaching Cues</label>
                    <Textarea
                      className="min-h-[80px]"
                      placeholder="Key coaching points..."
                      value={cues}
                      onChange={(e) => setCues(e.target.value)}
                    />
                  </div>

                  {/* Steps */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Steps</label>
                    <Textarea
                      className="min-h-[80px]"
                      placeholder="Step-by-step instructions (optional)..."
                      value={steps}
                      onChange={(e) => setSteps(e.target.value)}
                    />
                  </div>

                  {/* Progression / Regression */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Progression</label>
                      <Input
                        placeholder="Harder variation..."
                        value={progression}
                        onChange={(e) => setProgression(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Regression</label>
                      <Input
                        placeholder="Easier variation..."
                        value={regression}
                        onChange={(e) => setRegression(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Ages */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ages
              </label>
              <div className="flex flex-wrap gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="Add age"
                  value={ageInput}
                  onChange={(event) => setAgeInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddAge();
                    }
                  }}
                  className="w-28"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddAge}
                  disabled={!ageInput.trim()}
                >
                  Add Age
                </Button>
              </div>
              {ageList.length ? (
                <div className="flex flex-wrap gap-2">
                  {ageList.map((age) => (
                    <div
                      key={age}
                      className="flex items-center gap-2 rounded-full border border-border bg-secondary/30 px-3 py-1 text-xs"
                    >
                      <span>Age {age}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAge(age)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Remove age ${age}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No ages set. Content will show for all ages.
                </p>
              )}
            </div>

            {/* ── Media Section ── */}
            <div className="space-y-3 rounded-2xl border border-border bg-secondary/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Media
              </p>

              {/* Upload */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Upload a file directly</span>
                <ParentCourseMediaUpload
                  label={videoUrl ? "Replace File" : "Upload File"}
                  folder="program-section"
                  accept="video/*,image/*,application/pdf"
                  maxSizeMb={200}
                  onUploaded={(url) => { setVideoUrl(url); setExternalUrl(""); }}
                />
              </div>

              {/* External URL */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">
                  Or paste a URL (YouTube, Google Drive, Vimeo, Loom, Streamable…)
                </span>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://youtube.com/watch?v=..."
                    value={externalUrl}
                    onChange={(e) => { setExternalUrl(e.target.value); if (e.target.value.trim()) setVideoUrl(null); }}
                    className="flex-1"
                  />
                  {externalUrl.trim() ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExternalUrl("")}
                    >
                      Clear
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Preview */}
              {resolvedVideoUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MediaBadge url={resolvedVideoUrl} />
                    <span className="truncate text-xs text-muted-foreground">{resolvedVideoUrl}</span>
                  </div>
                  <MediaPreview url={resolvedVideoUrl} />
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/40 text-xs text-muted-foreground">
                  Upload a file or paste a URL for this section.
                </div>
              )}
            </div>

            {/* ── Athlete Upload Toggle ── */}
            <div className="rounded-2xl border border-border bg-secondary/20 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Athlete Video Uploads
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Allow premium athletes to upload training clips for this section.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={allowVideoUpload}
                    onChange={(event) => setAllowVideoUpload(event.target.checked)}
                  />
                  <span>{allowVideoUpload ? "On" : "Off"}</span>
                </label>
              </div>
            </div>

            {/* Order + Submit */}
            <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Order
                </label>
                <Input
                  type="number"
                  min={1}
                  value={order}
                  onChange={(event) => setOrder(event.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                {editingId ? (
                  <Button variant="outline" onClick={resetForm} disabled={isSaving}>
                    Cancel Edit
                  </Button>
                ) : null}
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={isSaving || !title.trim() || !body.trim()}
                >
                  {isSaving ? "Saving..." : editingId ? "Update Content" : "Publish Content"}
                </Button>
              </div>
            </div>
            {error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* ── Right: Content List ── */}
        <Card>
          <CardHeader>
            <SectionHeader
              title={`Published items`}
              description="Order matches display order in the app (per age filter)."
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="rounded-2xl border border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
                Loading content...
              </div>
            ) : null}
            {orderedItems.map((item) => {
              const meta = (item.metadata ?? {}) as ExerciseMetadata;
              const hasExercise = !!(meta.sets || meta.reps || meta.duration || meta.restSeconds);
              const weekSessionBits = [
                meta.weekNumber != null && Number.isFinite(Number(meta.weekNumber))
                  ? `W${meta.weekNumber}`
                  : null,
                meta.sessionNumber != null && Number.isFinite(Number(meta.sessionNumber))
                  ? `S${meta.sessionNumber}`
                  : null,
                meta.sessionLabel?.trim() ? meta.sessionLabel.trim() : null,
              ].filter(Boolean);

              return (
                <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          ID {item.id}
                        </span>
                        <span className="text-xs text-muted-foreground">Order {item.order ?? 1}</span>
                        {weekSessionBits.length ? (
                          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground">
                            {weekSessionBits.join(" · ")}
                          </span>
                        ) : null}
                        {Array.isArray(item.ageList) && item.ageList.length ? (
                          <span className="text-xs text-muted-foreground">
                            Ages: {item.ageList.join(", ")}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Ages: All</span>
                        )}
                        {item.videoUrl ? <MediaBadge url={item.videoUrl} /> : null}
                        {item.allowVideoUpload ? (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            Video Uploads On
                          </span>
                        ) : null}
                      </div>
                      {/* Exercise metadata tags */}
                      {hasExercise && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {meta.sets != null && (
                            <span className="rounded-md bg-secondary/60 px-1.5 py-0.5 text-[10px] font-medium text-foreground/80">
                              {meta.sets} sets
                            </span>
                          )}
                          {meta.reps != null && (
                            <span className="rounded-md bg-secondary/60 px-1.5 py-0.5 text-[10px] font-medium text-foreground/80">
                              {meta.reps} reps
                            </span>
                          )}
                          {meta.duration != null && (
                            <span className="rounded-md bg-secondary/60 px-1.5 py-0.5 text-[10px] font-medium text-foreground/80">
                              {meta.duration}s
                            </span>
                          )}
                          {meta.restSeconds != null && (
                            <span className="rounded-md bg-secondary/60 px-1.5 py-0.5 text-[10px] font-medium text-foreground/80">
                              {meta.restSeconds}s rest
                            </span>
                          )}
                          {meta.category && (
                            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              {meta.category}
                            </span>
                          )}
                          {meta.equipment && (
                            <span className="rounded-md bg-secondary/60 px-1.5 py-0.5 text-[10px] font-medium text-foreground/80">
                              🏋️ {meta.equipment}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => handleEdit(item)} disabled={isSaving}>
                        Edit
                      </Button>
                      <Button variant="outline" onClick={() => void handleDelete(item.id)} disabled={isSaving}>
                        Delete
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">
                    {item.body}
                  </p>
                  {/* Coaching cues */}
                  {meta.cues && (
                    <div className="mt-2 rounded-xl bg-secondary/30 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Coaching Cues</p>
                      <p className="mt-1 whitespace-pre-wrap text-xs text-foreground/80">{meta.cues}</p>
                    </div>
                  )}
                  {/* Progression / Regression */}
                  {(meta.progression || meta.regression) && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {meta.progression && (
                        <div className="rounded-xl bg-green-500/10 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-green-600">Progression</p>
                          <p className="mt-0.5 text-xs text-foreground/80">{meta.progression}</p>
                        </div>
                      )}
                      {meta.regression && (
                        <div className="rounded-xl bg-orange-500/10 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-600">Regression</p>
                          <p className="mt-0.5 text-xs text-foreground/80">{meta.regression}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {item.videoUrl ? (
                    <div className="mt-3">
                      <MediaPreview url={item.videoUrl} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

export default function ExerciseLibraryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <ExerciseLibraryPageInner />
    </Suspense>
  );
}
