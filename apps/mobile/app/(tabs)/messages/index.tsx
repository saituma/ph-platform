import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { InboxScreen } from "@/components/messages/InboxScreen";
import { useMessagesController } from "@/hooks/useMessagesController";
import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { canAccessTier } from "@/lib/planAccess";
import { Text } from "@/components/ScaledText";
import { apiRequest } from "@/lib/api";
import {
  setLatestSubscriptionRequest,
  setProgramTier,
} from "@/store/slices/userSlice";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

export default function MessagesScreen() {
  const { colors } = useAppTheme();
  const dispatch = useAppDispatch();
  const programTier = useAppSelector((state) => state.user.programTier);
  const token = useAppSelector((state) => state.user.token);
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

  const canMessage = canAccessTier(programTier ?? null, "PHP_Premium");

  React.useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const status = await apiRequest<{
          currentProgramTier?: string | null;
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
        dispatch(setLatestSubscriptionRequest(status?.latestRequest ?? null));
      } catch {
        // no-op
      }
    })();
  }, [dispatch, token]);

  useFocusEffect(
    React.useCallback(() => {
      resetOpeningThread();
    }, [resetOpeningThread])
  );

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
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-6 pb-12">
          <View className="items-center max-w-[340px]">
            {/* Visual Icon with Lock Overlay */}
            <View className="mb-12">
              <View className="w-32 h-32 bg-accent/5 dark:bg-accent/10 rounded-[40px] items-center justify-center border border-accent/10">
                <Ionicons
                  name="chatbubbles"
                  size={64}
                  color={colors.accent}
                />
              </View>
              <View className="absolute -top-2 -right-2 bg-red-500 w-10 h-10 rounded-full items-center justify-center border-4 border-app shadow-lg">
                <Ionicons name="lock-closed" size={20} color="white" />
              </View>
            </View>

            <Text className="text-4xl font-clash font-bold tracking-tight text-app text-center mb-3">
              Coaching Chat
            </Text>

            <Text className="text-[15px] font-outfit text-center text-secondary leading-relaxed max-w-[280px] mb-12">
              Get direct 1-on-1 access to your coach for personalized feedback, video reviews, and real-time guidance.
            </Text>

            {/* Benefits */}
            <View className="w-full space-y-5 mb-12 px-2">
              {[
                "Direct 1-on-1 chat with your coach",
                "Share training videos for quick feedback",
                "Get answers to questions in real time",
                "Stay perfectly aligned with your goals",
              ].map((benefit, i) => (
                <View key={i} className="flex-row items-start gap-4">
                  <View className="mt-0.5 h-5 w-5 rounded-full bg-accent/10 items-center justify-center">
                    <Ionicons name="checkmark" size={12} color={colors.accent} />
                  </View>
                  <Text className="font-outfit text-sm text-app flex-1 leading-snug">
                    {benefit}
                  </Text>
                </View>
              ))}
            </View>

            <View className="w-full bg-warning/10 py-4 rounded-2xl border border-warning/20">
              <Text className="text-[13px] font-semibold text-warning text-center">
                This feature is for Premium plan users only.
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ====================== INBOX VIEW ======================
  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <View className="px-6 pt-8 pb-5">
        <View className="rounded-[28px] border px-5 py-5" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-4xl font-clash font-bold tracking-tight text-app">
                Messages
              </Text>
              <Text className="mt-2 text-base font-outfit" style={{ color: colors.textSecondary }}>
                Cleaner chat, faster replies, and a calmer mobile flow.
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
                Real-time updates
              </Text>
            </View>
            <View className="rounded-full px-3 py-2" style={{ backgroundColor: colors.backgroundSecondary }}>
              <Text className="text-[11px] font-outfit font-semibold text-app">
                Media sharing
              </Text>
            </View>
          </View>
        </View>
      </View>

      <InboxScreen
        threads={sortedThreads}
        typingStatus={typingStatus}
        isLoading={isLoading}
        openingThreadId={openingThreadId}
        onRefresh={loadMessages}
        onOpenThread={openThread}
        backgroundSecondary={colors.backgroundSecondary}
        borderColor={colors.border}
        accentLight={colors.accentLight}
        textSecondaryColor={colors.textSecondary}
      />
    </SafeAreaView>
  );
}
