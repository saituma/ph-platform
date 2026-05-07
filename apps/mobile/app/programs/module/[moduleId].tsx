import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Pressable, View, Linking } from "react-native";
import { SkeletonBox } from "@/components/ui/legacy-skeleton";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Lock, CheckCircle, ChevronRight } from "lucide-react-native";
import { useSafeIsFocused } from "@/hooks/navigation/useSafeReactNavigation";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSelector } from "@/store/hooks";
import { apiRequest } from "@/lib/api";
import { scheduleLocalNotification } from "@/lib/localNotifications";
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
  lockedReason?: "tier" | "sequence" | null;
  unlockTiers?: Array<{ tier: string; label: string }>;
};

type Module = {
  id: number;
  title: string;
  order: number;
  totalDayLength: number;
  completed: boolean;
  locked: boolean;
  lockedReason?: "tier" | "sequence" | null;
  unlockTiers?: Array<{ tier: string; label: string }>;
  sessions: ModuleSession[];
};

type TrainingContentV2Workspace = {
  modules: Module[];
};

export default function ProgramModuleDetailScreen() {
  const router = useRouter();
  const isFocused = useSafeIsFocused(true);
  const { moduleId, programId } = useLocalSearchParams<{
    moduleId?: string | string[];
    programId?: ProgramId | string;
  }>();

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      if (router.canGoBack()) return;
      Linking.getInitialURL().then((url) => {
        if (cancelled) return;
        if (url && url.includes("/programs/module/")) return;
        router.replace("/(tabs)");
      });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const p = useAdminPastel();

  const activeAthlete = useMemo(() => {
    if (!managedAthletes.length) return null;
    return (
      managedAthletes.find(
        (athlete) =>
          athlete.id === athleteUserId || athlete.userId === athleteUserId,
      ) ?? managedAthletes[0]
    );
  }, [managedAthletes, athleteUserId]);
  const activeAthleteAge = activeAthlete?.age ?? null;

  const [workspace, setWorkspace] = useState<TrainingContentV2Workspace | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const wasLockedRef = useRef<boolean | null>(null);

  const formatUnlockTiers = (
    tiers?: Array<{ tier: string; label: string }>,
  ) => {
    const labels = (tiers ?? [])
      .map((t) => String(t?.label ?? "").trim())
      .filter(Boolean);
    return labels.length ? labels.join(", ") : null;
  };

  const moduleLockedCopy = (item: Module) => {
    if (item.lockedReason === "tier") {
      const available = formatUnlockTiers(item.unlockTiers);
      return available
        ? `Not available with your current access. Unlocks with: ${available}.`
        : "Not available with your current access.";
    }
    return "Complete the previous modules/sessions to unlock this module.";
  };

  const sessionLockedCopy = (item: ModuleSession) => {
    if (item.lockedReason === "tier") {
      const available = formatUnlockTiers(item.unlockTiers);
      return available
        ? `Not available with your current access. Unlocks with: ${available}.`
        : "Not available with your current access.";
    }
    return "Finish the previous session(s) to unlock this one.";
  };

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
          err instanceof Error ? err.message : "Failed to load module details.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [activeAthleteAge, token],
  );

  useEffect(() => {
    if (!isFocused) return;
    const force = hasLoadedOnceRef.current;
    hasLoadedOnceRef.current = true;
    void loadWorkspace({ force });
  }, [isFocused, loadWorkspace]);

  useEffect(() => {
    const notifyModuleOpened = async () => {
      if (!module || module.locked || !token) return;
      const moduleKey = `ph:module-opened:${module.id}`;
      const alreadyNotified = await AsyncStorage.getItem(moduleKey);
      if (alreadyNotified === "1") return;

      await scheduleLocalNotification({
        title: "Module available",
        body: `Module ${module.order}: ${module.title} is now open for you.`,
        data: {
          type: "module-open",
          moduleId: String(module.id),
          url: `/programs/module/${module.id}`,
        },
        channelId: "progress",
      });
      await AsyncStorage.setItem(moduleKey, "1");
    };

    void notifyModuleOpened();
  }, [module, token]);

  useEffect(() => {
    if (!module) return;
    const wasLocked = wasLockedRef.current;
    if (wasLocked === true && module.locked === false) {
      void scheduleLocalNotification({
        title: "New module unlocked",
        body: `You just unlocked Module ${module.order}: ${module.title}.`,
        data: {
          type: "module-unlocked",
          moduleId: String(module.id),
          url: `/programs/module/${module.id}`,
        },
        channelId: "progress",
      });
    }
    wasLockedRef.current = module.locked;
  }, [module]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top"]}>
      <SafeMaskedView style={{ flex: 1 }}>
        <ThemedScrollView
          onRefresh={() => loadWorkspace({ force: true })}
          style={{ backgroundColor: p.pageBg }}
          contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
        >
          <View style={{ paddingHorizontal: 24, paddingTop: 16, gap: 20 }}>
            {/* Hero card */}
            <View
              style={{
                overflow: "hidden",
                borderRadius: 22,
                paddingHorizontal: 20,
                paddingVertical: 20,
                backgroundColor: p.cardWhite,
              }}
            >
              <View
                style={{
                  position: "absolute",
                  right: -40,
                  top: -32,
                  height: 112,
                  width: 112,
                  borderRadius: 56,
                  backgroundColor: p.accentSoft,
                }}
              />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Pressable
                  onPress={handleBack}
                  style={{
                    height: 44, width: 44, alignItems: "center", justifyContent: "center",
                    borderRadius: 18, backgroundColor: p.inputBg,
                  }}
                >
                  <ArrowLeft size={20} color={p.accent} />
                </Pressable>
                <View
                  style={{
                    borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6,
                    backgroundColor: p.inputBg,
                  }}
                >
                  <Text
                    style={{ fontSize: 10, fontFamily: "Outfit-Bold", textTransform: "uppercase", letterSpacing: 1.3, color: p.accent }}
                  >
                    Module details
                  </Text>
                </View>
              </View>

              <Text style={{ marginTop: 16, fontSize: 26, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                {module ? `Module ${module.order}: ${module.title}` : "Module"}
              </Text>

              {module ? (
                <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <View
                    style={{
                      borderRadius: 100, paddingHorizontal: 12, paddingVertical: 8,
                      backgroundColor: p.inputBg,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                      {module.totalDayLength} planned days
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: 100, paddingHorizontal: 12, paddingVertical: 8,
                      backgroundColor: p.inputBg,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                      {module.sessions.length} session
                      {module.sessions.length === 1 ? "" : "s"}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            {isLoading ? (
              <View
                style={{
                  borderRadius: 22, paddingHorizontal: 20, paddingVertical: 20,
                  backgroundColor: p.cardWhite,
                  gap: 12,
                }}
              >
                {[0, 1, 2].map((i) => (
                  <SkeletonBox key={i} width="100%" height={56} borderRadius={16} />
                ))}
              </View>
            ) : null}

            {error ? (
              <View
                style={{
                  borderRadius: 22, paddingHorizontal: 20, paddingVertical: 20,
                  backgroundColor: p.cardWhite,
                }}
              >
                <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                  {error}
                </Text>
              </View>
            ) : null}

            {!isLoading && !error && moduleIdValue == null ? (
              <View
                style={{
                  borderRadius: 22, paddingHorizontal: 20, paddingVertical: 20,
                  backgroundColor: p.cardWhite,
                }}
              >
                <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                  Invalid module id.
                </Text>
              </View>
            ) : null}

            {!isLoading && !error && moduleIdValue != null && !module ? (
              <View
                style={{
                  borderRadius: 22, paddingHorizontal: 20, paddingVertical: 20,
                  backgroundColor: p.cardWhite,
                }}
              >
                <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                  Module not found.
                </Text>
              </View>
            ) : null}

            {!isLoading && !error && module ? (
              <View style={{ gap: 16 }}>
                {module.locked ? (
                  <View
                    style={{
                      borderRadius: 22, paddingHorizontal: 20, paddingVertical: 20,
                      backgroundColor: p.cardWhite,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Lock size={16} color={p.textSecondary} />
                      <Text
                        style={{ fontSize: 11, fontFamily: "Outfit-Bold", textTransform: "uppercase", letterSpacing: 1.1, color: p.textSecondary }}
                      >
                        Locked
                      </Text>
                    </View>
                    <Text
                      style={{ marginTop: 8, fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}
                    >
                      {moduleLockedCopy(module)}
                    </Text>
                  </View>
                ) : (
                  <>
                    {module.sessions.map((session) => (
                      <Pressable
                        key={session.id}
                        onPress={() => {
                          if (session.locked) {
                            Alert.alert(
                              "Session locked",
                              sessionLockedCopy(session),
                            );
                            return;
                          }
                          router.push(
                            `/programs/session/${encodeURIComponent(String(session.id))}?programId=${encodeURIComponent(safeProgramId)}&moduleId=${encodeURIComponent(String(module.id))}` as any,
                          );
                        }}
                        style={{
                          borderRadius: 22, paddingHorizontal: 16, paddingVertical: 16,
                          backgroundColor: session.locked
                            ? p.inputBg
                            : p.cardWhite,
                          opacity: session.locked ? 0.7 : 1,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{ fontSize: 16, fontFamily: "Outfit-Bold", color: p.textPrimary }}
                            >
                              {session.order}. {session.title}
                            </Text>
                            <Text
                              style={{ marginTop: 4, fontSize: 12, fontFamily: "Outfit-Regular", color: p.textSecondary }}
                            >
                              {session.dayLength} day target
                            </Text>
                            {session.locked ? (
                              <Text
                                style={{ marginTop: 8, fontSize: 12, fontFamily: "Outfit-Regular", color: p.textSecondary }}
                              >
                                {sessionLockedCopy(session)}
                              </Text>
                            ) : null}
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            {session.completed ? (
                              <CheckCircle size={18} color={p.success} />
                            ) : null}
                            {session.locked ? (
                              <Lock size={16} color={p.textSecondary} />
                            ) : null}
                            <ChevronRight size={18} color={p.textSecondary} />
                          </View>
                        </View>
                      </Pressable>
                    ))}

                    {!module.sessions.length ? (
                      <View
                        style={{
                          borderRadius: 22, paddingHorizontal: 20, paddingVertical: 20,
                          backgroundColor: p.cardWhite,
                        }}
                      >
                        <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                          No sessions available for this module yet.
                        </Text>
                      </View>
                    ) : null}
                  </>
                )}
              </View>
            ) : null}
          </View>
        </ThemedScrollView>
      </SafeMaskedView>
    </SafeAreaView>
  );
}
