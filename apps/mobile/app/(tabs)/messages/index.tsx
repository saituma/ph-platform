import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { InboxScreen } from "@/components/messages/InboxScreen";
import { useMessagesController } from "@/hooks/useMessagesController";
import React from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { canUseCoachMessaging } from "@/lib/messagingAccess";
import { Text } from "@/components/ScaledText";
import { apiRequest } from "@/lib/api";
import {
  setLatestSubscriptionRequest,
  setMessagingAccessTiers,
  setProgramTier,
} from "@/store/slices/userSlice";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { hasPaidProgramTier } from "@/lib/planAccess";
import { requestGlobalTabChange } from "@/context/ActiveTabContext";

export default function MessagesScreen() {
  const { colors } = useAppTheme();
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.user.token);
  const programTier = useAppSelector((state) => state.user.programTier);
  const messagingAccessTiers = useAppSelector(
    (state) => state.user.messagingAccessTiers,
  );
  const appRole = useAppSelector((state) => state.user.appRole);
  const profile = useAppSelector((state) => state.user.profile);
  const athleteUserId = useAppSelector((state) => state.user.athleteUserId);
  const managedAthletes = useAppSelector((state) => state.user.managedAthletes);
  const { isSectionHidden } = useAgeExperience();

  const {
    sortedThreads,
    typingStatus,
    isLoading,
    openingThreadId,
    openThread,
    loadMessages,
    resetOpeningThread,
  } = useMessagesController();
  const pathname = usePathname();
  const router = useRouter();
  const canMessage = canUseCoachMessaging(programTier, messagingAccessTiers);
  const paidPlan = hasPaidProgramTier(programTier);
  const isYouthAthleteRole =
    appRole === "youth_athlete_guardian_only" ||
    appRole === "youth_athlete_team_guardian";
  const unreadCount = React.useMemo(
    () => sortedThreads.reduce((sum, thread) => sum + (Number(thread.unread) || 0), 0),
    [sortedThreads],
  );
  const activeAthlete = React.useMemo(() => {
    if (!managedAthletes.length) return null;
    return (
      managedAthletes.find(
        (athlete) =>
          athlete.id === athleteUserId || athlete.userId === athleteUserId,
      ) ?? managedAthletes[0]
    );
  }, [athleteUserId, managedAthletes]);
  const focusName = activeAthlete?.name || profile?.name || "Athlete";
  const heroSubtitle = isYouthAthleteRole
    ? `Stay connected with your coach and keep ${focusName}'s plan on track.`
    : "Cleaner chat, faster replies, and a calmer mobile flow.";

  React.useEffect(() => {
    if (!token) return;
    const syncBillingStatus = async () => {
      try {
        const status = await apiRequest<{
          currentProgramTier?: string | null;
          messagingAccessTiers?: string[] | null;
          latestRequest?: {
            status?: string | null;
            paymentStatus?: string | null;
            planTier?: string | null;
            createdAt?: string | null;
          } | null;
        }>("/billing/status", {
          token,
          suppressStatusCodes: [401, 403, 404],
          skipCache: true,
        });

        dispatch(setProgramTier(status?.currentProgramTier ?? null));
        dispatch(
          setMessagingAccessTiers(
            Array.isArray(status?.messagingAccessTiers)
              ? status.messagingAccessTiers
              : ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"],
          ),
        );
        dispatch(setLatestSubscriptionRequest(status?.latestRequest ?? null));
      } catch {
        // no-op
      }
    };

    syncBillingStatus();
  }, [dispatch, token]);

  React.useEffect(() => {
    if (!pathname.startsWith("/(tabs)/messages")) return;
    resetOpeningThread();
  }, [pathname, resetOpeningThread]);

  if (isSectionHidden("messages")) {
    return (
      <AgeGate
        title="Messages locked"
        message="Messaging is restricted for this age."
      />
    );
  }

  // ====================== LOCKED / UPGRADE STATE ======================
  if (!canMessage) {
    return (
      <SafeAreaView className="flex-1" edges={["top"]} style={{ backgroundColor: colors.background }}>
        <View className="flex-1 items-center justify-center px-8">
          <View
            className="w-20 h-20 rounded-2xl items-center justify-center mb-6"
            style={{
              backgroundColor: colors.backgroundSecondary,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="chatbubbles" size={40} color={colors.accent} />
          </View>
          <Text className="text-2xl font-clash font-bold text-app text-center mb-3">
            Messages
          </Text>
          <Text className="text-base font-outfit text-secondary text-center max-w-[280px]">
            {paidPlan
              ? "Messaging is not enabled for your current plan. Ask your coach if you need access."
              : isYouthAthleteRole
                ? "Open your current plan in Programs and unlock coach messaging for this athlete."
                : "Choose a training plan in the Programs tab to unlock messaging with your coach."}
          </Text>
          {!paidPlan ? (
            <Pressable
              onPress={() => {
                requestGlobalTabChange(0);
                router.replace("/(tabs)/programs");
              }}
              className="mt-8 rounded-full px-8 py-3 bg-accent"
            >
              <Text className="text-sm font-outfit font-semibold text-white">Open Programs</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  // ====================== INBOX VIEW ======================
  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: colors.background }}
    >
      <View className="px-6 pt-8 pb-5">
        <View
          className="rounded-[28px] border px-5 py-5"
          style={{ backgroundColor: colors.card, borderColor: colors.borderSubtle }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-4xl font-telma-bold font-bold tracking-tight text-app">
                Messages
              </Text>
              <Text className="mt-2 text-base font-outfit" style={{ color: colors.textSecondary }}>
                {heroSubtitle}
              </Text>
            </View>
            <View className="h-12 w-12 rounded-2xl items-center justify-center" style={{ backgroundColor: colors.backgroundSecondary }}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.accent} />
            </View>
          </View>
          <View className="mt-4 flex-row flex-wrap gap-2">
            <View className="rounded-full px-3 py-2" style={{ backgroundColor: colors.backgroundSecondary }}>
              <Text className="text-[11px] font-outfit font-semibold text-app">
                {sortedThreads.length} thread{sortedThreads.length === 1 ? "" : "s"}
              </Text>
            </View>
            <View className="rounded-full px-3 py-2" style={{ backgroundColor: colors.backgroundSecondary }}>
              <Text className="text-[11px] font-outfit font-semibold text-app">
                {unreadCount} unread
              </Text>
            </View>
            <View className="rounded-full px-3 py-2" style={{ backgroundColor: colors.backgroundSecondary }}>
              <Text className="text-[11px] font-outfit font-semibold text-app">
                {isYouthAthleteRole ? "Coach support" : "Media sharing"}
              </Text>
            </View>
          </View>
          {isYouthAthleteRole && sortedThreads[0] ? (
            <Pressable
              onPress={() => openThread(sortedThreads[0]!)}
              className="mt-4 rounded-full py-3 items-center"
              style={{ backgroundColor: colors.accent }}
            >
              <Text className="text-sm font-outfit font-bold text-white">
                Open latest thread
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <InboxScreen
        threads={sortedThreads}
        typingStatus={typingStatus}
        isLoading={isLoading}
        openingThreadId={openingThreadId}
        onRefresh={loadMessages}
        onOpenThread={openThread}
      />
    </SafeAreaView>
  );
}
