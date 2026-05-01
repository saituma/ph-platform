"use client";

import { useEffect, useMemo, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import type { Exercise } from "./types";
import { ExerciseForm } from "./exercise-form";

export type ExerciseDialog = null | "add" | "edit";

type ExerciseDialogsProps = {
  active: ExerciseDialog;
  onClose: () => void;
  selectedExercise?: Exercise | null;
  onCreate: (payload: Exercise) => Promise<void>;
  onUpdate: (id: number | string, payload: Exercise) => Promise<void>;
  onDelete?: (id: number | string) => Promise<void>;
  saving?: boolean;
  deleting?: boolean;
};

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

function toInputValue(value?: string | number | null) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function ExerciseDialogs({
  active,
  onClose,
  selectedExercise,
  onCreate,
  onUpdate,
  onDelete,
  saving = false,
  deleting = false,
}: ExerciseDialogsProps) {
  const [form, setForm] = useState<Exercise>(emptyForm);

  const isEdit = active === "edit";
  const dialogTitle = useMemo(() => {
    if (active === "add") return "Add Exercise";
    if (active === "edit") return `Edit ${selectedExercise?.name ?? "Exercise"}`;
    return "";
  }, [active, selectedExercise?.name]);

  useEffect(() => {
    if (!active) return;
    if (active === "add") {
      setForm(emptyForm);
      return;
    }
    if (selectedExercise) {
      setForm({
        ...emptyForm,
        ...selectedExercise,
        sets: toInputValue(selectedExercise.sets),
        reps: toInputValue(selectedExercise.reps),
        time: toInputValue(selectedExercise.time),
        rest: toInputValue(selectedExercise.rest),
        videoUrl: selectedExercise.videoUrl ?? "",
        notes: selectedExercise.notes ?? "",
        cues: selectedExercise.cues ?? "",
        howTo: selectedExercise.howTo ?? "",
        progression: selectedExercise.progression ?? "",
        regression: selectedExercise.regression ?? "",
      });
    }
  }, [active, selectedExercise]);

  const handleChange = (field: keyof Exercise, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    if (isEdit && selectedExercise?.id !== undefined) {
      await onUpdate(selectedExercise.id, form);
      return;
    }
    await onCreate(form);
  };

  const handleDelete = async () => {
    if (!selectedExercise?.id || !onDelete) return;
    await onDelete(selectedExercise.id);
  };

  return (
    <Dialog open={active !== null} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>Save changes to your exercise library.</DialogDescription>
        </DialogHeader>
        <div className="mt-6">
          <ExerciseForm
            form={form}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onCancel={onClose}
            onDelete={isEdit && onDelete ? handleDelete : undefined}
            saving={saving}
            deleting={deleting}
            isEdit={isEdit}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
