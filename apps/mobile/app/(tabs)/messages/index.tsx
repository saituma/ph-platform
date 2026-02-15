import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ComposerActionsModal } from "@/components/messages/ComposerActionsModal";
import { InboxScreen } from "@/components/messages/InboxScreen";
import { ReactionPickerModal } from "@/components/messages/ReactionPickerModal";
import { ThreadChatBody } from "@/components/messages/ThreadChatBody";
import { ThreadHeader } from "@/components/messages/ThreadHeader";
import { useMessagesController } from "@/hooks/useMessagesController";
import React from "react";
import { Alert } from "react-native";
import { useAppSelector } from "@/store/hooks";
import { normalizeProgramTier } from "@/lib/planAccess";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MessagesScreen() {
  const { colors } = useAppTheme();
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
  const { programTier } = useAppSelector((state) => state.user);
  const canMessage = Boolean(normalizeProgramTier(programTier));
  const handleLockedPress = () => {
    Alert.alert(
      "Messaging locked",
      "Complete onboarding and select a plan to message your coach.",
      [{ text: "OK" }]
    );
  };

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
              ? "Messaging unlocks once your plan is active."
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
