"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select } from "../../ui/select";
import { Textarea } from "../../ui/textarea";

export type ExerciseDialog = null | "add" | "edit";

type ExerciseDialogsProps = {
  active: ExerciseDialog;
  onClose: () => void;
  selectedExercise?: {
    name: string;
    category: string;
    sets: string;
    reps: string;
    video: string;
  } | null;
};

export function ExerciseDialogs({ active, onClose, selectedExercise }: ExerciseDialogsProps) {
  return (
    <Dialog open={active !== null} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {active === "add" && "Add Exercise"}
            {active === "edit" && `Edit ${selectedExercise?.name ?? "Exercise"}`}
          </DialogTitle>
          <DialogDescription>UI-only for now.</DialogDescription>
        </DialogHeader>
        <div className="mt-6 space-y-4">
          <Input placeholder="Exercise name" defaultValue={selectedExercise?.name} />
          <Select defaultValue={selectedExercise?.category}>
            <option>Category</option>
            <option>Power</option>
            <option>Speed</option>
            <option>Recovery</option>
          </Select>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Sets" defaultValue={selectedExercise?.sets} />
            <Input placeholder="Reps" defaultValue={selectedExercise?.reps} />
          </div>
          <Input type="file" />
          <Textarea placeholder="Coaching notes" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onClose}>{active === "add" ? "Add" : "Save"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
