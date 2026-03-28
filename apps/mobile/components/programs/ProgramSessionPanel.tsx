import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, TouchableOpacity, View } from "react-native";

import { ExerciseCard } from "./ExerciseCard";
import type { ProgramId } from "@/constants/program-details";
import { SessionItem } from "@/constants/program-details";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

const progressKey = (programId: ProgramId) => `@ph/session-progress/${programId}`;

export function ProgramSessionPanel({
  programId,
  sessions,
  onNavigate,
}: {
  programId: ProgramId;
  sessions: SessionItem[];
  onNavigate?: (path: string) => void;
}) {
  const { colors, isDark } = useAppTheme();
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

  const openFirstIncompleteExercise = useCallback(() => {
    if (!onNavigate) return;
    const exercises = activeSession?.exercises ?? [];
    const target =
      exercises.find((exercise) => exercise.completed !== true && exercise.detailPath) ??
      exercises.find((exercise) => Boolean(exercise.detailPath));
    if (target?.detailPath) {
      onNavigate(target.detailPath);
    }
  }, [activeSession?.exercises, onNavigate]);

  return (
    <View className="gap-6">
      {activeSession?.exercises?.length ? (
        <Pressable
          onPress={openFirstIncompleteExercise}
          className="rounded-full py-4 flex-row items-center justify-center gap-2 active:opacity-90 shadow-sm"
          style={{ backgroundColor: colors.accent }}
        >
          <Feather name="play-circle" size={20} color="#FFFFFF" />
          <Text className="font-outfit font-bold text-[15px]" style={{ color: "#FFFFFF" }}>Start session</Text>
        </Pressable>
      ) : null}

      <View className="gap-3">
        <Text className="text-[17px] font-clash font-bold" style={{ color: colors.text }}>Week</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {weekOptions.map((week, index) => {
            const isActive = week === activeWeek;
            return (
              <TouchableOpacity
                key={`week-${week}-${index}`}
                onPress={() => {
                  setActiveWeek(week);
                  setActiveSessionIndex(0);
                }}
                className={`px-4 py-2 rounded-full border`}
                style={{
                  backgroundColor: isActive ? colors.text : "transparent",
                  borderColor: isActive ? colors.text : (isDark ? "rgba(255,255,255,0.15)" : "rgba(15,23,42,0.1)"),
                }}
              >
                <Text className={`text-[13px] font-outfit font-semibold`} style={{ color: isActive ? colors.background : colors.textSecondary }}>Week {week}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View className="gap-3">
        <Text className="text-[17px] font-clash font-bold" style={{ color: colors.text }}>Session</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {sessionsForWeek.map((session, index) => {
            const isActive = index === activeSessionIndex;
            return (
              <TouchableOpacity
                key={`session-${String(session.id ?? session.name ?? "session")}-${index}`}
                onPress={() => setActiveSessionIndex(index)}
                className={`px-4 py-2 rounded-full border`}
                style={{
                  backgroundColor: isActive ? colors.text : "transparent",
                  borderColor: isActive ? colors.text : (isDark ? "rgba(255,255,255,0.15)" : "rgba(15,23,42,0.1)"),
                }}
              >
                <Text className={`text-[13px] font-outfit font-semibold`} style={{ color: isActive ? colors.background : colors.textSecondary }}>
                  {String(session.name ?? `Session ${index + 1}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View className="gap-3">
        <Text className="text-[17px] font-clash font-bold" style={{ color: colors.text }}>Exercises</Text>
        {!activeSession?.exercises?.length ? (
          <Text className="text-[14px] font-outfit text-secondary">No exercises assigned for this session.</Text>
        ) : null}
        {activeSession?.exercises?.map((exercise, index) => (
          <ExerciseCard
            key={`exercise-${String(exercise.id ?? exercise.name ?? "item")}-${index}`}
            exercise={exercise}
            onPress={
              exercise.detailPath && onNavigate
                ? () => onNavigate(exercise.detailPath!)
                : undefined
            }
          />
        ))}
      </View>
    </View>
  );
}
