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
    reorderSessionExercises: builder.mutation<
      { ok: boolean },
      { sessionId: number; ids: number[] }
    >({
      query: ({ sessionId, ids }) => ({
        url: `/admin/sessions/${sessionId}/exercises/reorder`,
        method: "PATCH",
        body: { ids },
      }),
      invalidatesTags: ["ProgramBuilder"],
    }),
    getScheduledAssignments: builder.query<
      {
        items: {
          id: number;
          athleteId: number;
          athleteName: string;
          programId: number;
          programName: string;
          programType: string | null;
          status: string;
          scheduledDate: string;
        }[];
      },
      void
    >({
      query: () => "/admin/scheduled-assignments",
      providesTags: ["ProgramBuilder"],
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
      providesTags: ["Exercises"],
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
      invalidatesTags: ["Exercises"],
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
      invalidatesTags: ["Exercises", "ProgramBuilder"],
    }),
    deleteExercise: builder.mutation<
      { deleted: boolean },
      { exerciseId: number }
    >({
      query: ({ exerciseId }) => ({
        url: `/admin/exercises/${exerciseId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Exercises", "ProgramBuilder"],
    }),
    // Session Library
    getSessionLibrary: builder.query<{ sessions: any[] }, void>({
      query: () => "/admin/sessions/library",
      providesTags: ["SessionLibrary"],
    }),
    createLibrarySession: builder.mutation<
      { session: any },
      { title?: string | null; description?: string | null; weekNumber?: number; sessionNumber?: number; type?: string }
    >({
      query: (body) => ({ url: "/admin/sessions/library", method: "POST", body }),
      invalidatesTags: ["SessionLibrary"],
    }),
    copySessionToModule: builder.mutation<
      { session: any },
      { moduleId: number; sessionId: number; programId?: number }
    >({
      query: ({ moduleId, sessionId, ...body }) => ({
        url: `/admin/modules/${moduleId}/sessions/from-library/${sessionId}`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["ProgramBuilder", "ModuleLibrary"],
    }),
    getTeamSessions: builder.query<{ sessions: any[] }, { teamId: number }>({
      query: ({ teamId }) => `/admin/teams/${teamId}/sessions`,
      providesTags: ["TeamSessions"],
    }),
    copySessionToTeam: builder.mutation<
      { session: any },
      { teamId: number; sessionId: number }
    >({
      query: ({ teamId, sessionId }) => ({
        url: `/admin/teams/${teamId}/sessions/from-library/${sessionId}`,
        method: "POST",
      }),
      invalidatesTags: ["TeamSessions"],
    }),
    deleteTeamSession: builder.mutation<{ session: any }, { sessionId: number }>({
      query: ({ sessionId }) => ({ url: `/admin/team-sessions/${sessionId}`, method: "DELETE" }),
      invalidatesTags: ["TeamSessions"],
    }),
    // Module Library
    getModuleLibrary: builder.query<{ modules: any[] }, void>({
      query: () => "/admin/modules/library",
      providesTags: ["ModuleLibrary"],
    }),
    createLibraryModule: builder.mutation<
      { module: any },
      { title: string; description?: string | null }
    >({
      query: (body) => ({
        url: "/admin/modules/library",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ModuleLibrary"],
    }),
    updateLibraryModule: builder.mutation<
      { module: any },
      { moduleId: number; patch: { title?: string; description?: string | null } }
    >({
      query: ({ moduleId, patch }) => ({
        url: `/admin/modules/library/${moduleId}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: ["ModuleLibrary"],
    }),
    deleteLibraryModule: builder.mutation<{ module: any }, { moduleId: number }>({
      query: ({ moduleId }) => ({
        url: `/admin/modules/library/${moduleId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ModuleLibrary"],
    }),
    createLibraryModuleSession: builder.mutation<
      { session: any },
      {
        moduleId: number;
        title?: string | null;
        description?: string | null;
        weekNumber: number;
        sessionNumber: number;
        type?: string;
      }
    >({
      query: ({ moduleId, ...body }) => ({
        url: `/admin/modules/library/${moduleId}/sessions`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["ModuleLibrary", "ProgramBuilder"],
    }),
    copyModuleToProgram: builder.mutation<
      { module: any },
      { programId: number; moduleId: number }
    >({
      query: ({ programId, moduleId }) => ({
        url: `/admin/programs/${programId}/modules/from-library/${moduleId}`,
        method: "POST",
      }),
      invalidatesTags: ["ProgramBuilder"],
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
  useReorderSessionExercisesMutation,
  useGetScheduledAssignmentsQuery,
  useGetAdultAthletesQuery,
  useGetAthleteDetailQuery,
  useAssignProgramToAthleteMutation,
  useUnassignProgramMutation,
  useUpdateProgramAssignmentMutation,
  useAssignProgramMutation,
  useGetExercisesQuery,
  useCreateExerciseMutation,
  useUpdateExerciseMutation,
  useDeleteExerciseMutation,
  useGetSessionLibraryQuery,
  useCreateLibrarySessionMutation,
  useCopySessionToModuleMutation,
  useGetTeamSessionsQuery,
  useCopySessionToTeamMutation,
  useDeleteTeamSessionMutation,
  useGetModuleLibraryQuery,
  useCreateLibraryModuleMutation,
  useUpdateLibraryModuleMutation,
  useDeleteLibraryModuleMutation,
  useCreateLibraryModuleSessionMutation,
  useCopyModuleToProgramMutation,
} = programsApi;
