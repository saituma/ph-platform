import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/api";

export type AssignedProgram = {
  id: number;
  name: string;
  description: string | null;
  moduleCount: number;
  status: string;
};

export type ProgramModule = {
  id: number;
  title: string;
  description: string | null;
  order: number;
  sessionCount: number;
  sessions: ProgramSession[];
};

export type ProgramSession = {
  id: number;
  moduleId: number;
  weekNumber: number;
  sessionNumber: number;
  title: string | null;
  description: string | null;
  type: string;
  exerciseCount: number;
};

export type SessionExercise = {
  id: number;
  sessionId: number;
  exerciseId: number;
  order: number;
  coachingNotes: string | null;
  exercise: {
    id: number;
    name: string;
    category: string | null;
    sets: number | null;
    reps: number | null;
    duration: number | null;
    restSeconds: number | null;
    videoUrl: string | null;
    cues: string | null;
    howTo: string | null;
    notes: string | null;
  };
};

export function useMyPrograms(token: string | null) {
  const [programs, setPrograms] = useState<AssignedProgram[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPrograms = useCallback(
    async (force = false) => {
      if (!token) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ programs?: AssignedProgram[] }>(
          "/programs/my-assigned",
          { token, forceRefresh: force },
        );
        setPrograms(res.programs ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load programs.");
      } finally {
        setIsLoading(false);
      }
    },
    [token],
  );

  return { programs, isLoading, error, loadPrograms };
}

export function useMyProgramDetail(token: string | null) {
  const [program, setProgram] = useState<{
    id: number;
    name: string;
    description: string | null;
    modules: ProgramModule[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProgram = useCallback(
    async (programId: number, force = false) => {
      if (!token) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ program?: any }>(
          `/programs/my-assigned/${programId}`,
          { token, forceRefresh: force },
        );
        setProgram(res.program ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load program.");
      } finally {
        setIsLoading(false);
      }
    },
    [token],
  );

  return { program, isLoading, error, loadProgram };
}

export function useMySessionExercises(token: string | null) {
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExercises = useCallback(
    async (sessionId: number, force = false) => {
      if (!token) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ exercises?: SessionExercise[] }>(
          `/programs/my-sessions/${sessionId}/exercises`,
          { token, forceRefresh: force },
        );
        setExercises(res.exercises ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load exercises.");
      } finally {
        setIsLoading(false);
      }
    },
    [token],
  );

  return { exercises, isLoading, error, loadExercises };
}
