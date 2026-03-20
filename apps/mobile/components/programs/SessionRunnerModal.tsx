import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import type { ExerciseItem } from "@/constants/program-details";

function parseRestSeconds(ex: ExerciseItem): number | null {
  if (ex.restSeconds != null && Number.isFinite(ex.restSeconds)) {
    return Math.max(0, Math.round(ex.restSeconds));
  }
  const raw = ex.rest?.trim();
  if (!raw) return null;
  const m = raw.match(/(\d+)/);
  if (!m) return null;
  return Math.max(0, parseInt(m[1]!, 10));
}

export function SessionRunnerModal({
  visible,
  onClose,
  sessionLabel,
  exercises,
  onVideoPress,
}: {
  visible: boolean;
  onClose: () => void;
  sessionLabel: string;
  exercises: ExerciseItem[];
  onVideoPress?: (url: string) => void;
}) {
  const { colors, isDark } = useAppTheme();
  const [index, setIndex] = useState(0);
  const [restLeft, setRestLeft] = useState<number | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const safeExercises = useMemo(
    () => (Array.isArray(exercises) ? exercises.filter(Boolean) : []),
    [exercises],
  );
  const total = safeExercises.length;
  const current = safeExercises[index] ?? null;

  useEffect(() => {
    if (!visible) {
      setIndex(0);
      setRestLeft(null);
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
        restTimerRef.current = null;
      }
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, []);

  const stopRest = useCallback(() => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
    setRestLeft(null);
  }, []);

  const startRest = useCallback(() => {
    if (!current) return;
    const sec = parseRestSeconds(current);
    if (sec == null || sec <= 0) return;
    stopRest();
    setRestLeft(sec);
    restTimerRef.current = setInterval(() => {
      setRestLeft((prev) => {
        if (prev == null) return null;
        if (prev <= 1) {
          if (restTimerRef.current) {
            clearInterval(restTimerRef.current);
            restTimerRef.current = null;
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [current, stopRest]);

  const goNext = useCallback(() => {
    stopRest();
    setIndex((i) => Math.min(i + 1, Math.max(0, total - 1)));
  }, [stopRest, total]);

  const goPrev = useCallback(() => {
    stopRest();
    setIndex((i) => Math.max(0, i - 1));
  }, [stopRest]);

  const surface = isDark ? colors.cardElevated : "#F7FFF9";
  const muted = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  if (!visible || total === 0) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 pt-12" style={{ backgroundColor: surface }}>
        <View className="px-5 pb-3 flex-row items-center justify-between border-b border-app/10">
          <Pressable
            onPress={onClose}
            className="h-10 w-10 rounded-2xl items-center justify-center"
            style={{ backgroundColor: muted }}
            hitSlop={12}
          >
            <Feather name="x" size={22} color={colors.accent} />
          </Pressable>
          <Text className="text-sm font-outfit text-secondary flex-1 text-center px-2" numberOfLines={1}>
            {sessionLabel}
          </Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {current ? (
            <View className="gap-4">
              <Text className="text-xs font-outfit text-secondary uppercase tracking-wider">
                {index + 1} / {total}
              </Text>
              <Text className="text-2xl font-clash text-app font-bold">{current.name}</Text>

              <View className="flex-row flex-wrap gap-2">
                {current.sets != null ? (
                  <View className="rounded-full bg-accent/15 px-3 py-1">
                    <Text className="text-xs font-outfit text-accent">{current.sets} sets</Text>
                  </View>
                ) : null}
                {current.reps != null ? (
                  <View className="rounded-full bg-accent/15 px-3 py-1">
                    <Text className="text-xs font-outfit text-accent">{current.reps} reps</Text>
                  </View>
                ) : null}
                {current.time ? (
                  <View className="rounded-full bg-accent/15 px-3 py-1">
                    <Text className="text-xs font-outfit text-accent">{current.time}</Text>
                  </View>
                ) : null}
                {current.rest ? (
                  <View className="rounded-full bg-accent/15 px-3 py-1">
                    <Text className="text-xs font-outfit text-accent">Rest {current.rest}</Text>
                  </View>
                ) : null}
              </View>

              {current.notes ? (
                <Text className="text-base font-outfit text-app leading-6">{current.notes}</Text>
              ) : null}

              {(current.progressions || current.regressions) ? (
                <View className="rounded-2xl border border-app/10 p-4 gap-2 bg-app/5">
                  {current.progressions ? (
                    <Text className="text-sm font-outfit text-secondary">↑ {current.progressions}</Text>
                  ) : null}
                  {current.regressions ? (
                    <Text className="text-sm font-outfit text-secondary">↓ {current.regressions}</Text>
                  ) : null}
                </View>
              ) : null}

              {restLeft != null ? (
                <View className="rounded-2xl py-6 items-center bg-accent/12 border border-accent/25">
                  <Text className="text-xs font-outfit text-secondary mb-1">Rest</Text>
                  <Text className="text-4xl font-clash text-accent font-bold">{restLeft}</Text>
                  <Text className="text-xs font-outfit text-secondary mt-1">seconds</Text>
                  <Pressable onPress={stopRest} className="mt-4 px-4 py-2 rounded-full bg-app/10">
                    <Text className="text-sm font-outfit text-app">Skip</Text>
                  </Pressable>
                </View>
              ) : parseRestSeconds(current) ? (
                <Pressable
                  onPress={startRest}
                  className="rounded-2xl py-4 flex-row items-center justify-center gap-2 bg-accent"
                >
                  <Feather name="clock" size={18} color="#fff" />
                  <Text className="text-white font-outfit font-semibold">Start rest timer</Text>
                </Pressable>
              ) : null}

              {current.videoUrl ? (
                <Pressable
                  onPress={() => onVideoPress?.(current.videoUrl!)}
                  className="rounded-2xl py-4 flex-row items-center justify-center gap-2 border border-accent"
                >
                  <Feather name="play" size={18} color={colors.accent} />
                  <Text className="font-outfit font-semibold" style={{ color: colors.accent }}>
                    Watch demo
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        <View
          className="flex-row items-center gap-3 px-5 py-4 border-t border-app/10"
          style={{ backgroundColor: surface }}
        >
          <Pressable
            onPress={goPrev}
            disabled={index <= 0}
            className="flex-1 py-4 rounded-2xl items-center border border-app/15"
            style={{
              backgroundColor: muted,
              opacity: index <= 0 ? 0.35 : 1,
            }}
          >
            <Text className="font-outfit font-semibold text-app">Back</Text>
          </Pressable>
          {index >= total - 1 ? (
            <Pressable
              onPress={() => {
                stopRest();
                onClose();
              }}
              className="flex-1 py-4 rounded-2xl items-center"
              style={{ backgroundColor: colors.accent }}
            >
              <Text className="font-outfit font-semibold text-white">Done</Text>
            </Pressable>
          ) : (
            <Pressable onPress={goNext} className="flex-1 py-4 rounded-2xl items-center" style={{ backgroundColor: colors.accent }}>
              <Text className="font-outfit font-semibold text-white">Next</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}
