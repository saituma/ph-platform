"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  Copy,
  Dumbbell,
  ExternalLink,
  GripVertical,
  Layers,
  Library,
  Link2,
  Link2Off,
  Plus,
  Search,
  Trash2,
  Video,
  X,
} from "lucide-react";

import { AdminShell } from "../../../components/admin/shell";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { ExerciseForm } from "../../../components/admin/exercise-library/exercise-form";
import type { Exercise } from "../../../components/admin/exercise-library/types";
import {
  useGetProgramsQuery,
  useGetProgramModulesQuery,
  useGetModuleSessionsQuery,
  useGetSessionExercisesQuery,
  useGetExercisesQuery,
  useAddSessionExerciseMutation,
  useDeleteSessionExerciseMutation,
  useReorderSessionExercisesMutation,
  useCreateExerciseMutation,
  useGetSessionLibraryQuery,
  useCopySessionToModuleMutation,
  useLinkSessionToModuleMutation,
  useUnlinkLibrarySessionMutation,
} from "../../../lib/apiSlice";
import { toast } from "@/lib/toast";

const CATEGORIES = [
  "Power", "Speed", "Strength", "Conditioning", "Agility",
  "Plyometrics", "Mobility", "Flexibility", "Warmup", "Cooldown",
  "Recovery", "Core", "Balance", "Endurance", "Sport-Specific",
];

const emptyForm: Exercise = {
  name: "", category: "", sets: "", reps: "", time: "", rest: "",
  videoUrl: "", videoMuted: true, notes: "", cues: "", howTo: "",
  progression: "", regression: "",
};

type SessionExercise = {
  id: number;
  order?: number | null;
  exercise?: {
    id?: number | null;
    name?: string | null;
    category?: string | null;
    sets?: number | null;
    reps?: number | null;
    duration?: number | null;
    videoUrl?: string | null;
  } | null;
};

