import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/api";

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
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionExercises, setSessionExercises] = useState<SessionExerciseItem[]>([]);
  const [adultAthletes, setAdultAthletes] = useState<AdultAthleteItem[]>([]);
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPrograms = useCallback(async (forceRefresh = false) => {
    if (!token || !canLoad) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ programs?: ProgramItem[] }>("/admin/programs", {
        token,
        forceRefresh,
        skipCache: forceRefresh,
      });
      setPrograms(Array.isArray(res?.programs) ? res.programs : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load programs");
    } finally {
      setLoading(false);
    }
  }, [token, canLoad]);

  const createProgram = useCallback(async (data: { name: string; description?: string }) => {
    if (!token) return;
    setIsBusy(true);
    try {
      await apiRequest("/admin/programs", {
        method: "POST",
        token,
        body: { name: data.name, type: "PHP", description: data.description },
        skipCache: true,
      });
      await loadPrograms(true);
    } finally {
      setIsBusy(false);
    }
  }, [token, loadPrograms]);

  const updateProgram = useCallback(async (programId: number, data: { name: string; description?: string | null }) => {
    if (!token) return;
    setIsBusy(true);
    try {
      await apiRequest(`/admin/programs/${programId}`, {
        method: "PATCH",
        token,
        body: { name: data.name, description: data.description ?? null },
        skipCache: true,
      });
      await loadPrograms(true);
    } finally {
      setIsBusy(false);
    }
  }, [token, loadPrograms]);

  const deleteProgram = useCallback(async (programId: number) => {
    if (!token) return;
    setIsBusy(true);
    try {
      await apiRequest(`/admin/programs/${programId}`, {
        method: "DELETE",
        token,
        skipCache: true,
      });
      await loadPrograms(true);
    } finally {
      setIsBusy(false);
    }
  }, [token, loadPrograms]);

  const loadModules = useCallback(async (programId: number, forceRefresh = false) => {
    if (!token || !canLoad) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ modules?: ModuleItem[] }>(
        `/admin/programs/${programId}/modules`,
        { token, forceRefresh, skipCache: forceRefresh },
      );
      setModules(Array.isArray(res?.modules) ? res.modules : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load modules");
    } finally {
      setLoading(false);
    }
  }, [token, canLoad]);

  const createModule = useCallback(async (programId: number, data: { title: string; description?: string }) => {
    if (!token) return;
    setIsBusy(true);
    try {
      await apiRequest(`/admin/programs/${programId}/modules`, {
        method: "POST",
        token,
        body: { ...data, order: modules.length + 1 },
        skipCache: true,
      });
      await loadModules(programId, true);
    } finally {
      setIsBusy(false);
    }
  }, [token, modules.length, loadModules]);

  const updateModule = useCallback(async (programId: number, moduleId: number, data: { title?: string; description?: string }) => {
    if (!token) return;
    setIsBusy(true);
    try {
      await apiRequest(`/admin/programs/${programId}/modules/${moduleId}`, {
        method: "PATCH",
        token,
        body: data,
        skipCache: true,
      });
      await loadModules(programId, true);
    } finally {
      setIsBusy(false);
    }
  }, [token, loadModules]);

  const deleteModule = useCallback(async (programId: number, moduleId: number) => {
    if (!token) return;
    setIsBusy(true);
    try {
      await apiRequest(`/admin/programs/${programId}/modules/${moduleId}`, {
        method: "DELETE",
        token,
        skipCache: true,
      });
      await loadModules(programId, true);
    } finally {
      setIsBusy(false);
    }
  }, [token, loadModules]);

  const loadSessions = useCallback(async (moduleId: number, forceRefresh = false) => {
    if (!token || !canLoad) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ sessions?: SessionItem[] }>(
        `/admin/modules/${moduleId}/sessions`,
        { token, forceRefresh, skipCache: forceRefresh },
      );
      setSessions(Array.isArray(res?.sessions) ? res.sessions : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [token, canLoad]);

  const createSession = useCallback(async (moduleId: number, data: { title: string; type?: string; weekNumber?: number; sessionNumber?: number; programId?: number }) => {
    if (!token) return;
    setIsBusy(true);
    try {
      const programId = data.programId ?? 0;
      const body = {
        title: data.title,
        type: data.type,
        weekNumber: data.weekNumber ?? 1,
        sessionNumber: data.sessionNumber ?? 1,
      };
      await apiRequest(`/admin/programs/${programId}/modules/${moduleId}/sessions`, {
        method: "POST",
        token,
        body,
        skipCache: true,
      });
      await loadSessions(moduleId, true);
    } finally {
      setIsBusy(false);
    }
  }, [token, loadSessions]);

  const updateSession = useCallback(async (sessionId: number, moduleId: number, data: { title?: string; type?: string }) => {
    if (!token) return;
    setIsBusy(true);
    try {
      await apiRequest(`/admin/sessions/${sessionId}`, {
        method: "PATCH",
        token,
        body: data,
        skipCache: true,
      });
      await loadSessions(moduleId, true);
    } finally {
      setIsBusy(false);
    }
  }, [token, loadSessions]);

  const deleteSession = useCallback(async (sessionId: number, moduleId: number) => {
    if (!token) return;
    setIsBusy(true);
    try {
      await apiRequest(`/admin/sessions/${sessionId}`, {
        method: "DELETE",
        token,
        skipCache: true,
      });
      await loadSessions(moduleId, true);
    } finally {
      setIsBusy(false);
    }
  }, [token, loadSessions]);

  const loadSessionExercises = useCallback(async (sessionId: number, forceRefresh = false) => {
    if (!token || !canLoad) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ exercises?: SessionExerciseItem[] }>(
        `/admin/sessions/${sessionId}/exercises`,
        { token, forceRefresh, skipCache: forceRefresh },
      );
      setSessionExercises(Array.isArray(res?.exercises) ? res.exercises : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load exercises");
    } finally {
      setLoading(false);
    }
  }, [token, canLoad]);

  const loadExerciseLibrary = useCallback(async (forceRefresh = false) => {
    if (!token || !canLoad) return;
    try {
      const res = await apiRequest<{ exercises?: ExerciseLibraryItem[] }>("/admin/exercises", {
        token,
        forceRefresh,
        skipCache: forceRefresh,
      });
      setExerciseLibrary(Array.isArray(res?.exercises) ? res.exercises : []);
    } catch {
      // non-blocking
    }
  }, [token, canLoad]);

  const createExerciseAndAdd = useCallback(async (sessionId: number, order: number, data: {
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
  }) => {
    if (!token) return;
    setIsBusy(true);
    try {
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
    } finally {
      setIsBusy(false);
    }
  }, [token, loadSessionExercises]);

  const addExerciseToSession = useCallback(async (sessionId: number, exerciseId: number, order: number) => {
    if (!token) return;
    setIsBusy(true);
    try {
      await apiRequest("/admin/session-exercises", {
        method: "POST",
        token,
        body: { sessionId, exerciseId, order },
        skipCache: true,
      });
      await loadSessionExercises(sessionId, true);
    } finally {
      setIsBusy(false);
    }
  }, [token, loadSessionExercises]);

  const removeExerciseFromSession = useCallback(async (sessionExerciseId: number, sessionId: number) => {
    if (!token) return;
    setIsBusy(true);
    try {
      await apiRequest(`/admin/session-exercises/${sessionExerciseId}`, {
        method: "DELETE",
        token,
        skipCache: true,
      });
      await loadSessionExercises(sessionId, true);
    } finally {
      setIsBusy(false);
    }
  }, [token, loadSessionExercises]);

  const loadAdultAthletes = useCallback(async (forceRefresh = false) => {
    if (!token || !canLoad) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ athletes?: AdultAthleteItem[] }>("/admin/adult-athletes", {
        token,
        forceRefresh,
        skipCache: forceRefresh,
      });
      setAdultAthletes(Array.isArray(res?.athletes) ? res.athletes : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load athletes");
    } finally {
      setLoading(false);
    }
  }, [token, canLoad]);

  const assignProgram = useCallback(async (programId: number, athleteId: number) => {
    if (!token) return;
    setIsBusy(true);
    try {
      await apiRequest(`/admin/programs/${programId}/assignments`, {
        method: "POST",
        token,
        body: { athleteId },
        skipCache: true,
      });
      await loadAdultAthletes(true);
    } finally {
      setIsBusy(false);
    }
  }, [token, loadAdultAthletes]);

  const unassignProgram = useCallback(async (assignmentId: number) => {
    if (!token) return;
    setIsBusy(true);
    try {
      await apiRequest(`/admin/program-assignments/${assignmentId}`, {
        method: "DELETE",
        token,
        skipCache: true,
      });
      await loadAdultAthletes(true);
    } finally {
      setIsBusy(false);
    }
  }, [token, loadAdultAthletes]);

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
    createProgram,
    updateProgram,
    deleteProgram,
    loadModules,
    createModule,
    updateModule,
    deleteModule,
    loadSessions,
    createSession,
    updateSession,
    deleteSession,
    loadSessionExercises,
    loadExerciseLibrary,
    createExerciseAndAdd,
    addExerciseToSession,
    removeExerciseFromSession,
    loadAdultAthletes,
    assignProgram,
    unassignProgram,
  };
}
