import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { InboxScreen } from "@/components/messages/InboxScreen";
import { useMessagesController } from "@/hooks/useMessagesController";
import React from "react";
import { View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
import { usePathname } from "expo-router";

export default function MessagesScreen() {
  const { colors } = useAppTheme();
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.user.token);
  const programTier = useAppSelector((state) => state.user.programTier);
  const { isSectionHidden } = useAgeExperience();
  const insets = useSafeAreaInsets();

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
            Purchase the Premium plan to use messaging.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ====================== INBOX VIEW ======================
  return (
    <View className="flex-1" style={{ paddingTop: insets.top }}>
      <View className="px-6 pt-8 pb-5">
        <View className="rounded-[28px] border px-5 py-5" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-4xl font-telma-bold font-bold tracking-tight text-app">
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
    </View>
  );
}
