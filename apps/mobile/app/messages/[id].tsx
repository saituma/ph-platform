import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ChatMessage } from "@/constants/messages";
import { ComposerActionsModal } from "@/components/messages/ComposerActionsModal";
import { GifPickerModal } from "@/components/messages/GifPickerModal";
import { EmojiPickerModal } from "@/components/messages/EmojiPickerModal";
import ForwardMessageSheet from "@/components/messages/ForwardMessageSheet";
import { MessageContextMenu } from "@/components/messages/MessageContextMenu";
import { ReactionPickerModal } from "@/components/messages/ReactionPickerModal";
import { ThreadChatBody } from "@/components/messages/ThreadChatBody";
import { ThreadHeader } from "@/components/messages/ThreadHeader";
import ThreadSearchModal from "@/components/messages/ThreadSearchModal";
import { UserProfileSheet, type ProfileTarget } from "@/components/messages/UserProfileSheet";
import { useMessagesController } from "@/hooks/useMessagesController";
import { fonts } from "@/constants/theme";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { messagesApi } from "@/lib/apiClient/messages";
import * as Haptics from "expo-haptics";
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ScaledText";

export default function ThreadScreen() {
  const { colors, isDark } = useAppTheme();
  const token = useAppSelector((state) => state.user.token);
  const appRole = useAppSelector((state) => state.user.appRole);
  const profile = useAppSelector((state) => state.user.profile);
  const athleteUserId = useAppSelector((state) => state.user.athleteUserId);
  const managedAthletes = useAppSelector((state) => state.user.managedAthletes);
  const isYouthAthleteRole =
    appRole === "youth_athlete_guardian_only" ||
    appRole === "youth_athlete_team_guardian";
  const focusAthlete = React.useMemo(() => {
    if (!managedAthletes.length) return null;
    return (
      managedAthletes.find(
        (athlete) =>
          athlete.id === athleteUserId || athlete.userId === athleteUserId,
      ) ?? managedAthletes[0]
    );
  }, [athleteUserId, managedAthletes]);
  const focusName = focusAthlete?.name || profile?.name || "Athlete";

  const { sharedBoundTag, sharedAvatarTag } = useLocalSearchParams<{
    sharedBoundTag?: string;
    sharedAvatarTag?: string;
  }>();

  const {
    reactionOptions,
    effectiveProfileId,
    effectiveProfileName,
    groupMembers,
    currentThread,
    sortedThreads,
    localMessages,
    typingStatus,
    isLoading,
    isThreadLoading,
    draft,
    replyTarget,
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
    setReplyTargetFromMessage,
    clearReplyTarget,
    handleAttachFile,
    handleAttachImage,
    handleAttachVideo,
    handleTakePhoto,
    handleRecordVideo,
    handleSendGif,
    handleToggleReaction,
    handleDeleteMessage,
  } = useMessagesController();

  const [gifPickerOpen, setGifPickerOpen] = React.useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = React.useState(false);
  const [reactionEmojiTarget, setReactionEmojiTarget] =
    React.useState<ChatMessage | null>(null);
  const [messageActionsTarget, setMessageActionsTarget] =
    React.useState<ChatMessage | null>(null);
  const [profileTarget, setProfileTarget] = React.useState<ProfileTarget | null>(null);
  const [forwardTarget, setForwardTarget] = React.useState<ChatMessage | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);

  const handleLongPressMessage = React.useCallback((message: ChatMessage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessageActionsTarget(message);
  }, []);

  const handleCopyMessage = React.useCallback((message: ChatMessage) => {
    if (message.text) {
      Clipboard.setStringAsync(message.text);
    }
  }, []);

  const handleAvatarPress = React.useCallback(
    (senderId: number, name: string, avatar?: string | null) => {
      setProfileTarget({ kind: "dm", id: senderId, name, avatar });
    },
    [],
  );

  const handleHeaderPress = React.useCallback(() => {
    if (!currentThread) return;
    const isGroup = currentThread.id.startsWith("group:");
    if (isGroup) {
      const groupId = Number(currentThread.id.replace("group:", ""));
      const members = groupMembers[groupId];
      const memberCount = members ? Object.keys(members).length : undefined;
      setProfileTarget({
        kind: "group",
        id: currentThread.id,
        name: currentThread.name,
        avatar: currentThread.avatarUrl,
        memberCount,
      });
    } else {
      setProfileTarget({
        kind: "dm",
        id: Number(currentThread.id),
        name: currentThread.name,
        avatar: currentThread.avatarUrl,
        role: currentThread.role,
        lastSeen: currentThread.lastSeen,
      });
    }
  }, [currentThread, groupMembers]);

  const handlePinMessage = React.useCallback(async (message: ChatMessage) => {
    try {
      await messagesApi.pinMessage(message.id, { token });
    } catch (e) {
      console.warn("[pin] failed:", e);
    }
  }, [token]);

  const handleRemovePendingAttachment = React.useCallback(() => {
    setPendingAttachment(null);
  }, [setPendingAttachment]);


  if (!currentThread) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ThreadHeader
        thread={currentThread}
        onBack={clearThread}
        onSearch={() => setSearchOpen(true)}
        onHeaderPress={handleHeaderPress}
        sharedBoundTag={sharedBoundTag}
        sharedAvatarTag={sharedAvatarTag}
      />
      {isYouthAthleteRole ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <View
            style={{
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderWidth: 1,
              backgroundColor: isDark ? "hsla(155, 25%, 50%, 0.08)" : "hsla(155, 35%, 50%, 0.06)",
              borderColor: isDark ? "hsla(155, 25%, 50%, 0.16)" : "hsla(155, 35%, 50%, 0.12)",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontFamily: fonts.bodyBold,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: colors.accent,
              }}
            >
              Coaching thread
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontSize: 14,
                fontFamily: "Outfit",
                color: isDark ? "hsl(220,5%,55%)" : "hsl(220,5%,45%)",
              }}
            >
              Keep {focusName}&apos;s progress updates in one thread for faster
              coach feedback.
            </Text>
          </View>
        </View>
      ) : null}
      <ThreadChatBody
        thread={currentThread}
        messages={localMessages}
        effectiveProfileId={effectiveProfileId}
        effectiveProfileName={effectiveProfileName}
        groupMembers={groupMembers}
        token={token}
        draft={draft}
        replyTarget={replyTarget}
        onClearReplyTarget={clearReplyTarget}
        onReplyMessage={setReplyTargetFromMessage}
        isLoading={isLoading}
        isThreadLoading={isThreadLoading}
        typingStatus={typingStatus}
        textSecondaryColor={colors.textSecondary}
        onDraftChange={setDraft}
        onSend={handleSend}
        onOpenComposerMenu={() => setComposerMenuOpen(true)}
        onLongPressMessage={handleLongPressMessage}
        onReactionPress={handleToggleReaction}
        onOpenReactionPicker={(message) => setReactionTarget(message)}
        onAvatarPress={handleAvatarPress}
        composerDisabled={false}
        pendingAttachment={pendingAttachment}
        onRemovePendingAttachment={handleRemovePendingAttachment}
        isUploadingAttachment={isUploadingAttachment}
        coachingContextLabel={isYouthAthleteRole ? focusName : undefined}
      />
      <ReactionPickerModal
        reactionTarget={reactionTarget}
        options={reactionOptions}
        onClose={() => setReactionTarget(null)}
        onSelect={(message, emoji) => {
          setReactionTarget(null);
          void handleToggleReaction(message, emoji);
        }}
        onOpenEmojiPicker={(message) => {
          setReactionTarget(null);
          setReactionEmojiTarget(message);
        }}
      />
      <ComposerActionsModal
        open={composerMenuOpen}
        onClose={() => setComposerMenuOpen(false)}
        onAttachFile={handleAttachFile}
        onAttachImage={handleAttachImage}
        onAttachVideo={handleAttachVideo}
        onTakePhoto={handleTakePhoto}
        onRecordVideo={handleRecordVideo}
        onOpenGifs={() => setGifPickerOpen(true)}
        onOpenEmojis={() => setEmojiPickerOpen(true)}
      />
      <GifPickerModal
        open={gifPickerOpen}
        onClose={() => setGifPickerOpen(false)}
        token={token}
        onSelectGif={(url) => {
          setGifPickerOpen(false);
          void handleSendGif(url);
        }}
      />
      <EmojiPickerModal
        open={emojiPickerOpen || Boolean(reactionEmojiTarget)}
        onClose={() => {
          setEmojiPickerOpen(false);
          setReactionEmojiTarget(null);
        }}
        onSelectEmoji={(emoji) => {
          if (reactionEmojiTarget) {
            const target = reactionEmojiTarget;
            setReactionEmojiTarget(null);
            void handleToggleReaction(target, emoji);
            return;
          }
          setEmojiPickerOpen(false);
          setDraft(`${draft}${emoji}`);
        }}
      />

      <MessageContextMenu
        message={messageActionsTarget}
        selfUserId={effectiveProfileId}
        onClose={() => setMessageActionsTarget(null)}
        onReaction={(msg, emoji) => {
          void handleToggleReaction(msg, emoji);
        }}
        onReply={setReplyTargetFromMessage}
        onCopy={handleCopyMessage}
        onPin={handlePinMessage}
        onForward={(msg) => setForwardTarget(msg)}
        onDelete={handleDeleteMessage}
        onOpenEmojiPicker={(msg) => setReactionTarget(msg)}
      />
      <UserProfileSheet
        target={profileTarget}
        onClose={() => setProfileTarget(null)}
      />
      <ForwardMessageSheet
        message={forwardTarget}
        threads={sortedThreads}
        token={token}
        onClose={() => setForwardTarget(null)}
        onForwarded={() => setForwardTarget(null)}
      />
      <ThreadSearchModal
        visible={searchOpen}
        threadId={currentThread.id}
        token={token}
        onClose={() => setSearchOpen(false)}
        onJumpToMessage={() => setSearchOpen(false)}
      />
    </View>
  );
}
