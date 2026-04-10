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
import { ActivityIndicator, Pressable, View } from "react-native";
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
    handleSendGif,
    handleToggleReaction,
    handleDeleteMessage,
  } = useMessagesController();

  const [gifPickerOpen, setGifPickerOpen] = React.useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = React.useState(false);
  const [reactionEmojiTarget, setReactionEmojiTarget] =
    React.useState<ChatMessage | null>(null);
  const [lockedSheetOpen, setLockedSheetOpen] = React.useState(false);
  const [messageActionsTarget, setMessageActionsTarget] =
    React.useState<ChatMessage | null>(null);

  const lockedSheetRef = React.useRef<BottomSheetModal>(null);
  const messageActionsSheetRef = React.useRef<BottomSheetModal>(null);

  React.useEffect(() => {
    const ref = lockedSheetRef.current;
    if (!ref) return;
    if (lockedSheetOpen) ref.present();
    else ref.dismiss();
  }, [lockedSheetOpen]);

  React.useEffect(() => {
    const ref = messageActionsSheetRef.current;
    if (!ref) return;
    if (messageActionsTarget) ref.present();
    else ref.dismiss();
  }, [messageActionsTarget]);

  const handleLockedPress = React.useCallback(() => {
    setLockedSheetOpen(true);
  }, [router]);

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
  const canSendInThread = isGroupThread ? true : canMessage;

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
        onOpenReactionPicker={(message) => setReactionTarget(message)}
        composerDisabled={!canSendInThread}
        pendingAttachment={pendingAttachment}
        onRemovePendingAttachment={handleRemovePendingAttachment}
        isUploadingAttachment={isUploadingAttachment}
        disabledMessage={
          !canSendInThread
            ? "Messaging isn’t enabled for your plan."
            : undefined
        }
        onDisabledPress={handleLockedPress}
        coachingContextLabel={isYouthAthleteRole ? focusName : undefined}
      />
      <ReactionPickerModal
        reactionTarget={reactionTarget}
        options={reactionOptions}
        onClose={() => setReactionTarget(null)}
        onSelect={handleToggleReaction}
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
        ref={lockedSheetRef}
        index={0}
        snapPoints={["38%"]}
        onDismiss={() => setLockedSheetOpen(false)}
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
            Messaging locked
          </Text>
          <Text
            className="mt-2 font-outfit text-[13px]"
            style={{ color: colors.textSecondary }}
          >
            Messaging isn’t enabled for your current plan.
          </Text>
          <Pressable
            onPress={() => {
              setLockedSheetOpen(false);
              requestGlobalTabChange(0);
              router.replace("/(tabs)/programs");
            }}
            className="mt-6 h-12 rounded-2xl items-center justify-center"
            style={{ backgroundColor: colors.accent }}
          >
            <Text className="font-outfit font-bold text-white">
              Open programs
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setLockedSheetOpen(false)}
            className="mt-3 h-12 rounded-2xl items-center justify-center border"
            style={{
              borderColor: colors.borderSubtle,
              backgroundColor: colors.backgroundSecondary,
            }}
          >
            <Text
              className="font-outfit font-bold"
              style={{ color: colors.text }}
            >
              Not now
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

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
          <View className="mt-5 flex-row gap-3">
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
            <Pressable
              onPress={() => {
                const target = messageActionsTarget;
                setMessageActionsTarget(null);
                if (target && target.from === "user")
                  void handleDeleteMessage(target);
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
