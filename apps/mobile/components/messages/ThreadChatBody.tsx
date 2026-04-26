import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Keyboard,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	View,
} from "react-native";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import type { ChatMessage } from "@/constants/messages";
import { useChatScroll } from "@/hooks/messages/useChatScroll";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import type { MessageThread, TypingStatus } from "@/types/messages";

import { ChatComposer } from "./ChatComposer";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

type ThreadChatBodyProps = {
	thread: MessageThread;
	messages: ChatMessage[];
	effectiveProfileId: number;
	effectiveProfileName: string;
	groupMembers: Record<
		number,
		Record<number, { name: string; avatar?: string | null }>
	>;
	token?: string | null;
	draft: string;
	isLoading: boolean;
	isThreadLoading: boolean;
	typingStatus: TypingStatus;
	textSecondaryColor: string;
	replyTarget: {
		messageId?: number;
		preview?: string;
		authorName?: string;
	} | null;
	onClearReplyTarget: () => void;
	onReplyMessage: (message: ChatMessage) => void;
	onDraftChange: (value: string) => void;
	onSend: () => void;
	onOpenComposerMenu: () => void;
	onLongPressMessage: (message: ChatMessage) => void;
	onReactionPress: (message: ChatMessage, emoji: string) => void;
	onOpenReactionPicker: (message: ChatMessage) => void;
	composerDisabled?: boolean;
	disabledMessage?: string;
	onDisabledPress?: () => void;
	pendingAttachment?: {
		uri: string;
		isImage: boolean;
		fileName: string;
		sizeBytes: number;
	} | null;
	onRemovePendingAttachment?: () => void;
	isUploadingAttachment?: boolean;
	coachingContextLabel?: string;
};

// ── MessageListSection ────────────────────────────────────────────────
// Isolated memo so that draft / typing / reply state changes never
// trigger a re-render of the FlatList or its items.

type MessageListSectionProps = {
	thread: MessageThread;
	messages: ChatMessage[];
	effectiveProfileId: number;
	effectiveProfileName: string;
	groupMembers: Record<
		number,
		Record<number, { name: string; avatar?: string | null }>
	>;
	token?: string | null;
	isLoading: boolean;
	isThreadLoading: boolean;
	listBottomPadding: number;
	isKeyboardVisible: boolean;
	onLongPressMessage: (message: ChatMessage) => void;
	onReactionPress: (message: ChatMessage, emoji: string) => void;
	onOpenReactionPicker: (message: ChatMessage) => void;
	onReplyMessage: (message: ChatMessage) => void;
	coachingContextLabel?: string;
};

const MessageListSection = React.memo(function MessageListSection({
	thread,
	messages,
	effectiveProfileId,
	effectiveProfileName,
	groupMembers,
	token,
	isLoading,
	isThreadLoading,
	listBottomPadding,
	isKeyboardVisible,
	onLongPressMessage,
	onReactionPress,
	onOpenReactionPicker,
	onReplyMessage,
	coachingContextLabel,
}: MessageListSectionProps) {
	const { colors, isDark } = useAppTheme();
	const insets = useAppSafeAreaInsets();
	const reversed = useMemo(() => [...messages].reverse(), [messages]);
	const { listRef, handleScroll, jumpTo, newIncomingCount, highlightedId } =
		useChatScroll(messages, thread.id);

	// Ref so renderItem doesn't close over highlightedId — prevents
	// all FlatList cells getting a new renderItem on every reply-jump.
	const highlightedIdRef = useRef<number | null>(null);
	highlightedIdRef.current = highlightedId;

	const resolveReactionUserName = useCallback(
		(userId: number) => {
			if (userId === effectiveProfileId) return effectiveProfileName || "You";

			if (thread.id.startsWith("group:")) {
				const groupId = Number(thread.id.replace("group:", ""));
				const name = groupMembers?.[groupId]?.[userId]?.name;
				return name || `User ${userId}`;
			}

			if (String(userId) === thread.id) return thread.name;
			return `User ${userId}`;
		},
		[
			effectiveProfileId,
			effectiveProfileName,
			groupMembers,
			thread.id,
			thread.name,
		],
	);

	const renderItem = useCallback(
		({ item }: { item: ChatMessage }) => (
			<MessageBubble
				message={item}
				selfUserId={effectiveProfileId}
				isGroupThread={thread.id.startsWith("group:")}
				token={token}
				resolveReactionUserName={resolveReactionUserName}
				onLongPress={onLongPressMessage}
				onReactionPress={onReactionPress}
				onOpenReactionPicker={onOpenReactionPicker}
				onReply={onReplyMessage}
				onJumpToMessage={jumpTo}
				isHighlighted={highlightedIdRef.current === Number(item.id)}
			/>
		),
		[
			effectiveProfileId,
			token,
			resolveReactionUserName,
			jumpTo,
			thread.id,
			onLongPressMessage,
			onReactionPress,
			onOpenReactionPicker,
			onReplyMessage,
			// highlightedId intentionally omitted — handled via extraData + ref
		],
	);

	const keyExtractor = useCallback((m: ChatMessage) => String(m.id), []);

	return (
		<>
			<FlatList
				ref={listRef}
				inverted
				data={reversed}
				keyExtractor={keyExtractor}
				onScroll={handleScroll}
				// extraData re-renders only the affected cell when highlight changes,
				// while keeping renderItem reference stable (no mass cell re-renders).
				extraData={highlightedId}
				removeClippedSubviews={Platform.OS === "android"}
				maxToRenderPerBatch={10}
				windowSize={5}
				initialNumToRender={14}
				updateCellsBatchingPeriod={16}
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{
					paddingHorizontal: 12,
					paddingTop: 56,
					paddingBottom: listBottomPadding,
				}}
				renderItem={renderItem}
				ListFooterComponent={
					<View style={{ paddingBottom: 8 }}>
						{(isThreadLoading || (isLoading && messages.length === 0)) && (
							<View
								style={{
									alignSelf: "center",
									borderRadius: 999,
									paddingHorizontal: 12,
									paddingVertical: 6,
									backgroundColor: isDark
										? "rgba(255,255,255,0.08)"
										: "rgba(15,23,42,0.06)",
									flexDirection: "row",
									alignItems: "center",
									gap: 8,
								}}
							>
								<ActivityIndicator size="small" color={colors.accent} />
								<Text
									style={{
										color: colors.textSecondary,
										fontFamily: "Outfit-SemiBold",
										fontSize: 11,
									}}
								>
									Loading messages
								</Text>
							</View>
						)}

						{messages.length === 0 && !isLoading && !isThreadLoading ? (
							<View
								style={{
									alignSelf: "center",
									borderRadius: 16,
									paddingHorizontal: 14,
									paddingVertical: 10,
									backgroundColor: isDark
										? "rgba(255,255,255,0.06)"
										: "rgba(15,23,42,0.05)",
								}}
							>
								<Text
									style={{
										color: colors.textSecondary,
										fontFamily: "Outfit-Medium",
										fontSize: 12,
									}}
								>
									{coachingContextLabel
										? `Start chatting about ${coachingContextLabel}`
										: "Start the conversation"}
								</Text>
							</View>
						) : null}
					</View>
				}
			/>

			{newIncomingCount > 0 && (
				<Pressable
					onPress={() =>
						listRef.current?.scrollToOffset({ offset: 0, animated: true })
					}
					className="absolute left-0 right-0 items-center"
					style={{
						bottom: isKeyboardVisible
							? Platform.OS === "ios"
								? 96
								: 88
							: insets.bottom + 88,
					}}
				>
					<View className="bg-accent px-4 py-2 rounded-full flex-row items-center gap-2 shadow-lg">
						<Feather name="arrow-down" size={16} color="white" />
						<Text className="text-white font-outfit-bold text-xs">
							{newIncomingCount} New
						</Text>
					</View>
				</Pressable>
			)}
		</>
	);
});