function LibraryExerciseCard({ ex, isAdded }: { ex: Exercise; isAdded: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: `lib-${ex.id}`,
    disabled: isAdded,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      className={`group flex items-center gap-2.5 rounded-xl border p-2.5 transition select-none ${
        isAdded
          ? "border-border/40 bg-secondary/20 opacity-50 cursor-not-allowed"
          : "border-border bg-card hover:border-primary/40 hover:bg-primary/5 cursor-grab active:cursor-grabbing"
      }`}
    >
      <button
        type="button"
        className="touch-none text-muted-foreground/40 hover:text-muted-foreground"
        {...(isAdded ? {} : { ...attributes, ...listeners })}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/60">
        {ex.videoUrl
          ? <Video className="h-3.5 w-3.5 text-primary" />
          : <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{ex.name}</p>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {ex.category && <Badge variant="secondary" className="text-[10px] px-1.5">{ex.category}</Badge>}
          {ex.sets && <span className="text-[10px] text-muted-foreground">{ex.sets}×</span>}
          {ex.reps && <span className="text-[10px] text-muted-foreground">{ex.reps} reps</span>}
        </div>
      </div>
      {isAdded && <Badge variant="outline" className="text-[10px] shrink-0">Added</Badge>}
    </div>
  );
}

function SessionExerciseRow({
  se, index, onRemove, isRemoving,
}: {
  se: SessionExercise; index: number; onRemove: (id: number) => void; isRemoving: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `session-${se.id}`,
  });

  const isRun = (se.exercise?.category as string | undefined | null) === "cardio_run";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      className={`flex items-center gap-2.5 rounded-xl border p-3 ${isRun ? "border-blue-500/30 bg-blue-500/5" : "border-border bg-card"}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isRun ? "bg-blue-500/15 text-blue-600" : "bg-primary/10 text-primary"}`}>
        {isRun ? "🏃" : index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {se.exercise?.name ?? "Unknown"}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          {se.exercise?.category && (
            <Badge variant={isRun ? "outline" : "secondary"} className={`text-[10px] px-1.5 ${isRun ? "border-blue-500/40 text-blue-600" : ""}`}>
              {isRun ? "Run" : se.exercise.category}
            </Badge>
          )}
          {se.exercise?.sets && (
            <span className="text-[10px] text-muted-foreground">{se.exercise.sets} sets</span>
          )}
          {se.exercise?.reps && (
            <span className="text-[10px] text-muted-foreground">{se.exercise.reps} reps</span>
          )}
          {se.exercise?.videoUrl && (
            <span className="flex items-center gap-0.5 text-[10px] text-primary">
              <Video className="h-3 w-3" /> Video
            </span>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-destructive shrink-0"
        onClick={() => onRemove(se.id)}
        disabled={isRemoving}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function DragCard({ ex }: { ex: Exercise }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-primary/40 bg-card shadow-2xl p-2.5 w-64 opacity-95 rotate-1">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Dumbbell className="h-3.5 w-3.5 text-primary" />
      </div>
      <p className="truncate text-sm font-semibold text-foreground">{ex.name}</p>
    </div>
  );
}

export default function SplitBuilderPage() {
  const [programId, setProgramId] = useState<number | null>(null);
  const [moduleId, setModuleId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);

  // Library tabs
  const [leftTab, setLeftTab] = useState<"exercises" | "sessions">("exercises");
  const [search, setSearch] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [exerciseForm, setExerciseForm] = useState<Exercise>(emptyForm);

  // Link/copy dialog for session library
  const [linkTarget, setLinkTarget] = useState<{ id: number; title: string | null } | null>(null);
  const [linkWeek, setLinkWeek] = useState("1");
  const [linkSessionNum, setLinkSessionNum] = useState("1");

  const [draggingLibId, setDraggingLibId] = useState<number | null>(null);

  const { data: programsData } = useGetProgramsQuery();
  const { data: modulesData } = useGetProgramModulesQuery(
    { programId: programId! },
    { skip: !programId },
  );
  const { data: sessionsData, refetch: refetchSessions } = useGetModuleSessionsQuery(
    { moduleId: moduleId! },
    { skip: !moduleId },
  );
  const { data: sessionExData } = useGetSessionExercisesQuery(
    { sessionId: sessionId! },
    { skip: !sessionId },
  );
  const { data: exerciseLibData } = useGetExercisesQuery();
  const { data: sessionLibData } = useGetSessionLibraryQuery();
  const [addExercise, { isLoading: isAdding }] = useAddSessionExerciseMutation();
  const [removeExercise, { isLoading: isRemoving }] = useDeleteSessionExerciseMutation();
  const [reorderExercises] = useReorderSessionExercisesMutation();
  const [createExercise, { isLoading: isCreating }] = useCreateExerciseMutation();
  const [copySession, { isLoading: isCopying }] = useCopySessionToModuleMutation();
  const [linkSession, { isLoading: isLinking }] = useLinkSessionToModuleMutation();
  const [unlinkSession, { isLoading: isUnlinking }] = useUnlinkLibrarySessionMutation();

  const programs = programsData?.programs ?? [];
  const modules = modulesData?.modules ?? [];
  const sessions = sessionsData?.sessions ?? [];
  const libraryExercises: Exercise[] = exerciseLibData?.exercises ?? [];
  const librarySessions: any[] = sessionLibData?.sessions ?? [];

  const serverExercises: SessionExercise[] = useMemo(
    () => [...(sessionExData?.exercises ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [sessionExData],
  );
  const [localOrder, setLocalOrder] = useState<SessionExercise[]>([]);
  useEffect(() => { setLocalOrder(serverExercises); }, [serverExercises]);

  const addedIds = new Set(localOrder.map((se) => Number(se.exercise?.id)).filter(Boolean));
  const nextOrder = localOrder.length ? Math.max(...localOrder.map((se) => se.order ?? 0)) + 1 : 1;

  const filteredLibrary = useMemo(() => libraryExercises.filter((ex) => {
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || ex.category === categoryFilter;
    return matchSearch && matchCat;
  }), [libraryExercises, search, categoryFilter]);

  const filteredSessions = useMemo(() => librarySessions.filter((s: any) =>
    !sessionSearch || (s.title ?? "").toLowerCase().includes(sessionSearch.toLowerCase()),
  ), [librarySessions, sessionSearch]);

  useEffect(() => { setModuleId(null); setSessionId(null); }, [programId]);
  useEffect(() => { setSessionId(null); }, [moduleId]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const reorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draggingExercise = draggingLibId
    ? libraryExercises.find((ex) => Number(ex.id) === draggingLibId) ?? null
    : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith("lib-")) {
      setDraggingLibId(Number(id.replace("lib-", "")));
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setDraggingLibId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith("lib-") && sessionId) {
      const exId = Number(activeId.replace("lib-", ""));
      if (addedIds.has(exId)) return;
      try {
        await addExercise({ sessionId, exerciseId: exId, order: nextOrder }).unwrap();
        toast.success("Exercise added");
      } catch {
        toast.error("Failed to add exercise");
      }
      return;
    }

    if (activeId.startsWith("session-") && overId.startsWith("session-")) {
      const activeSeId = Number(activeId.replace("session-", ""));
      const overSeId = Number(overId.replace("session-", ""));
      if (activeSeId === overSeId) return;

      setLocalOrder((prev) => {
        const reordered = arrayMove(
          prev,
          prev.findIndex((se) => se.id === activeSeId),
          prev.findIndex((se) => se.id === overSeId),
        );
        if (reorderTimer.current) clearTimeout(reorderTimer.current);
        reorderTimer.current = setTimeout(() => {
          if (!sessionId) return;
          reorderExercises({ sessionId, ids: reordered.map((se) => se.id) })
            .unwrap()
            .catch(() => toast.error("Failed to save order"));
        }, 600);
        return reordered;
      });
    }
  }, [sessionId, addedIds, nextOrder, addExercise, reorderExercises]);

  const handleRemove = async (sessionExerciseId: number) => {
    if (!window.confirm("Remove exercise from session?")) return;
    try {
      await removeExercise({ sessionExerciseId }).unwrap();
      toast.success("Removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  const handleCreateExercise = async () => {
    if (!exerciseForm.name.trim()) return;
    try {
      await createExercise({
        name: exerciseForm.name,
        category: exerciseForm.category || undefined,
        cues: exerciseForm.cues || undefined,
        howTo: exerciseForm.howTo || undefined,
        progression: exerciseForm.progression || undefined,
        regression: exerciseForm.regression || undefined,
        sets: exerciseForm.sets ? Number(exerciseForm.sets) : undefined,
        reps: exerciseForm.reps ? Number(exerciseForm.reps) : undefined,
        duration: exerciseForm.time ? Number(exerciseForm.time) : undefined,
        restSeconds: exerciseForm.rest ? Number(exerciseForm.rest) : undefined,
        videoUrl: exerciseForm.videoUrl || undefined,
        videoMuted: exerciseForm.videoMuted !== false,
      }).unwrap();
      setCreateOpen(false);
      setExerciseForm(emptyForm);
      toast.success("Exercise created and added to library");
    } catch {
      toast.error("Failed to create exercise");
    }
  };

  const handleCopySession = async (libSession: any) => {
    if (!moduleId) { toast.error("Select a module first"); return; }
    if (!programId) { toast.error("Select a program first"); return; }
    try {
      await copySession({ moduleId, sessionId: libSession.id, programId }).unwrap();
      refetchSessions();
      toast.success(`"${libSession.title ?? "Session"}" copied into module`);
    } catch {
      toast.error("Failed to copy session");
    }
  };

  const handleLinkSession = async () => {
    if (!linkTarget || !moduleId) return;
    const wk = parseInt(linkWeek, 10);
    const sn = parseInt(linkSessionNum, 10);
    if (!wk || !sn) { toast.error("Enter valid week and session numbers"); return; }
    try {
      await linkSession({ moduleId, librarySessionId: linkTarget.id, weekNumber: wk, sessionNumber: sn }).unwrap();
      refetchSessions();
      setLinkTarget(null);
      toast.success(`"${linkTarget.title ?? "Session"}" linked into module`);
    } catch {
      toast.error("Failed to link session");
    }
  };

  const handleUnlinkSession = async () => {
    if (!sessionId) return;
    if (!window.confirm("Unlink this session from the library? It will become a standalone copy.")) return;
    try {
      await unlinkSession({ sessionId }).unwrap();
      toast.success("Session unlinked — you can now edit it independently");
    } catch {
      toast.error("Failed to unlink session");
    }
  };

  const selectedProgram = programs.find((p: any) => p.id === programId);
  const selectedModule = modules.find((m: any) => m.id === moduleId);
  const selectedSession = sessions.find((s: any) => s.id === sessionId);
  const isLinked = !!(selectedSession as any)?.sourceLibrarySessionId;

  return (
    <AdminShell
      title="Split Builder"
      subtitle="Drag exercises from the library into your session"
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 h-[calc(100vh-10rem)]">

          {/* LEFT PANEL */}
          <div className="flex w-80 shrink-0 flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4">

            {/* Tabs */}
            <div className="flex rounded-xl border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setLeftTab("exercises")}
                className={`flex flex-1 items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition ${leftTab === "exercises" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Dumbbell className="h-3.5 w-3.5" /> Exercises
              </button>
              <button
                type="button"
                onClick={() => setLeftTab("sessions")}
                className={`flex flex-1 items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition ${leftTab === "sessions" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Library className="h-3.5 w-3.5" /> Session Library
              </button>
            </div>

            {leftTab === "exercises" ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Exercise Library</p>
                  <Button size="sm" className="h-7 px-2 text-xs" onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-1 h-3 w-3" /> New
                  </Button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8 h-8 text-sm"
                    placeholder="Search exercises..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      type="button"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setSearch("")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter(null)}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                      !categoryFilter ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                        categoryFilter === cat ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <p className="text-[10px] text-muted-foreground">
                  {filteredLibrary.length} exercise{filteredLibrary.length !== 1 ? "s" : ""}
                  {sessionId ? " — drag into session →" : ""}
                </p>

                <SortableContext
                  items={filteredLibrary.map((ex) => `lib-${ex.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
                    {filteredLibrary.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        {search ? `No exercises matching "${search}"` : "No exercises yet."}
                      </div>
                    ) : (
                      filteredLibrary.map((ex) => (
                        <LibraryExerciseCard
                          key={ex.id}
                          ex={ex}
                          isAdded={addedIds.has(Number(ex.id))}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Session Library</p>
                  <a href="/programs/sessions" target="_blank" className="flex items-center gap-0.5 text-[10px] text-primary underline-offset-2 hover:underline">
                    Manage <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8 h-8 text-sm"
                    placeholder="Search sessions..."
                    value={sessionSearch}
                    onChange={(e) => setSessionSearch(e.target.value)}
                  />
                  {sessionSearch && (
                    <button
                      type="button"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setSessionSearch("")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {!moduleId && (
                  <p className="text-[10px] text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5">
                    Select a module first to add sessions
                  </p>
                )}

                <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
                  {filteredSessions.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      {sessionSearch ? `No sessions matching "${sessionSearch}"` : "No library sessions yet."}
                    </div>
                  ) : (
                    filteredSessions.map((s: any) => (
                      <div key={s.id} className="rounded-xl border border-border bg-card p-2.5 space-y-1.5">
                        <div className="flex items-start gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary/60">
                            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">{s.title ?? `Session ${s.sessionNumber}`}</p>
                            <p className="text-[10px] text-muted-foreground">{s.exerciseCount} exercise{s.exerciseCount !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 flex-1 px-2 text-[10px] gap-1"
                            disabled={!moduleId || isCopying}
                            onClick={() => handleCopySession(s)}
                          >
                            <Copy className="h-3 w-3" /> Copy
                          </Button>
                          <Button
                            size="sm"
                            className="h-6 flex-1 px-2 text-[10px] gap-1"
                            disabled={!moduleId || isLinking}
                            onClick={() => { setLinkTarget(s); setLinkWeek("1"); setLinkSessionNum(String((sessions.length ?? 0) + 1)); }}
                          >
                            <Link2 className="h-3 w-3" /> Link
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* RIGHT PANEL — Session Builder */}
          <div className="flex flex-1 flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-primary" />
              Session Builder
            </p>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Program</label>
                <Select
                  items={programs.map((p: any) => ({ label: p.name ?? `Program ${p.id}`, value: String(p.id) }))}
                  value={programId ? String(programId) : ""}
                  onValueChange={(v) => setProgramId(v ? Number(v) : null)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectPopup>
                    {programs.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name ?? `Program ${p.id}`}</SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Module</label>
                <Select
                  items={modules.map((m: any) => ({ label: m.title ?? `Module ${m.id}`, value: String(m.id) }))}
                  value={moduleId ? String(moduleId) : ""}
                  onValueChange={(v) => setModuleId(v ? Number(v) : null)}
                  disabled={!programId}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={programId ? "Select..." : "Pick program first"} />
                  </SelectTrigger>
                  <SelectPopup>
                    {modules.map((m: any) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.title ?? `Module ${m.id}`}</SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Session</label>
                <Select
                  items={sessions.map((s: any) => ({ label: s.title ?? `W${s.weekNumber} S${s.sessionNumber}`, value: String(s.id) }))}
                  value={sessionId ? String(sessionId) : ""}
                  onValueChange={(v) => setSessionId(v ? Number(v) : null)}
                  disabled={!moduleId}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={moduleId ? "Select..." : "Pick module first"} />
                  </SelectTrigger>
                  <SelectPopup>
                    {sessions.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.title ?? `Week ${s.weekNumber} · Session ${s.sessionNumber}`}
                        {s.sourceLibrarySessionId ? " 🔗" : ""}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </div>
            </div>

            {selectedSession && (
              <div className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{selectedProgram?.name}</span>
                {" → "}
                <span>{selectedModule?.title}</span>
                {" → "}
                <span>{(selectedSession as any).title ?? `Week ${(selectedSession as any).weekNumber} · Session ${(selectedSession as any).sessionNumber}`}</span>
                <span className="ml-2 text-primary font-medium">{localOrder.length} exercise{localOrder.length !== 1 ? "s" : ""}</span>
                {isLinked && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    <Link2 className="h-3 w-3" /> Linked to library
                  </span>
                )}
              </div>
            )}

            {/* Linked session banner */}
            {isLinked && (
              <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                <span className="text-foreground">
                  <Link2 className="mr-1.5 inline h-3.5 w-3.5 text-primary" />
                  Exercises mirror the library session. Edit the source in the{" "}
                  <a href="/programs/sessions" target="_blank" className="text-primary underline-offset-2 hover:underline">Session Library</a>.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-3 h-6 shrink-0 gap-1 text-[10px]"
                  onClick={handleUnlinkSession}
                  disabled={isUnlinking}
                >
                  <Link2Off className="h-3 w-3" /> Unlink to customise
                </Button>
              </div>
            )}

            {!sessionId ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-center text-muted-foreground">
                <ChevronDown className="mb-2 h-8 w-8 opacity-30" />
                <p className="text-sm font-medium">Select a session above</p>
                <p className="mt-1 text-xs">Then drag exercises from the left panel</p>
              </div>
            ) : (
              <SortableContext
                items={localOrder.map((se) => `session-${se.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <div
                  className={`flex-1 space-y-1.5 overflow-y-auto rounded-xl transition-colors ${
                    draggingLibId && !addedIds.has(draggingLibId)
                      ? "bg-primary/5 ring-2 ring-primary/30 ring-dashed"
                      : ""
                  }`}
                >
                  {localOrder.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                      <Dumbbell className="mb-2 h-8 w-8 opacity-30" />
                      <p className="text-sm font-medium">Drop exercises here</p>
                      <p className="mt-1 text-xs">Drag from the library on the left</p>
                    </div>
                  ) : (
                    localOrder.map((se, index) => (
                      <SessionExerciseRow
                        key={se.id}
                        se={se}
                        index={index}
                        onRemove={handleRemove}
                        isRemoving={isRemoving}
                      />
                    ))
                  )}
                </div>
              </SortableContext>
            )}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {draggingExercise && <DragCard ex={draggingExercise} />}
        </DragOverlay>
      </DndContext>

      {/* Create Exercise Dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setExerciseForm(emptyForm); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Exercise</DialogTitle>
            <DialogDescription>Add a new exercise to the library.</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <ExerciseForm
              form={exerciseForm}
              onChange={(field, value) => setExerciseForm((prev) => ({ ...prev, [field]: value }))}
              onToggle={(field, value) => setExerciseForm((prev) => ({ ...prev, [field]: value }))}
              onSubmit={handleCreateExercise}
              onCancel={() => { setCreateOpen(false); setExerciseForm(emptyForm); }}
              saving={isCreating}
              isEdit={false}
              submitLabel="Create Exercise"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Session Dialog */}
      <Dialog open={!!linkTarget} onOpenChange={(o) => { if (!o) setLinkTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Link "{linkTarget?.title ?? "Session"}" into Module</DialogTitle>
            <DialogDescription>
              This session will stay connected to the library. Edits to the library entry propagate automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Week number</Label>
                <Input type="number" min={1} value={linkWeek} onChange={(e) => setLinkWeek(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Session number</Label>
                <Input type="number" min={1} value={linkSessionNum} onChange={(e) => setLinkSessionNum(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setLinkTarget(null)}>Cancel</Button>
              <Button size="sm" onClick={handleLinkSession} disabled={isLinking}>
                <Link2 className="mr-1.5 h-3.5 w-3.5" />
                {isLinking ? "Linking..." : "Link Session"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
