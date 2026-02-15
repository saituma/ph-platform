import React, { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ExerciseCard } from "./ExerciseCard";
import { SessionItem } from "@/constants/program-details";

export function ProgramSessionPanel({
  sessions,
  onVideoPress,
}: {
  sessions: SessionItem[];
  onVideoPress?: (url: string) => void;
}) {
  const weekOptions = useMemo(() => {
    const unique = Array.from(
      new Set(
        sessions
          .map((session) => session.weekNumber)
          .filter((week): week is number => typeof week === "number")
      )
    );
    return unique.length > 0 ? unique.sort((a, b) => a - b) : [1];
  }, [sessions]);
  const [activeWeek, setActiveWeek] = useState<number>(weekOptions[0] ?? 1);
  const [activeSessionIndex, setActiveSessionIndex] = useState(0);

  React.useEffect(() => {
    if (!weekOptions.includes(activeWeek)) {
      setActiveWeek(weekOptions[0] ?? 1);
      setActiveSessionIndex(0);
    }
  }, [activeWeek, weekOptions]);

  const sessionsForWeek = useMemo(() => {
    if (!sessions.some((session) => typeof session.weekNumber === "number")) {
      return sessions;
    }
    return sessions.filter((session) => (session.weekNumber ?? 1) === activeWeek);
  }, [activeWeek, sessions]);

  const activeSession = useMemo(
    () => sessionsForWeek[activeSessionIndex] ?? sessionsForWeek[0],
    [sessionsForWeek, activeSessionIndex]
  );

  return (
    <View className="gap-5">
      <View className="gap-3">
        <Text className="text-sm font-clash text-app">Week Selector</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {weekOptions.map((week) => {
            const isActive = week === activeWeek;
            return (
              <TouchableOpacity
                key={week}
                onPress={() => {
                  setActiveWeek(week);
                  setActiveSessionIndex(0);
                }}
                className={`px-4 py-2 rounded-full border ${isActive ? "bg-accent border-accent" : "bg-input border-app"}`}
              >
                <Text className={`${isActive ? "text-white" : "text-app"} text-xs font-outfit`}>Week {week}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View className="gap-3">
        <Text className="text-sm font-clash text-app">Session Selector</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {sessionsForWeek.map((session, index) => {
            const isActive = index === activeSessionIndex;
            return (
              <TouchableOpacity
                key={session.id}
                onPress={() => setActiveSessionIndex(index)}
                className={`px-4 py-2 rounded-full border ${isActive ? "bg-accent border-accent" : "bg-input border-app"}`}
              >
                <Text className={`${isActive ? "text-white" : "text-app"} text-xs font-outfit`}>{session.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View className="gap-4">
        <Text className="text-sm font-clash text-app">Exercises</Text>
        {activeSession?.exercises?.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} onVideoPress={onVideoPress} />
        ))}
      </View>
    </View>
  );
}
