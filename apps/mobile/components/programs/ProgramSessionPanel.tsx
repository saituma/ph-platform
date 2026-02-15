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
  const [activeWeek, setActiveWeek] = useState(1);
  const [activeSessionIndex, setActiveSessionIndex] = useState(0);
  const weekOptions = [1, 2, 3, 4];

  const activeSession = useMemo(() => sessions[activeSessionIndex] ?? sessions[0], [sessions, activeSessionIndex]);

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
                onPress={() => setActiveWeek(week)}
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
          {sessions.map((session, index) => {
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
