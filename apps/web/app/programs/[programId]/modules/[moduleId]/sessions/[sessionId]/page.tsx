"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { AdminShell } from "../../../../../../../components/admin/shell";
import { SectionHeader } from "../../../../../../../components/admin/section-header";
import { Button } from "../../../../../../../components/ui/button";
import { Badge } from "../../../../../../../components/ui/badge";
import { Input } from "../../../../../../../components/ui/input";
import { Label } from "../../../../../../../components/ui/label";
import { Textarea } from "../../../../../../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../../../../components/ui/dialog";
import {
  ChevronRight,
  Dumbbell,
  ExternalLink,
  GripVertical,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Trash2,
  Video,
} from "lucide-react";
import {
  useGetProgramsQuery,
  useGetProgramModulesQuery,
  useGetModuleSessionsQuery,
  useGetSessionExercisesQuery,
  useAddSessionExerciseMutation,
  useDeleteSessionExerciseMutation,
  useCreateExerciseMutation,
  useUpdateExerciseMutation,
  useUpdateSessionExerciseMutation,
  useGetExercisesQuery,
  useReorderSessionExercisesMutation,
} from "../../../../../../../lib/apiSlice";
import { toast } from "@/lib/toast";
import { ExerciseForm } from "../../../../../../../components/admin/exercise-library/exercise-form";
import type { Exercise } from "../../../../../../../components/admin/exercise-library/types";

const emptyForm: Exercise = {
  name: "",
  category: "",
  sets: "",
  reps: "",
  time: "",
  rest: "",
  videoUrl: "",
  notes: "",
  cues: "",
  howTo: "",
  progression: "",
  regression: "",
};

type ProgramSummary = { id: number; name?: string | null };
type ProgramModule = { id: number; title?: string | null };
type ProgramSession = {
  id: number;
  title?: string | null;
  sessionNumber?: number | null;
};

type SessionExercise = {
  id: number;
  order?: number | null;
  coachingNotes?: string | null;
  progressionNotes?: string | null;
  regressionNotes?: string | null;
  setsOverride?: number | null;
  repsOverride?: number | null;
  durationOverride?: number | null;
  restSecondsOverride?: number | null;
  exercise?: {
    id?: number | null;
    name?: string | null;
    category?: string | null;
    sets?: number | null;
    reps?: number | null;
    duration?: number | null;
    restSeconds?: number | null;
    videoUrl?: string | null;
    notes?: string | null;
    cues?: string | null;
    howTo?: string | null;
    progression?: string | null;
    regression?: string | null;
  } | null;
};

type ExerciseRecord = NonNullable<SessionExercise["exercise"]>;

function exerciseToForm(ex: ExerciseRecord): Exercise {
  return {
    id: ex.id ?? undefined,
    name: ex.name ?? "",
    category: ex.category ?? "",
    sets: ex.sets != null ? String(ex.sets) : "",
    reps: ex.reps != null ? String(ex.reps) : "",
    time: ex.duration != null ? String(ex.duration) : "",
    rest: ex.restSeconds != null ? String(ex.restSeconds) : "",
    videoUrl: ex.videoUrl ?? "",
    notes: ex.notes ?? "",
    cues: ex.cues ?? "",
    howTo: ex.howTo ?? "",
    progression: ex.progression ?? "",
    regression: ex.regression ?? "",
  };
}

// ─── Library picker (keyboard nav + hover video) ──────────────────────────────

type LibraryPickerProps = {
  exercises: Exercise[];
  search: string;
  onSearchChange: (v: string) => void;
  onPick: (ex: Exercise) => void;
  isAdding: boolean;
  emptyReason: string;
  onCreateInstead: () => void;
};

