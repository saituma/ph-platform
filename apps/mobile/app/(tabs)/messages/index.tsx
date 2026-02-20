import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ComposerActionsModal } from "@/components/messages/ComposerActionsModal";
import { InboxScreen } from "@/components/messages/InboxScreen";
import { ReactionPickerModal } from "@/components/messages/ReactionPickerModal";
import { ThreadChatBody } from "@/components/messages/ThreadChatBody";
import { ThreadHeader } from "@/components/messages/ThreadHeader";
import { useMessagesController } from "@/hooks/useMessagesController";
import React from "react";
import { Alert, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { canAccessTier } from "@/lib/planAccess";
import { Text } from "@/components/ScaledText";
import { useFocusEffect } from "@react-navigation/native";
import { apiRequest } from "@/lib/api";
import {
  setLatestSubscriptionRequest,
  setProgramTier,
} from "@/store/slices/userSlice";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";
import { Ionicons } from "@expo/vector-icons";
import { useTabVisibility } from "@/context/TabVisibilityContext";
import { useEffect } from "react";

export default function MessagesScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
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
  } = useMessagesController();

  const canMessage = canAccessTier(programTier ?? null, "PHP_Plus");

  if (isSectionHidden("messages")) {
    return (
      <AgeGate
        title="Messages locked"
        message="Messaging is restricted for this age."
      />
    );
  }

  useFocusEffect(
    React.useCallback(() => {
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
          });
          dispatch(setProgramTier(status?.currentProgramTier ?? null));
          dispatch(setLatestSubscriptionRequest(status?.latestRequest ?? null));
        } catch {
          // no-op
        }
      })();
    }, [dispatch, token]),
  );

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

            <TouchableOpacity
              onPress={() => router.push("/plans")}
              className="w-full bg-accent py-4 rounded-2xl active:opacity-90 shadow-lg shadow-accent/20"
            >
              <Text className="text-white font-bold text-base text-center">
                Upgrade to Unlock
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/programs")}
              className="mt-6"
            >
              <Text className="text-sm font-semibold text-accent/80">
                Compare Plan Features →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ====================== INBOX VIEW ======================
  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      {/* Premium Header – matches ProgramsScreen style */}
      <View className="px-6 pt-10 pb-6">
        <View className="flex-row items-center gap-3 mb-1">
          <View className="h-8 w-1.5 rounded-full bg-[#2F8F57]" />
          <Text className="text-4xl font-clash font-bold tracking-tight text-[#0E1510] dark:text-[#F2F6F2]">
            Messages
          </Text>
        </View>
        <Text className="text-base font-outfit text-secondary ml-5">
          Direct coaching chat · Real-time support
        </Text>
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
