import React, { useMemo, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";

import { ExerciseCard } from "./ExerciseCard";
import { SessionItem } from "@/constants/program-details";
import { Text } from "@/components/ScaledText";

export function ProgramSessionPanel({
  sessions,
  onVideoPress,
}: {
  sessions: SessionItem[];
  onVideoPress?: (url: string) => void;
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

  return (
    <View className="gap-5">
      <View className="gap-3">
        <Text className="text-2xl font-clash text-app">Week Selector</Text>
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
              <Text className={`${isActive ? "text-white" : "text-app"} text-2xl font-outfit`}>Week {week}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View className="gap-3">
        <Text className="text-2xl font-clash text-app">Session Selector</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {sessionsForWeek.map((session, index) => {
            const isActive = index === activeSessionIndex;
            return (
              <TouchableOpacity
                key={`session-${String(session.id ?? session.name ?? "session")}-${index}`}
                onPress={() => setActiveSessionIndex(index)}
                className={`px-4 py-2 rounded-full border ${isActive ? "bg-accent border-accent" : "bg-input border-app"}`}
              >
                <Text className={`${isActive ? "text-white" : "text-app"} text-2xl font-outfit`}>
                  {String(session.name ?? `Session ${index + 1}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View className="gap-4">
        <Text className="text-2xl font-clash text-app">Exercises</Text>
        {!activeSession?.exercises?.length ? (
          <Text className="text-2xl font-outfit text-secondary">No exercises configured.</Text>
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