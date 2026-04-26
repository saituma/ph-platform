import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ChatMessage } from "@/constants/messages";
import { ComposerActionsModal } from "@/components/messages/ComposerActionsModal";
import { GifPickerModal } from "@/components/messages/GifPickerModal";
import { EmojiPickerModal } from "@/components/messages/EmojiPickerModal";
import { ReactionPickerModal } from "@/components/messages/ReactionPickerModal";
import { ThreadChatBody } from "@/components/messages/ThreadChatBody";
import { ThreadHeader } from "@/components/messages/ThreadHeader";
import { useMessagesController } from "@/hooks/useMessagesController";
import React from "react";
import { ActivityIndicator, Pressable, View, Alert } from "react-native";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useLocalSearchParams } from "expo-router";
import { useRouter } from "expo-router";
import { Text } from "@/components/ScaledText";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Feather } from "@/components/ui/theme-icons";

export default function ThreadScreen() {
  const { colors, isDark } = useAppTheme();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const token = useAppSelector((state) => state.user.token);
  const appRole = useAppSelector((state) => state.user.appRole);
  const profile = useAppSelector((state) => state.user.profile);
  const athleteUserId = useAppSelector((state) => state.user.athleteUserId);
  const managedAthletes = useAppSelector((state) => state.user.managedAthletes);
  const canMessage = true;
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
  const isOwnActionTarget = React.useMemo(() => {
    if (!messageActionsTarget) return false;
    const senderId = Number(messageActionsTarget.senderId ?? Number.NaN);
    if (Number.isFinite(senderId)) return senderId === effectiveProfileId;
    return messageActionsTarget.from === "user";
  }, [effectiveProfileId, messageActionsTarget]);

  const messageActionsSheetRef = React.useRef<BottomSheetModal>(null);

  React.useEffect(() => {
    const ref = messageActionsSheetRef.current;
    if (!ref) return;
    if (messageActionsTarget) ref.present();
    else ref.dismiss();
  }, [messageActionsTarget]);

  const handleLongPressMessage = React.useCallback((message: ChatMessage) => {
    setMessageActionsTarget(message);
  }, []);

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

  const isGroupThread = currentThread.id.startsWith("group:");
  const canSendInThread = true;

  return (
    <View
      className="flex-1 bg-app"
      style={{ backgroundColor: colors.background }}
    >
      <ThreadHeader
        thread={currentThread}
        onBack={clearThread}
        sharedBoundTag={sharedBoundTag}
        sharedAvatarTag={sharedAvatarTag}
      />
      {isYouthAthleteRole ? (
        <View className="px-4 pb-2">
          <View
            className="rounded-2xl px-4 py-3 border"
            style={{
              backgroundColor: "rgba(34,197,94,0.08)",
              borderColor: "rgba(34,197,94,0.16)",
            }}
          >
            <Text
              className="text-[11px] font-outfit font-bold uppercase tracking-[1.2px]"
              style={{ color: colors.accent }}
            >
              Coaching thread
            </Text>
            <Text
              className="mt-1 text-sm font-outfit"
              style={{ color: colors.textSecondary }}
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
        composerDisabled={!canSendInThread}
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

      <BottomSheetModal
        ref={messageActionsSheetRef}
        index={0}
        snapPoints={["32%"]}
        onDismiss={() => setMessageActionsTarget(null)}
        enablePanDownToClose
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            opacity={0.4}
            pressBehavior="close"
          />
        )}
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{
          backgroundColor: isDark
            ? "rgba(255,255,255,0.28)"
            : "rgba(15,23,42,0.22)",
        }}
      >
        <BottomSheetView className="px-6 pb-8">
          <Text
            className="font-clash text-[18px] font-bold"
            style={{ color: colors.text }}
          >
            Message actions
          </Text>
          <View className="mt-5 flex-col gap-3">
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => {
                  const target = messageActionsTarget;
                  setMessageActionsTarget(null);
                  if (target) setReactionTarget(target);
                }}
                className="flex-1 h-12 rounded-2xl items-center justify-center border flex-row gap-2"
                style={{
                  borderColor: colors.borderSubtle,
                  backgroundColor: colors.backgroundSecondary,
                }}
              >
                <Feather name="smile" size={18} color={colors.accent} />
                <Text
                  className="font-outfit font-bold"
                  style={{ color: colors.text }}
                >
                  React
                </Text>
              </Pressable>
              {isOwnActionTarget && (
                <Pressable
                  onPress={() => {
                    const target = messageActionsTarget;
                    setMessageActionsTarget(null);
                    if (target) void handleDeleteMessage(target);
                  }}
                  className="flex-1 h-12 rounded-2xl items-center justify-center border flex-row gap-2"
                  style={{
                    borderColor: "rgba(239,68,68,0.25)",
                    backgroundColor: "rgba(239,68,68,0.10)",
                  }}
                >
                  <Feather name="trash-2" size={18} color="#EF4444" />
                  <Text
                    className="font-outfit font-bold"
                    style={{ color: "#EF4444" }}
                  >
                    Delete
                  </Text>
                </Pressable>
              )}
            </View>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => {
                  setMessageActionsTarget(null);
                  Alert.alert("Report User", "Would you like to report this user for inappropriate content? Our moderation team will review this user and take action within 24 hours.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Report", style: "destructive", onPress: () => Alert.alert("User Reported", "A report has been sent to our moderation team.") }
                  ]);
                }}
                className="flex-1 h-12 rounded-2xl items-center justify-center border flex-row gap-2"
                style={{
                  borderColor: "rgba(245,158,11,0.25)",
                  backgroundColor: "rgba(245,158,11,0.10)",
                }}
              >
                <Feather name="flag" size={18} color="#F59E0B" />
                <Text
                  className="font-outfit font-bold"
                  style={{ color: "#F59E0B" }}
                >
                  Report
                </Text>
              </Pressable>
              {!isOwnActionTarget ? (
                <Pressable
                  onPress={() => {
                    setMessageActionsTarget(null);
                    Alert.alert("Block User", "Are you sure you want to block this user? You will no longer receive or see their messages.", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Block", style: "destructive", onPress: () => Alert.alert("User Blocked", "This user has been blocked.") }
                    ]);
                  }}
                  className="flex-1 h-12 rounded-2xl items-center justify-center border flex-row gap-2"
                  style={{
                    borderColor: "rgba(239,68,68,0.25)",
                    backgroundColor: "rgba(239,68,68,0.10)",
                  }}
                >
                  <Feather name="slash" size={18} color="#EF4444" />
                  <Text
                    className="font-outfit font-bold"
                    style={{ color: "#EF4444" }}
                  >
                    Block
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <Pressable
            onPress={() => setMessageActionsTarget(null)}
            className="mt-4 h-12 rounded-2xl items-center justify-center border"
            style={{
              borderColor: colors.borderSubtle,
              backgroundColor: colors.backgroundSecondary,
            }}
          >
            <Text
              className="font-outfit font-bold"
              style={{ color: colors.text }}
            >
              Close
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}
