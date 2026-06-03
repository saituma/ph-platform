import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import { apiRequest } from "@/lib/api";

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
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const reload = useCallback(
    async (force = false) => {
      if (!token) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ entries?: ProgressEntry[] }>("/progress/entries", {
          token,
          forceRefresh: force,
        });
        setEntries(res.entries ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load progress.");
      } finally {
        setIsLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (!token || hasFetched.current) return;
    hasFetched.current = true;
    void reload(true);
  }, [token, reload]);

  const save = useCallback(
    async (body: Record<string, unknown>) => {
      if (!token) return false;
      try {
        await apiRequest("/progress/entries", {
          method: "POST",
          body: { clientId: Crypto.randomUUID(), ...body },
          token,
        });
        await reload(true);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
        return false;
      }
    },
    [token, reload],
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
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
      try {
        await apiRequest(`/progress/entries/${id}`, { method: "DELETE", token });
      } catch {
        void reload(true);
      }
    },
    [token, reload],
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
