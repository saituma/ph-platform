import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export type PreseasonDaySession = {
  id: number;
  dayOfWeek: number;
  category: string;
  title: string;
  description: string;
  durationLabel: string;
  intensityLabel: string;
  focusLabel: string;
  completed: boolean;
};

export type PreseasonExercise = {
  id: number;
  order: number;
  metric: string;
  setsOverride: number | null;
  repsOverride: number | null;
  durationOverride: number | null;
  restSecondsOverride?: number | null;
  notes: string | null;
  exercise: {
    id: number;
    name: string;
    category: string | null;
    sets: number | null;
    reps: number | null;
    duration: number | null;
    videoUrl: string | null;
    posterUrl?: string | null;
    cues?: string | null;
    howTo?: string | null;
    progression?: string | null;
    regression?: string | null;
    videoMuted?: boolean | null;
    durationSec?: number | null;
    width?: number | null;
    height?: number | null;
  };
};

export type SessionCompleteResult = {
  completedAt: string;
  weekComplete: boolean;
  nextWeekId: number | null;
};

type RawExercise = Omit<PreseasonExercise, "exercise"> & {
  exercise?: PreseasonExercise["exercise"];
  exerciseId?: number;
  exerciseName?: string;
  exerciseCategory?: string | null;
  exerciseSets?: number | null;
  exerciseReps?: number | null;
  exerciseDuration?: number | null;
  exerciseVideoUrl?: string | null;
  exercisePosterUrl?: string | null;
  exerciseCues?: string | null;
  exerciseHowTo?: string | null;
  exerciseProgression?: string | null;
  exerciseRegression?: string | null;
  exerciseVideoMuted?: boolean | null;
  exerciseDurationSec?: number | null;
  exerciseWidth?: number | null;
  exerciseHeight?: number | null;
};

type RawResponse =
  | { daySession: PreseasonDaySession; exercises: RawExercise[] }
  | (PreseasonDaySession & { exercises?: RawExercise[] });

function normalizeExercise(ex: RawExercise): PreseasonExercise {
  if (ex.exercise) return { ...ex, exercise: ex.exercise };
  return {
    ...ex,
    exercise: {
      id: ex.exerciseId ?? ex.id,
      name: ex.exerciseName ?? "Exercise",
      category: ex.exerciseCategory ?? null,
      sets: ex.exerciseSets ?? null,
      reps: ex.exerciseReps ?? null,
      duration: ex.exerciseDuration ?? null,
      videoUrl: ex.exerciseVideoUrl ?? null,
      posterUrl: ex.exercisePosterUrl ?? null,
      cues: ex.exerciseCues ?? null,
      howTo: ex.exerciseHowTo ?? null,
      progression: ex.exerciseProgression ?? null,
      regression: ex.exerciseRegression ?? null,
      videoMuted: ex.exerciseVideoMuted ?? null,
      durationSec: ex.exerciseDurationSec ?? null,
      width: ex.exerciseWidth ?? null,
      height: ex.exerciseHeight ?? null,
    },
  };
}

function parseResponse(res: RawResponse): { daySession: PreseasonDaySession; exercises: PreseasonExercise[] } {
  const daySession = "daySession" in res ? res.daySession : res;
  const exercises = (res.exercises ?? [])
    .map(normalizeExercise)
    .sort((a, b) => a.order - b.order);
  return { daySession, exercises };
}

export function usePreseasonSessionDetail(token: string | null, daySessionId: number | null) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.preseason.session(daySessionId!),
    queryFn: async () => {
      const res = await apiRequest<RawResponse>(
        `/preseason-programme/mobile/day-sessions/${daySessionId}`,
        { token: token! },
      );
      return parseResponse(res);
    },
    enabled: Boolean(token) && Boolean(daySessionId),
    staleTime: 2 * 60 * 1000,
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      apiRequest<SessionCompleteResult>(
        `/preseason-programme/mobile/day-sessions/${daySessionId}/complete`,
        { method: "POST", token },
      ),
    onSuccess: (result) => {
      // Mark session completed in cache immediately
      queryClient.setQueryData(
        queryKeys.preseason.session(daySessionId!),
        (old: { daySession: PreseasonDaySession; exercises: PreseasonExercise[] } | undefined) =>
          old ? { ...old, daySession: { ...old.daySession, completed: true } } : old,
      );
      // Refresh programme so week status updates (active → completed, next week unlocks)
      queryClient.invalidateQueries({ queryKey: queryKeys.preseason.programme() });
      if (result.weekComplete) {
        queryClient.invalidateQueries({ queryKey: queryKeys.preseason.all() });
      }
    },
    meta: {
      retryQueue: {
        path: `/preseason-programme/mobile/day-sessions/${daySessionId}/complete`,
        method: "POST",
      },
    },
  });

  return {
    daySession: data?.daySession ?? null,
    exercises: data?.exercises ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    completeSession: completeMutation.mutateAsync,
    completing: completeMutation.isPending,
    completeError: completeMutation.error instanceof Error ? completeMutation.error.message : null,
    completeResult: completeMutation.data ?? null,
  };
}
