import { apiSlice } from "../core";

export type PreseasonProgramme = {
  id: number;
  title: string;
  description?: string;
  weekCount: number;
  requiredTier?: string;
  athleteType: string;
  isPublished: boolean;
  createdAt: string;
};

export type PreseasonExercise = {
  id: number;
  name: string;
  daySessionId: number;
  order: number;
  metric: "reps" | "duration";
  setsOverride?: number | null;
  repsOverride?: number | null;
  durationOverride?: number | null;
  restSecondsOverride?: number | null;
  notes?: string;
  exercise: {
    id: number;
    name: string;
    category?: string;
    sets?: number;
    reps?: number;
    duration?: number;
    restSeconds?: number;
    videoUrl?: string;
  };
};

export type PreseasonDaySession = {
  id: number;
  dayOfWeek: number;
  category: string;
  title: string;
  description?: string;
  durationLabel?: string;
  intensityLabel?: string;
  focusLabel?: string;
  exercises: PreseasonExercise[];
};

export type PreseasonWeekType = {
  id: number;
  name: string;
  description?: string;
  order: number;
  daySessions: PreseasonDaySession[];
};

export type PreseasonWeek = {
  id: number;
  weekNumber: number;
  title?: string;
  weekTypes: PreseasonWeekType[];
};

export type PreseasonProgrammeFull = PreseasonProgramme & {
  weeks: PreseasonWeek[];
};

export type PreseasonAssignment = {
  athleteId: number;
  athleteName: string;
  athleteType: string;
  assignedAt: string;
};

export type AthleteSearchResult = {
  id: number;
  name: string;
  athleteType: string;
};

const BASE = "/preseason-programme";

type RawPreseasonExercise = Omit<Partial<PreseasonExercise>, "exercise"> & {
  id: number;
  daySessionId: number;
  exerciseId: number;
  order: number;
  metric: "reps" | "duration";
  exercise?: PreseasonExercise["exercise"];
  exerciseName?: string | null;
  exerciseCategory?: string | null;
  exerciseSets?: number | null;
  exerciseReps?: number | null;
  exerciseDuration?: number | null;
  exerciseRestSeconds?: number | null;
  exerciseVideoUrl?: string | null;
};

type RawPreseasonDaySession = Omit<PreseasonDaySession, "exercises"> & {
  exercises?: RawPreseasonExercise[];
};

type RawPreseasonWeekType = Omit<PreseasonWeekType, "daySessions"> & {
  daySessions?: RawPreseasonDaySession[];
};

type RawPreseasonWeek = Omit<PreseasonWeek, "weekTypes"> & {
  weekTypes?: RawPreseasonWeekType[];
};

type RawPreseasonProgrammeFull = Omit<PreseasonProgrammeFull, "weeks"> & {
  weeks?: RawPreseasonWeek[];
};

export type ExerciseLibraryItem = {
  id: number;
  name?: string;
  category?: string | null;
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
};

function normalizePreseasonExercise(raw: RawPreseasonExercise): PreseasonExercise {
  const exercise = raw.exercise ?? {
    id: raw.exerciseId,
    name: raw.exerciseName ?? raw.name ?? "Exercise",
    category: raw.exerciseCategory ?? undefined,
    sets: raw.exerciseSets ?? undefined,
    reps: raw.exerciseReps ?? undefined,
    duration: raw.exerciseDuration ?? undefined,
    restSeconds: raw.exerciseRestSeconds ?? undefined,
    videoUrl: raw.exerciseVideoUrl ?? undefined,
  };

  return {
    ...raw,
    name: raw.name ?? exercise.name,
    exercise,
  };
}

function normalizeProgrammeFull(response: { programme: RawPreseasonProgrammeFull }): { programme: PreseasonProgrammeFull } {
  return {
    programme: {
      ...response.programme,
      weeks: (response.programme?.weeks ?? []).map((week) => ({
        ...week,
        weekTypes: (week.weekTypes ?? []).map((weekType) => ({
          ...weekType,
          daySessions: (weekType.daySessions ?? []).map((daySession) => ({
            ...daySession,
            exercises: (daySession.exercises ?? []).map(normalizePreseasonExercise),
          })),
        })),
      })),
    },
  };
}

