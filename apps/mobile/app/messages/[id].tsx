import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ChatMessage } from "@/constants/messages";
import { ComposerActionsModal } from "@/components/messages/ComposerActionsModal";
import { ReactionPickerModal } from "@/components/messages/ReactionPickerModal";
import { ThreadChatBody } from "@/components/messages/ThreadChatBody";
import { ThreadHeader } from "@/components/messages/ThreadHeader";
import { useMessagesController } from "@/hooks/useMessagesController";
import React from "react";
import { Alert, ActivityIndicator, View } from "react-native";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { canUseCoachMessaging } from "@/lib/messagingAccess";
import { apiRequest } from "@/lib/api";
import { setMessagingAccessTiers, setProgramTier } from "@/store/slices/userSlice";
import { useLocalSearchParams } from "expo-router";

export default function ThreadScreen() {
  const { colors } = useAppTheme();
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.user.token);
  const programTier = useAppSelector((state) => state.user.programTier);
  const messagingAccessTiers = useAppSelector((state) => state.user.messagingAccessTiers);
  const canMessage = canUseCoachMessaging(programTier, messagingAccessTiers);

  React.useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const status = await apiRequest<{
          currentProgramTier?: string | null;
          messagingAccessTiers?: string[] | null;
        }>("/billing/status", { token, suppressStatusCodes: [401, 403, 404], skipCache: true });
        dispatch(setProgramTier(status?.currentProgramTier ?? null));
        dispatch(
          setMessagingAccessTiers(
            Array.isArray(status?.messagingAccessTiers)
              ? status!.messagingAccessTiers!
              : ["PHP", "PHP_Plus", "PHP_Premium"],
          ),
        );
      } catch {
        // no-op
      }
    })();
  }, [dispatch, token]);
  const { sharedBoundTag, sharedAvatarTag } = useLocalSearchParams<{
    sharedBoundTag?: string;
    sharedAvatarTag?: string;
  }>();

  const {
    reactionOptions,
    currentThread,
    localMessages,
    typingStatus,
    isLoading,
    isThreadLoading,
    draft,
    reactionTarget,
    composerMenuOpen,
    isUploadingAttachment,
    pendingAttachment,
    setDraft,
    setReactionTarget,
    setComposerMenuOpen,
    setPendingAttachment,
    clearThread,
    handleSend,
    handleAttachFile,
    handleAttachImage,
    handleAttachVideo,
    handleTakePhoto,
    handleRecordVideo,
    handleToggleReaction,
    handleDeleteMessage,
  } = useMessagesController();

  const handleLockedPress = React.useCallback(() => {
    Alert.alert(
      "Messaging locked",
      "Messaging isn’t enabled for your current plan.",
      [{ text: "OK" }],
    );
  }, []);

  const handleLongPressMessage = React.useCallback((message: ChatMessage) => {
    const isOwn = message.from === "user";
    if (isOwn) {
      Alert.alert("Message options", "Choose an action", [
        {
          text: "React",
          onPress: () => {
            setReactionTarget(message);
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeleteMessage(message),
        },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }
    setReactionTarget(message);
  }, [handleDeleteMessage, setReactionTarget]);

  const handleRemovePendingAttachment = React.useCallback(() => {
    setPendingAttachment(null);
  }, [setPendingAttachment]);

  if (!currentThread) {
    return (
      <View className="flex-1 bg-app items-center justify-center">
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-app" style={{ backgroundColor: colors.background }}>
      <ThreadHeader
        thread={currentThread}
        onBack={clearThread}
        sharedBoundTag={sharedBoundTag}
        sharedAvatarTag={sharedAvatarTag}
      />
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
        onLongPressMessage={handleLongPressMessage}
        onReactionPress={handleToggleReaction}
        composerDisabled={!canMessage}
        pendingAttachment={pendingAttachment}
        onRemovePendingAttachment={handleRemovePendingAttachment}
        isUploadingAttachment={isUploadingAttachment}
        disabledMessage={!canMessage ? "Messaging isn’t enabled for your plan." : undefined}
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
        onAttachVideo={handleAttachVideo}
        onTakePhoto={handleTakePhoto}
        onRecordVideo={handleRecordVideo}
      />
    </View>
  );
}
