"use client";

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

function toInputValue(value?: string | number | null) {
  if (value === null || value === undefined) return "";
  return String(value);
}

type ExerciseFormProps = {
  form: Exercise;
  onChange: (field: keyof Exercise, value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  saving?: boolean;
  deleting?: boolean;
  isEdit?: boolean;
  submitLabel?: string;
};

export function ExerciseForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  onDelete,
  saving = false,
  deleting = false,
  isEdit = false,
  submitLabel,
}: ExerciseFormProps) {
  const categoryItems = [
    { label: "Category", value: "" },
    { label: "Power", value: "Power" },
    { label: "Speed", value: "Speed" },
    { label: "Recovery", value: "Recovery" },
  ];

  return (
    <div className="space-y-4">
      <Input
        placeholder="Exercise name"
        value={form.name}
        onChange={(event) => onChange("name", event.target.value)}
      />
      <Select
        items={categoryItems}
        value={form.category ?? ""}
        onValueChange={(v) => onChange("category", v ?? "")}
      >
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectPopup>
          {categoryItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
          ))}
        </SelectPopup>
      </Select>
      <div className="grid gap-3 sm:grid-cols-4">
        <Input
          placeholder="Sets"
          value={toInputValue(form.sets)}
          onChange={(event) => onChange("sets", event.target.value)}
        />
        <Input
          placeholder="Reps"
          value={toInputValue(form.reps)}
          onChange={(event) => onChange("reps", event.target.value)}
        />
        <Input
          placeholder="Time"
          value={toInputValue(form.time)}
          onChange={(event) => onChange("time", event.target.value)}
        />
        <Input
          placeholder="Rest"
          value={toInputValue(form.rest)}
          onChange={(event) => onChange("rest", event.target.value)}
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
            onUploaded={(url) => onChange("videoUrl", url)}
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
          onChange={(event) => onChange("cues", event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">How To Tips</Label>
        <Textarea
          placeholder="Setup instructions..."
          value={form.howTo ?? ""}
          onChange={(event) => onChange("howTo", event.target.value)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs">Progression</Label>
          <Input
            placeholder="Harder version..."
            value={form.progression ?? ""}
            onChange={(event) => onChange("progression", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Regression</Label>
          <Input
            placeholder="Easier version..."
            value={form.regression ?? ""}
            onChange={(event) => onChange("regression", event.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {isEdit && onDelete ? (
          <Button variant="outline" onClick={onDelete} disabled={saving || deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        ) : null}
        <div className="flex-1" />
        {onCancel ? (
          <Button variant="outline" onClick={onCancel} disabled={saving || deleting}>
            Cancel
          </Button>
        ) : null}
        <Button onClick={onSubmit} disabled={saving || deleting || !form.name.trim()}>
          {saving ? "Saving..." : submitLabel ?? (isEdit ? "Save Changes" : "Create Exercise")}
        </Button>
      </div>
    </div>
  );
}
