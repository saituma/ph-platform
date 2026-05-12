import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ChatMessage } from "@/constants/messages";
import { ComposerActionsModal } from "@/components/messages/ComposerActionsModal";
import { EmojiPickerModal } from "@/components/messages/EmojiPickerModal";
import ForwardMessageSheet from "@/components/messages/ForwardMessageSheet";
import { MessageContextMenu } from "@/components/messages/MessageContextMenu";
import { ReactionPickerModal } from "@/components/messages/ReactionPickerModal";
import { ThreadChatBody } from "@/components/messages/ThreadChatBody";
import { ThreadHeader } from "@/components/messages/ThreadHeader";
import ThreadSearchModal from "@/components/messages/ThreadSearchModal";
import { UserProfileSheet, type ProfileTarget } from "@/components/messages/UserProfileSheet";
import { useMessagesController } from "@/hooks/useMessagesController";
import React from "react";
import { Modal, Platform, Pressable, TextInput, View } from "react-native";
import { Pin, X, Flag, AlertTriangle, MessageSquare, Ban, Shield } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { messagesApi } from "@/lib/apiClient/messages";
import * as Haptics from "expo-haptics";
import { useAppSelector } from "@/store/hooks";
import { useAppToast } from "@/hooks/useAppToast";
import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ScaledText";
import { SkeletonThreadScreen } from "@/components/ui/legacy-skeleton";

