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
import { ChevronRight, Dumbbell, Plus, Trash2 } from "lucide-react";
import {
  useGetProgramFullQuery,
  useGetSessionExercisesQuery,
  useAddSessionExerciseMutation,
  useDeleteSessionExerciseMutation,
  useCreateExerciseMutation,
} from "../../../../../../../lib/apiSlice";
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

export default function SessionDetailPage() {
  const params = useParams();
  const programId = Number(params?.programId);
  const moduleId = Number(params?.moduleId);
  const sessionId = Number(params?.sessionId);

  const { data: fullData } = useGetProgramFullQuery(
    { programId },
    { skip: !Number.isFinite(programId) || programId <= 0 },
  );
  const { data: exercisesInSession, isLoading } = useGetSessionExercisesQuery(
    { sessionId },
    { skip: !Number.isFinite(sessionId) || sessionId <= 0 },
  );
  const [addExercise, { isLoading: isAdding }] = useAddSessionExerciseMutation();
  const [removeExercise, { isLoading: isRemoving }] = useDeleteSessionExerciseMutation();
  const [createExercise, { isLoading: isCreatingExercise }] = useCreateExerciseMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [exerciseForm, setExerciseForm] = useState<Exercise>(emptyForm);

  const program = fullData?.program ?? null;
  const currentModule = useMemo(
    () => (program?.modules ?? []).find((m: any) => m.id === moduleId),
    [program, moduleId],
  );
  const currentSession = useMemo(
    () => (currentModule?.sessions ?? []).find((s: any) => s.id === sessionId),
    [currentModule, sessionId],
  );

  const sessionExercises = exercisesInSession?.exercises ?? [];

  const nextOrder = sessionExercises.length
    ? Math.max(...sessionExercises.map((e: any) => e.order ?? 0)) + 1
    : 1;

  const handleCreateAndAdd = async () => {
    if (!exerciseForm.name.trim()) return;
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
    } as any).unwrap();
    const newId = created?.exercise?.id;
    if (newId) {
      await addExercise({ sessionId, exerciseId: newId, order: nextOrder }).unwrap();
    }
    setExerciseForm(emptyForm);
    setDialogOpen(false);
  };

  const handleRemove = async (sessionExerciseId: number) => {
    if (!window.confirm("Remove this exercise from the session?")) return;
    await removeExercise({ sessionExerciseId }).unwrap();
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
        <Button onClick={() => setDialogOpen(true)}>
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
          <p className="mt-1">Click "Add Exercise" to pick from the library or create a new one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessionExercises.map((se: any, index: number) => (
            <div
              key={se.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </div>
              <div className="flex-1">
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
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setExerciseForm(emptyForm); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Exercise</DialogTitle>
            <DialogDescription>
              Create a new exercise and add it to this session.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <ExerciseForm
              form={exerciseForm}
              onChange={(field, value) =>
                setExerciseForm((prev) => ({ ...prev, [field]: value }))
              }
              onSubmit={handleCreateAndAdd}
              onCancel={() => setDialogOpen(false)}
              saving={isCreatingExercise || isAdding}
              submitLabel="Create & Add"
            />
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