// ── ThreadChatBody ────────────────────────────────────────────────────

export const ThreadChatBody = React.memo(function ThreadChatBody({
	thread,
	messages,
	effectiveProfileId,
	effectiveProfileName,
	groupMembers,
	token,
	draft,
	isLoading,
	isThreadLoading,
	typingStatus,
	replyTarget,
	onClearReplyTarget,
	onReplyMessage,
	onDraftChange,
	onSend,
	onOpenComposerMenu,
	onLongPressMessage,
	onReactionPress,
	onOpenReactionPicker,
	composerDisabled,
	pendingAttachment,
	onRemovePendingAttachment,
	isUploadingAttachment,
	coachingContextLabel,
}: ThreadChatBodyProps) {
	const { colors } = useAppTheme();
	const insets = useAppSafeAreaInsets();
	const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

	const typingKey = thread.id.startsWith("group:")
		? thread.id
		: `user:${thread.id}`;
	const typing = typingStatus[typingKey];
	const composerDockGap = Platform.OS === "ios" ? 8 : 10;
	const listBottomPadding =
		isKeyboardVisible ? 12 : Math.max(8, insets.bottom);

	useEffect(() => {
		const show = Keyboard.addListener(
			Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
			() => setIsKeyboardVisible(true),
		);
		const hide = Keyboard.addListener(
			Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
			() => setIsKeyboardVisible(false),
		);
		return () => {
			show.remove();
			hide.remove();
		};
	}, []);

	return (
		<KeyboardAvoidingView
			style={{ flex: 1, backgroundColor: colors.background }}
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
		>
			<MessageListSection
				thread={thread}
				messages={messages}
				effectiveProfileId={effectiveProfileId}
				effectiveProfileName={effectiveProfileName}
				groupMembers={groupMembers}
				token={token}
				isLoading={isLoading}
				isThreadLoading={isThreadLoading}
				listBottomPadding={listBottomPadding}
				isKeyboardVisible={isKeyboardVisible}
				onLongPressMessage={onLongPressMessage}
				onReactionPress={onReactionPress}
				onOpenReactionPicker={onOpenReactionPicker}
				onReplyMessage={onReplyMessage}
				coachingContextLabel={coachingContextLabel}
			/>

			<View style={{ paddingBottom: composerDockGap }}>
				{replyTarget && (
					<View className="px-4 pb-2">
						<View className="bg-card rounded-2xl p-3 flex-row items-center border border-border">
							<View className="flex-1">
								<Text className="text-[10px] font-bold text-accent uppercase">
									Replying to {replyTarget.authorName}
								</Text>
								<Text className="text-xs text-secondary" numberOfLines={1}>
									{replyTarget.preview}
								</Text>
							</View>
							<Pressable onPress={onClearReplyTarget}>
								<Feather name="x" size={18} color={colors.textSecondary} />
							</Pressable>
						</View>
					</View>
				)}

				{typing?.isTyping && (
					<View className="px-5 pb-2">
						<TypingIndicator />
					</View>
				)}

				<ChatComposer
					draft={draft}
					onDraftChange={onDraftChange}
					onSend={onSend}
					onOpenMenu={onOpenComposerMenu}
					pendingAttachment={pendingAttachment}
					onRemoveAttachment={onRemovePendingAttachment}
					isUploading={isUploadingAttachment}
					disabled={composerDisabled}
					placeholder={
						thread.id.startsWith("group:")
							? "Message the group"
							: "Type a message"
					}
					isKeyboardVisible={isKeyboardVisible}
					insets={insets}
				/>
			</View>
		</KeyboardAvoidingView>
	);
});
