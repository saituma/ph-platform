import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
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

type ModuleSession = {
  id: number;
  title: string;
  dayLength: number;
  order: number;
  completed: boolean;
  locked: boolean;
};

type Module = {
  id: number;
  title: string;
  order: number;
  totalDayLength: number;
  completed: boolean;
  locked: boolean;
  sessions: ModuleSession[];
};

type TrainingContentV2Workspace = {
  modules: Module[];
};

export default function ProgramModuleDetailScreen() {
  const router = useRouter();
  const { moduleId, programId } = useLocalSearchParams<{
    moduleId?: string | string[];
    programId?: ProgramId | string;
  }>();

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

  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  const module = useMemo(() => {
    if (!workspace?.modules?.length || moduleIdValue == null) return null;
    return workspace.modules.find((item) => item.id === moduleIdValue) ?? null;
  }, [workspace, moduleIdValue]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(`/programs/${safeProgramId}` as any);
  }, [router, safeProgramId]);

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
            : "Failed to load module details.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [activeAthleteAge, token],
  );

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
                    Module details
                  </Text>
                </View>
              </View>

              <Text className="mt-4 text-[26px] font-telma-bold text-app font-bold">
                {module ? `Module ${module.order}: ${module.title}` : "Module"}
              </Text>

              {module ? (
                <View className="mt-4 flex-row flex-wrap gap-2">
                  <View className="rounded-full px-3 py-2" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.84)" }}>
                    <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.text }}>
                      {module.totalDayLength} planned days
                    </Text>
                  </View>
                  <View className="rounded-full px-3 py-2" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.84)" }}>
                    <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.text }}>
                      {module.sessions.length} session{module.sessions.length === 1 ? "" : "s"}
                    </Text>
                  </View>
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

            {!isLoading && !error && moduleIdValue == null ? (
              <View className="rounded-[24px] border px-5 py-5" style={{ backgroundColor: colors.card, borderColor: borderSoft }}>
                <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>
                  Invalid module id.
                </Text>
              </View>
            ) : null}

            {!isLoading && !error && moduleIdValue != null && !module ? (
              <View className="rounded-[24px] border px-5 py-5" style={{ backgroundColor: colors.card, borderColor: borderSoft }}>
                <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>
                  Module not found.
                </Text>
              </View>
            ) : null}

            {!isLoading && !error && module ? (
              <View className="gap-4">
                {module.sessions.map((session) => (
                  <Pressable
                    key={session.id}
                    onPress={() => {
                      router.push(
                        `/programs/session/${encodeURIComponent(String(session.id))}?programId=${encodeURIComponent(safeProgramId)}&moduleId=${encodeURIComponent(String(module.id))}` as any,
                      );
                    }}
                    className="rounded-[22px] border px-4 py-4"
                    style={{
                      backgroundColor: session.locked ? (isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC") : colors.background,
                      borderColor: session.completed ? "rgba(34,197,94,0.25)" : borderSoft,
                      opacity: session.locked ? 0.7 : 1,
                    }}
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-base font-clash font-bold" style={{ color: colors.text }}>
                          {session.order}. {session.title}
                        </Text>
                        <Text className="mt-1 text-xs font-outfit" style={{ color: colors.textSecondary }}>
                          {session.dayLength} day target
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-2">
                        {session.completed ? <Feather name="check-circle" size={18} color="#16A34A" /> : null}
                        {session.locked ? <Feather name="lock" size={16} color={colors.textSecondary} /> : null}
                        <Feather name="chevron-right" size={18} color={colors.textSecondary} />
                      </View>
                    </View>
                  </Pressable>
                ))}

                {!module.sessions.length ? (
                  <View className="rounded-[24px] border px-5 py-5" style={{ backgroundColor: colors.card, borderColor: borderSoft }}>
                    <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>
                      No sessions available for this module yet.
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </ThemedScrollView>
      </SafeMaskedView>
    </SafeAreaView>
  );
}
