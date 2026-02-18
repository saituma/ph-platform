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
import { setLatestSubscriptionRequest, setProgramTier } from "@/store/slices/userSlice";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";

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
    return <AgeGate title="Messages locked" message="Messaging is restricted for this age." />;
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
    }, [dispatch, token])
  );
  const handleLockedPress = () => {
    Alert.alert(
      "Messaging locked",
      "Messaging is available on PHP Plus and PHP Premium plans.",
      [{ text: "OK" }]
    );
  };

  if (!canMessage) {
    return (
      <SafeAreaView className="flex-1 bg-app items-center justify-center px-6" edges={["top"]}>
        <View className="w-full rounded-3xl border border-app bg-input p-6">
          <Text className="text-xl font-clash text-app mb-2">Messaging Locked</Text>
          <Text className="text-sm font-outfit text-secondary mb-4">
            Messaging is available on PHP Plus and PHP Premium plans.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/plans")}
            className="rounded-2xl bg-accent py-3 items-center"
          >
            <Text className="text-sm font-outfit text-white">View Plans</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
            const parsedId = isGroup ? Number(message.id.replace("group-", "")) : Number(message.id);
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

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
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
