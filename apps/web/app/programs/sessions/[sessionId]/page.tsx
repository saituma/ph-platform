"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { AdminShell } from "../../../../components/admin/shell";
import { SectionHeader } from "../../../../components/admin/section-header";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Textarea } from "../../../../components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "../../../../components/ui/dialog";
import {
  ChevronRight, Dumbbell, ExternalLink, GripVertical, MessageSquare, Pencil, Plus, Search, Trash2, Video,
} from "lucide-react";
import {
  useGetSessionLibraryQuery,
  useGetSessionExercisesQuery,
  useAddSessionExerciseMutation,
  useDeleteSessionExerciseMutation,
  useCreateExerciseMutation,
  useUpdateExerciseMutation,
  useUpdateSessionExerciseMutation,
  useGetExercisesQuery,
  useReorderSessionExercisesMutation,
} from "../../../../lib/apiSlice";
import { toast } from "@/lib/toast";
import { ExerciseForm } from "../../../../components/admin/exercise-library/exercise-form";
import type { Exercise } from "../../../../components/admin/exercise-library/types";

const emptyForm: Exercise = { name: "", category: "", sets: "", reps: "", time: "", rest: "", videoUrl: "", notes: "", cues: "", howTo: "", progression: "", regression: "" };

type SessionExercise = {
  id: number; order?: number | null; coachingNotes?: string | null; progressionNotes?: string | null;
  regressionNotes?: string | null; setsOverride?: number | null; repsOverride?: number | null;
  durationOverride?: number | null; restSecondsOverride?: number | null;
  exercise?: { id?: number | null; name?: string | null; category?: string | null; sets?: number | null;
    reps?: number | null; duration?: number | null; restSeconds?: number | null; videoUrl?: string | null;
    notes?: string | null; cues?: string | null; howTo?: string | null; progression?: string | null; regression?: string | null; } | null;
};

