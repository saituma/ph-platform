import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { useMyProgramDetail, useMySessionExercises } from "@/hooks/programs/useMyPrograms";
import { Shadows } from "@/constants/theme";

export default function AssignedProgramDetailScreen() {
  const router = useRouter();
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const token = useAppSelector((s) => s.user.token);
  const { colors, isDark } = useAppTheme();

  const programIdNum = useMemo(() => {
    const n = Number(programId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [programId]);

  const { program, isLoading, error, loadProgram } = useMyProgramDetail(token);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedModuleId, setExpandedModuleId] = useState<number | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null);

  const {
    exercises,
    isLoading: exercisesLoading,
    loadExercises,
  } = useMySessionExercises(token);

  useEffect(() => {
    if (programIdNum) loadProgram(programIdNum);
  }, [programIdNum]);

  useEffect(() => {
    if (expandedSessionId) loadExercises(expandedSessionId);
  }, [expandedSessionId]);

  const handleRefresh = useCallback(async () => {
    if (!programIdNum) return;
    setIsRefreshing(true);
    await loadProgram(programIdNum, true);
    setIsRefreshing(false);
  }, [programIdNum, loadProgram]);

  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "left", "right"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/programs" as any))}
          style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }}
        >
          <Feather name="chevron-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 18, fontFamily: "ClashDisplay-Bold", color: colors.textPrimary, marginLeft: 12, flex: 1 }} numberOfLines={1}>
          {program?.name ?? "Program"}
        </Text>
      </View>

      {isLoading && !program ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: colors.textSecondary, textAlign: "center" }}>
            {error}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
        >
          {program?.description ? (
            <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: colors.textSecondary, marginBottom: 16 }}>
              {program.description}
            </Text>
          ) : null}

          {(program?.modules ?? []).map((mod) => {
            const isExpanded = expandedModuleId === mod.id;
            return (
              <View
                key={mod.id}
                style={{
                  backgroundColor: colors.card,
                  borderColor: borderSoft,
                  borderWidth: 1,
                  borderRadius: 20,
                  marginBottom: 12,
                  overflow: "hidden",
                  ...(isDark ? {} : Shadows.sm),
                }}
              >
                <Pressable
                  onPress={() => setExpandedModuleId(isExpanded ? null : mod.id)}
                  style={{ flexDirection: "row", alignItems: "center", padding: 16 }}
                >
                  <View style={{
                    width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? "rgba(34,197,94,0.15)" : "#F0FDF4",
                    alignItems: "center", justifyContent: "center", marginRight: 12,
                  }}>
                    <Text style={{ fontSize: 14, fontFamily: "Outfit-Bold", color: colors.accent }}>{mod.order}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontFamily: "Outfit-SemiBold", color: colors.textPrimary }}>{mod.title}</Text>
                    <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: colors.textSecondary, marginTop: 2 }}>
                      {mod.sessionCount} {mod.sessionCount === 1 ? "session" : "sessions"}
                    </Text>
                  </View>
                  <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                </Pressable>

                {isExpanded && (mod.sessions ?? []).length > 0 ? (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                    {mod.sessions.map((session: any) => {
                      const isSessionExpanded = expandedSessionId === session.id;
                      return (
                        <View key={session.id}>
                          <Pressable
                            onPress={() => setExpandedSessionId(isSessionExpanded ? null : session.id)}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              paddingVertical: 10,
                              paddingHorizontal: 8,
                              borderTopWidth: 1,
                              borderTopColor: borderSoft,
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontFamily: "Outfit-Medium", color: colors.textPrimary }}>
                                {session.title || `Session ${session.sessionNumber}`}
                              </Text>
                              <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: colors.textSecondary, marginTop: 2 }}>
                                {session.type} · {session.exerciseCount} exercises
                              </Text>
                            </View>
                            <Feather name={isSessionExpanded ? "chevron-up" : "chevron-right"} size={16} color={colors.textSecondary} />
                          </Pressable>

                          {isSessionExpanded ? (
                            <View style={{ paddingLeft: 16, paddingBottom: 8 }}>
                              {exercisesLoading ? (
                                <ActivityIndicator size="small" color={colors.accent} style={{ paddingVertical: 8 }} />
                              ) : exercises.length === 0 ? (
                                <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: colors.textSecondary, paddingVertical: 8 }}>
                                  No exercises in this session.
                                </Text>
                              ) : (
                                exercises.map((ex) => (
                                  <View
                                    key={ex.id}
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      paddingVertical: 8,
                                      borderBottomWidth: 1,
                                      borderBottomColor: borderSoft,
                                    }}
                                  >
                                    <View style={{
                                      width: 24, height: 24, borderRadius: 8, backgroundColor: isDark ? "rgba(34,197,94,0.15)" : "#F0FDF4",
                                      alignItems: "center", justifyContent: "center", marginRight: 10,
                                    }}>
                                      <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: colors.accent }}>{ex.order}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                      <Text style={{ fontSize: 14, fontFamily: "Outfit-Medium", color: colors.textPrimary }}>
                                        {ex.exercise.name}
                                      </Text>
                                      <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: colors.textSecondary, marginTop: 1 }}>
                                        {[
                                          ex.exercise.sets ? `${ex.exercise.sets} sets` : null,
                                          ex.exercise.reps ? `${ex.exercise.reps} reps` : null,
                                          ex.exercise.duration ? `${ex.exercise.duration}s` : null,
                                        ]
                                          .filter(Boolean)
                                          .join(" · ") || ex.exercise.category || ""}
                                      </Text>
                                      {ex.coachingNotes ? (
                                        <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: colors.accent, marginTop: 2 }}>
                                          Coach: {ex.coachingNotes}
                                        </Text>
                                      ) : null}
                                    </View>
                                    {ex.exercise.videoUrl ? (
                                      <Feather name="play-circle" size={18} color={colors.accent} />
                                    ) : null}
                                  </View>
                                ))
                              )}
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ) : isExpanded ? (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                    <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: colors.textSecondary }}>
                      No sessions in this module yet.
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}

          {(program?.modules ?? []).length === 0 ? (
            <View
              style={{
                backgroundColor: colors.card,
                borderColor: borderSoft,
                borderWidth: 1,
                borderRadius: 20,
                padding: 32,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: colors.textSecondary, textAlign: "center" }}>
                No modules in this program yet. Your coach will add content soon.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
