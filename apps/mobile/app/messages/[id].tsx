import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ChatMessage } from "@/constants/messages";
import { ComposerActionsModal } from "@/components/messages/ComposerActionsModal";
import { ReactionPickerModal } from "@/components/messages/ReactionPickerModal";
import { ThreadChatBody } from "@/components/messages/ThreadChatBody";
import { ThreadHeader } from "@/components/messages/ThreadHeader";
import { VoiceRecorderModal } from "@/components/messages/VoiceRecorderModal";
import { useMessagesController } from "@/hooks/useMessagesController";
import React from "react";
import { Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSelector } from "@/store/hooks";
import { canAccessTier } from "@/lib/planAccess";

export default function ThreadScreen() {
  const { colors } = useAppTheme();
  const programTier = useAppSelector((state) => state.user.programTier);
  const canMessage = canAccessTier(programTier ?? null, "PHP_Premium");

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
  const [voiceRecorderOpen, setVoiceRecorderOpen] = React.useState(false);
  const [isHoldingVoiceRecord, setIsHoldingVoiceRecord] = React.useState(false);

  const handleLockedPress = React.useCallback(() => {
    Alert.alert(
      "Messaging locked",
      "Messaging is available on PHP Premium plans.",
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
      <SafeAreaView className="flex-1 bg-app items-center justify-center">
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

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
        onOpenVoiceRecorder={() => setVoiceRecorderOpen(true)}
        onVoiceHoldStart={() => {
          setVoiceRecorderOpen(true);
          setIsHoldingVoiceRecord(true);
        }}
        onVoiceHoldEnd={() => {
          setIsHoldingVoiceRecord(false);
        }}
        onLongPressMessage={handleLongPressMessage}
        onReactionPress={handleToggleReaction}
        composerDisabled={!canMessage}
        pendingAttachment={pendingAttachment}
        onRemovePendingAttachment={handleRemovePendingAttachment}
        isUploadingAttachment={isUploadingAttachment}
        disabledMessage={
          !canMessage
            ? "Messaging unlocks on PHP Premium."
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
        onAttachVideo={handleAttachVideo}
        onTakePhoto={handleTakePhoto}
        onRecordVideo={handleRecordVideo}
        onRecordVoice={() => {
          setComposerMenuOpen(false);
          setVoiceRecorderOpen(true);
        }}
      />
      <VoiceRecorderModal
        open={voiceRecorderOpen}
        holdToRecordActive={isHoldingVoiceRecord}
        onClose={() => {
          setVoiceRecorderOpen(false);
          setIsHoldingVoiceRecord(false);
        }}
        onRecorded={(payload) => {
          setPendingAttachment({
            uri: payload.uri,
            fileName: payload.fileName,
            mimeType: payload.mimeType,
            sizeBytes: payload.sizeBytes,
            isImage: false,
          });
        }}
      />
    </SafeAreaView>
  );
}
