import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ComposerActionsModal } from "@/components/messages/ComposerActionsModal";
import { InboxScreen } from "@/components/messages/InboxScreen";
import { ReactionPickerModal } from "@/components/messages/ReactionPickerModal";
import { ThreadChatBody } from "@/components/messages/ThreadChatBody";
import { ThreadHeader } from "@/components/messages/ThreadHeader";
import { useMessagesController } from "@/hooks/useMessagesController";
import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { useAppSelector } from "@/store/hooks";
import { tierRank } from "@/lib/planAccess";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

export default function MessagesScreen() {
  const router = useRouter();
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
  const canMessage = tierRank(programTier) >= tierRank("PHP_Plus");
  const handleLockedPress = () => {
    Alert.alert(
      "Messaging locked",
      "Messaging is available on PHP Plus and PHP Premium plans.",
      [{ text: "OK" }]
    );
  };

  if (!canMessage) {
    return (
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <View className="flex-1 px-6 pt-8">
          <View className="rounded-3xl border border-app/10 bg-secondary/10 p-5">
            <View className="flex-row items-center gap-2 mb-2">
              <Feather name="lock" size={16} color={colors.textSecondary} />
              <Text className="text-sm font-outfit text-secondary uppercase tracking-[1.4px]">
                Locked
              </Text>
            </View>
            <Text className="text-xl font-clash text-app mb-2">
              Messages are locked on PHP
            </Text>
            <Text className="text-sm font-outfit text-secondary leading-relaxed">
              Upgrade to PHP Plus or PHP Premium to chat with your coach.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/plans")}
              className="mt-4 rounded-full bg-accent px-4 py-3"
            >
              <Text className="text-white text-sm font-outfit text-center">View Plans</Text>
            </TouchableOpacity>
          </View>
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
