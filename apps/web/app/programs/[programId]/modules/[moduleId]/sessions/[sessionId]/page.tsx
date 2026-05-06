"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { AdminShell } from "../../../../../../../components/admin/shell";
import { SectionHeader } from "../../../../../../../components/admin/section-header";
import { Button } from "../../../../../../../components/ui/button";
import { Badge } from "../../../../../../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../../../../components/ui/dialog";
import { ChevronRight, Dumbbell, Pencil, Plus, Trash2 } from "lucide-react";
import {
  useGetProgramsQuery,
  useGetProgramModulesQuery,
  useGetModuleSessionsQuery,
  useGetSessionExercisesQuery,
  useAddSessionExerciseMutation,
  useDeleteSessionExerciseMutation,
  useCreateExerciseMutation,
  useUpdateExerciseMutation,
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

type ProgramSummary = {
  id: number;
  name?: string | null;
};

type ProgramModule = {
  id: number;
  title?: string | null;
};

type ProgramSession = {
  id: number;
  title?: string | null;
  sessionNumber?: number | null;
};

type SessionExercise = {
  id: number;
  order?: number | null;
  coachingNotes?: string | null;
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
  const [addExercise, { isLoading: isAdding }] = useAddSessionExerciseMutation();
  const [removeExercise, { isLoading: isRemoving }] = useDeleteSessionExerciseMutation();
  const [createExercise, { isLoading: isCreatingExercise }] = useCreateExerciseMutation();
  const [updateExercise, { isLoading: isUpdatingExercise }] = useUpdateExerciseMutation();

  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [exerciseForm, setExerciseForm] = useState<Exercise>(emptyForm);
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);

  const program = useMemo(
    () => ((programsData?.programs ?? []) as ProgramSummary[]).find((item) => item.id === programId) ?? null,
    [programsData, programId],
  );
  const currentModule = useMemo(
    () => ((modulesData?.modules ?? []) as ProgramModule[]).find((m) => m.id === moduleId),
    [modulesData, moduleId],
  );
  const currentSession = useMemo(
    () => ((sessionsData?.sessions ?? []) as ProgramSession[]).find((s) => s.id === sessionId),
    [sessionsData, sessionId],
  );

  const sessionExercises: SessionExercise[] = exercisesInSession?.exercises ?? [];

  const nextOrder = sessionExercises.length
    ? Math.max(...sessionExercises.map((e) => e.order ?? 0)) + 1
    : 1;

  const openCreate = () => {
    setExerciseForm(emptyForm);
    setEditingExerciseId(null);
    setDialogMode("create");
  };

  const openEdit = (se: SessionExercise) => {
    if (!se.exercise) return;
    setExerciseForm(exerciseToForm(se.exercise));
    setEditingExerciseId(se.exercise.id ?? null);
    setDialogMode("edit");
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
        await addExercise({ sessionId, exerciseId: newId, order: nextOrder }).unwrap();
      }
      setExerciseForm(emptyForm);
      setDialogMode(null);
      toast.success("Exercise added");
    } catch {
      toast.error("Failed to add exercise");
    }
  };

  const handleUpdate = async () => {
    if (!editingExerciseId || !exerciseForm.name.trim()) return;
    try {
      await updateExercise({
        exerciseId: editingExerciseId,
        patch: {
          name: exerciseForm.name,
          category: exerciseForm.category || null,
          cues: exerciseForm.cues || undefined,
          howTo: exerciseForm.howTo || null,
          progression: exerciseForm.progression || null,
          regression: exerciseForm.regression || null,
          sets: exerciseForm.sets ? Number(exerciseForm.sets) : null,
          reps: exerciseForm.reps ? Number(exerciseForm.reps) : null,
          duration: exerciseForm.time ? Number(exerciseForm.time) : null,
          restSeconds: exerciseForm.rest ? Number(exerciseForm.rest) : null,
          notes: exerciseForm.notes || null,
          videoUrl: exerciseForm.videoUrl || null,
        },
      }).unwrap();
      setDialogMode(null);
      toast.success("Exercise updated");
    } catch {
      toast.error("Failed to update exercise");
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
      title={currentSession?.title || `Session ${currentSession?.sessionNumber ?? ""}`}
      subtitle={
        <span className="flex items-center gap-2 text-xs">
          <Link href="/programs" className="text-muted-foreground hover:text-foreground">
            Programs
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <Link href={`/programs/${programId}`} className="text-muted-foreground hover:text-foreground">
            {program?.name ?? "Program"}
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <Link href={`/programs/${programId}/modules/${moduleId}`} className="text-muted-foreground hover:text-foreground">
            {currentModule?.title ?? "Module"}
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span>{currentSession?.title || `Session ${currentSession?.sessionNumber ?? ""}`}</span>
        </span>
      }
      actions={
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> Add Exercise
        </Button>
      }
    >
      <SectionHeader
        title="Exercises"
        description={`${sessionExercises.length} exercise${sessionExercises.length !== 1 ? "s" : ""} in this session.`}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-secondary/40" />
          ))}
        </div>
      ) : sessionExercises.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          <Dumbbell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="font-semibold text-foreground">No exercises yet</p>
          <p className="mt-1">Click &quot;Add Exercise&quot; to pick from the library or create a new one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessionExercises.map((se, index) => (
            <div
              key={se.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  {se.exercise?.name ?? "Unknown exercise"}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {se.exercise?.category && (
                    <Badge variant="secondary" className="text-[10px]">
                      {se.exercise.category}
                    </Badge>
                  )}
                  {se.exercise?.sets != null && <span>{se.exercise.sets} sets</span>}
                  {se.exercise?.reps != null && <span>{se.exercise.reps} reps</span>}
                  {se.exercise?.duration != null && <span>{se.exercise.duration}s</span>}
                  {se.exercise?.restSeconds != null && <span>{se.exercise.restSeconds}s rest</span>}
                  {se.exercise?.videoUrl && (
                    <a
                      href={se.exercise.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      Video
                    </a>
                  )}
                </div>
                {se.coachingNotes && (
                  <div className="mt-1 text-xs text-muted-foreground italic">
                    {se.coachingNotes}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => openEdit(se)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 shrink-0 p-0 text-destructive"
                  onClick={() => handleRemove(se.id)}
                  disabled={isRemoving}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogMode !== null} onOpenChange={(open) => { if (!open) { setDialogMode(null); setExerciseForm(emptyForm); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialogMode === "edit" ? "Edit Exercise" : "Create Exercise"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "edit"
                ? "Update this exercise. Changes apply everywhere it is used."
                : "Create a new exercise and add it to this session."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <ExerciseForm
              form={exerciseForm}
              onChange={(field, value) =>
                setExerciseForm((prev) => ({ ...prev, [field]: value }))
              }
              onSubmit={dialogMode === "edit" ? handleUpdate : handleCreateAndAdd}
              onCancel={() => { setDialogMode(null); setExerciseForm(emptyForm); }}
              saving={isCreatingExercise || isAdding || isUpdatingExercise}
              isEdit={dialogMode === "edit"}
              submitLabel={dialogMode === "edit" ? "Save Changes" : "Create & Add"}
            />
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
