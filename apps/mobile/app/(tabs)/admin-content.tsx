import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text, TextInput } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Modal, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ProgramTemplate = {
  id: number;
  name?: string | null;
  type?: string | null;
  description?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ExerciseItem = {
  id: number;
  name?: string | null;
  cues?: string | null;
  howTo?: string | null;
  progression?: string | null;
  regression?: string | null;
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSeconds?: number | null;
  notes?: string | null;
  videoUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function defaultProgramPatchJson(p: ProgramTemplate) {
  return JSON.stringify(
    {
      name: p.name ?? undefined,
      type: p.type ?? undefined,
      description: p.description ?? undefined,
      minAge: p.minAge ?? undefined,
      maxAge: p.maxAge ?? undefined,
    },
    null,
    2,
  );
}

function defaultExercisePatchJson(e: ExerciseItem) {
  return JSON.stringify(
    {
      name: e.name ?? undefined,
      category: undefined,
      cues: e.cues ?? undefined,
      howTo: e.howTo ?? undefined,
      progression: e.progression ?? undefined,
      regression: e.regression ?? undefined,
      sets: e.sets ?? undefined,
      reps: e.reps ?? undefined,
      duration: e.duration ?? undefined,
      restSeconds: e.restSeconds ?? undefined,
      notes: e.notes ?? undefined,
      videoUrl: e.videoUrl ?? undefined,
    },
    null,
    2,
  );
}

function SmallAction({
  label,
  tone,
  onPress,
  disabled,
}: {
  label: string;
  tone: "neutral" | "success" | "danger";
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors, isDark } = useAppTheme();
  const tint =
    tone === "success"
      ? colors.accent
      : tone === "danger"
        ? colors.danger
        : colors.text;
  const bg =
    tone === "success"
      ? isDark
        ? `${colors.accent}18`
        : `${colors.accent}12`
      : tone === "danger"
        ? isDark
          ? `${colors.danger}18`
          : `${colors.danger}10`
        : isDark
          ? "rgba(255,255,255,0.04)"
          : "rgba(15,23,42,0.04)";
  const border =
    tone === "success"
      ? isDark
        ? `${colors.accent}30`
        : `${colors.accent}24`
      : tone === "danger"
        ? isDark
          ? `${colors.danger}30`
          : `${colors.danger}24`
        : isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(15,23,42,0.06)";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 16,
          borderWidth: 1,
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        className="text-[12px] font-outfit-semibold"
        style={{ color: tint }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function AdminContentScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);

  const [programs, setPrograms] = useState<ProgramTemplate[]>([]);
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [programDetailOpenId, setProgramDetailOpenId] = useState<number | null>(
    null,
  );
  const [exerciseDetailOpenId, setExerciseDetailOpenId] = useState<
    number | null
  >(null);

  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [patchJson, setPatchJson] = useState("");

  const load = useCallback(
    async (forceRefresh: boolean) => {
      if (!token || !bootstrapReady) return;
      setLoading(true);
      setError(null);
      try {
        const [programRes, exerciseRes] = await Promise.all([
          apiRequest<{ programs?: ProgramTemplate[] }>(
            "/admin/programs?limit=50",
            {
              token,
              suppressStatusCodes: [403],
              skipCache: forceRefresh,
              forceRefresh,
            },
          ),
          apiRequest<{ exercises?: ExerciseItem[] }>("/admin/exercises", {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          }),
        ]);

        setPrograms(
          Array.isArray(programRes?.programs) ? programRes.programs : [],
        );
        setExercises(
          Array.isArray(exerciseRes?.exercises) ? exerciseRes.exercises : [],
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load content");
        setPrograms([]);
        setExercises([]);
      } finally {
        setLoading(false);
      }
    },
    [bootstrapReady, token],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const selectedProgram = useMemo(() => {
    if (programDetailOpenId == null) return null;
    return programs.find((p) => p.id === programDetailOpenId) ?? null;
  }, [programDetailOpenId, programs]);

  const selectedExercise = useMemo(() => {
    if (exerciseDetailOpenId == null) return null;
    return exercises.find((e) => e.id === exerciseDetailOpenId) ?? null;
  }, [exerciseDetailOpenId, exercises]);

  useEffect(() => {
    setDetailError(null);
    setDetailBusy(false);
    if (selectedProgram) {
      setPatchJson(defaultProgramPatchJson(selectedProgram));
    } else if (selectedExercise) {
      setPatchJson(defaultExercisePatchJson(selectedExercise));
    } else {
      setPatchJson("");
    }
  }, [selectedExercise?.id, selectedProgram?.id]);

  const savePatch = useCallback(async () => {
    if (!token || !bootstrapReady) return;
    if (!selectedProgram && !selectedExercise) return;
    let parsed: any;
    try {
      parsed = JSON.parse(patchJson);
    } catch {
      setDetailError("Invalid JSON.");
      return;
    }
    setDetailBusy(true);
    setDetailError(null);
    try {
      if (selectedProgram) {
        const res = await apiRequest<{ program?: ProgramTemplate }>(
          `/admin/programs/${selectedProgram.id}`,
          {
            method: "PATCH",
            token,
            body: parsed,
            skipCache: true,
          },
        );
        if (res?.program) {
          setPrograms((prev) =>
            prev.map((p) => (p.id === selectedProgram.id ? res.program! : p)),
          );
        }
      } else if (selectedExercise) {
        const res = await apiRequest<{ exercise?: ExerciseItem }>(
          `/admin/exercises/${selectedExercise.id}`,
          {
            method: "PATCH",
            token,
            body: parsed,
            skipCache: true,
          },
        );
        if (res?.exercise) {
          setExercises((prev) =>
            prev.map((e) => (e.id === selectedExercise.id ? res.exercise! : e)),
          );
        }
      }
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setDetailBusy(false);
    }
  }, [bootstrapReady, patchJson, selectedExercise, selectedProgram, token]);

  const deleteExercise = useCallback(async () => {
    if (!token || !bootstrapReady) return;
    if (!selectedExercise) return;
    Alert.alert("Delete exercise", selectedExercise.name ?? "This item", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDetailBusy(true);
          setDetailError(null);
          try {
            await apiRequest(`/admin/exercises/${selectedExercise.id}`, {
              method: "DELETE",
              token,
              skipCache: true,
            });
            setExercises((prev) =>
              prev.filter((e) => e.id !== selectedExercise.id),
            );
            setExerciseDetailOpenId(null);
          } catch (e) {
            setDetailError(e instanceof Error ? e.message : "Failed to delete");
          } finally {
            setDetailBusy(false);
          }
        },
      },
    ]);
  }, [bootstrapReady, selectedExercise, token]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedScrollView onRefresh={() => load(true)}>
        <View className="pt-6 mb-4">
          <View className="flex-row items-center gap-3 overflow-hidden">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <View className="flex-1">
              <Text
                className="text-4xl font-telma-bold text-app tracking-tight"
                numberOfLines={1}
              >
                Content
              </Text>
              <Text
                className="text-[12px] font-outfit text-secondary"
                numberOfLines={1}
              >
                Programs & Exercises
              </Text>
            </View>
          </View>
        </View>

        <View
          className="rounded-[28px] border p-5"
          style={{
            backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
            borderColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(15,23,42,0.06)",
            ...(isDark ? Shadows.none : Shadows.md),
          }}
        >
          {loading ? (
            <View className="gap-2">
              <Skeleton width="92%" height={14} />
              <Skeleton width="80%" height={14} />
              <Skeleton width="86%" height={14} />
            </View>
          ) : error ? (
            <Text selectable className="text-sm font-outfit text-red-400">
              {error}
            </Text>
          ) : (
            <View className="gap-5">
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-clash font-bold text-app">
                    Programs
                  </Text>
                  <Text className="text-[12px] font-outfit text-secondary">
                    {programs.length}
                  </Text>
                </View>
                {programs.length === 0 ? (
                  <Text className="text-sm font-outfit text-secondary">
                    No programs.
                  </Text>
                ) : (
                  <View className="gap-3">
                    {programs.map((p) => (
                      <Pressable
                        key={String(p.id)}
                        accessibilityRole="button"
                        onPress={() => setProgramDetailOpenId(p.id)}
                        className="rounded-2xl border px-4 py-3"
                        style={{
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.03)"
                            : "rgba(15,23,42,0.03)",
                          borderColor: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(15,23,42,0.06)",
                        }}
                      >
                        <Text
                          className="text-[13px] font-clash font-bold text-app"
                          numberOfLines={1}
                        >
                          {p.name ?? `Program ${p.id}`}
                        </Text>
                        <Text
                          className="text-[12px] font-outfit text-secondary"
                          numberOfLines={2}
                        >
                          {p.type ?? "—"}
                          {p.description ? ` • ${p.description}` : ""}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-clash font-bold text-app">
                    Exercises
                  </Text>
                  <Text className="text-[12px] font-outfit text-secondary">
                    {exercises.length}
                  </Text>
                </View>
                {exercises.length === 0 ? (
                  <Text className="text-sm font-outfit text-secondary">
                    No exercises.
                  </Text>
                ) : (
                  <View className="gap-3">
                    {exercises.slice(0, 50).map((e) => (
                      <Pressable
                        key={String(e.id)}
                        accessibilityRole="button"
                        onPress={() => setExerciseDetailOpenId(e.id)}
                        className="rounded-2xl border px-4 py-3"
                        style={{
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.03)"
                            : "rgba(15,23,42,0.03)",
                          borderColor: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(15,23,42,0.06)",
                        }}
                      >
                        <Text
                          className="text-[13px] font-clash font-bold text-app"
                          numberOfLines={1}
                        >
                          {e.name ?? `Exercise ${e.id}`}
                        </Text>
                        {e.notes ? (
                          <Text
                            className="text-[12px] font-outfit text-secondary"
                            numberOfLines={2}
                          >
                            {e.notes}
                          </Text>
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                )}
                {exercises.length > 50 ? (
                  <Text className="text-[11px] font-outfit text-secondary">
                    Showing first 50 items.
                  </Text>
                ) : null}
              </View>
            </View>
          )}
        </View>

        <Modal
          visible={programDetailOpenId != null || exerciseDetailOpenId != null}
          animationType="slide"
          presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
          onRequestClose={() => {
            setProgramDetailOpenId(null);
            setExerciseDetailOpenId(null);
          }}
        >
          <View
            style={{
              flex: 1,
              paddingTop: insets.top,
              backgroundColor: isDark ? colors.background : "#FFFFFF",
            }}
          >
            <ThemedScrollView
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 24 + insets.bottom,
              }}
            >
              <View className="pt-4 mb-4 flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text
                    className="text-2xl font-clash font-bold text-app"
                    numberOfLines={1}
                  >
                    {selectedProgram
                      ? (selectedProgram.name ??
                        `Program ${selectedProgram.id}`)
                      : selectedExercise
                        ? (selectedExercise.name ??
                          `Exercise ${selectedExercise.id}`)
                        : "Detail"}
                  </Text>
                  <Text
                    className="text-[12px] font-outfit text-secondary"
                    numberOfLines={1}
                    selectable
                  >
                    {selectedProgram
                      ? `Program #${selectedProgram.id}`
                      : selectedExercise
                        ? `Exercise #${selectedExercise.id}`
                        : ""}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setProgramDetailOpenId(null);
                    setExerciseDetailOpenId(null);
                  }}
                  style={({ pressed }) => [
                    {
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 999,
                      borderWidth: 1,
                      opacity: pressed ? 0.85 : 1,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(15,23,42,0.04)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(15,23,42,0.08)",
                    },
                  ]}
                >
                  <Text className="text-[12px] font-outfit-semibold text-app">
                    Close
                  </Text>
                </Pressable>
              </View>

              {detailError ? (
                <View className="mb-3">
                  <Text selectable className="text-sm font-outfit text-red-400">
                    {detailError}
                  </Text>
                </View>
              ) : null}

              <View
                className="rounded-[28px] border p-5 mb-4"
                style={{
                  backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(15,23,42,0.06)",
                  ...(isDark ? Shadows.none : Shadows.md),
                }}
              >
                <Text className="text-base font-clash font-bold text-app mb-3">
                  Raw
                </Text>
                <Text
                  selectable
                  className="text-[12px] font-outfit text-secondary"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {safeJson(selectedProgram ?? selectedExercise)}
                </Text>
              </View>

              <View
                className="rounded-[28px] border p-5"
                style={{
                  backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(15,23,42,0.06)",
                  ...(isDark ? Shadows.none : Shadows.md),
                }}
              >
                <Text className="text-base font-clash font-bold text-app mb-3">
                  Patch JSON
                </Text>
                <View
                  className="rounded-2xl border px-3 py-2"
                  style={{
                    borderColor: isDark
                      ? "rgba(255,255,255,0.10)"
                      : "rgba(15,23,42,0.10)",
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(15,23,42,0.03)",
                  }}
                >
                  <TextInput
                    value={patchJson}
                    onChangeText={setPatchJson}
                    className="text-[12px] font-outfit text-app"
                    multiline
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="{}"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View className="flex-row flex-wrap gap-2 mt-3">
                  <SmallAction
                    label={detailBusy ? "Saving…" : "Save"}
                    tone="success"
                    onPress={savePatch}
                    disabled={detailBusy}
                  />
                  {selectedExercise ? (
                    <SmallAction
                      label="Delete"
                      tone="danger"
                      onPress={deleteExercise}
                      disabled={detailBusy}
                    />
                  ) : null}
                </View>
              </View>
            </ThemedScrollView>
          </View>
        </Modal>
      </ThemedScrollView>
    </View>
  );
}