function LibraryPicker({
  exercises,
  search,
  onSearchChange,
  onPick,
  isAdding,
  emptyReason,
  onCreateInstead,
}: LibraryPickerProps) {
  const listId = useId();
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hoveredId, setHoveredId] = useState<number | string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Reset active index when search changes
  useEffect(() => { setActiveIndex(-1); }, [search]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLElement>("[data-picker-item]");
    items[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(exercises.length > 0 ? 0 : -1);
    }
  };

  const handleListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, exercises.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (activeIndex <= 0) {
        setActiveIndex(-1);
        searchRef.current?.focus();
      } else {
        setActiveIndex((i) => i - 1);
      }
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const ex = exercises[activeIndex];
      if (ex) onPick(ex);
    } else if (e.key === "Escape") {
      setActiveIndex(-1);
      searchRef.current?.focus();
    }
  };

  const hoveredExercise = exercises.find((ex) => ex.id === hoveredId);

  return (
    <div className="mt-2 space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchRef}
          className="pl-9"
          placeholder="Search exercises… (↓ arrow to navigate, Enter to add)"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          autoFocus
          aria-controls={listId}
          aria-autocomplete="list"
        />
      </div>

      {exercises.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {emptyReason}
        </div>
      ) : (
        <div className="flex gap-3">
          {/* Exercise list */}
          <div
            id={listId}
            ref={listRef}
            role="listbox"
            aria-label="Exercise library"
            tabIndex={activeIndex >= 0 ? 0 : -1}
            onKeyDown={handleListKeyDown}
            className="max-h-96 flex-1 space-y-1.5 overflow-y-auto pr-1 outline-none"
          >
            {exercises.map((ex, idx) => {
              const isActive = activeIndex === idx;
              return (
                <button
                  key={ex.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  data-picker-item
                  disabled={isAdding}
                  onClick={() => onPick(ex)}
                  onMouseEnter={() => {
                    setActiveIndex(idx);
                    if (ex.videoUrl) setHoveredId(ex.id ?? null);
                  }}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition disabled:opacity-50 ${
                    isActive
                      ? "border-primary/50 bg-primary/8 ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-primary/30 hover:bg-primary/5"
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/60">
                    {ex.videoUrl ? (
                      <Video className="h-4 w-4 text-primary" />
                    ) : (
                      <Dumbbell className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {ex.name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      {ex.category && (
                        <Badge variant="secondary" className="text-[10px]">
                          {ex.category}
                        </Badge>
                      )}
                      {ex.sets && (
                        <span className="text-[11px] text-muted-foreground">
                          {ex.sets} sets
                        </span>
                      )}
                      {ex.reps && (
                        <span className="text-[11px] text-muted-foreground">
                          {ex.reps} reps
                        </span>
                      )}
                      {typeof ex.usageCount === "number" && ex.usageCount > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          · {ex.usageCount} {ex.usageCount === 1 ? "session" : "sessions"}
                        </span>
                      )}
                    </div>
                    {ex.cues && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {ex.cues}
                      </p>
                    )}
                  </div>
                  <Plus className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                </button>
              );
            })}
          </div>

          {/* Hover video preview panel */}
          {hoveredExercise?.videoUrl && (
            <div className="w-44 shrink-0 self-start overflow-hidden rounded-xl border border-border bg-card shadow-md">
              <video
                key={hoveredExercise.videoUrl}
                src={hoveredExercise.videoUrl}
                autoPlay
                muted
                loop
                playsInline
                className="aspect-video w-full object-cover"
              />
              <p className="truncate px-2 py-1.5 text-[11px] font-medium text-foreground">
                {hoveredExercise.name}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-border pt-3 text-center">
        <button
          type="button"
          className="text-sm text-primary underline-offset-2 hover:underline"
          onClick={onCreateInstead}
        >
          Create a new exercise instead
        </button>
      </div>
    </div>
  );
}

// ─── Sortable row ─────────────────────────────────────────────────────────────

type SortableRowProps = {
  se: SessionExercise;
  index: number;
  onNotes: (se: SessionExercise) => void;
  onRemove: (id: number) => void;
  isRemoving: boolean;
};

function SortableExerciseRow({
  se,
  index,
  onNotes,
  onRemove,
  isRemoving,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: se.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const hasNotes =
    se.coachingNotes || se.progressionNotes || se.regressionNotes;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
    >
      {/* Drag handle */}
      <button
        type="button"
        className="mt-0.5 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Order badge */}
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {index + 1}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {se.exercise?.name ?? "Unknown exercise"}
          </span>
          {hasNotes && (
            <span title="Has session notes">
              <MessageSquare className="h-3.5 w-3.5 text-primary/60" />
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          {se.exercise?.category && (
            <Badge variant="secondary" className="text-[10px]">
              {se.exercise.category}
            </Badge>
          )}
          {/* Sets — show override if set, else library default */}
          {(se.setsOverride != null || se.exercise?.sets != null) && (
            <span className={se.setsOverride != null ? "font-semibold text-primary" : "text-muted-foreground"}>
              {se.setsOverride ?? se.exercise?.sets} sets
              {se.setsOverride != null && se.exercise?.sets != null && se.setsOverride !== se.exercise.sets && (
                <span className="ml-0.5 text-muted-foreground line-through">
                  {se.exercise.sets}
                </span>
              )}
            </span>
          )}
          {/* Reps */}
          {(se.repsOverride != null || se.exercise?.reps != null) && (
            <span className={se.repsOverride != null ? "font-semibold text-primary" : "text-muted-foreground"}>
              {se.repsOverride ?? se.exercise?.reps} reps
              {se.repsOverride != null && se.exercise?.reps != null && se.repsOverride !== se.exercise.reps && (
                <span className="ml-0.5 text-muted-foreground line-through">
                  {se.exercise.reps}
                </span>
              )}
            </span>
          )}
          {/* Duration */}
          {(se.durationOverride != null || se.exercise?.duration != null) && (
            <span className={se.durationOverride != null ? "font-semibold text-primary" : "text-muted-foreground"}>
              {se.durationOverride ?? se.exercise?.duration}s
            </span>
          )}
          {/* Rest */}
          {(se.restSecondsOverride != null || se.exercise?.restSeconds != null) && (
            <span className={se.restSecondsOverride != null ? "font-semibold text-primary" : "text-muted-foreground"}>
              {se.restSecondsOverride ?? se.exercise?.restSeconds}s rest
            </span>
          )}
          {se.exercise?.videoUrl && (
            <span className="flex items-center gap-1 text-primary">
              <Video className="h-3 w-3" /> Video
            </span>
          )}
        </div>

        {/* Session coaching notes preview */}
        {se.coachingNotes && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70">Coaching: </span>
            {se.coachingNotes}
          </p>
        )}
        {se.progressionNotes && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70">Progression: </span>
            {se.progressionNotes}
          </p>
        )}
        {se.regressionNotes && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70">Regression: </span>
            {se.regressionNotes}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onNotes(se)}
          title="Session notes & overrides"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 shrink-0 p-0 text-destructive"
          onClick={() => onRemove(se.id)}
          disabled={isRemoving}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Session notes dialog ─────────────────────────────────────────────────────

type NotesForm = {
  coachingNotes: string;
  progressionNotes: string;
  regressionNotes: string;
  setsOverride: string;
  repsOverride: string;
  durationOverride: string;
  restSecondsOverride: string;
};

type SessionNotesDialogProps = {
  open: boolean;
  se: SessionExercise | null;
  onClose: () => void;
  onSave: (id: number, notes: NotesForm) => Promise<void>;
  saving: boolean;
};

function SessionNotesDialog({
  open,
  se,
  onClose,
  onSave,
  saving,
}: SessionNotesDialogProps) {
  const [form, setForm] = useState<NotesForm>({
    coachingNotes: "",
    progressionNotes: "",
    regressionNotes: "",
    setsOverride: "",
    repsOverride: "",
    durationOverride: "",
    restSecondsOverride: "",
  });

  useEffect(() => {
    if (se) {
      setForm({
        coachingNotes: se.coachingNotes ?? "",
        progressionNotes: se.progressionNotes ?? "",
        regressionNotes: se.regressionNotes ?? "",
        setsOverride: se.setsOverride != null ? String(se.setsOverride) : "",
        repsOverride: se.repsOverride != null ? String(se.repsOverride) : "",
        durationOverride: se.durationOverride != null ? String(se.durationOverride) : "",
        restSecondsOverride: se.restSecondsOverride != null ? String(se.restSecondsOverride) : "",
      });
    }
  }, [se]);

  const ex = se?.exercise;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {ex?.name ?? "Exercise"}
            <span className="text-sm font-normal text-muted-foreground">
              — session overrides
            </span>
          </DialogTitle>
          <DialogDescription>
            These notes are specific to this session and don&apos;t affect the
            exercise library.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-5">
          {/* Library defaults (read-only reference) */}
          <div className="rounded-xl border border-border bg-secondary/30 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Library defaults
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {ex?.sets != null && <span>{ex.sets} sets</span>}
              {ex?.reps != null && <span>{ex.reps} reps</span>}
              {ex?.duration != null && <span>{ex.duration}s duration</span>}
              {ex?.restSeconds != null && <span>{ex.restSeconds}s rest</span>}
              {ex?.category && (
                <Badge variant="secondary" className="text-[10px]">
                  {ex.category}
                </Badge>
              )}
            </div>
            {ex?.cues && (
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/70">Cues: </span>
                {ex.cues}
              </p>
            )}
            {ex?.videoUrl && (
              <div className="mt-3 aspect-video overflow-hidden rounded-lg border border-border">
                <video
                  className="h-full w-full object-cover"
                  src={ex.videoUrl}
                  controls
                  muted
                  preload="metadata"
                />
              </div>
            )}
            <Link
              href="/programs/exercises"
              target="_blank"
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
            >
              Edit in library <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {/* Sets / reps / duration / rest overrides */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">
              Load overrides{" "}
              <span className="font-normal text-muted-foreground">
                — leave blank to use the library defaults
              </span>
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Sets", field: "setsOverride" as const, placeholder: ex?.sets != null ? String(ex.sets) : "—" },
                { label: "Reps", field: "repsOverride" as const, placeholder: ex?.reps != null ? String(ex.reps) : "—" },
                { label: "Duration (s)", field: "durationOverride" as const, placeholder: ex?.duration != null ? String(ex.duration) : "—" },
                { label: "Rest (s)", field: "restSecondsOverride" as const, placeholder: ex?.restSeconds != null ? String(ex.restSeconds) : "—" },
              ].map(({ label, field, placeholder }) => (
                <div key={field} className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">{label}</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder={placeholder}
                    value={form[field]}
                    onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Session-specific notes */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Coaching notes{" "}
                <span className="text-muted-foreground">
                  (for this session only)
                </span>
              </Label>
              <Textarea
                rows={3}
                placeholder="e.g. Focus on knee tracking today, lighter load than usual…"
                value={form.coachingNotes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, coachingNotes: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                Progression note{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                rows={2}
                placeholder="If easy, add 2.5kg…"
                value={form.progressionNotes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, progressionNotes: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                Regression note{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                rows={2}
                placeholder="If struggling, reduce to bodyweight…"
                value={form.regressionNotes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, regressionNotes: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={() => se && onSave(se.id, form)}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Notes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SessionDetailPage() {
  const params = useParams();
  const programId = Number(params?.programId);
  const moduleId = Number(params?.moduleId);
  const sessionId = Number(params?.sessionId);

  const { data: programsData } = useGetProgramsQuery();
  const { data: modulesData } = useGetProgramModulesQuery(
    { programId },
    { skip: !Number.isFinite(programId) || programId <= 0 },
  );
  const { data: sessionsData } = useGetModuleSessionsQuery(
    { moduleId },
    { skip: !Number.isFinite(moduleId) || moduleId <= 0 },
  );
  const { data: exercisesInSession, isLoading } = useGetSessionExercisesQuery(
    { sessionId },
    { skip: !Number.isFinite(sessionId) || sessionId <= 0 },
  );
  const { data: libraryData } = useGetExercisesQuery();

  const [addExercise, { isLoading: isAdding }] = useAddSessionExerciseMutation();
  const [removeExercise, { isLoading: isRemoving }] = useDeleteSessionExerciseMutation();
  const [createExercise, { isLoading: isCreatingExercise }] = useCreateExerciseMutation();
  const [updateExercise, { isLoading: isUpdatingExercise }] = useUpdateExerciseMutation();
  const [updateSessionExercise, { isLoading: isSavingNotes }] = useUpdateSessionExerciseMutation();
  const [reorderExercises] = useReorderSessionExercisesMutation();

  // Local ordered list for optimistic drag-reorder
  const serverExercises: SessionExercise[] = useMemo(
    () =>
      [...(exercisesInSession?.exercises ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      ),
    [exercisesInSession],
  );
  const [localOrder, setLocalOrder] = useState<SessionExercise[]>([]);

  useEffect(() => {
    setLocalOrder(serverExercises);
  }, [serverExercises]);

  const reorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setLocalOrder((prev) => {
        const oldIndex = prev.findIndex((se) => se.id === active.id);
        const newIndex = prev.findIndex((se) => se.id === over.id);
        const reordered = arrayMove(prev, oldIndex, newIndex);

        if (reorderTimer.current) clearTimeout(reorderTimer.current);
        reorderTimer.current = setTimeout(() => {
          reorderExercises({
            sessionId,
            ids: reordered.map((se) => se.id),
          })
            .unwrap()
            .catch(() => {
              toast.error("Failed to save order");
              setLocalOrder(serverExercises);
            });
        }, 600);

        return reordered;
      });
    },
    [reorderExercises, serverExercises, sessionId],
  );

  // Add dialog: null | "library" | "create"
  const [addDialog, setAddDialog] = useState<"library" | "create" | null>(null);
  const [exerciseForm, setExerciseForm] = useState<Exercise>(emptyForm);
  const [librarySearch, setLibrarySearch] = useState("");

  // Notes dialog
  const [notesTarget, setNotesTarget] = useState<SessionExercise | null>(null);

  const program = useMemo(
    () =>
      ((programsData?.programs ?? []) as ProgramSummary[]).find(
        (item) => item.id === programId,
      ) ?? null,
    [programsData, programId],
  );
  const currentModule = useMemo(
    () =>
      ((modulesData?.modules ?? []) as ProgramModule[]).find(
        (m) => m.id === moduleId,
      ),
    [modulesData, moduleId],
  );
  const currentSession = useMemo(
    () =>
      ((sessionsData?.sessions ?? []) as ProgramSession[]).find(
        (s) => s.id === sessionId,
      ),
    [sessionsData, sessionId],
  );

  const libraryExercises: Exercise[] = libraryData?.exercises ?? [];
  const alreadyAddedIds = new Set(
    localOrder.map((se) => se.exercise?.id).filter(Boolean),
  );
  const nextOrder = localOrder.length
    ? Math.max(...localOrder.map((se) => se.order ?? 0)) + 1
    : 1;

  const filteredLibrary = libraryExercises.filter((ex) => {
    if (alreadyAddedIds.has(Number(ex.id))) return false;
    if (!librarySearch) return true;
    return ex.name.toLowerCase().includes(librarySearch.toLowerCase());
  });

  const openLibrary = () => {
    setLibrarySearch("");
    setAddDialog("library");
  };
  const openCreate = () => {
    setExerciseForm(emptyForm);
    setAddDialog("create");
  };
  const closeAddDialog = () => {
    setAddDialog(null);
    setExerciseForm(emptyForm);
  };

  const handlePickFromLibrary = async (ex: Exercise) => {
    try {
      await addExercise({
        sessionId,
        exerciseId: Number(ex.id),
        order: nextOrder,
      }).unwrap();
      toast.success(`"${ex.name}" added`);
      closeAddDialog();
    } catch {
      toast.error("Failed to add exercise");
    }
  };

  const handleCreateAndAdd = async () => {
    if (!exerciseForm.name.trim()) return;
    try {
      const created = await createExercise({
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
        notes: exerciseForm.notes || undefined,
        videoUrl: exerciseForm.videoUrl || undefined,
      }).unwrap();
      const newId = created?.exercise?.id;
      if (newId) {
        await addExercise({
          sessionId,
          exerciseId: newId,
          order: nextOrder,
        }).unwrap();
      }
      closeAddDialog();
      toast.success("Exercise created and added");
    } catch {
      toast.error("Failed to add exercise");
    }
  };

  const handleSaveNotes = async (id: number, notes: NotesForm) => {
    const numOrNull = (v: string) => {
      const n = Number(v);
      return v.trim() && Number.isFinite(n) && n > 0 ? n : null;
    };
    try {
      await updateSessionExercise({
        id,
        patch: {
          coachingNotes: notes.coachingNotes || null,
          progressionNotes: notes.progressionNotes || null,
          regressionNotes: notes.regressionNotes || null,
          setsOverride: numOrNull(notes.setsOverride),
          repsOverride: numOrNull(notes.repsOverride),
          durationOverride: numOrNull(notes.durationOverride),
          restSecondsOverride: numOrNull(notes.restSecondsOverride),
        },
      }).unwrap();
      setNotesTarget(null);
      toast.success("Session overrides saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleRemove = async (sessionExerciseId: number) => {
    if (!window.confirm("Remove this exercise from the session?")) return;
    try {
      await removeExercise({ sessionExerciseId }).unwrap();
      toast.success("Exercise removed");
    } catch {
      toast.error("Failed to remove exercise");
    }
  };

  return (
    <AdminShell
      title={
        currentSession?.title ||
        `Session ${currentSession?.sessionNumber ?? ""}`
      }
      subtitle={
        <span className="flex items-center gap-2 text-xs">
          <Link
            href="/programs"
            className="text-muted-foreground hover:text-foreground"
          >
            Programs
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <Link
            href={`/programs/${programId}`}
            className="text-muted-foreground hover:text-foreground"
          >
            {program?.name ?? "Program"}
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <Link
            href={`/programs/${programId}/modules/${moduleId}`}
            className="text-muted-foreground hover:text-foreground"
          >
            {currentModule?.title ?? "Module"}
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span>
            {currentSession?.title ||
              `Session ${currentSession?.sessionNumber ?? ""}`}
          </span>
        </span>
      }
      actions={
        <Button onClick={openLibrary}>
          <Plus className="mr-1 h-4 w-4" /> Add Exercise
        </Button>
      }
    >
      <SectionHeader
        title="Exercises"
        description={
          localOrder.length > 0
            ? `${localOrder.length} exercise${localOrder.length !== 1 ? "s" : ""} — drag to reorder · click pencil to add session notes`
            : "No exercises yet."
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl bg-secondary/40"
            />
          ))}
        </div>
      ) : localOrder.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          <Dumbbell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="font-semibold text-foreground">No exercises yet</p>
          <p className="mt-1">
            Click &quot;Add Exercise&quot; to pick from your library or create a
            new one.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localOrder.map((se) => se.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {localOrder.map((se, index) => (
                <SortableExerciseRow
                  key={se.id}
                  se={se}
                  index={index}
                  onNotes={setNotesTarget}
                  onRemove={handleRemove}
                  isRemoving={isRemoving}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* ── Add exercise dialog ─────────────────────────────── */}
      <Dialog
        open={addDialog !== null}
        onOpenChange={(open) => { if (!open) closeAddDialog(); }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {addDialog === "library" ? "Pick from Exercise Library" : "Create New Exercise"}
            </DialogTitle>
            <DialogDescription>
              {addDialog === "library"
                ? "Search and click to add instantly. Already-added exercises are hidden."
                : "Creates a new exercise in the library and adds it to this session."}
            </DialogDescription>
          </DialogHeader>

          {addDialog === "library" && (
            <LibraryPicker
              exercises={filteredLibrary}
              search={librarySearch}
              onSearchChange={setLibrarySearch}
              onPick={handlePickFromLibrary}
              isAdding={isAdding}
              emptyReason={
                librarySearch
                  ? `No exercises matching "${librarySearch}"`
                  : libraryExercises.length === 0
                    ? "Your library is empty."
                    : "All exercises are already in this session."
              }
              onCreateInstead={openCreate}
            />
          )}

          {addDialog === "create" && (
            <div className="mt-4 space-y-4">
              <button
                type="button"
                className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={openLibrary}
              >
                ← Back to library
              </button>
              <ExerciseForm
                form={exerciseForm}
                onChange={(field, value) =>
                  setExerciseForm((prev) => ({ ...prev, [field]: value }))
                }
                onSubmit={handleCreateAndAdd}
                onCancel={closeAddDialog}
                saving={isCreatingExercise || isAdding || isUpdatingExercise}
                isEdit={false}
                submitLabel="Create & Add to Session"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Session notes dialog ────────────────────────────── */}
      <SessionNotesDialog
        open={notesTarget !== null}
        se={notesTarget}
        onClose={() => setNotesTarget(null)}
        onSave={handleSaveNotes}
        saving={isSavingNotes}
      />
    </AdminShell>
  );
}
