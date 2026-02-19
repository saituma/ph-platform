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

export default function MessagesScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { programTier, token } = useAppSelector((state) => state.user);
  const { isSectionHidden } = useAgeExperience();

  const {
    reactionOptions,
    currentThread,
    sortedThreads,
    localMessages,
    typingStatus,
    isLoading,
    isThreadLoading,
    draft,
    reactionTarget,
    composerMenuOpen,
    isUploadingAttachment,
    pendingAttachment,
    openingThreadId,
    setDraft,
    setReactionTarget,
    setComposerMenuOpen,
    setPendingAttachment,
    openThread,
    clearThread,
    handleSend,
    handleAttachFile,
    handleAttachImage,
    handleToggleReaction,
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

  const handleLockedPress = () => {
    Alert.alert(
      "Messaging locked",
      "Messaging is available on PHP Plus and PHP Premium plans.",
      [{ text: "OK" }],
    );
  };

  // ====================== LOCKED / UPGRADE STATE ======================
  if (!canMessage) {
    return (
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-6 pb-12">
          <View className="items-center max-w-[340px]">
            {/* Visual Icon with Lock Overlay */}
            <View className="relative mb-10">
              <View className="w-28 h-28 bg-[#2F8F57]/10 dark:bg-[#2F8F57]/20 rounded-full items-center justify-center">
                <Ionicons
                  name="chatbubble-ellipses"
                  size={68}
                  color="#2F8F57"
                />
              </View>
              <View className="absolute -top-1 -right-1 bg-red-500 w-11 h-11 rounded-full items-center justify-center border-[5px] border-app">
                <Ionicons name="lock-closed" size={24} color="white" />
              </View>
            </View>

            <Text className="text-5xl font-clash tracking-tighter text-[#0E1510] dark:text-[#F2F6F2] text-center mb-4">
              Messages
            </Text>

            <Text className="text-[17px] font-outfit text-center text-[#1D2A22] dark:text-[#D8E6D8] leading-relaxed max-w-[280px] mb-12">
              Connect directly with your coach for instant feedback, video
              reviews, and personalized guidance.
            </Text>

            {/* Benefits */}
            <View className="w-full space-y-6 mb-12">
              {[
                "Direct 1-on-1 chat with your coach",
                "Share training videos for quick feedback",
                "Get answers to questions in real time",
                "Stay perfectly aligned with your goals",
              ].map((benefit, i) => (
                <View key={i} className="flex-row gap-3">
                  <Ionicons name="checkmark-circle" size={22} color="#2F8F57" />
                  <Text className="font-outfit text-[15px] text-[#1D2A22] dark:text-[#D8E6D8] flex-1 leading-tight">
                    {benefit}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => router.push("/plans")}
              className="w-full bg-[#2F8F57] py-4 rounded-3xl active:opacity-90"
            >
              <Text className="text-white font-semibold text-[17px] text-center">
                Unlock Messaging
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/programs")}
              className="mt-6"
            >
              <Text className="text-sm font-medium text-[#2F8F57]">
                Compare all programs →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ====================== THREAD VIEW ======================
  if (currentThread) {
    return (
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <ThreadHeader thread={currentThread} onBack={clearThread} />
        <ThreadChatBody
          thread={currentThread}
          messages={localMessages}
          draft={draft}
          isLoading={isLoading}
          isThreadLoading={isThreadLoading}
          typingStatus={typingStatus}
          textSecondaryColor={colors.textSecondary}
          onDraftChange={setDraft}
          onSend={handleSend}
          onOpenComposerMenu={() => setComposerMenuOpen(true)}
          onLongPressMessage={(message) => {
            const isGroup = message.threadId.startsWith("group:");
            const parsedId = isGroup
              ? Number(message.id.replace("group-", ""))
              : Number(message.id);
            if (!Number.isFinite(parsedId)) return;
            setReactionTarget(message);
          }}
          onReactionPress={handleToggleReaction}
          composerDisabled={!canMessage}
          pendingAttachment={pendingAttachment}
          onRemovePendingAttachment={() => setPendingAttachment(null)}
          isUploadingAttachment={isUploadingAttachment}
          disabledMessage={
            !canMessage
              ? "Messaging unlocks on PHP Plus and PHP Premium."
              : undefined
          }
          onDisabledPress={handleLockedPress}
        />
        <ReactionPickerModal
          reactionTarget={reactionTarget}
          options={reactionOptions}
          onClose={() => setReactionTarget(null)}
          onSelect={handleToggleReaction}
        />
        <ComposerActionsModal
          open={composerMenuOpen}
          onClose={() => setComposerMenuOpen(false)}
          onAttachFile={handleAttachFile}
          onAttachImage={handleAttachImage}
        />
      </SafeAreaView>
    );
  }

  // ====================== INBOX VIEW ======================
  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      {/* Premium Header – matches ProgramsScreen style */}
      <View className="px-6 pt-9 pb-5 border-b border-gray-100 dark:border-gray-800">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-1.5 rounded-full bg-[#2F8F57]" />
          <Text className="text-4xl font-clash tracking-tighter text-[#0E1510] dark:text-[#F2F6F2]">
            Messages
          </Text>
        </View>
        <Text className="text-base font-outfit text-[#1D2A22] dark:text-[#D8E6D8] mt-1">
          Direct coaching chat • Real-time support
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