function updateExerciseInProgramme(
  draft: { programme: PreseasonProgrammeFull },
  id: number,
  updater: (exercise: PreseasonExercise, exercises: PreseasonExercise[]) => void,
) {
  for (const week of draft.programme.weeks) {
    for (const weekType of week.weekTypes) {
      for (const session of weekType.daySessions) {
        const exercise = session.exercises.find((item) => item.id === id);
        if (exercise) {
          updater(exercise, session.exercises);
          return;
        }
      }
    }
  }
}

function updateDaySessionExercises(
  draft: { programme: PreseasonProgrammeFull },
  daySessionId: number,
  updater: (exercises: PreseasonExercise[]) => void,
) {
  for (const week of draft.programme.weeks) {
    for (const weekType of week.weekTypes) {
      const session = weekType.daySessions.find((item) => item.id === daySessionId);
      if (session) {
        updater(session.exercises);
        return;
      }
    }
  }
}

const preseasonApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPreseasonProgrammes: builder.query<
      { programmes: PreseasonProgramme[] },
      void
    >({
      query: () => `${BASE}/admin/programmes`,
      providesTags: ["PreseasonProgrammes"],
    }),

    getPreseasonProgrammeFull: builder.query<
      { programme: PreseasonProgrammeFull },
      { id: number }
    >({
      query: ({ id }) => `${BASE}/admin/programmes/${id}/full`,
      transformResponse: normalizeProgrammeFull,
      providesTags: ["PreseasonBuilder"],
    }),

    createPreseasonProgramme: builder.mutation<
      { programme: PreseasonProgramme },
      { title: string; description?: string; weekCount: number; requiredTier?: string; athleteType?: string }
    >({
      query: (body) => ({
        url: `${BASE}/admin/programmes`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["PreseasonProgrammes"],
    }),

    updatePreseasonProgramme: builder.mutation<
      { programme: PreseasonProgramme },
      { id: number; patch: { title?: string; description?: string; weekCount?: number; requiredTier?: string } }
    >({
      query: ({ id, patch }) => ({
        url: `${BASE}/admin/programmes/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: ["PreseasonProgrammes", "PreseasonBuilder"],
    }),

    deletePreseasonProgramme: builder.mutation<{ deleted: boolean }, { id: number }>({
      query: ({ id }) => ({
        url: `${BASE}/admin/programmes/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PreseasonProgrammes"],
    }),

    publishPreseasonProgramme: builder.mutation<
      { programme: PreseasonProgramme },
      { id: number; isPublished: boolean }
    >({
      query: ({ id, isPublished }) => ({
        url: `${BASE}/admin/programmes/${id}/publish`,
        method: "PUT",
        body: { isPublished },
      }),
      invalidatesTags: ["PreseasonProgrammes", "PreseasonBuilder"],
    }),

    createPreseasonWeek: builder.mutation<
      { week: PreseasonWeek },
      { programmeId: number; weekNumber: number; title?: string }
    >({
      query: (body) => ({
        url: `${BASE}/admin/weeks`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["PreseasonBuilder"],
    }),

    updatePreseasonWeek: builder.mutation<
      { week: PreseasonWeek },
      { id: number; patch: { title?: string; weekNumber?: number } }
    >({
      query: ({ id, patch }) => ({
        url: `${BASE}/admin/weeks/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: ["PreseasonBuilder"],
    }),

    deletePreseasonWeek: builder.mutation<{ deleted: boolean }, { id: number }>({
      query: ({ id }) => ({
        url: `${BASE}/admin/weeks/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PreseasonBuilder"],
    }),

    createPreseasonWeekType: builder.mutation<
      { weekType: PreseasonWeekType },
      { weekId: number; name: string; description?: string; order?: number }
    >({
      query: (body) => ({
        url: `${BASE}/admin/week-types`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["PreseasonBuilder"],
    }),

    updatePreseasonWeekType: builder.mutation<
      { weekType: PreseasonWeekType },
      { id: number; patch: { name?: string; description?: string; order?: number } }
    >({
      query: ({ id, patch }) => ({
        url: `${BASE}/admin/week-types/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: ["PreseasonBuilder"],
    }),

    deletePreseasonWeekType: builder.mutation<{ deleted: boolean }, { id: number }>({
      query: ({ id }) => ({
        url: `${BASE}/admin/week-types/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PreseasonBuilder"],
    }),

    createPreseasonDaySession: builder.mutation<
      { daySession: PreseasonDaySession },
      {
        weekTypeId: number;
        dayOfWeek: number;
        category: string;
        title: string;
        description?: string;
        durationLabel?: string;
        intensityLabel?: string;
        focusLabel?: string;
      }
    >({
      query: (body) => ({
        url: `${BASE}/admin/day-sessions`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["PreseasonBuilder"],
    }),

    updatePreseasonDaySession: builder.mutation<
      { daySession: PreseasonDaySession },
      {
        id: number;
        patch: {
          category?: string;
          title?: string;
          description?: string;
          durationLabel?: string;
          intensityLabel?: string;
          focusLabel?: string;
        };
      }
    >({
      query: ({ id, patch }) => ({
        url: `${BASE}/admin/day-sessions/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: ["PreseasonBuilder"],
    }),

    deletePreseasonDaySession: builder.mutation<{ deleted: boolean }, { id: number }>({
      query: ({ id }) => ({
        url: `${BASE}/admin/day-sessions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PreseasonBuilder"],
    }),

    addPreseasonExercise: builder.mutation<
      { exercise: PreseasonExercise },
      {
        programmeId: number;
        daySessionId: number;
        exerciseId: number;
        order: number;
        metric?: "reps" | "duration";
        setsOverride?: number;
        repsOverride?: number;
        durationOverride?: number;
        notes?: string;
      }
    >({
      query: ({ programmeId, ...body }) => {
        void programmeId;
        return {
          url: `${BASE}/admin/day-session-exercises`,
          method: "POST",
          body,
        };
      },
      transformResponse: (response: { exercise: RawPreseasonExercise }) => ({
        exercise: normalizePreseasonExercise(response.exercise),
      }),
      async onQueryStarted({ programmeId, daySessionId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            preseasonApi.util.updateQueryData(
              "getPreseasonProgrammeFull",
              { id: programmeId },
              (draft) => {
                updateDaySessionExercises(draft, daySessionId, (exercises) => {
                  if (!exercises.some((exercise) => exercise.id === data.exercise.id)) {
                    exercises.push(data.exercise);
                    exercises.sort((a, b) => a.order - b.order);
                  }
                });
              },
            ),
          );
        } catch {
          // The mutation error is handled by the component toast.
        }
      },
    }),

    updatePreseasonExercise: builder.mutation<
      { exercise: PreseasonExercise },
      {
        programmeId: number;
        id: number;
        patch: {
          metric?: "reps" | "duration";
          setsOverride?: number | null;
          repsOverride?: number | null;
          durationOverride?: number | null;
          notes?: string | null;
        };
      }
    >({
      query: ({ programmeId, id, patch }) => {
        void programmeId;
        return {
          url: `${BASE}/admin/day-session-exercises/${id}`,
          method: "PUT",
          body: patch,
        };
      },
      transformResponse: (response: { exercise: RawPreseasonExercise }) => ({
        exercise: normalizePreseasonExercise(response.exercise),
      }),
      async onQueryStarted({ programmeId, id, patch }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          preseasonApi.util.updateQueryData(
            "getPreseasonProgrammeFull",
            { id: programmeId },
            (draft) => {
              updateExerciseInProgramme(draft, id, (exercise) => {
                Object.assign(exercise, patch);
              });
            },
          ),
        );

        try {
          const { data } = await queryFulfilled;
          dispatch(
            preseasonApi.util.updateQueryData(
              "getPreseasonProgrammeFull",
              { id: programmeId },
              (draft) => {
                updateExerciseInProgramme(draft, id, (exercise) => {
                  Object.assign(exercise, data.exercise);
                });
              },
            ),
          );
        } catch {
          patchResult.undo();
        }
      },
    }),

    deletePreseasonExercise: builder.mutation<{ deleted: boolean }, { programmeId: number; id: number }>({
      query: ({ id }) => ({
        url: `${BASE}/admin/day-session-exercises/${id}`,
        method: "DELETE",
      }),
      async onQueryStarted({ programmeId, id }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          preseasonApi.util.updateQueryData(
            "getPreseasonProgrammeFull",
            { id: programmeId },
            (draft) => {
              for (const week of draft.programme.weeks) {
                for (const weekType of week.weekTypes) {
                  for (const session of weekType.daySessions) {
                    const index = session.exercises.findIndex((exercise) => exercise.id === id);
                    if (index !== -1) {
                      session.exercises.splice(index, 1);
                      return;
                    }
                  }
                }
              }
            },
          ),
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    reorderPreseasonExercises: builder.mutation<
      { ok: boolean },
      { programmeId: number; daySessionId: number; orderedIds: number[] }
    >({
      query: ({ daySessionId, orderedIds }) => ({
        url: `${BASE}/admin/day-sessions/${daySessionId}/exercises/reorder`,
        method: "PATCH",
        body: { orderedIds },
      }),
      async onQueryStarted({ programmeId, daySessionId, orderedIds }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          preseasonApi.util.updateQueryData(
            "getPreseasonProgrammeFull",
            { id: programmeId },
            (draft) => {
              updateDaySessionExercises(draft, daySessionId, (exercises) => {
                const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
                const reordered = orderedIds
                  .map((id, index) => {
                    const exercise = byId.get(id);
                    if (exercise) exercise.order = index + 1;
                    return exercise;
                  })
                  .filter(Boolean) as PreseasonExercise[];
                exercises.splice(0, exercises.length, ...reordered);
              });
            },
          ),
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    getExercisesForPreseason: builder.query<{ exercises: ExerciseLibraryItem[] }, void>({
      query: () => "/admin/exercises",
      providesTags: ["Exercises"],
      transformResponse: (response: { exercises?: ExerciseLibraryItem[] } | undefined) => ({
        exercises: response?.exercises ?? [],
      }),
    }),

    getPreseasonAssignments: builder.query<
      { assignments: PreseasonAssignment[] },
      { programmeId: number }
    >({
      query: ({ programmeId }) => `${BASE}/admin/programmes/${programmeId}/assignments`,
      providesTags: (_r, _e, { programmeId }) => [{ type: "PreseasonAssignments" as const, id: programmeId }],
    }),

    assignPreseasonAthletes: builder.mutation<
      { assigned: number },
      { programmeId: number; athleteIds: number[] }
    >({
      query: ({ programmeId, athleteIds }) => ({
        url: `${BASE}/admin/programmes/${programmeId}/assignments`,
        method: "POST",
        body: { athleteIds },
      }),
      invalidatesTags: (_r, _e, { programmeId }) => [{ type: "PreseasonAssignments" as const, id: programmeId }],
    }),

    unassignPreseasonAthlete: builder.mutation<
      { unassigned: number },
      { programmeId: number; athleteId: number }
    >({
      query: ({ programmeId, athleteId }) => ({
        url: `${BASE}/admin/programmes/${programmeId}/assignments/${athleteId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { programmeId }) => [{ type: "PreseasonAssignments" as const, id: programmeId }],
    }),

    searchPreseasonAthletes: builder.query<
      { athletes: AthleteSearchResult[] },
      { q: string }
    >({
      query: ({ q }) => `${BASE}/admin/athletes${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPreseasonProgrammesQuery,
  useGetPreseasonProgrammeFullQuery,
  useCreatePreseasonProgrammeMutation,
  useUpdatePreseasonProgrammeMutation,
  useDeletePreseasonProgrammeMutation,
  usePublishPreseasonProgrammeMutation,
  useCreatePreseasonWeekMutation,
  useUpdatePreseasonWeekMutation,
  useDeletePreseasonWeekMutation,
  useCreatePreseasonWeekTypeMutation,
  useUpdatePreseasonWeekTypeMutation,
  useDeletePreseasonWeekTypeMutation,
  useCreatePreseasonDaySessionMutation,
  useUpdatePreseasonDaySessionMutation,
  useDeletePreseasonDaySessionMutation,
  useAddPreseasonExerciseMutation,
  useUpdatePreseasonExerciseMutation,
  useDeletePreseasonExerciseMutation,
  useReorderPreseasonExercisesMutation,
  useGetExercisesForPreseasonQuery,
  useGetPreseasonAssignmentsQuery,
  useAssignPreseasonAthletesMutation,
  useUnassignPreseasonAthleteMutation,
  useSearchPreseasonAthletesQuery,
} = preseasonApi;
