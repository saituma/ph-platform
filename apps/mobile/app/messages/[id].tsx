import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ChatMessage } from "@/constants/messages";
import { ComposerActionsModal } from "@/components/messages/ComposerActionsModal";
import { GifPickerModal } from "@/components/messages/GifPickerModal";
import { EmojiPickerModal } from "@/components/messages/EmojiPickerModal";
import { ReactionPickerModal } from "@/components/messages/ReactionPickerModal";
import { ThreadChatBody } from "@/components/messages/ThreadChatBody";
import { ThreadHeader } from "@/components/messages/ThreadHeader";
import { useMessagesController } from "@/hooks/useMessagesController";
import { fonts } from "@/constants/theme";
import React from "react";
import { ActivityIndicator, Pressable, View, Alert } from "react-native";
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ScaledText";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";

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

  const textPrimary = isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,10%)";
  const dangerColor = isDark ? "hsl(0, 35%, 60%)" : "hsl(0, 40%, 48%)";
  const dangerBg = isDark ? "hsla(0, 35%, 60%, 0.10)" : "hsla(0, 40%, 48%, 0.06)";
  const dangerBorder = isDark ? "hsla(0, 35%, 60%, 0.25)" : "hsla(0, 40%, 48%, 0.18)";
  const warningColor = isDark ? "hsl(40, 35%, 60%)" : "hsl(40, 45%, 42%)";
  const warningBg = isDark ? "hsla(40, 35%, 60%, 0.10)" : "hsla(40, 45%, 42%, 0.06)";
  const warningBorder = isDark ? "hsla(40, 35%, 60%, 0.25)" : "hsla(40, 45%, 42%, 0.18)";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

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
        backgroundStyle={{ backgroundColor: isDark ? "hsl(220, 8%, 12%)" : colors.card }}
        handleIndicatorStyle={{
          backgroundColor: isDark
            ? "rgba(255,255,255,0.28)"
            : "rgba(15,23,42,0.22)",
        }}
      >
        <BottomSheetView style={{ paddingHorizontal: 24, paddingBottom: 32 }}>
          <Text
            style={{
              fontFamily: "ClashDisplay-Bold",
              fontSize: 18,
              color: textPrimary,
            }}
          >
            Message actions
          </Text>
          <View style={{ marginTop: 20, gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => {
                  const target = messageActionsTarget;
                  setMessageActionsTarget(null);
                  if (target) setReactionTarget(target);
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 48,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  flexDirection: "row",
                  gap: 8,
                  borderColor: cardBorder,
                  backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Ionicons name="happy-outline" size={18} color={colors.accent} />
                <Text style={{ fontFamily: fonts.bodyBold, color: textPrimary }}>
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
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 48,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    flexDirection: "row",
                    gap: 8,
                    borderColor: dangerBorder,
                    backgroundColor: dangerBg,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Ionicons name="trash-outline" size={18} color={dangerColor} />
                  <Text style={{ fontFamily: fonts.bodyBold, color: dangerColor }}>
                    Delete
                  </Text>
                </Pressable>
              )}
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => {
                  setMessageActionsTarget(null);
                  Alert.alert("Report User", "Would you like to report this user for inappropriate content? Our moderation team will review this user and take action within 24 hours.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Report", style: "destructive", onPress: () => Alert.alert("User Reported", "A report has been sent to our moderation team.") }
                  ]);
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 48,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  flexDirection: "row",
                  gap: 8,
                  borderColor: warningBorder,
                  backgroundColor: warningBg,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Ionicons name="flag-outline" size={18} color={warningColor} />
                <Text style={{ fontFamily: fonts.bodyBold, color: warningColor }}>
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
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 48,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    flexDirection: "row",
                    gap: 8,
                    borderColor: dangerBorder,
                    backgroundColor: dangerBg,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Ionicons name="ban-outline" size={18} color={dangerColor} />
                  <Text style={{ fontFamily: fonts.bodyBold, color: dangerColor }}>
                    Block
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <Pressable
            onPress={() => setMessageActionsTarget(null)}
            style={({ pressed }) => ({
              marginTop: 16,
              height: 48,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: cardBorder,
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontFamily: fonts.bodyBold, color: textPrimary }}>
              Close
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}
