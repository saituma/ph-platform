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
  order: number;
  metric: "reps" | "duration";
  setsOverride?: number;
  repsOverride?: number;
  durationOverride?: number;
  notes?: string;
  exercise: {
    id: number;
    name: string;
    category?: string;
    sets?: number;
    reps?: number;
    duration?: number;
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
      query: (body) => ({
        url: `${BASE}/admin/day-session-exercises`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["PreseasonBuilder"],
    }),

    updatePreseasonExercise: builder.mutation<
      { exercise: PreseasonExercise },
      {
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
      query: ({ id, patch }) => ({
        url: `${BASE}/admin/day-session-exercises/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: ["PreseasonBuilder"],
    }),

    deletePreseasonExercise: builder.mutation<{ deleted: boolean }, { id: number }>({
      query: ({ id }) => ({
        url: `${BASE}/admin/day-session-exercises/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PreseasonBuilder"],
    }),

    reorderPreseasonExercises: builder.mutation<
      { ok: boolean },
      { daySessionId: number; orderedIds: number[] }
    >({
      query: ({ daySessionId, orderedIds }) => ({
        url: `${BASE}/admin/day-sessions/${daySessionId}/exercises/reorder`,
        method: "PATCH",
        body: { orderedIds },
      }),
      invalidatesTags: ["PreseasonBuilder"],
    }),

    getExercisesForPreseason: builder.query<{ exercises: any[] }, void>({
      query: () => "/admin/exercises",
      providesTags: ["Exercises"],
      transformResponse: (response: { exercises?: any[] } | undefined) => ({
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
