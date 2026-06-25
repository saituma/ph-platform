import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Keyboard,
	Platform,
	Pressable,
	View,
} from "react-native";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { fonts } from "@/constants/theme";
import type { ChatMessage } from "@/constants/messages";
import { useChatScroll } from "@/hooks/messages/useChatScroll";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import type { MessageThread, TypingStatus } from "@/types/messages";

import { computeGroupingMap, type MessageGroupMeta } from "@/lib/messages/messageGrouping";
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
	avoidKeyboardWithPadding?: boolean;
	jumpToRef?: React.MutableRefObject<((id: number) => void) | null>;
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
	jumpToRef?: React.MutableRefObject<((id: number) => void) | null>;
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
	jumpToRef,
}: MessageListSectionProps) {
	const { colors, isDark } = useAppTheme();
	const insets = useAppSafeAreaInsets();
	const isGroupThread = useMemo(() => thread.id.startsWith("group:"), [thread.id]);
	const { listRef, handleScroll, jumpTo, newIncomingCount, highlightedId } =
		useChatScroll(messages, thread.id);

	useEffect(() => {
		if (jumpToRef) jumpToRef.current = jumpTo;
	}, [jumpTo, jumpToRef]);

	const groupingMapRef = useRef<Map<string | number, MessageGroupMeta>>(new Map());
	groupingMapRef.current = useMemo(() => computeGroupingMap(messages), [messages]);

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
			const meta = groupingMapRef.current.get(item.id);
			return (
				<MessageBubble
					message={item}
					selfUserId={effectiveProfileId}
					isGroupThread={isGroupThread}
					groupPosition={meta?.position}
					showGroupAvatar={meta?.showAvatar}
					showGroupSenderName={meta?.showSenderName}
					dateSeparator={meta?.dateSeparator ?? null}
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
			);
		},
		[
			effectiveProfileId,
			token,
			resolveReactionUserName,
			jumpTo,
			isGroupThread,
			onLongPressMessage,
			onReactionPress,
			onOpenReactionPicker,
			onReplyMessage,
			onAvatarPress,
			highlightedId,
		],
	);

	const keyExtractor = useCallback((m: ChatMessage) => String(m.id), []);

	const showLoadingFooter = isThreadLoading || (isLoading && messages.length === 0);
	const showEmptyFooter = messages.length === 0 && !isLoading && !isThreadLoading;
	const footerComponent = useMemo(
		() => (
			<View style={{ paddingBottom: 8 }}>
				{showLoadingFooter && (
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
				{showEmptyFooter ? (
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
		),
		[showLoadingFooter, showEmptyFooter, isDark, colors.accent, colors.textSecondary, coachingContextLabel],
	);

	return (
		<View style={{ flex: 1 }}>
			<FlashList
				ref={listRef as never}
				data={messages}
				keyExtractor={keyExtractor}
				estimatedItemSize={88}
				onScroll={handleScroll}
				extraData={highlightedId}
				scrollEventThrottle={16}
				maintainVisibleContentPosition={{
					startRenderingFromBottom: true,
				}}
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode="interactive"
				contentContainerStyle={{
					paddingHorizontal: 12,
					paddingTop: 8,
					paddingBottom: listBottomPadding + 56,
				}}
				renderItem={renderItem}
				ListFooterComponent={footerComponent}
			/>

			{newIncomingCount > 0 && (
				<Pressable
					onPress={() => {
						if (listRef.current?.scrollToEnd) {
							listRef.current.scrollToEnd({ animated: true });
							return;
						}
						listRef.current?.scrollToOffset({
							offset: Number.MAX_SAFE_INTEGER,
							animated: true,
						});
					}}
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
		</View>
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
	avoidKeyboardWithPadding = true,
	jumpToRef,
}: ThreadChatBodyProps) {
	const { colors, isDark } = useAppTheme();
	const insets = useAppSafeAreaInsets();
	const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
	const [keyboardHeight, setKeyboardHeight] = useState(0);

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
			(e) => {
				setIsKeyboardVisible(true);
				setKeyboardHeight(e.endCoordinates.height);
			},
		);
		const hide = Keyboard.addListener(
			Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
			() => {
				setIsKeyboardVisible(false);
				setKeyboardHeight(0);
			},
		);
		return () => {
			show.remove();
			hide.remove();
		};
	}, []);

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
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
				jumpToRef={jumpToRef}
			/>

			<View
				style={{
					paddingBottom:
						avoidKeyboardWithPadding && keyboardHeight > 0 ? keyboardHeight : 0,
				}}
			>
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
		</View>
	);
});