function LibraryPicker({ exercises, search, onSearchChange, onPick, isAdding, emptyReason, onCreateInstead }: {
  exercises: Exercise[]; search: string; onSearchChange: (v: string) => void;
  onPick: (ex: Exercise) => void; isAdding: boolean; emptyReason: string; onCreateInstead: () => void;
}) {
  const listId = useId();
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hoveredId, setHoveredId] = useState<number | string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setActiveIndex(-1); }, [search]);
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    listRef.current.querySelectorAll<HTMLElement>("[data-picker-item]")[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const hoveredExercise = exercises.find((ex) => ex.id === hoveredId);

  return (
    <div className="mt-2 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input ref={searchRef} className="pl-9" placeholder="Search exercises… (↓ arrow, Enter to add)"
          value={search} onChange={(e) => onSearchChange(e.target.value)} autoFocus
          onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(exercises.length > 0 ? 0 : -1); } }}
          aria-controls={listId} aria-autocomplete="list" />
      </div>
      {exercises.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">{emptyReason}</div>
      ) : (
        <div className="flex gap-3">
          <div id={listId} ref={listRef} role="listbox" tabIndex={activeIndex >= 0 ? 0 : -1}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, exercises.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); if (activeIndex <= 0) { setActiveIndex(-1); searchRef.current?.focus(); } else setActiveIndex((i) => i - 1); }
              else if (e.key === "Enter" && activeIndex >= 0) { e.preventDefault(); const ex = exercises[activeIndex]; if (ex) onPick(ex); }
            }}
            className="max-h-96 flex-1 space-y-1.5 overflow-y-auto pr-1 outline-none">
            {exercises.map((ex, idx) => (
              <button key={ex.id} type="button" role="option" aria-selected={activeIndex === idx} data-picker-item
                disabled={isAdding} onClick={() => onPick(ex)}
                onMouseEnter={() => { setActiveIndex(idx); if (ex.videoUrl) setHoveredId(ex.id ?? null); }}
                onMouseLeave={() => setHoveredId(null)}
                className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition disabled:opacity-50 ${activeIndex === idx ? "border-primary/50 bg-primary/8 ring-1 ring-primary/30" : "border-border bg-card hover:border-primary/30 hover:bg-primary/5"}`}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/60">
                  {ex.videoUrl ? <Video className="h-4 w-4 text-primary" /> : <Dumbbell className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{ex.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {ex.category && <Badge variant="secondary" className="text-[10px]">{ex.category}</Badge>}
                    {ex.sets && <span className="text-[11px] text-muted-foreground">{ex.sets} sets</span>}
                    {ex.reps && <span className="text-[11px] text-muted-foreground">{ex.reps} reps</span>}
                  </div>
                </div>
                <Plus className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </button>
            ))}
          </div>
          {hoveredExercise?.videoUrl && (
            <div className="w-44 shrink-0 self-start overflow-hidden rounded-xl border border-border bg-card shadow-md">
              <video key={hoveredExercise.videoUrl} src={hoveredExercise.videoUrl} autoPlay muted loop playsInline className="aspect-video w-full object-cover" />
              <p className="truncate px-2 py-1.5 text-[11px] font-medium text-foreground">{hoveredExercise.name}</p>
            </div>
          )}
        </div>
      )}
      <div className="border-t border-border pt-3 text-center">
        <button type="button" className="text-sm text-primary underline-offset-2 hover:underline" onClick={onCreateInstead}>
          Create a new exercise instead
        </button>
      </div>
    </div>
  );
}

function SortableExerciseRow({ se, index, onNotes, onRemove, isRemoving }: {
  se: SessionExercise; index: number; onNotes: (se: SessionExercise) => void; onRemove: (id: number) => void; isRemoving: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: se.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 50 : undefined }}
      className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
      <button type="button" className="mt-0.5 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{se.exercise?.name ?? "Unknown exercise"}</span>
          {(se.coachingNotes || se.progressionNotes || se.regressionNotes) && <MessageSquare className="h-3.5 w-3.5 text-primary/60" />}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          {se.exercise?.category && <Badge variant="secondary" className="text-[10px]">{se.exercise.category}</Badge>}
          {(se.setsOverride != null || se.exercise?.sets != null) && (
            <span className={se.setsOverride != null ? "font-semibold text-primary" : "text-muted-foreground"}>
              {se.setsOverride ?? se.exercise?.sets} sets
            </span>
          )}
          {(se.repsOverride != null || se.exercise?.reps != null) && (
            <span className={se.repsOverride != null ? "font-semibold text-primary" : "text-muted-foreground"}>
              {se.repsOverride ?? se.exercise?.reps} reps
            </span>
          )}
          {se.exercise?.videoUrl && <span className="flex items-center gap-1 text-primary"><Video className="h-3 w-3" /> Video</span>}
        </div>
        {se.coachingNotes && <p className="mt-1.5 text-xs text-muted-foreground"><span className="font-medium text-foreground/70">Coaching: </span>{se.coachingNotes}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onNotes(se)}><Pencil className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => onRemove(se.id)} disabled={isRemoving}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

type NotesForm = { coachingNotes: string; progressionNotes: string; regressionNotes: string; setsOverride: string; repsOverride: string; durationOverride: string; restSecondsOverride: string; };

function SessionNotesDialog({ open, se, onClose, onSave, saving }: { open: boolean; se: SessionExercise | null; onClose: () => void; onSave: (id: number, notes: NotesForm) => Promise<void>; saving: boolean; }) {
  const [form, setForm] = useState<NotesForm>({ coachingNotes: "", progressionNotes: "", regressionNotes: "", setsOverride: "", repsOverride: "", durationOverride: "", restSecondsOverride: "" });
  useEffect(() => {
    if (se) setForm({ coachingNotes: se.coachingNotes ?? "", progressionNotes: se.progressionNotes ?? "", regressionNotes: se.regressionNotes ?? "", setsOverride: se.setsOverride != null ? String(se.setsOverride) : "", repsOverride: se.repsOverride != null ? String(se.repsOverride) : "", durationOverride: se.durationOverride != null ? String(se.durationOverride) : "", restSecondsOverride: se.restSecondsOverride != null ? String(se.restSecondsOverride) : "" });
  }, [se]);
  const ex = se?.exercise;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{ex?.name ?? "Exercise"} <span className="text-sm font-normal text-muted-foreground">— session overrides</span></DialogTitle>
          <DialogDescription>These notes are specific to this session and don&apos;t affect the exercise library.</DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-4">
          {ex?.videoUrl && <div className="aspect-video overflow-hidden rounded-lg border border-border"><video className="h-full w-full object-cover" src={ex.videoUrl} controls muted preload="metadata" /></div>}
          <Link href="/programs/exercises" target="_blank" className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline">Edit in library <ExternalLink className="h-3 w-3" /></Link>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Sets", field: "setsOverride" as const, ph: ex?.sets != null ? String(ex.sets) : "—" },
              { label: "Reps", field: "repsOverride" as const, ph: ex?.reps != null ? String(ex.reps) : "—" },
              { label: "Duration (s)", field: "durationOverride" as const, ph: ex?.duration != null ? String(ex.duration) : "—" },
              { label: "Rest (s)", field: "restSecondsOverride" as const, ph: ex?.restSeconds != null ? String(ex.restSeconds) : "—" },
            ].map(({ label, field, ph }) => (
              <div key={field} className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{label}</Label>
                <Input type="number" min={1} placeholder={ph} value={form[field]} onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))} className="h-8 text-sm" />
              </div>
            ))}
          </div>
          {(["coachingNotes", "progressionNotes", "regressionNotes"] as const).map((field) => (
            <div key={field} className="space-y-1.5">
              <Label className="text-xs capitalize">{field.replace("Notes", " notes")} <span className="text-muted-foreground">(for this session only)</span></Label>
              <Textarea rows={2} value={form[field]} onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))} />
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={() => se && onSave(se.id, form)} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function LibrarySessionExercisePage() {
  const params = useParams();
  const sessionId = Number(params?.sessionId);

  const { data: libraryData } = useGetSessionLibraryQuery();
  const { data: exercisesInSession, isLoading } = useGetSessionExercisesQuery({ sessionId }, { skip: !sessionId });
  const { data: exerciseLibraryData } = useGetExercisesQuery();

  const [addExercise, { isLoading: isAdding }] = useAddSessionExerciseMutation();
  const [removeExercise, { isLoading: isRemoving }] = useDeleteSessionExerciseMutation();
  const [createExercise, { isLoading: isCreatingExercise }] = useCreateExerciseMutation();
  const [updateExercise, { isLoading: isUpdatingExercise }] = useUpdateExerciseMutation();
  const [updateSessionExercise, { isLoading: isSavingNotes }] = useUpdateSessionExerciseMutation();
  const [reorderExercises] = useReorderSessionExercisesMutation();

  const serverExercises: SessionExercise[] = useMemo(
    () => [...(exercisesInSession?.exercises ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [exercisesInSession],
  );
  const [localOrder, setLocalOrder] = useState<SessionExercise[]>([]);
  useEffect(() => { setLocalOrder(serverExercises); }, [serverExercises]);

  const reorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocalOrder((prev) => {
      const reordered = arrayMove(prev, prev.findIndex((se) => se.id === active.id), prev.findIndex((se) => se.id === over.id));
      if (reorderTimer.current) clearTimeout(reorderTimer.current);
      reorderTimer.current = setTimeout(() => {
        reorderExercises({ sessionId, ids: reordered.map((se) => se.id) }).unwrap().catch(() => { toast.error("Failed to save order"); setLocalOrder(serverExercises); });
      }, 600);
      return reordered;
    });
  }, [reorderExercises, serverExercises, sessionId]);

  const [addDialog, setAddDialog] = useState<"library" | "create" | null>(null);
  const [exerciseForm, setExerciseForm] = useState<Exercise>(emptyForm);
  const [librarySearch, setLibrarySearch] = useState("");
  const [notesTarget, setNotesTarget] = useState<SessionExercise | null>(null);

  const currentSession = useMemo(() => (libraryData?.sessions ?? []).find((s: any) => s.id === sessionId), [libraryData, sessionId]);
  const libraryExercises: Exercise[] = exerciseLibraryData?.exercises ?? [];
  const alreadyAddedIds = new Set(localOrder.map((se) => se.exercise?.id).filter(Boolean));
  const nextOrder = localOrder.length ? Math.max(...localOrder.map((se) => se.order ?? 0)) + 1 : 1;

  const filteredLibrary = libraryExercises.filter((ex) => {
    if (alreadyAddedIds.has(Number(ex.id))) return false;
    return !librarySearch || ex.name.toLowerCase().includes(librarySearch.toLowerCase());
  });

  const handlePickFromLibrary = async (ex: Exercise) => {
    try {
      await addExercise({ sessionId, exerciseId: Number(ex.id), order: nextOrder }).unwrap();
      toast.success(`"${ex.name}" added`);
      setAddDialog(null);
    } catch { toast.error("Failed to add exercise"); }
  };

  const handleCreateAndAdd = async () => {
    if (!exerciseForm.name.trim()) return;
    try {
      const created = await createExercise({ name: exerciseForm.name, category: exerciseForm.category || undefined, cues: exerciseForm.cues || undefined, howTo: exerciseForm.howTo || undefined, progression: exerciseForm.progression || undefined, regression: exerciseForm.regression || undefined, sets: exerciseForm.sets ? Number(exerciseForm.sets) : undefined, reps: exerciseForm.reps ? Number(exerciseForm.reps) : undefined, duration: exerciseForm.time ? Number(exerciseForm.time) : undefined, restSeconds: exerciseForm.rest ? Number(exerciseForm.rest) : undefined, videoUrl: exerciseForm.videoUrl || undefined }).unwrap();
      const newId = created?.exercise?.id;
      if (newId) await addExercise({ sessionId, exerciseId: newId, order: nextOrder }).unwrap();
      setAddDialog(null);
      setExerciseForm(emptyForm);
      toast.success("Exercise created and added");
    } catch { toast.error("Failed to add exercise"); }
  };

  const handleSaveNotes = async (id: number, notes: NotesForm) => {
    const n = (v: string) => { const x = Number(v); return v.trim() && Number.isFinite(x) && x > 0 ? x : null; };
    try {
      await updateSessionExercise({ id, patch: { coachingNotes: notes.coachingNotes || null, progressionNotes: notes.progressionNotes || null, regressionNotes: notes.regressionNotes || null, setsOverride: n(notes.setsOverride), repsOverride: n(notes.repsOverride), durationOverride: n(notes.durationOverride), restSecondsOverride: n(notes.restSecondsOverride) } }).unwrap();
      setNotesTarget(null);
      toast.success("Overrides saved");
    } catch { toast.error("Failed to save"); }
  };

  return (
    <AdminShell
      title={currentSession?.title || `Session ${currentSession?.sessionNumber ?? ""}`}
      subtitle={
        <span className="flex items-center gap-2 text-xs">
          <Link href="/programs" className="text-muted-foreground hover:text-foreground">Programs</Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <Link href="/programs/sessions" className="text-muted-foreground hover:text-foreground">Session Library</Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span>{currentSession?.title || `Session ${currentSession?.sessionNumber ?? ""}`}</span>
        </span>
      }
      actions={<Button onClick={() => { setLibrarySearch(""); setAddDialog("library"); }}><Plus className="mr-1 h-4 w-4" /> Add Exercise</Button>}
    >
      <SectionHeader title="Exercises" description={localOrder.length > 0 ? `${localOrder.length} exercise${localOrder.length !== 1 ? "s" : ""} — drag to reorder` : "No exercises yet."} />

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-secondary/40" />)}</div>
      ) : localOrder.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          <Dumbbell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="font-semibold text-foreground">No exercises yet</p>
          <p className="mt-1">Add exercises from the library or create new ones.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={localOrder.map((se) => se.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {localOrder.map((se, index) => (
                <SortableExerciseRow key={se.id} se={se} index={index} onNotes={setNotesTarget} onRemove={async (id) => { if (!window.confirm("Remove exercise?")) return; try { await removeExercise({ sessionExerciseId: id }).unwrap(); toast.success("Removed"); } catch { toast.error("Failed"); } }} isRemoving={isRemoving} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={addDialog !== null} onOpenChange={(o) => { if (!o) { setAddDialog(null); setExerciseForm(emptyForm); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{addDialog === "library" ? "Pick from Exercise Library" : "Create New Exercise"}</DialogTitle>
            <DialogDescription>{addDialog === "library" ? "Search and click to add instantly." : "Creates a new exercise and adds it to this session."}</DialogDescription>
          </DialogHeader>
          {addDialog === "library" && (
            <LibraryPicker exercises={filteredLibrary} search={librarySearch} onSearchChange={setLibrarySearch} onPick={handlePickFromLibrary} isAdding={isAdding}
              emptyReason={librarySearch ? `No exercises matching "${librarySearch}"` : libraryExercises.length === 0 ? "Your library is empty." : "All exercises already added."}
              onCreateInstead={() => { setExerciseForm(emptyForm); setAddDialog("create"); }} />
          )}
          {addDialog === "create" && (
            <div className="mt-4 space-y-4">
              <button type="button" className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" onClick={() => setAddDialog("library")}>← Back to library</button>
              <ExerciseForm form={exerciseForm} onChange={(field, value) => setExerciseForm((prev) => ({ ...prev, [field]: value }))} onSubmit={handleCreateAndAdd} onCancel={() => { setAddDialog(null); setExerciseForm(emptyForm); }} saving={isCreatingExercise || isAdding || isUpdatingExercise} isEdit={false} submitLabel="Create & Add to Session" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SessionNotesDialog open={notesTarget !== null} se={notesTarget} onClose={() => setNotesTarget(null)} onSave={handleSaveNotes} saving={isSavingNotes} />
    </AdminShell>
  );
}
