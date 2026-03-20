import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, TouchableOpacity, View } from "react-native";

import { ExerciseCard } from "./ExerciseCard";
import { SessionRunnerModal } from "./SessionRunnerModal";
import type { ProgramId } from "@/constants/program-details";
import { SessionItem } from "@/constants/program-details";
import { Text } from "@/components/ScaledText";
import { apiRequest } from "@/lib/api";
import { formatAchievementNames } from "@/lib/trainingAchievements";

const progressKey = (programId: ProgramId) => `@ph/session-progress/${programId}`;

export function ProgramSessionPanel({
  programId,
  sessions,
  onVideoPress,
  authToken,
  onTrainingLogged,
}: {
  programId: ProgramId;
  sessions: SessionItem[];
  onVideoPress?: (url: string) => void;
  authToken: string | null;
  /** Refresh achievements / progress on parent after a session is logged. */
  onTrainingLogged?: () => void;
}) {
  const safeSessions = useMemo(() => (Array.isArray(sessions) ? sessions : []), [sessions]);

  const weekOptions = useMemo(() => {
    const unique = Array.from(
      new Set(
        safeSessions
          .map((session) => session.weekNumber)
          .filter((week): week is number => typeof week === "number")
      )
    );
    return unique.length > 0 ? unique.sort((a, b) => a - b) : [1];
  }, [safeSessions]);
  const [activeWeek, setActiveWeek] = useState<number>(weekOptions[0] ?? 1);
  const [activeSessionIndex, setActiveSessionIndex] = useState(0);
  const [runnerOpen, setRunnerOpen] = useState(false);
  const [progressHydrated, setProgressHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setProgressHydrated(false);
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(progressKey(programId));
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as { week?: number; sessionIndex?: number };
          const w = typeof parsed.week === "number" ? parsed.week : null;
          const si = typeof parsed.sessionIndex === "number" ? parsed.sessionIndex : 0;
          if (w != null && weekOptions.includes(w)) {
            setActiveWeek(w);
            const forWeek = safeSessions.filter((s) => (s.weekNumber ?? 1) === w);
            if (forWeek.length && si >= 0 && si < forWeek.length) {
              setActiveSessionIndex(si);
            }
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setProgressHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [programId, safeSessions, weekOptions]);

  useEffect(() => {
    if (!progressHydrated) return;
    void AsyncStorage.setItem(
      progressKey(programId),
      JSON.stringify({ week: activeWeek, sessionIndex: activeSessionIndex }),
    );
  }, [activeWeek, activeSessionIndex, programId, progressHydrated]);

  React.useEffect(() => {
    if (!weekOptions.includes(activeWeek)) {
      setActiveWeek(weekOptions[0] ?? 1);
      setActiveSessionIndex(0);
    }
  }, [activeWeek, weekOptions]);

  const sessionsForWeek = useMemo(() => {
    if (!safeSessions.some((session) => typeof session.weekNumber === "number")) {
      return safeSessions;
    }
    return safeSessions.filter((session) => (session.weekNumber ?? 1) === activeWeek);
  }, [activeWeek, safeSessions]);

  const activeSession = useMemo(
    () => sessionsForWeek[activeSessionIndex] ?? sessionsForWeek[0],
    [sessionsForWeek, activeSessionIndex]
  );

  const sessionRunnerLabel = useMemo(() => {
    const w = activeSession?.weekNumber ?? activeWeek;
    const name = activeSession?.name ?? `Session ${activeSessionIndex + 1}`;
    return `Week ${w} · ${name}`;
  }, [activeSession, activeWeek, activeSessionIndex]);

  const openRunner = useCallback(() => {
    if ((activeSession?.exercises?.length ?? 0) > 0) setRunnerOpen(true);
  }, [activeSession?.exercises?.length]);

  const handleSessionComplete = useCallback(
    async (exerciseIds: string[]) => {
      if (!authToken) return;
      const contentIds = exerciseIds
        .map((id) => parseInt(id, 10))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (!contentIds.length) return;
      try {
        const res = await apiRequest<{
          completionsLogged: number;
          newAchievements: string[];
        }>("/program-section-content/complete-session", {
          method: "POST",
          token: authToken,
          body: {
            contentIds,
            weekNumber: activeSession?.weekNumber ?? activeWeek,
            sessionLabel: sessionRunnerLabel,
            programKey: programId,
          },
        });
        onTrainingLogged?.();
        if (Array.isArray(res.newAchievements) && res.newAchievements.length > 0) {
          Alert.alert("Achievement unlocked", formatAchievementNames(res.newAchievements));
        }
      } catch (err) {
        Alert.alert(
          "Could not save session",
          err instanceof Error ? err.message : "Check your connection and try again.",
        );
      }
    },
    [
      authToken,
      activeSession?.weekNumber,
      activeWeek,
      sessionRunnerLabel,
      programId,
      onTrainingLogged,
    ],
  );

  return (
    <View className="gap-5">
      {activeSession?.exercises?.length ? (
        <Pressable
          onPress={openRunner}
          className="rounded-2xl bg-accent py-4 px-4 flex-row items-center justify-center gap-2 active:opacity-90"
        >
          <Feather name="play-circle" size={22} color="#fff" />
          <Text className="text-white font-outfit font-bold text-base">Start session</Text>
        </Pressable>
      ) : null}

      <SessionRunnerModal
        visible={runnerOpen}
        onClose={() => setRunnerOpen(false)}
        sessionLabel={sessionRunnerLabel}
        exercises={activeSession?.exercises ?? []}
        onVideoPress={onVideoPress}
        onSessionComplete={(ids) => {
          void handleSessionComplete(ids);
        }}
      />

      <View className="gap-3">
        <Text className="text-lg font-clash text-app">Week</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {weekOptions.map((week, index) => {
            const isActive = week === activeWeek;
            return (
              <TouchableOpacity
                key={`week-${week}-${index}`}
                onPress={() => {
                  setActiveWeek(week);
                  setActiveSessionIndex(0);
                }}
                className={`px-4 py-2 rounded-full border ${isActive ? "bg-accent border-accent" : "bg-input border-app"}`}
              >
              <Text className={`${isActive ? "text-white" : "text-app"} text-sm font-outfit`}>Week {week}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View className="gap-3">
        <Text className="text-lg font-clash text-app">Session</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {sessionsForWeek.map((session, index) => {
            const isActive = index === activeSessionIndex;
            return (
              <TouchableOpacity
                key={`session-${String(session.id ?? session.name ?? "session")}-${index}`}
                onPress={() => setActiveSessionIndex(index)}
                className={`px-4 py-2 rounded-full border ${isActive ? "bg-accent border-accent" : "bg-input border-app"}`}
              >
                <Text className={`${isActive ? "text-white" : "text-app"} text-sm font-outfit`}>
                  {String(session.name ?? `Session ${index + 1}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View className="gap-4">
        <Text className="text-lg font-clash text-app">Exercises</Text>
        {!activeSession?.exercises?.length ? (
          <Text className="text-sm font-outfit text-secondary">No exercises for this session.</Text>
        ) : null}
        {activeSession?.exercises?.map((exercise, index) => (
          <ExerciseCard
            key={`exercise-${String(exercise.id ?? exercise.name ?? "item")}-${index}`}
            exercise={exercise}
            onVideoPress={onVideoPress}
          />
        ))}
      </View>
    </View>
  );
}