import type { Metadata } from "@/hooks/admin/useAdminAudienceWorkspace";

type FormStrings = {
  sets: string;
  reps: string;
  duration: string;
  restSeconds: string;
  steps: string;
  cues: string;
  progression: string;
  regression: string;
  category: string;
  equipment: string;
};

/** Mirrors web `buildMetadata` in training-content-v2/api.ts */
export function buildSessionItemMetadata(input: FormStrings): Metadata | null {
  const metadata: Metadata = {};
  if (input.sets.trim()) metadata.sets = Number(input.sets);
  if (input.reps.trim()) metadata.reps = Number(input.reps);
  if (input.duration.trim()) metadata.duration = Number(input.duration);
  if (input.restSeconds.trim()) metadata.restSeconds = Number(input.restSeconds);
  if (input.steps.trim()) metadata.steps = input.steps.trim();
  if (input.cues.trim()) metadata.cues = input.cues.trim();
  if (input.progression.trim()) metadata.progression = input.progression.trim();
  if (input.regression.trim()) metadata.regression = input.regression.trim();
  if (input.category.trim()) metadata.category = input.category.trim();
  if (input.equipment.trim()) metadata.equipment = input.equipment.trim();
  return Object.keys(metadata).length ? metadata : null;
}

export function emptySessionExerciseForm() {
  return {
    id: null as number | null,
    blockType: "main" as string,
    title: "",
    body: "",
    videoUrl: "",
    allowVideoUpload: false,
    order: "",
    sets: "",
    reps: "",
    duration: "",
    restSeconds: "",
    steps: "",
    cues: "",
    progression: "",
    regression: "",
    category: "",
    equipment: "",
  };
}

export type SessionExerciseFormState = ReturnType<typeof emptySessionExerciseForm>;
