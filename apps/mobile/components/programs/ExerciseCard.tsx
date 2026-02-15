import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ExerciseItem } from "@/constants/program-details";

export function ExerciseCard({
  exercise,
  onVideoPress,
}: {
  exercise: ExerciseItem;
  onVideoPress?: (url: string) => void;
}) {
  return (
    <View className="rounded-3xl border border-app/10 bg-input px-5 py-4">
      <Text className="text-base font-clash text-app mb-2">{exercise.name}</Text>
      <View className="flex-row flex-wrap gap-3">
        {exercise.sets ? (
          <Text className="text-xs font-outfit text-secondary">Sets: {exercise.sets}</Text>
        ) : null}
        {exercise.reps ? (
          <Text className="text-xs font-outfit text-secondary">Reps: {exercise.reps}</Text>
        ) : null}
        {exercise.time ? (
          <Text className="text-xs font-outfit text-secondary">Time: {exercise.time}</Text>
        ) : null}
        {exercise.rest ? (
          <Text className="text-xs font-outfit text-secondary">Rest: {exercise.rest}</Text>
        ) : null}
      </View>
      {exercise.notes ? (
        <Text className="text-sm font-outfit text-secondary mt-3">{exercise.notes}</Text>
      ) : null}
      {exercise.videoUrl ? (
        <TouchableOpacity
          onPress={() => onVideoPress?.(exercise.videoUrl!)}
          className="mt-4 inline-flex flex-row items-center gap-2"
        >
          <View className="h-8 w-8 rounded-full bg-accent items-center justify-center">
            <Feather name="play" size={14} color="white" />
          </View>
          <Text className="text-sm font-outfit text-accent">Watch Instruction</Text>
        </TouchableOpacity>
      ) : null}
      {(exercise.progressions || exercise.regressions) ? (
        <View className="mt-4 rounded-2xl bg-white/5 border border-app/10 px-4 py-3">
          {exercise.progressions ? (
            <Text className="text-xs font-outfit text-secondary">Progression: {exercise.progressions}</Text>
          ) : null}
          {exercise.regressions ? (
            <Text className="text-xs font-outfit text-secondary mt-2">Regression: {exercise.regressions}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
