import { apiSlice } from "../core";
import type { ApiPayload } from "../core";

const programsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPrograms: builder.query<
      { programs: any[] },
      { q?: string; limit?: number } | void
    >({
      query: (params) => {
        if (!params) return "/admin/programs";
        const query = new URLSearchParams();
        if (params.q) query.set("q", params.q);
        if (params.limit) query.set("limit", String(params.limit));
        const queryString = query.toString();
        return queryString
          ? `/admin/programs?${queryString}`
          : "/admin/programs";
      },
      providesTags: ["Programs"],
    }),
    createProgram: builder.mutation<
      { program: any },
      {
        name: string;
        type: string;
        description?: string;
        minAge?: number | null;
        maxAge?: number | null;
      }
    >({
      query: (body) => ({
        url: "/admin/programs",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Programs"],
    }),
    updateProgram: builder.mutation<
      { program: any },
      {
        programId: number;
        data: {
          name?: string;
          type?: string;
          description?: string | null;
          minAge?: number | null;
          maxAge?: number | null;
        };
      }
    >({
      query: ({ programId, data }) => ({
        url: `/admin/programs/${programId}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Programs"],
    }),
    deleteProgram: builder.mutation<{ deleted: boolean }, number>({
      query: (programId) => ({
        url: `/admin/programs/${programId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Programs"],
    }),
    // Program Builder
    getProgramFull: builder.query<{ program: any }, { programId: number }>({
      query: ({ programId }) => `/admin/programs/${programId}/full`,
      providesTags: ["ProgramBuilder"],
    }),
    getProgramModules: builder.query<{ modules: any[] }, { programId: number }>({
      query: ({ programId }) => `/admin/programs/${programId}/modules`,
      providesTags: ["ProgramBuilder"],
    }),
    createProgramModule: builder.mutation<
      { module: any },
      { programId: number; title: string; description?: string | null }
    >({
      query: ({ programId, ...body }) => ({
        url: `/admin/programs/${programId}/modules`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["ProgramBuilder"],
    }),
    updateProgramModule: builder.mutation<
      { module: any },
      { programId: number; moduleId: number; patch: ApiPayload }
    >({
      query: ({ programId, moduleId, patch }) => ({
        url: `/admin/programs/${programId}/modules/${moduleId}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: ["ProgramBuilder"],
    }),
    deleteProgramModule: builder.mutation<
      { module: any },
      { programId: number; moduleId: number }
    >({
      query: ({ programId, moduleId }) => ({
        url: `/admin/programs/${programId}/modules/${moduleId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ProgramBuilder"],
    }),
    getModuleSessions: builder.query<{ sessions: any[] }, { moduleId: number }>({
      query: ({ moduleId }) => `/admin/modules/${moduleId}/sessions`,
      providesTags: ["ProgramBuilder"],
    }),
    createModuleSession: builder.mutation<
      { session: any },
      {
        programId: number;
        moduleId: number;
        title?: string | null;
        description?: string | null;
        weekNumber: number;
        sessionNumber: number;
        type?: string;
      }
    >({
      query: ({ programId, moduleId, ...body }) => ({
        url: `/admin/programs/${programId}/modules/${moduleId}/sessions`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["ProgramBuilder"],
    }),
    updateBuilderSession: builder.mutation<
      { session: any },
      { sessionId: number; patch: ApiPayload }
    >({
      query: ({ sessionId, patch }) => ({
        url: `/admin/sessions/${sessionId}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: ["ProgramBuilder"],
    }),
    deleteBuilderSession: builder.mutation<
      { session: any },
      { sessionId: number }
    >({
      query: ({ sessionId }) => ({
        url: `/admin/sessions/${sessionId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ProgramBuilder"],
    }),
    getSessionExercises: builder.query<{ exercises: any[] }, { sessionId: number }>({
      query: ({ sessionId }) => `/admin/sessions/${sessionId}/exercises`,
      providesTags: ["ProgramBuilder"],
    }),
    updateSessionExercise: builder.mutation<
      { exercise: any },
      { id: number; patch: ApiPayload }
    >({
      query: ({ id, patch }) => ({
        url: `/admin/session-exercises/${id}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: ["ProgramBuilder"],
    }),
    addSessionExercise: builder.mutation<
      { item: any },
      { sessionId: number; exerciseId: number; order: number; coachingNotes?: string | null; progressionNotes?: string | null; regressionNotes?: string | null }
    >({
      query: (body) => ({
        url: "/admin/session-exercises",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ProgramBuilder"],
    }),
    deleteSessionExercise: builder.mutation<
      { item: any },
      { sessionExerciseId: number }
    >({
      query: ({ sessionExerciseId }) => ({
        url: `/admin/session-exercises/${sessionExerciseId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ProgramBuilder"],
    }),
    getAdultAthletes: builder.query<{ athletes: any[] }, void>({
      query: () => "/admin/adult-athletes",
      providesTags: ["ProgramBuilder", "Users"],
    }),
    getAthleteDetail: builder.query<{ athlete: any }, { athleteId: number }>({
      query: ({ athleteId }) => `/admin/adult-athletes/${athleteId}`,
      providesTags: ["ProgramBuilder", "Users"],
    }),
    assignProgramToAthlete: builder.mutation<
      { assignment: any },
      { programId: number; athleteId: number }
    >({
      query: ({ programId, athleteId }) => ({
        url: `/admin/programs/${programId}/assignments`,
        method: "POST",
        body: { athleteId },
      }),
      invalidatesTags: ["ProgramBuilder", "Users"],
    }),
    unassignProgram: builder.mutation<
      { assignment: any },
      { assignmentId: number }
    >({
      query: ({ assignmentId }) => ({
        url: `/admin/program-assignments/${assignmentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ProgramBuilder", "Users"],
    }),
    updateProgramAssignment: builder.mutation<
      { assignment: any },
      { assignmentId: number; scheduledDate: string | null }
    >({
      query: ({ assignmentId, ...body }) => ({
        url: `/admin/program-assignments/${assignmentId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["ProgramBuilder", "Users"],
    }),
    assignProgram: builder.mutation<
      any,
      { athleteId: number; programType: string; programTemplateId?: number }
    >({
      query: (body) => ({
        url: "/admin/enrollments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    getExercises: builder.query<{ exercises: any[] }, void>({
      query: () => "/admin/exercises",
      providesTags: ["Content"],
      transformResponse: (response: { exercises?: any[] } | undefined) => ({
        exercises: response?.exercises ?? [],
      }),
    }),
    createExercise: builder.mutation<
      { exercise: any },
      {
        name: string;
        category?: string;
        cues?: string;
        howTo?: string;
        progression?: string;
        regression?: string;
        sets?: number;
        reps?: number;
        duration?: number;
        restSeconds?: number;
        notes?: string;
        videoUrl?: string;
      }
    >({
      query: (body) => ({
        url: "/admin/exercises",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Content"],
    }),
    updateExercise: builder.mutation<
      { exercise: any },
      { exerciseId: number; patch: Record<string, any> }
    >({
      query: ({ exerciseId, patch }) => ({
        url: `/admin/exercises/${exerciseId}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: ["Content", "ProgramBuilder"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetProgramsQuery,
  useCreateProgramMutation,
  useUpdateProgramMutation,
  useDeleteProgramMutation,
  useGetProgramFullQuery,
  useGetProgramModulesQuery,
  useCreateProgramModuleMutation,
  useUpdateProgramModuleMutation,
  useDeleteProgramModuleMutation,
  useGetModuleSessionsQuery,
  useCreateModuleSessionMutation,
  useUpdateBuilderSessionMutation,
  useDeleteBuilderSessionMutation,
  useGetSessionExercisesQuery,
  useUpdateSessionExerciseMutation,
  useAddSessionExerciseMutation,
  useDeleteSessionExerciseMutation,
  useGetAdultAthletesQuery,
  useGetAthleteDetailQuery,
  useAssignProgramToAthleteMutation,
  useUnassignProgramMutation,
  useUpdateProgramAssignmentMutation,
  useAssignProgramMutation,
  useGetExercisesQuery,
  useCreateExerciseMutation,
  useUpdateExerciseMutation,
} = programsApi;
