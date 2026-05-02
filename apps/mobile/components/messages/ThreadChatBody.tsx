import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Keyboard,
	Platform,
	Pressable,
	View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { FlashList } from "@shopify/flash-list";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { fonts } from "@/constants/theme";
import type { ChatMessage } from "@/constants/messages";
import { useChatScroll } from "@/hooks/messages/useChatScroll";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import type { MessageThread, TypingStatus } from "@/types/messages";

import { computeGroupingMap } from "@/lib/messages/messageGrouping";
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
	onAvatarPress?: (senderId: number, name: string, avatar?: string | null) => void;
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
	onAvatarPress?: (senderId: number, name: string, avatar?: string | null) => void;
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
	onAvatarPress,
	coachingContextLabel,
}: MessageListSectionProps) {
	const { colors, isDark } = useAppTheme();
	const insets = useAppSafeAreaInsets();
	const reversed = useMemo(() => [...messages].reverse(), [messages]);
	const groupingMap = useMemo(() => computeGroupingMap(messages), [messages]);
	const { listRef, handleScroll, jumpTo, newIncomingCount, highlightedId } =
		useChatScroll(messages, thread.id);

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
		({ item }: { item: ChatMessage }) => {
			const meta = groupingMap.get(item.id);
			return (
				<>
					<MessageBubble
						message={item}
						selfUserId={effectiveProfileId}
						isGroupThread={thread.id.startsWith("group:")}
						groupPosition={meta?.position}
						showGroupAvatar={meta?.showAvatar}
						showGroupSenderName={meta?.showSenderName}
						token={token}
						resolveReactionUserName={resolveReactionUserName}
						onLongPress={onLongPressMessage}
						onReactionPress={onReactionPress}
						onOpenReactionPicker={onOpenReactionPicker}
						onReply={onReplyMessage}
						onJumpToMessage={jumpTo}
						onAvatarPress={onAvatarPress}
						isHighlighted={highlightedId === Number(item.id)}
					/>
					{meta?.dateSeparator && (
						<View style={{ alignItems: "center", paddingVertical: 10 }}>
							<View
								style={{
									backgroundColor: isDark
										? "rgba(255,255,255,0.06)"
										: "rgba(0,0,0,0.04)",
									borderRadius: 10,
									paddingHorizontal: 12,
									paddingVertical: 4,
								}}
							>
								<Text
									style={{
										fontSize: 12,
										color: colors.textDim,
										fontFamily: fonts.labelMedium,
									}}
								>
									{meta.dateSeparator}
								</Text>
							</View>
						</View>
					)}
				</>
			);
		},
		[
			effectiveProfileId,
			token,
			resolveReactionUserName,
			jumpTo,
			thread.id,
			groupingMap,
			isDark,
			colors.textDim,
			onLongPressMessage,
			onReactionPress,
			onOpenReactionPicker,
			onReplyMessage,
			onAvatarPress,
			highlightedId,
		],
	);

	const keyExtractor = useCallback((m: ChatMessage) => String(m.id), []);

	return (
		<>
			<FlashList
				ref={listRef}
				data={reversed}
				keyExtractor={keyExtractor}
				onScroll={handleScroll}
				extraData={highlightedId}
				keyboardShouldPersistTaps="handled"
				maintainVisibleContentPosition={{ startRenderingFromBottom: true, autoscrollToBottomThreshold: 60 }}
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
					style={{
						position: "absolute",
						left: 0,
						right: 0,
						alignItems: "center",
						bottom: isKeyboardVisible
							? Platform.OS === "ios"
								? 96
								: 88
							: insets.bottom + 88,
					}}
				>
					<View
						style={{
							backgroundColor: colors.accent,
							paddingHorizontal: 16,
							paddingVertical: 8,
							borderRadius: 99,
							flexDirection: "row",
							alignItems: "center",
							gap: 8,
						}}
					>
						<Ionicons name="arrow-down" size={16} color="hsl(220, 5%, 98%)" />
						<Text
							style={{
								color: "hsl(220, 5%, 98%)",
								fontFamily: fonts.bodyBold,
								fontSize: 12,
							}}
						>
							{newIncomingCount} New
						</Text>
					</View>
				</Pressable>
			)}
		</>
	);
});

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
	onAvatarPress,
	composerDisabled,
	pendingAttachment,
	onRemovePendingAttachment,
	isUploadingAttachment,
	coachingContextLabel,
}: ThreadChatBodyProps) {
	const { colors, isDark } = useAppTheme();
	const insets = useAppSafeAreaInsets();
	const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

	const typingKey = thread.id.startsWith("group:")
		? thread.id
		: `user:${thread.id}`;
	const typing = typingStatus[typingKey];
	const composerDockGap = Platform.OS === "ios" ? 8 : 10;
	const listBottomPadding =
		isKeyboardVisible ? 12 : Math.max(8, insets.bottom);

	const labelColor = isDark ? "hsl(220, 5%, 55%)" : "hsl(220, 5%, 45%)";
	const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
	const cardBg = isDark ? "hsl(220, 8%, 12%)" : colors.card;

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
				onAvatarPress={onAvatarPress}
				coachingContextLabel={coachingContextLabel}
			/>

			<View style={{ paddingBottom: composerDockGap }}>
				{replyTarget && (
					<View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
						<View
							style={{
								backgroundColor: cardBg,
								borderRadius: 16,
								padding: 12,
								flexDirection: "row",
								alignItems: "center",
								borderWidth: 1,
								borderColor: cardBorder,
							}}
						>
							<View style={{ flex: 1 }}>
								<Text
									style={{
										fontSize: 10,
										fontFamily: fonts.bodyBold,
										textTransform: "uppercase",
										letterSpacing: 1,
										color: colors.accent,
									}}
								>
									Replying to {replyTarget.authorName}
								</Text>
								<Text
									numberOfLines={1}
									style={{
										fontSize: 12,
										fontFamily: fonts.bodyMedium,
										color: labelColor,
									}}
								>
									{replyTarget.preview}
								</Text>
							</View>
							<Pressable onPress={onClearReplyTarget}>
								<Ionicons name="close" size={18} color={labelColor} />
							</Pressable>
						</View>
					</View>
				)}

				{typing?.isTyping && (
					<View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
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