export default function ThreadScreen() {
  const p = useAdminPastel();
  const { isDark } = useAppTheme();
  const toast = useAppToast();
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

  const [emojiPickerOpen, setEmojiPickerOpen] = React.useState(false);
  const [reactionEmojiTarget, setReactionEmojiTarget] =
    React.useState<ChatMessage | null>(null);
  const [messageActionsTarget, setMessageActionsTarget] =
    React.useState<ChatMessage | null>(null);
  const [profileTarget, setProfileTarget] = React.useState<ProfileTarget | null>(null);
  const [forwardTarget, setForwardTarget] = React.useState<ChatMessage | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [reportModalOpen, setReportModalOpen] = React.useState(false);
  const [reportReason, setReportReason] = React.useState<string | null>(null);
  const [reportDetails, setReportDetails] = React.useState("");
  const [reportTarget, setReportTarget] = React.useState<ChatMessage | null>(null);

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

  const [pinnedOverrides, setPinnedOverrides] = React.useState<Record<string, string | null>>({});

  const handlePinMessage = React.useCallback(async (message: ChatMessage) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await messagesApi.pinMessage(message.id, { token }) as { pinned?: boolean };
      setPinnedOverrides((prev) => ({
        ...prev,
        [message.id]: res?.pinned ? new Date().toISOString() : null,
      }));
      toast.success(res?.pinned ? "Message pinned" : "Message unpinned");
    } catch (e) {
      console.warn("[pin] failed:", e);
      toast.error("Couldn't pin message");
    }
  }, [token, toast]);

  const handleReportMessage = React.useCallback((message: ChatMessage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setReportTarget(message);
    setReportModalOpen(true);
  }, []);

  const handleBlockUser = React.useCallback(async (message: ChatMessage) => {
    if (!token || !message.senderId) return;
    try {
      await messagesApi.blockUser(Number(message.senderId), { token });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("User blocked", "You won't see messages from this person.");
    } catch {
      toast.error("Could not block user", "Please try again.");
    }
  }, [token, toast]);

  const pinnedMessage = React.useMemo(() => {
    for (const msg of localMessages) {
      const override = pinnedOverrides[msg.id];
      if (override !== undefined) {
        if (override !== null) return msg;
        continue;
      }
      if (msg.pinnedAt) return msg;
    }
    return null;
  }, [localMessages, pinnedOverrides]);

  const handleRemovePendingAttachment = React.useCallback(() => {
    setPendingAttachment(null);
  }, [setPendingAttachment]);

  const handleSubmitReport = React.useCallback(async () => {
    if (!reportReason || !reportTarget) return;
    const isGroup = currentThread?.id.startsWith("group:");
    const body = { reason: reportReason, details: reportDetails || undefined };
    try {
      if (isGroup) {
        const groupId = Number(currentThread!.id.replace("group:", ""));
        const messageId = Number(reportTarget.id);
        await messagesApi.groups.reportMessage(groupId, messageId, body, { token });
      } else {
        await messagesApi.reportMessage(Number(reportTarget.id), body, { token });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Report submitted", "We'll review this and take action if needed.");
    } catch {
      toast.error("Report failed", "Please try again.");
    }
    setReportModalOpen(false);
    setReportTarget(null);
    setReportReason(null);
    setReportDetails("");
  }, [reportReason, reportTarget, reportDetails, currentThread, token, toast]);


  if (!currentThread) {
    return (
      <View style={{ flex: 1, backgroundColor: p.pageBg }}>
        <SkeletonThreadScreen />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg }}>
      <ThreadHeader
        thread={currentThread}
        onBack={clearThread}
        onSearch={() => setSearchOpen(true)}
        onMore={() => setReportModalOpen(true)}
        onHeaderPress={handleHeaderPress}
        sharedBoundTag={sharedBoundTag}
        sharedAvatarTag={sharedAvatarTag}
      />
      {pinnedMessage && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
            borderBottomWidth: 1,
            borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
            gap: 10,
          }}
        >
          <Pin size={14} color={p.accent} />
          <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => {/* TODO: scroll to pinned */}}>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 13,
                fontFamily: "Outfit-Medium",
                color: p.textPrimary,
              }}
            >
              {pinnedMessage.text || "Pinned message"}
            </Text>
          </Pressable>
          <Pressable
            hitSlop={8}
            onPress={() => handlePinMessage(pinnedMessage)}
          >
            <X size={14} color={p.textMuted} />
          </Pressable>
        </View>
      )}
      {isYouthAthleteRole ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <View
            style={{
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: p.accentSoft,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Outfit-Bold",
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: p.accent,
              }}
            >
              Coaching thread
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontSize: 14,
                fontFamily: "Outfit-Regular",
                color: p.textSecondary,
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
        textSecondaryColor={p.textSecondary}
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
        onOpenEmojis={() => setEmojiPickerOpen(true)}
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
        onReport={handleReportMessage}
        onBlock={handleBlockUser}
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

      <Modal
        visible={reportModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalOpen(false)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setReportModalOpen(false)} />
          <View
            style={{
              backgroundColor: isDark ? p.cardWhite : "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 16,
              paddingBottom: Platform.OS === "ios" ? 40 : 24,
              paddingHorizontal: 20,
            }}
          >
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: p.divider }} />
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,59,48,0.1)", alignItems: "center", justifyContent: "center" }}>
                <Shield size={20} color="#FF3B30" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                  Report {currentThread.name}
                </Text>
                <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textMuted, marginTop: 2 }}>
                  Select a reason for your report
                </Text>
              </View>
            </View>

            {([
              { key: "harassment", label: "Harassment or bullying", icon: AlertTriangle },
              { key: "inappropriate", label: "Inappropriate content", icon: Ban },
              { key: "spam", label: "Spam or misleading", icon: MessageSquare },
              { key: "other", label: "Other", icon: Flag },
            ] as const).map((option) => {
              const selected = reportReason === option.key;
              const Icon = option.icon;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setReportReason(option.key)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    borderRadius: 14,
                    marginBottom: 6,
                    backgroundColor: selected
                      ? isDark ? "rgba(255,59,48,0.12)" : "rgba(255,59,48,0.06)"
                      : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                    borderWidth: 1,
                    borderColor: selected ? "rgba(255,59,48,0.3)" : "transparent",
                  }}
                >
                  <Icon size={18} color={selected ? "#FF3B30" : p.textMuted} />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 15,
                      fontFamily: selected ? "Outfit-SemiBold" : "Outfit-Medium",
                      color: selected ? "#FF3B30" : p.textPrimary,
                    }}
                  >
                    {option.label}
                  </Text>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: selected ? "#FF3B30" : p.divider,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selected && (
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#FF3B30" }} />
                    )}
                  </View>
                </Pressable>
              );
            })}

            <TextInput
              placeholder="Add details (optional)"
              placeholderTextColor={p.textMuted}
              value={reportDetails}
              onChangeText={setReportDetails}
              multiline
              style={{
                marginTop: 10,
                minHeight: 80,
                maxHeight: 120,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: p.divider,
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                paddingHorizontal: 14,
                paddingTop: 12,
                paddingBottom: 12,
                fontSize: 14,
                fontFamily: "Outfit-Regular",
                color: p.textPrimary,
                textAlignVertical: "top",
              }}
            />

            <Pressable
              onPress={handleSubmitReport}
              disabled={!reportReason}
              style={{
                marginTop: 16,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
                backgroundColor: reportReason ? "#FF3B30" : p.divider,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Outfit-Bold",
                  color: reportReason ? "#FFFFFF" : p.textMuted,
                }}
              >
                Submit Report
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
