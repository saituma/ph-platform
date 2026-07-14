import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useSocket } from "@/context/SocketContext";

export type AssignedProgram = {
  id: number;
  name: string;
  description: string | null;
  moduleCount: number;
  status: string;
  kind?: "program" | "team";
  teamId?: number;
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
  setsOverride: number | null;
  repsOverride: number | null;
  durationOverride: number | null;
  restSecondsOverride: number | null;
  coachingNotes: string | null;
  progressionNotes: string | null;
  regressionNotes: string | null;
  allowVideoUpload?: boolean;
  runConfig?: {
    runType?: string;
    distanceMeters?: number;
    surface?: string;
    targetPace?: string;
    intervals?: Array<{ distanceMeters?: number; durationSeconds?: number; restSeconds?: number; targetPace?: string }>;
  } | null;
  videoUpload?: {
    id: number;
    videoUrl: string;
    posterUrl?: string | null;
    durationSec?: number | null;
    coachVideoUrl: string | null;
    coachVideoPosterUrl?: string | null;
    feedback: string | null;
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
    posterUrl?: string | null;
    durationSec?: number | null;
    cues: string | null;
    howTo: string | null;
    notes: string | null;
  };
};

export function useMyPrograms(token: string | null, autoFetch = false) {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const { data: programs = [], isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.programs.myAssigned(),
    queryFn: async () => {
      const res = await apiRequest<{ programs?: AssignedProgram[] }>(
        "/programs/my-assigned",
        {
          token: token!,
          // apiRequest caches GETs for 5 minutes and persists that cache across restarts.
          // Without this, a coach assigning a program leaves the athlete staring at
          // "No programs assigned" — pull-to-refresh and the program:assigned socket event
          // both invalidate React Query, but the HTTP layer just replays the stale body.
          // React Query's staleTime below already does the deduping we want here.
          skipCache: true,
          forceRefresh: true,
        },
      );
      return res.programs ?? [];
    },
    enabled: Boolean(token) && autoFetch,
    staleTime: 2 * 60 * 1000,
  });

  const error = queryError
    ? (queryError instanceof Error ? queryError.message : "Failed to load programs.")
    : null;

  const loadPrograms = useCallback(
    async (_force = false) => {
      if (!token) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.programs.myAssigned() });
    },
    [token, queryClient],
  );

  useEffect(() => {
    if (!socket || !token) return;
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.myAssigned() });
    };
    socket.on("program:changed", refresh);
    socket.on("program:assigned", refresh);
    return () => {
      socket.off("program:changed", refresh);
      socket.off("program:assigned", refresh);
    };
  }, [socket, token, queryClient]);

  return { programs, isLoading, error, loadPrograms };
}

export function useMyProgramDetail(token: string | null) {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const programIdRef = useRef<number | null>(null);

  const [activeProgramId, setActiveProgramId] = useState<number | null>(null);

  const { data: program = null, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.programs.detail(activeProgramId ?? 0),
    queryFn: async () => {
      const pid = activeProgramId!;
      const path = pid < 0
        ? `/programs/my-assigned/team/${-pid}`
        : `/programs/my-assigned/${pid}`;
      // Same reason as myAssigned above: the program:changed socket event and pull-to-refresh
      // invalidate React Query, but the HTTP cache would keep replaying the pre-edit program.
      const res = await apiRequest<{ program?: any }>(path, {
        token: token!,
        skipCache: true,
        forceRefresh: true,
      });
      return res.program ?? null;
    },
    enabled: Boolean(token) && activeProgramId != null,
    staleTime: 2 * 60 * 1000,
  });

  const error = queryError
    ? (queryError instanceof Error ? queryError.message : "Failed to load program.")
    : null;

  const loadProgram = useCallback(
    async (programId: number, _force = false) => {
      programIdRef.current = programId;
      setActiveProgramId(programId);
      if (_force) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.programs.detail(programId) });
      }
    },
    [queryClient],
  );

  useEffect(() => {
    if (!socket || !token) return;
    const refresh = () => {
      if (programIdRef.current != null) {
        queryClient.invalidateQueries({ queryKey: queryKeys.programs.detail(programIdRef.current) });
      }
    };
    socket.on("program:changed", refresh);
    socket.on("program:assigned", refresh);
    return () => {
      socket.off("program:changed", refresh);
      socket.off("program:assigned", refresh);
    };
  }, [socket, token, queryClient]);

  return { program, isLoading, error, loadProgram };
}

export function useMySessionExercises(token: string | null) {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const sessionIdRef = useRef<number | null>(null);

  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  const { data: exercises = [], isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.programs.sessionExercises(activeSessionId ?? 0),
    queryFn: async () => {
      const res = await apiRequest<{ exercises?: SessionExercise[] }>(
        `/programs/my-sessions/${activeSessionId!}/exercises`,
        { token: token! },
      );
      return (res.exercises ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
    enabled: Boolean(token) && activeSessionId != null,
    staleTime: 2 * 60 * 1000,
  });

  const error = queryError
    ? (queryError instanceof Error ? queryError.message : "Failed to load exercises.")
    : null;

  const loadExercises = useCallback(
    async (sessionId: number, _force = false) => {
      sessionIdRef.current = sessionId;
      setActiveSessionId(sessionId);
      if (_force) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.programs.sessionExercises(sessionId) });
      }
    },
    [queryClient],
  );

  useEffect(() => {
    if (!socket || !token) return;
    const refresh = () => {
      if (sessionIdRef.current != null) {
        queryClient.invalidateQueries({ queryKey: queryKeys.programs.sessionExercises(sessionIdRef.current) });
      }
    };
    socket.on("program:changed", refresh);
    socket.on("program:session:coach-response", refresh);
    socket.on("video:reviewed", refresh);
    return () => {
      socket.off("program:changed", refresh);
      socket.off("program:session:coach-response", refresh);
      socket.off("video:reviewed", refresh);
    };
  }, [socket, token, queryClient]);

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
