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
import {
  setMessagingAccessTiers,
  setProgramTier,
} from "@/store/slices/userSlice";
import { useLocalSearchParams } from "expo-router";
import { useRouter } from "expo-router";
import { requestGlobalTabChange } from "@/context/ActiveTabContext";
import { Text } from "@/components/ScaledText";
import { Pressable } from "react-native";

export default function ThreadScreen() {
  const { colors } = useAppTheme();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const token = useAppSelector((state) => state.user.token);
  const programTier = useAppSelector((state) => state.user.programTier);
  const messagingAccessTiers = useAppSelector(
    (state) => state.user.messagingAccessTiers,
  );
  const appRole = useAppSelector((state) => state.user.appRole);
  const profile = useAppSelector((state) => state.user.profile);
  const athleteUserId = useAppSelector((state) => state.user.athleteUserId);
  const managedAthletes = useAppSelector((state) => state.user.managedAthletes);
  const canMessage = canUseCoachMessaging(programTier, messagingAccessTiers);
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

  React.useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const status = await apiRequest<{
          currentProgramTier?: string | null;
          messagingAccessTiers?: string[] | null;
        }>("/billing/status", {
          token,
          suppressStatusCodes: [401, 403, 404],
          skipCache: true,
        });
        dispatch(setProgramTier(status?.currentProgramTier ?? null));
        dispatch(
          setMessagingAccessTiers(
            Array.isArray(status?.messagingAccessTiers)
              ? status!.messagingAccessTiers!
              : ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"],
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
    handleToggleReaction,
    handleDeleteMessage,
  } = useMessagesController();

  const handleLockedPress = React.useCallback(() => {
    Alert.alert(
      "Messaging locked",
      "Messaging isn’t enabled for your current plan.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Programs",
          onPress: () => {
            requestGlobalTabChange(0);
            router.replace("/(tabs)/programs");
          },
        },
      ],
    );
  }, [router]);

  const handleLongPressMessage = React.useCallback(
    (message: ChatMessage) => {
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
    },
    [handleDeleteMessage, setReactionTarget],
  );

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
        composerDisabled={!canMessage}
        pendingAttachment={pendingAttachment}
        onRemovePendingAttachment={handleRemovePendingAttachment}
        isUploadingAttachment={isUploadingAttachment}
        disabledMessage={
          !canMessage ? "Messaging isn’t enabled for your plan." : undefined
        }
        onDisabledPress={handleLockedPress}
        coachingContextLabel={isYouthAthleteRole ? focusName : undefined}
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
