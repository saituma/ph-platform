import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { apiRequest } from "@/lib/api";
import { Shadows } from "@/constants/theme";
import { ProgramId } from "@/constants/program-details";
import { SafeAreaView } from "react-native-safe-area-context";
import { SafeMaskedView } from "@/components/navigation/TransitionStack";

type SessionItem = {
  id: number;
  blockType: string;
  title: string;
  body: string;
  order: number;
  metadata?: {
    sets?: number | null;
    reps?: number | null;
    duration?: number | null;
  } | null;
};

type ModuleSession = {
  id: number;
  title: string;
  dayLength: number;
  order: number;
  completed: boolean;
  locked: boolean;
  items: SessionItem[];
};

type Module = {
  id: number;
  title: string;
  order: number;
  sessions: ModuleSession[];
};

type TrainingContentV2Workspace = {
  modules: Module[];
};

const BLOCK_ORDER = ["warmup", "main", "cooldown"] as const;
const BLOCK_LABELS: Record<(typeof BLOCK_ORDER)[number], string> = {
  warmup: "Warmup",
  main: "Main session",
  cooldown: "Cool down",
};

export default function ProgramSessionDetailScreen() {
  const router = useRouter();
  const { sessionId, programId, moduleId } = useLocalSearchParams<{
    sessionId?: string | string[];
    programId?: ProgramId | string;
    moduleId?: string | string[];
  }>();

  const sessionIdValue = useMemo(() => {
    const raw = Array.isArray(sessionId) ? sessionId[0] : sessionId;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [sessionId]);

  const moduleIdValue = useMemo(() => {
    const raw = Array.isArray(moduleId) ? moduleId[0] : moduleId;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [moduleId]);

  const safeProgramId = useMemo(() => {
    const raw = Array.isArray(programId) ? programId[0] : programId;
    if (raw === "php" || raw === "plus" || raw === "premium") return raw;
    return "php";
  }, [programId]);

  const token = useAppSelector((state) => state.user.token);
  const athleteUserId = useAppSelector((state) => state.user.athleteUserId);
  const managedAthletes = useAppSelector((state) => state.user.managedAthletes);
  const { colors, isDark } = useAppTheme();

  const activeAthleteAge = useMemo(() => {
    if (!managedAthletes.length) return null;
    const selected =
      managedAthletes.find(
        (athlete) =>
          athlete.id === athleteUserId || athlete.userId === athleteUserId,
      ) ??
      managedAthletes[0];
    return selected?.age ?? null;
  }, [managedAthletes, athleteUserId]);

  const [workspace, setWorkspace] = useState<TrainingContentV2Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  const module = useMemo(() => {
    if (!workspace?.modules?.length) return null;
    if (moduleIdValue != null) {
      return workspace.modules.find((item) => item.id === moduleIdValue) ?? null;
    }
    return workspace.modules.find((item) => item.sessions.some((s) => s.id === sessionIdValue)) ?? null;
  }, [workspace, moduleIdValue, sessionIdValue]);

  const session = useMemo(() => {
    if (!module?.sessions?.length || sessionIdValue == null) return null;
    return module.sessions.find((item) => item.id === sessionIdValue) ?? null;
  }, [module, sessionIdValue]);

  const nextNavigation = useMemo(() => {
    if (!workspace?.modules?.length || !module || !session) return null;

    const sortedModules = [...workspace.modules].sort(
      (a, b) => Number(a.order) - Number(b.order),
    );
    const currentModuleIndex = sortedModules.findIndex((m) => m.id === module.id);
    if (currentModuleIndex < 0) return null;

    const sortedSessions = [...module.sessions].sort(
      (a, b) => Number(a.order) - Number(b.order),
    );
    const currentSessionIndex = sortedSessions.findIndex((s) => s.id === session.id);

    if (currentSessionIndex >= 0 && currentSessionIndex < sortedSessions.length - 1) {
      const nextSession = sortedSessions[currentSessionIndex + 1];
      if (nextSession && !nextSession.locked) {
        return {
          label: "Open Next Session",
          path: `/programs/session/${encodeURIComponent(String(nextSession.id))}?programId=${encodeURIComponent(
            safeProgramId,
          )}&moduleId=${encodeURIComponent(String(module.id))}`,
        };
      }
      return null;
    }

    for (let i = currentModuleIndex + 1; i < sortedModules.length; i += 1) {
      const nextModule = sortedModules[i];
      if (!nextModule || nextModule.locked) continue;
      return {
        label: "Open Next Module",
        path: `/programs/module/${encodeURIComponent(String(nextModule.id))}?programId=${encodeURIComponent(
          safeProgramId,
        )}`,
      };
    }

    return null;
  }, [module, safeProgramId, session, workspace]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (moduleIdValue != null) {
      router.replace(
        `/programs/module/${encodeURIComponent(String(moduleIdValue))}?programId=${encodeURIComponent(safeProgramId)}` as any,
      );
      return;
    }
    router.replace(`/programs/${safeProgramId}` as any);
  }, [moduleIdValue, router, safeProgramId]);

  const loadWorkspace = useCallback(
    async (options?: { force?: boolean }) => {
      if (!token) {
        setWorkspace(null);
        return;
      }
      const ageQ =
        activeAthleteAge !== null
          ? `?age=${encodeURIComponent(String(activeAthleteAge))}`
          : "";
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiRequest<TrainingContentV2Workspace>(
          `/training-content-v2/mobile${ageQ}`,
          { token, forceRefresh: options?.force ?? false },
        );
        setWorkspace(response);
      } catch (err) {
        setWorkspace(null);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load session details.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [activeAthleteAge, token],
  );

  const finishSession = useCallback(async () => {
    if (!token || !sessionIdValue) return;
    setFinishing(true);
    try {
      await apiRequest(`/training-content-v2/mobile/sessions/${sessionIdValue}/finish`, {
        method: "POST",
        token,
      });
      await loadWorkspace({ force: true });
    } catch {
      Alert.alert("Session", "Could not mark session finished.");
    } finally {
      setFinishing(false);
    }
  }, [loadWorkspace, sessionIdValue, token]);

  useEffect(() => {
    if (router.canGoBack()) return;
    router.replace("/(tabs)");
  }, [router]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <SafeMaskedView style={{ flex: 1 }}>
        <ThemedScrollView
          onRefresh={() => loadWorkspace({ force: true })}
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
        >
          <View className="px-6 pt-4 gap-5">
            <View
              className="overflow-hidden rounded-[30px] border px-5 py-5"
              style={{ backgroundColor: colors.card, borderColor: borderSoft, ...(isDark ? Shadows.none : Shadows.md) }}
            >
              <View className="absolute -right-10 -top-8 h-28 w-28 rounded-full" style={{ backgroundColor: isDark ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.10)" }} />
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={handleBack}
                  className="h-11 w-11 items-center justify-center rounded-[18px]"
                  style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.84)" }}
                >
                  <Feather name="arrow-left" size={20} color={colors.accent} />
                </Pressable>
                <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.84)" }}>
                  <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px]" style={{ color: colors.accent }}>
                    Session details
                  </Text>
                </View>
              </View>

              <Text className="mt-4 text-[26px] font-telma-bold text-app font-bold">
                {session ? `${session.order}. ${session.title}` : "Session"}
              </Text>

              {session ? (
                <View className="mt-4 flex-row flex-wrap gap-2">
                  <View className="rounded-full px-3 py-2" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.84)" }}>
                    <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.text }}>
                      {session.dayLength} day target
                    </Text>
                  </View>
                  {module ? (
                    <View className="rounded-full px-3 py-2" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.84)" }}>
                      <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.text }}>
                        Module {module.order}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            {isLoading ? (
              <View className="rounded-[24px] border px-5 py-5 items-center" style={{ backgroundColor: colors.card, borderColor: borderSoft }}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : null}

            {error ? (
              <View className="rounded-[24px] border px-5 py-5" style={{ backgroundColor: colors.card, borderColor: borderSoft }}>
                <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>
                  {error}
                </Text>
              </View>
            ) : null}

            {!isLoading && !error && sessionIdValue == null ? (
              <View className="rounded-[24px] border px-5 py-5" style={{ backgroundColor: colors.card, borderColor: borderSoft }}>
                <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>
                  Invalid session id.
                </Text>
              </View>
            ) : null}

            {!isLoading && !error && sessionIdValue != null && !session ? (
              <View className="rounded-[24px] border px-5 py-5" style={{ backgroundColor: colors.card, borderColor: borderSoft }}>
                <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>
                  Session not found.
                </Text>
              </View>
            ) : null}

            {!isLoading && !error && session ? (
              <View
                className="rounded-[22px] border px-4 py-4"
                style={{
                  backgroundColor: session.locked ? (isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC") : colors.background,
                  borderColor: session.completed ? "rgba(34,197,94,0.25)" : borderSoft,
                  opacity: session.locked ? 0.7 : 1,
                }}
              >
                <View className="mt-1 gap-3">
                  {BLOCK_ORDER.map((blockType) => {
                    const blockItems = session.items.filter((item) => item.blockType === blockType);
                    return (
                      <View key={`${session.id}-${blockType}`}>
                        <Text className="text-[11px] font-outfit font-bold uppercase tracking-[1px]" style={{ color: colors.accent }}>
                          {BLOCK_LABELS[blockType]}
                        </Text>
                        <View className="mt-2 gap-2">
                          {blockItems.map((item) => (
                            <View
                              key={item.id}
                              className="rounded-2xl px-3 py-3"
                              style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC" }}
                            >
                              <Text className="text-sm font-outfit font-semibold" style={{ color: colors.text }}>
                                {item.order}. {item.title}
                              </Text>
                              <Text className="mt-1 text-xs font-outfit" style={{ color: colors.textSecondary }}>
                                {item.body}
                              </Text>
                              {(item.metadata?.sets != null || item.metadata?.reps != null || item.metadata?.duration != null) ? (
                                <View className="mt-2 flex-row flex-wrap gap-2">
                                  {item.metadata?.sets != null ? (
                                    <Text className="text-[11px] font-outfit" style={{ color: colors.textSecondary }}>
                                      {item.metadata.sets} sets
                                    </Text>
                                  ) : null}
                                  {item.metadata?.reps != null ? (
                                    <Text className="text-[11px] font-outfit" style={{ color: colors.textSecondary }}>
                                      {item.metadata.reps} reps
                                    </Text>
                                  ) : null}
                                  {item.metadata?.duration != null ? (
                                    <Text className="text-[11px] font-outfit" style={{ color: colors.textSecondary }}>
                                      {item.metadata.duration}s
                                    </Text>
                                  ) : null}
                                </View>
                              ) : null}
                            </View>
                          ))}
                          {!blockItems.length ? (
                            <Text className="text-xs font-outfit" style={{ color: colors.textSecondary }}>
                              No items added yet.
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {!session.locked && !session.completed ? (
                  <Pressable
                    disabled={finishing}
                    onPress={() => void finishSession()}
                    className="mt-4 rounded-full py-3 items-center justify-center"
                    style={{ backgroundColor: colors.accent, opacity: finishing ? 0.7 : 1 }}
                  >
                    <Text className="text-[12px] font-outfit font-bold uppercase tracking-[1.2px] text-white">
                      {finishing ? "Finishing..." : "Finished"}
                    </Text>
                  </Pressable>
                ) : null}

                {session.completed && nextNavigation ? (
                  <Pressable
                    onPress={() => router.push(nextNavigation.path as any)}
                    className="mt-3 rounded-full py-3 items-center justify-center border"
                    style={{ borderColor: colors.accent, backgroundColor: isDark ? "rgba(34,197,94,0.12)" : "#ECFDF3" }}
                  >
                    <Text className="text-[12px] font-outfit font-bold uppercase tracking-[1.1px]" style={{ color: colors.accent }}>
                      {nextNavigation.label}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        </ThemedScrollView>
      </SafeMaskedView>
    </SafeAreaView>
  );
}
