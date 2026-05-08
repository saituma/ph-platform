import { useState, useCallback, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/api";
import { useSocket } from "@/context/SocketContext";

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
  programSectionContentId?: number | null;
  trainingSessionItemId?: number | null;
  sectionContentId?: number | null;
  order: number;
  coachingNotes: string | null;
  progressionNotes: string | null;
  regressionNotes: string | null;
  videoUpload?: {
    id: number;
    videoUrl: string;
    feedback: string | null;
    coachVideoUrl: string | null;
    reviewedAt: string | null;
  } | null;
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

export function useMyPrograms(token: string | null, autoFetch = false) {
  const [programs, setPrograms] = useState<AssignedProgram[]>([]);
  const [isLoading, setIsLoading] = useState(autoFetch && !!token);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);
  const { socket } = useSocket();

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

  useEffect(() => {
    if (autoFetch && token && !hasFetched.current) {
      hasFetched.current = true;
      loadPrograms();
    }
  }, [autoFetch, token, loadPrograms]);

  useEffect(() => {
    if (!socket || !token) return;
    const refresh = () => { loadPrograms(true); };
    socket.on("program:changed", refresh);
    socket.on("program:assigned", refresh);
    return () => {
      socket.off("program:changed", refresh);
      socket.off("program:assigned", refresh);
    };
  }, [socket, token, loadPrograms]);

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
  const { socket } = useSocket();
  const programIdRef = useRef<number | null>(null);

  const loadProgram = useCallback(
    async (programId: number, force = false) => {
      if (!token) return;
      programIdRef.current = programId;
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

  useEffect(() => {
    if (!socket || !token) return;
    const refresh = () => {
      if (programIdRef.current) loadProgram(programIdRef.current, true);
    };
    socket.on("program:changed", refresh);
    socket.on("program:assigned", refresh);
    return () => {
      socket.off("program:changed", refresh);
      socket.off("program:assigned", refresh);
    };
  }, [socket, token, loadProgram]);

  return { program, isLoading, error, loadProgram };
}

export function useMySessionExercises(token: string | null) {
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useSocket();
  const sessionIdRef = useRef<number | null>(null);

  const loadExercises = useCallback(
    async (sessionId: number, force = false) => {
      if (!token) return;
      sessionIdRef.current = sessionId;
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

  useEffect(() => {
    if (!socket || !token) return;
    const refresh = () => {
      if (sessionIdRef.current) loadExercises(sessionIdRef.current, true);
    };
    socket.on("program:changed", refresh);
    socket.on("program:session:coach-response", refresh);
    socket.on("video:reviewed", refresh);
    return () => {
      socket.off("program:changed", refresh);
      socket.off("program:session:coach-response", refresh);
      socket.off("video:reviewed", refresh);
    };
  }, [socket, token, loadExercises]);

  return { exercises, isLoading, error, loadExercises };
}

export function useCompleteSession(token: string | null) {
  const [isCompleting, setIsCompleting] = useState(false);

  const completeSession = useCallback(
    async (sessionId: number) => {
      if (!token) return null;
      setIsCompleting(true);
      try {
        const res = await apiRequest<{
          completed: boolean;
          nextSession: { id: number; title: string | null; sessionNumber: number } | null;
        }>(`/programs/my-sessions/${sessionId}/complete`, {
          method: "POST",
          token,
        });
        return res;
      } catch {
        return null;
      } finally {
        setIsCompleting(false);
      }
    },
    [token],
  );

  return { completeSession, isCompleting };
}
