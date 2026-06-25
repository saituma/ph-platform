import { useCallback, useMemo } from "react";
import * as Crypto from "expo-crypto";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export type MeasurementKind = "chest" | "waist" | "hips" | "arm" | "thigh" | "calf" | "neck" | "other";

export type StrengthEntry = {
  id: number;
  date_iso: string;
  exercise_name: string;
  weight_kg: number;
  reps: number | null;
  sets: number | null;
  notes: string;
};

export type BodyWeightEntry = {
  id: number;
  date_iso: string;
  weight_kg: number;
  notes: string;
};

export type MeasurementEntry = {
  id: number;
  date_iso: string;
  kind: MeasurementKind;
  label: string;
  value_cm: number;
  notes: string;
};

type ProgressEntry = {
  id: number;
  clientId: string;
  type: "strength" | "body_weight" | "measurement";
  entryDate: string;
  exerciseName: string | null;
  weightKg: number | null;
  reps: number | null;
  sets: number | null;
  measureKind: string | null;
  label: string | null;
  valueCm: number | null;
  notes: string | null;
};

export type NewStrength = Omit<StrengthEntry, "id">;
export type NewBodyWeight = Omit<BodyWeightEntry, "id">;
export type NewMeasurement = Omit<MeasurementEntry, "id">;

export function useProgressData(token: string | null) {
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.progress.entries(),
    queryFn: async () => {
      const res = await apiRequest<{ entries?: ProgressEntry[] }>("/progress/entries", {
        token: token!,
      });
      return res.entries ?? [];
    },
    enabled: Boolean(token),
    staleTime: 2 * 60 * 1000,
  });

  const error = queryError
    ? (queryError instanceof Error ? queryError.message : "Failed to load progress.")
    : null;

  const reload = useCallback(
    async (_force = false) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.progress.entries() });
    },
    [queryClient],
  );

  const save = useCallback(
    async (body: Record<string, unknown>) => {
      if (!token) return false;
      try {
        await apiRequest("/progress/entries", {
          method: "POST",
          body: { clientId: Crypto.randomUUID(), ...body },
          token,
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.progress.entries() });
        return true;
      } catch {
        return false;
      }
    },
    [token, queryClient],
  );

  const addStrength = useCallback(
    (e: NewStrength) =>
      save({
        type: "strength",
        entryDate: e.date_iso,
        exerciseName: e.exercise_name,
        weightKg: e.weight_kg,
        reps: e.reps,
        sets: e.sets,
        notes: e.notes,
      }),
    [save],
  );

  const addBodyWeight = useCallback(
    (e: NewBodyWeight) => save({ type: "body_weight", entryDate: e.date_iso, weightKg: e.weight_kg, notes: e.notes }),
    [save],
  );

  const addMeasurement = useCallback(
    (e: NewMeasurement) =>
      save({
        type: "measurement",
        entryDate: e.date_iso,
        measureKind: e.kind,
        label: e.label,
        valueCm: e.value_cm,
        notes: e.notes,
      }),
    [save],
  );

  const remove = useCallback(
    async (id: number) => {
      if (!token) return;
      queryClient.setQueryData<ProgressEntry[]>(
        queryKeys.progress.entries(),
        (prev) => (prev ?? []).filter((entry) => entry.id !== id),
      );
      try {
        await apiRequest(`/progress/entries/${id}`, { method: "DELETE", token });
      } catch {
        await queryClient.invalidateQueries({ queryKey: queryKeys.progress.entries() });
      }
    },
    [token, queryClient],
  );

  const strength = useMemo<StrengthEntry[]>(
    () =>
      entries
        .filter((e) => e.type === "strength")
        .map((e) => ({
          id: e.id,
          date_iso: e.entryDate,
          exercise_name: e.exerciseName ?? "",
          weight_kg: e.weightKg ?? 0,
          reps: e.reps,
          sets: e.sets,
          notes: e.notes ?? "",
        })),
    [entries],
  );

  const weights = useMemo<BodyWeightEntry[]>(
    () =>
      entries
        .filter((e) => e.type === "body_weight")
        .map((e) => ({ id: e.id, date_iso: e.entryDate, weight_kg: e.weightKg ?? 0, notes: e.notes ?? "" })),
    [entries],
  );

  const measures = useMemo<MeasurementEntry[]>(
    () =>
      entries
        .filter((e) => e.type === "measurement")
        .map((e) => ({
          id: e.id,
          date_iso: e.entryDate,
          kind: (e.measureKind ?? "other") as MeasurementKind,
          label: e.label ?? "",
          value_cm: e.valueCm ?? 0,
          notes: e.notes ?? "",
        })),
    [entries],
  );

  return { strength, weights, measures, isLoading, error, reload, addStrength, addBodyWeight, addMeasurement, remove };
}
