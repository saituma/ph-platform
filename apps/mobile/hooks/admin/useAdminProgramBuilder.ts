import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { useAdminQuery, useAdminMutation } from "./useAdminQuery";

export type ProgramItem = {
  id: number;
  name: string;
  type: string;
  description?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
};

export type ModuleItem = {
  id: number;
  programId: number;
  title: string;
  description?: string | null;
  order: number;
  sessionCount?: number;
};

export type SessionItem = {
  id: number;
  moduleId?: number | null;
  title?: string | null;
  description?: string | null;
  type?: string | null;
  weekNumber?: number | null;
  sessionNumber?: number | null;
  exerciseCount?: number;
};

export type SessionExerciseItem = {
  id: number;
  exerciseId: number;
  order: number;
  coachingNotes?: string | null;
  exercise?: {
    id: number;
    name: string;
    category?: string | null;
    sets?: number | null;
    reps?: number | null;
    videoUrl?: string | null;
  };
};

export type AdultAthleteItem = {
  id: number;
  name: string;
  age?: number | null;
  currentProgramTier?: string | null;
  assignments?: { id: number; programId: number; programName: string }[];
};

export type ExerciseLibraryItem = {
  id: number;
  name: string;
  category?: string | null;
  sets?: number | null;
  reps?: number | null;
  videoUrl?: string | null;
};

