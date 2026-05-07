import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, ChevronRight, Layers, Dumbbell } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSelector } from "@/store/hooks";
import { useMyProgramDetail } from "@/hooks/programs/useMyPrograms";
import { SkeletonProgramDetailScreen } from "@/components/ui/legacy-skeleton";

export default function AssignedProgramDetailScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { programId, moduleId: moduleIdParam } = useLocalSearchParams<{
    programId: string;
    moduleId?: string;
  }>();
  const token = useAppSelector((s) => s.user.token);
  const p = useAdminPastel();

  const programIdNum = useMemo(() => {
    const n = Number(programId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [programId]);

  const initialModuleId = useMemo(() => {
    const n = Number(moduleIdParam);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [moduleIdParam]);

  const { program, isLoading, error, loadProgram } = useMyProgramDetail(token);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (programIdNum) loadProgram(programIdNum);
  }, [programIdNum]);

  const handleRefresh = useCallback(async () => {
    if (!programIdNum) return;
    setIsRefreshing(true);
    await loadProgram(programIdNum, true);
    setIsRefreshing(false);
  }, [programIdNum, loadProgram]);

  const modules = program?.modules ?? [];
  const targetModule = initialModuleId
    ? modules.find((m) => m.id === initialModuleId)
    : null;
  const showSingleModule = !!targetModule;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/programs" as any))}
          style={{
            height: 40, width: 40, alignItems: "center", justifyContent: "center",
            borderRadius: 100, backgroundColor: p.accentSoft,
          }}
        >
          <ChevronLeft size={24} color={p.accent} />
        </Pressable>
        <Text
          style={{ fontSize: 18, fontFamily: "Outfit-Bold", color: p.textPrimary, marginLeft: 12, flex: 1 }}
          numberOfLines={1}
        >
          {showSingleModule ? targetModule.title : (program?.name ?? "Program")}
        </Text>
      </View>

      {isLoading && !program ? (
        <SkeletonProgramDetailScreen />
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary, textAlign: "center" }}>
            {error}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={p.accent} />}
          showsVerticalScrollIndicator={false}
        >
          {showSingleModule ? (
            <>
              {(targetModule.sessions ?? []).length === 0 ? (
                <EmptyCard p={p} text="No sessions in this module yet." />
              ) : (
                (targetModule.sessions ?? []).map((session: any, idx: number) => {
                  const entering = reduceMotion ? undefined : FadeInDown.delay(Math.min(idx, 8) * 40).springify().damping(15);
                  const label = session.title || `Session ${session.sessionNumber ?? idx + 1}`;
                  return (
                    <Animated.View key={session.id} entering={entering}>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push(`/programs/assigned-session/${session.id}?title=${encodeURIComponent(label)}&programId=${programIdNum}&moduleId=${targetModule.id}` as any);
                        }}
                        style={({ pressed }) => ({
                          backgroundColor: p.cardWhite,
                          borderRadius: 22,
                          marginBottom: 12,
                          overflow: "hidden",
                          transform: [{ scale: pressed ? 0.97 : 1 }],
                        })}
                      >
                        <View style={{ padding: 16, flexDirection: "row", alignItems: "center" }}>
                          <View style={{
                            width: 40, height: 40, borderRadius: 12,
                            backgroundColor: p.accentSoft,
                            alignItems: "center", justifyContent: "center", marginRight: 14,
                          }}>
                            <Text style={{ fontSize: 16, fontFamily: "Outfit-Bold", color: p.accent }}>
                              {session.sessionNumber ?? idx + 1}
                            </Text>
                          </View>
                          <View style={{ flex: 1, gap: 3 }}>
                            <Text style={{ fontSize: 16, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                              {label}
                            </Text>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <Dumbbell size={12} color={p.textSecondary} />
                                <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                                  {session.exerciseCount} exercises
                                </Text>
                              </View>
                              {session.type ? (
                                <View style={{
                                  paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100,
                                  backgroundColor: p.accentSoft,
                                }}>
                                  <Text style={{ fontSize: 10, fontFamily: "Outfit-Regular", color: p.textSecondary, textTransform: "capitalize" }}>
                                    {session.type}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          </View>
                          <View style={{
                            width: 30, height: 30, borderRadius: 100,
                            backgroundColor: p.accentSoft,
                            alignItems: "center", justifyContent: "center",
                          }}>
                            <ChevronRight size={14} color={p.textSecondary} />
                          </View>
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })
              )}
            </>
          ) : (
            <>
              {program?.description ? (
                <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary, marginBottom: 16 }}>
                  {program.description}
                </Text>
              ) : null}

              {modules.map((mod, modIdx) => {
                const entering = reduceMotion ? undefined : FadeInDown.delay(Math.min(modIdx, 8) * 40).springify().damping(15);
                return (
                  <Animated.View key={mod.id} entering={entering}>
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/programs/assigned/${programId}?moduleId=${mod.id}` as any);
                      }}
                      style={({ pressed }) => ({
                        backgroundColor: p.cardWhite,
                        borderRadius: 22,
                        marginBottom: 14,
                        overflow: "hidden",
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      })}
                    >
                      <View style={{ height: 3, backgroundColor: p.accent, opacity: 0.6 }} />
                      <View style={{ padding: 18, flexDirection: "row", alignItems: "center" }}>
                        <View style={{
                          width: 44, height: 44, borderRadius: 14,
                          backgroundColor: p.accentSoft,
                          alignItems: "center", justifyContent: "center", marginRight: 14,
                        }}>
                          <Text style={{ fontSize: 18, fontFamily: "Outfit-Bold", color: p.accent }}>{mod.order}</Text>
                        </View>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={{ fontSize: 17, fontFamily: "Outfit-Bold", color: p.textPrimary, letterSpacing: -0.2 }}>
                            {mod.title}
                          </Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Layers size={13} color={p.textSecondary} />
                            <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                              {mod.sessionCount} {mod.sessionCount === 1 ? "session" : "sessions"}
                            </Text>
                          </View>
                        </View>
                        <View style={{
                          width: 32, height: 32, borderRadius: 100,
                          backgroundColor: p.accentSoft,
                          alignItems: "center", justifyContent: "center",
                        }}>
                          <ChevronRight size={16} color={p.textSecondary} />
                        </View>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })}

              {modules.length === 0 ? (
                <EmptyCard p={p} text="No modules in this program yet. Your coach will add content soon." />
              ) : null}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function EmptyCard({
  p,
  text,
}: {
  p: ReturnType<typeof useAdminPastel>;
  text: string;
}) {
  return (
    <View
      style={{
        backgroundColor: p.cardWhite,
        borderRadius: 22,
        padding: 32,
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary, textAlign: "center" }}>
        {text}
      </Text>
    </View>
  );
}
