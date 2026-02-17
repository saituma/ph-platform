import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { ProgramTabBar } from "@/components/programs/ProgramTabBar";
import { ProgramSessionPanel } from "@/components/programs/ProgramSessionPanel";
import { Text } from "@/components/ScaledText";
import {
  BookingsPanel,
  FoodDiaryPanel,
  ParentEducationPanel,
  PhysioReferralPanel,
  VideoUploadPanel,
} from "@/components/programs/ProgramPanels";
import { PROGRAM_TABS, TRAINING_TABS, getSessionTypesForTab, ProgramId, SessionItem } from "@/constants/program-details";
import { PROGRAM_TIERS } from "@/constants/Programs";
import { useAppSelector } from "@/store/hooks";
import { useRole } from "@/context/RoleContext";
import { canAccessTier, normalizeProgramTier, programIdToTier, tierRank } from "@/lib/planAccess";
import { apiRequest } from "@/lib/api";
import { VideoPlayer } from "@/components/media/VideoPlayer";

const PROGRAM_TITLES: Record<ProgramId, string> = {
  php: "PHP Program",
  plus: "PHP Plus",
  premium: "PHP Premium",
};

export default function ProgramDetailScreen() {
  const { id, tab } = useLocalSearchParams<{ id: ProgramId; tab?: string }>();
  const programId = id && ["php", "plus", "premium"].includes(id) ? (id as ProgramId) : "php";
  const router = useRouter();
  const { programTier, token } = useAppSelector((state) => state.user);
  const { role } = useRole();
  const tabs = useMemo(() => {
    const base = PROGRAM_TABS[programId];
    if (role === "Athlete") {
      return base.filter(
        (tab) =>
          tab !== "Parent Education" &&
          tab !== "Nutrition & Food Diaries" &&
          tab !== "Submit Diary"
      );
    }
    if (role === "Guardian") {
      return base.filter((tab) => tab !== "Video Upload");
    }
    return base;
  }, [programId, role]);
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [allSessions, setAllSessions] = useState<SessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const rawTab = typeof tab === "string" ? tab : Array.isArray(tab) ? tab[0] : undefined;
    if (rawTab && tabs.includes(rawTab)) {
      setActiveTab(rawTab);
    } else {
      setActiveTab(tabs[0]);
    }
  }, [tabs, tab]);

  const sessions = useMemo(() => {
    const allowedTypes = new Set(getSessionTypesForTab(activeTab));
    if (allowedTypes.size === 0) {
      return [];
    }
    return allSessions.filter((session) => allowedTypes.has(String(session.type ?? "")));
  }, [activeTab, allSessions]);

  const loadSessions = useCallback(async () => {
    if (!token) {
      setAllSessions([]);
      return;
    }
    setIsLoadingSessions(true);
    setSessionError(null);
    try {
      const mapExercise = (entry: any) => ({
        id: String(entry?.id ?? entry?.exerciseId ?? "exercise-unknown"),
        name: String(entry?.name ?? "Exercise"),
        sets: typeof entry?.sets === "number" ? entry.sets : undefined,
        reps: typeof entry?.reps === "number" ? entry.reps : undefined,
        time:
          typeof entry?.duration === "number" && entry.duration > 0
            ? `${entry.duration}s`
            : undefined,
        rest:
          typeof entry?.restSeconds === "number" && entry.restSeconds > 0
            ? `${entry.restSeconds}s`
            : undefined,
        notes: entry?.notes || undefined,
        videoUrl: entry?.videoUrl || undefined,
        progressions: entry?.progression || undefined,
        regressions: entry?.regression || undefined,
      });

      const programsData = await apiRequest<{ programs: { type: string; programId?: number | null }[] }>(
        "/programs",
        { token }
      );
      const libraryData = await apiRequest<{ exercises: any[] }>("/programs/exercises", { token });
      const requiredType = programIdToTier(programId);
      const selected = (programsData.programs ?? []).find((item) => item.type === requiredType);
      if (!selected?.programId) {
        const fallbackLibraryExercises = (libraryData.exercises ?? []).map(mapExercise);
        setAllSessions(
          fallbackLibraryExercises.length
            ? [
                {
                  id: `${requiredType}-library`,
                  name: "Exercise Library",
                  weekNumber: 1,
                  type: "program",
                  exercises: fallbackLibraryExercises,
                },
              ]
            : []
        );
        return;
      }
      const sessionData = await apiRequest<{ sessions: any[] }>(`/programs/${selected.programId}/sessions`, {
        token,
      });

      const mappedSessions: SessionItem[] = (sessionData.sessions ?? []).map((session) => {
        const sessionExercises = Array.isArray(session.exercises) ? session.exercises : [];
        return {
          id: String(session.id),
          name: `Week ${session.weekNumber} Session ${session.sessionNumber}`,
          weekNumber: session.weekNumber,
          type: String(session.type ?? ""),
          exercises: sessionExercises.map((entry: any) => {
            const exercise = entry.exercise ?? {};
            return {
              id: String(entry.exerciseId ?? exercise.id ?? entry.id),
              name: String(exercise.name ?? "Exercise"),
              sets: typeof exercise.sets === "number" ? exercise.sets : undefined,
              reps: typeof exercise.reps === "number" ? exercise.reps : undefined,
              time:
                typeof exercise.duration === "number" && exercise.duration > 0
                  ? `${exercise.duration}s`
                  : undefined,
              rest:
                typeof exercise.restSeconds === "number" && exercise.restSeconds > 0
                  ? `${exercise.restSeconds}s`
                  : undefined,
              notes: entry.coachingNotes || exercise.notes || undefined,
              videoUrl: exercise.videoUrl || undefined,
              progressions: entry.progressionNotes || exercise.progression || undefined,
              regressions: entry.regressionNotes || exercise.regression || undefined,
            };
          }),
        } as SessionItem;
      });

      const libraryExercises = (libraryData.exercises ?? []).map(mapExercise);
      const librarySession: SessionItem[] = libraryExercises.length
        ? [
            {
              id: `${requiredType}-library`,
              name: "Exercise Library",
              weekNumber: 1,
              type: "program",
              exercises: libraryExercises,
            },
          ]
        : [];

      setAllSessions([...mappedSessions, ...librarySession]);
    } catch (error: any) {
      setSessionError(error?.message || "Failed to load configured sessions.");
      setAllSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [programId, token]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const handlePageRefresh = async () => {
    await loadSessions();
    setRefreshToken((prev) => prev + 1);
  };

  const handleVideoPress = (url: string) => {
    setActiveVideoUrl(url);
  };

  const renderTrainingContent = () => {
    if (isLoadingSessions) {
      return (
        <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
          <Text className="text-2xl font-outfit text-secondary">Loading configured exercises...</Text>
        </View>
      );
    }
    if (sessionError) {
      return (
        <View className="rounded-3xl border border-red-500/30 bg-red-500/10 px-6 py-5">
          <Text className="text-2xl font-outfit text-red-600">{sessionError}</Text>
        </View>
      );
    }
    if (sessions.length === 0) {
      return (
        <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
          <Text className="text-2xl font-outfit text-secondary">
            No exercises configured for this section yet. Ask your coach/admin to add sessions in Web Admin.
          </Text>
        </View>
      );
    }
    return <ProgramSessionPanel sessions={sessions} onVideoPress={handleVideoPress} />;
  };

  const renderTab = () => {
    const hasAccess = canAccessTier(programTier, programIdToTier(programId));
    const normalizedTier = normalizeProgramTier(programTier);
    if (!hasAccess) {
      const title = normalizedTier
        ? "Apply to unlock this program"
        : "Complete onboarding to unlock programs";
      const body = normalizedTier
        ? "This program is available on a higher plan tier. Apply to upgrade your coaching."
        : "Once your plan is active, your full program will appear here.";
      return (
        <View className="rounded-3xl border border-app/10 bg-input px-6 py-5 gap-3">
          <View className="flex-row items-center gap-2">
            <Feather name="lock" size={16} color="#94A3B8" />
            <Text className="text-2xl font-outfit text-secondary uppercase tracking-[1.2px]">
              Pending Access
            </Text>
          </View>
          <Text className="text-2xl font-clash text-app">
            {title}
          </Text>
          <Text className="text-2xl font-outfit text-secondary">
            {body}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/plans")}
            className="mt-2 rounded-full bg-accent px-4 py-3"
          >
            <Text className="text-white text-2xl font-outfit text-center">
              {normalizedTier ? "View Plans" : "Choose a Plan"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (activeTab === "Program") {
      const tier = PROGRAM_TIERS.find((item) => item.id === programId);
      return (
        <View className="gap-4">
          <View className="rounded-3xl border border-app/10 bg-input px-6 py-5 gap-3">
            <Text className="text-2xl font-clash text-app">Program Features</Text>
            {tier?.features?.map((feature, index) => (
              <View key={`${tier.id}-feature-${index}`} className="flex-row items-center gap-3">
                <View className="h-6 w-6 rounded-full bg-success-soft items-center justify-center">
                  <Feather name="check" size={12} color="#16A34A" />
                </View>
                <Text className="text-2xl font-outfit text-app flex-1">{feature}</Text>
              </View>
            ))}
          </View>
          {renderTrainingContent()}
        </View>
      );
    }

    if (TRAINING_TABS.has(activeTab)) {
      return renderTrainingContent();
    }

    if (activeTab === "Book In" || activeTab === "Bookings") {
      return <BookingsPanel onOpen={() => router.push("/(tabs)/schedule")} />;
    }

    if (activeTab === "Physio Referral" || activeTab === "Physio Referrals") {
      return <PhysioReferralPanel discount={programId === "plus" ? "10%" : undefined} />;
    }

    if (activeTab === "Parent Education") {
      if (role !== "Guardian") {
        return (
          <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
            <Text className="text-2xl font-outfit text-secondary">Parent education is only available for guardians.</Text>
          </View>
        );
      }
      if (tierRank(programTier) < tierRank("PHP_Plus")) {
        return (
          <View className="rounded-3xl border border-app/10 bg-input px-6 py-5 gap-3">
            <View className="flex-row items-center gap-2">
              <Feather name="lock" size={16} color="#94A3B8" />
              <Text className="text-2xl font-outfit text-secondary uppercase tracking-[1.2px]">
                Locked
              </Text>
            </View>
            <Text className="text-2xl font-clash text-app">
              Parent Program is locked on PHP
            </Text>
            <Text className="text-2xl font-outfit text-secondary">
              Upgrade to PHP Plus or PHP Premium to access parent education.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/plans")}
              className="mt-2 rounded-full bg-accent px-4 py-3"
            >
              <Text className="text-white text-2xl font-outfit text-center">
                View Plans
              </Text>
            </TouchableOpacity>
          </View>
        );
      }
      return <ParentEducationPanel onOpen={() => router.push("/(tabs)/parent-platform")} />;
    }

    if (activeTab === "Education") {
      return <ParentEducationPanel onOpen={() => router.push("/(tabs)/parent-platform")} />;
    }

    if (activeTab === "Nutrition & Food Diaries" || activeTab === "Submit Diary") {
      if (role !== "Guardian") {
        return (
          <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
            <Text className="text-2xl font-outfit text-secondary">Food diaries are managed by guardians.</Text>
          </View>
        );
      }
      return <FoodDiaryPanel />;
    }

    if (activeTab === "Video Upload") {
      if (role !== "Athlete") {
        return (
          <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
            <Text className="text-2xl font-outfit text-secondary">Video uploads are available for athletes.</Text>
          </View>
        );
      }
      return <VideoUploadPanel refreshToken={refreshToken} />;
    }

    return (
      <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
        <Text className="text-2xl font-outfit text-secondary">Content coming soon.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView onRefresh={handlePageRefresh} contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center bg-secondary rounded-full"
            >
              <Feather name="arrow-left" size={20} color="#94A3B8" />
            </TouchableOpacity>
          <Text className="text-2xl font-clash text-app font-bold">{PROGRAM_TITLES[programId]}</Text>
            <View className="w-10" />
          </View>

          <Text className="text-2xl font-outfit text-secondary mb-4">
            Select a tab to view your program sessions and resources.
          </Text>
        </View>

        <ProgramTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <View className="px-6">
          {renderTab()}
        </View>
      </ThemedScrollView>
      <Modal
        visible={Boolean(activeVideoUrl)}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveVideoUrl(null)}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-app rounded-t-3xl p-4 pb-8">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-2xl font-clash text-app">Exercise Video</Text>
              <TouchableOpacity
                onPress={() => setActiveVideoUrl(null)}
                className="h-9 w-9 rounded-full bg-secondary items-center justify-center"
              >
                <Feather name="x" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            {activeVideoUrl ? <VideoPlayer uri={activeVideoUrl} /> : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}