export function useAdminProgramBuilder(token: string | null, canLoad: boolean) {
  const enabled = Boolean(token && canLoad);

  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionExercises, setSessionExercises] = useState<SessionExerciseItem[]>([]);
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Programs query uses useAdminQuery (simple forceRefresh pattern)
  const programsFetcher = useCallback(
    async (forceRefresh: boolean) => {
      if (!token) return [];
      const res = await apiRequest<{ programs?: ProgramItem[] }>("/admin/programs", {
        token,
        forceRefresh,
        skipCache: forceRefresh,
      });
      return Array.isArray(res?.programs) ? res.programs : [];
    },
    [token],
  );
  const { data: programs, load: loadPrograms } = useAdminQuery<ProgramItem[]>(programsFetcher, [], enabled);

  // Adult athletes query uses useAdminQuery
  const athletesFetcher = useCallback(
    async (forceRefresh: boolean) => {
      if (!token) return [];
      const res = await apiRequest<{ athletes?: AdultAthleteItem[] }>("/admin/adult-athletes", {
        token,
        forceRefresh,
        skipCache: forceRefresh,
      });
      return Array.isArray(res?.athletes) ? res.athletes : [];
    },
    [token],
  );
  const { data: adultAthletes, load: loadAdultAthletes } = useAdminQuery<AdultAthleteItem[]>(
    athletesFetcher,
    [],
    enabled,
  );

  // Hierarchical loaders (take entity IDs, can't use useAdminQuery)
  const loadModules = useCallback(
    async (programId: number, forceRefresh = false) => {
      if (!enabled) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ modules?: ModuleItem[] }>(
          `/admin/programs/${programId}/modules`,
          { token: token!, forceRefresh, skipCache: forceRefresh },
        );
        setModules(Array.isArray(res?.modules) ? res.modules : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load modules");
      } finally {
        setLoading(false);
      }
    },
    [enabled, token],
  );

  const loadSessions = useCallback(
    async (moduleId: number, forceRefresh = false) => {
      if (!enabled) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ sessions?: SessionItem[] }>(
          `/admin/modules/${moduleId}/sessions`,
          { token: token!, forceRefresh, skipCache: forceRefresh },
        );
        setSessions(Array.isArray(res?.sessions) ? res.sessions : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load sessions");
      } finally {
        setLoading(false);
      }
    },
    [enabled, token],
  );

  const loadSessionExercises = useCallback(
    async (sessionId: number, forceRefresh = false) => {
      if (!enabled) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ exercises?: SessionExerciseItem[] }>(
          `/admin/sessions/${sessionId}/exercises`,
          { token: token!, forceRefresh, skipCache: forceRefresh },
        );
        setSessionExercises(Array.isArray(res?.exercises) ? res.exercises : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load exercises");
      } finally {
        setLoading(false);
      }
    },
    [enabled, token],
  );

  const loadExerciseLibrary = useCallback(
    async (forceRefresh = false) => {
      if (!enabled) return;
      try {
        const res = await apiRequest<{ exercises?: ExerciseLibraryItem[] }>("/admin/exercises", {
          token: token!,
          forceRefresh,
          skipCache: forceRefresh,
        });
        setExerciseLibrary(Array.isArray(res?.exercises) ? res.exercises : []);
      } catch {
        // non-blocking
      }
    },
    [enabled, token],
  );

  // Mutations
  const createProgramMut = useAdminMutation<{ name: string; description?: string }>(
    useCallback(
      async (data) => {
        if (!token) return;
        await apiRequest("/admin/programs", {
          method: "POST",
          token,
          body: { name: data.name, type: "PHP", description: data.description },
          skipCache: true,
        });
        await loadPrograms(true);
      },
      [token, loadPrograms],
    ),
  );

  const updateProgramMut = useAdminMutation<{ programId: number; data: { name: string; description?: string | null } }>(
    useCallback(
      async ({ programId, data }) => {
        if (!token) return;
        await apiRequest(`/admin/programs/${programId}`, {
          method: "PATCH",
          token,
          body: { name: data.name, description: data.description ?? null },
          skipCache: true,
        });
        await loadPrograms(true);
      },
      [token, loadPrograms],
    ),
  );

  const deleteProgramMut = useAdminMutation<number>(
    useCallback(
      async (programId) => {
        if (!token) return;
        await apiRequest(`/admin/programs/${programId}`, { method: "DELETE", token, skipCache: true });
        await loadPrograms(true);
      },
      [token, loadPrograms],
    ),
  );

  const createModuleMut = useAdminMutation<{ programId: number; data: { title: string; description?: string } }>(
    useCallback(
      async ({ programId, data }) => {
        if (!token) return;
        await apiRequest(`/admin/programs/${programId}/modules`, {
          method: "POST",
          token,
          body: { ...data, order: modules.length + 1 },
          skipCache: true,
        });
        await loadModules(programId, true);
      },
      [token, modules.length, loadModules],
    ),
  );

  const updateModuleMut = useAdminMutation<{
    programId: number;
    moduleId: number;
    data: { title?: string; description?: string };
  }>(
    useCallback(
      async ({ programId, moduleId, data }) => {
        if (!token) return;
        await apiRequest(`/admin/programs/${programId}/modules/${moduleId}`, {
          method: "PATCH",
          token,
          body: data,
          skipCache: true,
        });
        await loadModules(programId, true);
      },
      [token, loadModules],
    ),
  );

  const deleteModuleMut = useAdminMutation<{ programId: number; moduleId: number }>(
    useCallback(
      async ({ programId, moduleId }) => {
        if (!token) return;
        await apiRequest(`/admin/programs/${programId}/modules/${moduleId}`, {
          method: "DELETE",
          token,
          skipCache: true,
        });
        await loadModules(programId, true);
      },
      [token, loadModules],
    ),
  );

  const createSessionMut = useAdminMutation<{
    moduleId: number;
    data: { title: string; type?: string; weekNumber?: number; sessionNumber?: number; programId?: number };
  }>(
    useCallback(
      async ({ moduleId, data }) => {
        if (!token) return;
        const programId = data.programId ?? 0;
        await apiRequest(`/admin/programs/${programId}/modules/${moduleId}/sessions`, {
          method: "POST",
          token,
          body: { title: data.title, type: data.type, weekNumber: data.weekNumber ?? 1, sessionNumber: data.sessionNumber ?? 1 },
          skipCache: true,
        });
        await loadSessions(moduleId, true);
      },
      [token, loadSessions],
    ),
  );

  const updateSessionMut = useAdminMutation<{
    sessionId: number;
    moduleId: number;
    data: { title?: string; type?: string };
  }>(
    useCallback(
      async ({ sessionId, moduleId, data }) => {
        if (!token) return;
        await apiRequest(`/admin/sessions/${sessionId}`, { method: "PATCH", token, body: data, skipCache: true });
        await loadSessions(moduleId, true);
      },
      [token, loadSessions],
    ),
  );

  const deleteSessionMut = useAdminMutation<{ sessionId: number; moduleId: number }>(
    useCallback(
      async ({ sessionId, moduleId }) => {
        if (!token) return;
        await apiRequest(`/admin/sessions/${sessionId}`, { method: "DELETE", token, skipCache: true });
        await loadSessions(moduleId, true);
      },
      [token, loadSessions],
    ),
  );

  const createExerciseAndAddMut = useAdminMutation<{
    sessionId: number;
    order: number;
    data: {
      name: string;
      category?: string;
      sets?: number;
      reps?: number;
      duration?: number;
      restSeconds?: number;
      videoUrl?: string;
      notes?: string;
      cues?: string;
      howTo?: string;
    };
  }>(
    useCallback(
      async ({ sessionId, order, data }) => {
        if (!token) return;
        const res = await apiRequest<{ exercise?: { id: number } }>("/admin/exercises", {
          method: "POST",
          token,
          body: data,
          skipCache: true,
        });
        const exerciseId = res?.exercise?.id;
        if (exerciseId) {
          await apiRequest("/admin/session-exercises", {
            method: "POST",
            token,
            body: { sessionId, exerciseId, order },
            skipCache: true,
          });
          await loadSessionExercises(sessionId, true);
        }
      },
      [token, loadSessionExercises],
    ),
  );

  const addExerciseMut = useAdminMutation<{ sessionId: number; exerciseId: number; order: number }>(
    useCallback(
      async ({ sessionId, exerciseId, order }) => {
        if (!token) return;
        await apiRequest("/admin/session-exercises", {
          method: "POST",
          token,
          body: { sessionId, exerciseId, order },
          skipCache: true,
        });
        await loadSessionExercises(sessionId, true);
      },
      [token, loadSessionExercises],
    ),
  );

  const removeExerciseMut = useAdminMutation<{ sessionExerciseId: number; sessionId: number }>(
    useCallback(
      async ({ sessionExerciseId, sessionId }) => {
        if (!token) return;
        await apiRequest(`/admin/session-exercises/${sessionExerciseId}`, {
          method: "DELETE",
          token,
          skipCache: true,
        });
        await loadSessionExercises(sessionId, true);
      },
      [token, loadSessionExercises],
    ),
  );

  const assignProgramMut = useAdminMutation<{ programId: number; athleteId: number }>(
    useCallback(
      async ({ programId, athleteId }) => {
        if (!token) return;
        await apiRequest(`/admin/programs/${programId}/assignments`, {
          method: "POST",
          token,
          body: { athleteId },
          skipCache: true,
        });
        await loadAdultAthletes(true);
      },
      [token, loadAdultAthletes],
    ),
  );

  const unassignProgramMut = useAdminMutation<number>(
    useCallback(
      async (assignmentId) => {
        if (!token) return;
        await apiRequest(`/admin/program-assignments/${assignmentId}`, {
          method: "DELETE",
          token,
          skipCache: true,
        });
        await loadAdultAthletes(true);
      },
      [token, loadAdultAthletes],
    ),
  );

  const isBusy =
    createProgramMut.busy ||
    updateProgramMut.busy ||
    deleteProgramMut.busy ||
    createModuleMut.busy ||
    updateModuleMut.busy ||
    deleteModuleMut.busy ||
    createSessionMut.busy ||
    updateSessionMut.busy ||
    deleteSessionMut.busy ||
    createExerciseAndAddMut.busy ||
    addExerciseMut.busy ||
    removeExerciseMut.busy ||
    assignProgramMut.busy ||
    unassignProgramMut.busy;

  return {
    programs,
    modules,
    sessions,
    sessionExercises,
    adultAthletes,
    exerciseLibrary,
    loading,
    isBusy,
    error,
    loadPrograms,
    createProgram: (data: { name: string; description?: string }) => createProgramMut.run(data),
    updateProgram: (programId: number, data: { name: string; description?: string | null }) =>
      updateProgramMut.run({ programId, data }),
    deleteProgram: (programId: number) => deleteProgramMut.run(programId),
    loadModules,
    createModule: (programId: number, data: { title: string; description?: string }) =>
      createModuleMut.run({ programId, data }),
    updateModule: (programId: number, moduleId: number, data: { title?: string; description?: string }) =>
      updateModuleMut.run({ programId, moduleId, data }),
    deleteModule: (programId: number, moduleId: number) => deleteModuleMut.run({ programId, moduleId }),
    loadSessions,
    createSession: (
      moduleId: number,
      data: { title: string; type?: string; weekNumber?: number; sessionNumber?: number; programId?: number },
    ) => createSessionMut.run({ moduleId, data }),
    updateSession: (sessionId: number, moduleId: number, data: { title?: string; type?: string }) =>
      updateSessionMut.run({ sessionId, moduleId, data }),
    deleteSession: (sessionId: number, moduleId: number) => deleteSessionMut.run({ sessionId, moduleId }),
    loadSessionExercises,
    loadExerciseLibrary,
    createExerciseAndAdd: (
      sessionId: number,
      order: number,
      data: {
        name: string;
        category?: string;
        sets?: number;
        reps?: number;
        duration?: number;
        restSeconds?: number;
        videoUrl?: string;
        notes?: string;
        cues?: string;
        howTo?: string;
      },
    ) => createExerciseAndAddMut.run({ sessionId, order, data }),
    addExerciseToSession: (sessionId: number, exerciseId: number, order: number) =>
      addExerciseMut.run({ sessionId, exerciseId, order }),
    removeExerciseFromSession: (sessionExerciseId: number, sessionId: number) =>
      removeExerciseMut.run({ sessionExerciseId, sessionId }),
    loadAdultAthletes,
    assignProgram: (programId: number, athleteId: number) => assignProgramMut.run({ programId, athleteId }),
    unassignProgram: (assignmentId: number) => unassignProgramMut.run(assignmentId),
  };
}
