"use client";

import { useEffect, useMemo, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import type { Exercise } from "./types";
import { ParentCourseMediaUpload } from "../../parent/config/parent-course-media-upload";

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
        <div className="mt-6 space-y-4">
          <Input
            placeholder="Exercise name"
            value={form.name}
            onChange={(event) => handleChange("name", event.target.value)}
          />
          {(() => {
            const categoryItems = [
              { label: "Category", value: "" },
              { label: "Power", value: "Power" },
              { label: "Speed", value: "Speed" },
              { label: "Recovery", value: "Recovery" },
            ];
            return (
              <Select
                items={categoryItems}
                value={form.category ?? ""}
                onValueChange={(v) => handleChange("category", v ?? "")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectPopup>
                  {categoryItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            );
          })()}
          <div className="grid gap-3 sm:grid-cols-4">
            <Input
              placeholder="Sets"
              value={toInputValue(form.sets)}
              onChange={(event) => handleChange("sets", event.target.value)}
            />
            <Input
              placeholder="Reps"
              value={toInputValue(form.reps)}
              onChange={(event) => handleChange("reps", event.target.value)}
            />
            <Input
              placeholder="Time"
              value={toInputValue(form.time)}
              onChange={(event) => handleChange("time", event.target.value)}
            />
            <Input
              placeholder="Rest"
              value={toInputValue(form.rest)}
              onChange={(event) => handleChange("rest", event.target.value)}
            />
          </div>
          <div className="space-y-2 rounded-2xl border border-border bg-secondary/30 p-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Exercise Video</Label>
              <ParentCourseMediaUpload
                label={form.videoUrl ? "Replace Video" : "Upload Video"}
                folder="exercise-videos"
                accept="video/*"
                maxSizeMb={200}
                onUploaded={(url) => handleChange("videoUrl", url)}
              />
            </div>
            {form.videoUrl ? (
              <video
                className="aspect-video w-full rounded-2xl border border-border bg-secondary/40 object-cover"
                src={form.videoUrl}
                controls
                muted
              />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/40 text-xs text-muted-foreground">
                Upload a video file for this exercise.
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Coaching Notes (Cues)</Label>
            <Textarea
              placeholder="Core tight, drive through heel..."
              value={form.cues ?? ""}
              onChange={(event) => handleChange("cues", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">How To Tips</Label>
            <Textarea
              placeholder="Setup instructions..."
              value={form.howTo ?? ""}
              onChange={(event) => handleChange("howTo", event.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Progression</Label>
              <Input
                placeholder="Harder version..."
                value={form.progression ?? ""}
                onChange={(event) => handleChange("progression", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Regression</Label>
              <Input
                placeholder="Easier version..."
                value={form.regression ?? ""}
                onChange={(event) => handleChange("regression", event.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {isEdit && onDelete ? (
              <Button variant="outline" onClick={handleDelete} disabled={saving || deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            ) : null}
            <div className="flex-1" />
            <Button variant="outline" onClick={onClose} disabled={saving || deleting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving || deleting || !form.name.trim()}>
              {saving ? "Saving..." : active === "add" ? "Create Exercise" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
