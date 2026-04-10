import { useState, useCallback, useEffect, useMemo } from "react";
import { Alert } from "react-native";
import { apiRequest } from "@/lib/api";

export type ProgramTemplate = {
  id: number;
  name?: string | null;
  type?: string | null;
  description?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ExerciseItem = {
  id: number;
  name?: string | null;
  cues?: string | null;
  howTo?: string | null;
  progression?: string | null;
  regression?: string | null;
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSeconds?: number | null;
  notes?: string | null;
  videoUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

function defaultProgramPatchJson(p: ProgramTemplate) {
  return JSON.stringify(
    {
      name: p.name ?? undefined,
      type: p.type ?? undefined,
      description: p.description ?? undefined,
      minAge: p.minAge ?? undefined,
      maxAge: p.maxAge ?? undefined,
    },
    null,
    2,
  );
}

function defaultExercisePatchJson(e: ExerciseItem) {
  return JSON.stringify(
    {
      name: e.name ?? undefined,
      category: undefined,
      cues: e.cues ?? undefined,
      howTo: e.howTo ?? undefined,
      progression: e.progression ?? undefined,
      regression: e.regression ?? undefined,
      sets: e.sets ?? undefined,
      reps: e.reps ?? undefined,
      duration: e.duration ?? undefined,
      restSeconds: e.restSeconds ?? undefined,
      notes: e.notes ?? undefined,
      videoUrl: e.videoUrl ?? undefined,
    },
    null,
    2,
  );
}

export function useAdminContentController(token: string | null, bootstrapReady: boolean) {
  const [programs, setPrograms] = useState<ProgramTemplate[]>([]);
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [programDetailOpenId, setProgramDetailOpenId] = useState<number | null>(null);
  const [exerciseDetailOpenId, setExerciseDetailOpenId] = useState<number | null>(null);

  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [patchJson, setPatchJson] = useState("");

  const load = useCallback(
    async (forceRefresh: boolean) => {
      if (!token || !bootstrapReady) return;
      setIsLoading(true);
      setError(null);
      try {
        const [programRes, exerciseRes] = await Promise.all([
          apiRequest<{ programs?: ProgramTemplate[] }>("/admin/programs?limit=50", {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          }),
          apiRequest<{ exercises?: ExerciseItem[] }>("/admin/exercises", {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          }),
        ]);

        setPrograms(Array.isArray(programRes?.programs) ? programRes.programs : []);
        setExercises(Array.isArray(exerciseRes?.exercises) ? exerciseRes.exercises : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load content");
        setPrograms([]);
        setExercises([]);
      } finally {
        setIsLoading(false);
      }
    },
    [bootstrapReady, token],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const selectedProgram = useMemo(() => {
    if (programDetailOpenId == null) return null;
    return programs.find((p) => p.id === programDetailOpenId) ?? null;
  }, [programDetailOpenId, programs]);

  const selectedExercise = useMemo(() => {
    if (exerciseDetailOpenId == null) return null;
    return exercises.find((e) => e.id === exerciseDetailOpenId) ?? null;
  }, [exerciseDetailOpenId, exercises]);

  useEffect(() => {
    setDetailError(null);
    setDetailBusy(false);
    if (selectedProgram) {
      setPatchJson(defaultProgramPatchJson(selectedProgram));
    } else if (selectedExercise) {
      setPatchJson(defaultExercisePatchJson(selectedExercise));
    } else {
      setPatchJson("");
    }
  }, [selectedExercise?.id, selectedProgram?.id]);

  const savePatch = useCallback(async () => {
    if (!token || !bootstrapReady) return;
    if (!selectedProgram && !selectedExercise) return;
    let parsed: any;
    try {
      parsed = JSON.parse(patchJson);
    } catch {
      setDetailError("Invalid JSON.");
      return;
    }
    setDetailBusy(true);
    setDetailError(null);
    try {
      if (selectedProgram) {
        const res = await apiRequest<{ program?: ProgramTemplate }>(
          `/admin/programs/${selectedProgram.id}`,
          { method: "PATCH", token, body: parsed, skipCache: true },
        );
        if (res?.program) {
          setPrograms((prev) =>
            prev.map((p) => (p.id === selectedProgram.id ? res.program! : p)),
          );
        }
      } else if (selectedExercise) {
        const res = await apiRequest<{ exercise?: ExerciseItem }>(
          `/admin/exercises/${selectedExercise.id}`,
          { method: "PATCH", token, body: parsed, skipCache: true },
        );
        if (res?.exercise) {
          setExercises((prev) =>
            prev.map((e) => (e.id === selectedExercise.id ? res.exercise! : e)),
          );
        }
      }
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setDetailBusy(false);
    }
  }, [bootstrapReady, patchJson, selectedExercise, selectedProgram, token]);

  const deleteExercise = useCallback(async () => {
    if (!token || !bootstrapReady) return;
    if (!selectedExercise) return;
    Alert.alert("Delete exercise", selectedExercise.name ?? "This item", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDetailBusy(true);
          setDetailError(null);
          try {
            await apiRequest(`/admin/exercises/${selectedExercise.id}`, {
              method: "DELETE",
              token,
              skipCache: true,
            });
            setExercises((prev) => prev.filter((e) => e.id !== selectedExercise.id));
            setExerciseDetailOpenId(null);
          } catch (e) {
            setDetailError(e instanceof Error ? e.message : "Failed to delete");
          } finally {
            setDetailBusy(false);
          }
        },
      },
    ]);
  }, [bootstrapReady, selectedExercise, token]);

  return {
    programs,
    exercises,
    isLoading,
    error,
    load,
    detail: {
      programId: programDetailOpenId, setProgramId: setProgramDetailOpenId,
      exerciseId: exerciseDetailOpenId, setExerciseId: setExerciseDetailOpenId,
      selectedProgram,
      selectedExercise,
      isBusy: detailBusy,
      error: detailError,
      patchJson,
      setPatchJson,
      savePatch,
      deleteExercise,
    }
  };
}
