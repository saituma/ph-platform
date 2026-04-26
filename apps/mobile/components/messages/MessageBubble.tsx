import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Image,
	Platform,
	Pressable,
	useWindowDimensions,
	View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import Animated, {
	Easing,
	cancelAnimation,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSpring,
	withTiming,
} from "react-native-reanimated";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { OpenGraphPreview } from "@/components/media/OpenGraphPreview";
import { Text } from "@/components/ScaledText";
import type { ChatMessage } from "@/constants/messages";
import { fonts, Shadows } from "@/constants/theme";

import { useMessageDimensions } from "@/hooks/messages/useMessageDimensions";
import { FullScreenMediaModal } from "./FullScreenMediaModal";
import { MessageMediaView } from "./MessageMediaView";
import { ReactionsListModal } from "./ReactionsListModal";

type MessageBubbleProps = {
	message: ChatMessage;
	selfUserId: number;
	isGroupThread?: boolean;
	resolveReactionUserName?: (userId: number) => string;
	onLongPress: (message: ChatMessage) => void;
	onReactionPress: (message: ChatMessage, emoji: string) => void;
	onOpenReactionPicker?: (message: ChatMessage) => void;
	onReply: (message: ChatMessage) => void;
	onJumpToMessage?: (messageId: number) => void;
	isHighlighted?: boolean;
	resolvedReplyPreview?: string | null;
	token?: string | null;
};

// Premium spring configuration for bubble press
const BUBBLE_SPRING = {
	damping: 16,
	stiffness: 200,
	mass: 0.6,
};

function MessageBubbleComponent({
	message,
	selfUserId,
	isGroupThread = false,
	resolveReactionUserName,
	onLongPress,
	onReactionPress,
	onOpenReactionPicker,
	onReply,
	onJumpToMessage,
	isHighlighted,
	resolvedReplyPreview,
	token,
}: MessageBubbleProps) {
	const { colors, isDark } = useAppTheme();
	const senderId = Number(message.senderId ?? NaN);
	const receiverId = Number(message.receiverId ?? NaN);
	const isUser = Number.isFinite(senderId)
		? senderId === selfUserId
		: Number.isFinite(receiverId)
			? receiverId !== selfUserId
			: message.from === "user";
	const [mediaOpen, setMediaOpen] = useState(false);
	const [reactionsOpen, setReactionsOpen] = useState(false);
	const { width: viewportWidth } = useWindowDimensions();

	const swipeRef = useRef<Swipeable | null>(null);
	const lastTapRef = useRef<number>(0);

	const { mediaDimensions } = useMessageDimensions(
		message.mediaUrl ?? null,
		message.contentType ?? null,
		isUser,
	);

	const bubbleScale = useSharedValue(1);
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: bubbleScale.value }],
	}));
	const uploadPulse = useSharedValue(0.24);
	const isPendingMediaUpload =
		isUser &&
		typeof message.id === "string" &&
		message.id.startsWith("client-") &&
		Boolean(message.mediaUrl);
	const uploadOverlayStyle = useAnimatedStyle(() => ({
		opacity: uploadPulse.value,
	}));

	useEffect(() => {
		if (!isPendingMediaUpload) {
			cancelAnimation(uploadPulse);
			uploadPulse.value = 0;
			return;
		}
		uploadPulse.value = withRepeat(
			withTiming(0.48, {
				duration: 900,
				easing: Easing.inOut(Easing.quad),
			}),
			-1,
			true,
		);
		return () => {
			cancelAnimation(uploadPulse);
		};
	}, [isPendingMediaUpload, uploadPulse]);

	const urls = useMemo(() => {
		const matches =
			String(message.text || "").match(/https?:\/\/[^\s]+/gi) ?? [];
		return matches.slice(0, 1);
	}, [message.text]);

	const initials = useMemo(
		() =>
			(message.authorName || "?")
				.split(" ")
				.filter(Boolean)
				.slice(0, 2)
				.map((p) => p[0].toUpperCase())
				.join(""),
		[message.authorName],
	);

	const reactions = message.reactions ?? [];
	const hasReactions = reactions.length > 0;
	const isAttachmentOnly =
		Boolean(message.mediaUrl) &&
		!String(message.text ?? "")
			.trim()
			.length &&
		message.replyToMessageId == null;
	const showSenderBesideBubble = isGroupThread && !isUser;
	const showLeadingAvatar = isGroupThread && !isUser;
	const senderNameBeside = useMemo(() => {
		if (!showSenderBesideBubble) return null;
		return (message.authorName || "Team Member").trim() || "Team Member";
	}, [message.authorName, showSenderBesideBubble]);

	const handleSwipeOpen = (direction: "left" | "right") => {
		if (direction === "left") {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
			onReply(message);
			swipeRef.current?.close();
		}
	};

	const handlePress = () => {
		const now = Date.now();
		const DOUBLE_TAP_DELAY = 300;

		if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
			// Double tap detected!
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
			onReactionPress(message, "❤️");
			lastTapRef.current = 0; // Reset after double tap
		} else {
			lastTapRef.current = now;
		}
	};

	const bubbleBackgroundColor = isUser
		? colors.accent
		: isDark
			? "rgba(255,255,255,0.08)"
			: "#F2F2F7";
	const bubbleTextColor = isUser ? "#FFFFFF" : colors.textPrimary;
	const metaColor = isUser ? "rgba(255,255,255,0.8)" : colors.textDim;
	const bubbleMaxWidth = Math.min(
		viewportWidth * (Platform.OS === "ios" ? 0.78 : 0.82),
		420,
	);
	const outgoingRadius = Platform.OS === "ios" ? 17 : 18;

	return (
		<View className="mb-px w-full">
			<View
				className={`flex-row items-end gap-2 w-full ${isUser ? "justify-end" : "justify-start"}`}
			>
				{showLeadingAvatar && (
					<View className="items-center">
						{message.authorAvatar ? (
							<Image
								source={{ uri: message.authorAvatar }}
								className="h-8 w-8 rounded-full"
							/>
						) : (
							<View
								className="h-8 w-8 rounded-full items-center justify-center"
								style={{ backgroundColor: colors.surfaceHigher }}
							>
								<Text
									className="text-[10px] font-bold uppercase"
									style={{
										color: colors.textSecondary,
										fontFamily: fonts.labelBold,
									}}
								>
									{initials}
								</Text>
							</View>
						)}
					</View>
				)}

				{/* WhatsApp/Telegram sizing style: 
          Container has a strict max width, so the bubble inside can naturally expand to fit content 
          up to 82% of the screen width, then it wraps the text.
        */}
				<View
					style={{
						maxWidth: bubbleMaxWidth,
						alignSelf: isUser ? "flex-end" : "flex-start",
					}}
				>
					<Swipeable
						ref={swipeRef}
						friction={1.5}
						rightThreshold={40}
						onSwipeableOpen={handleSwipeOpen}
						renderLeftActions={() => (
							<View className="w-16 items-center justify-center pl-2">
								<View
									className="h-10 w-10 rounded-full items-center justify-center"
									style={{ backgroundColor: colors.surfaceHigher }}
								>
									<Ionicons
										name="arrow-undo"
										size={18}
										color={colors.textSecondary}
									/>
								</View>
							</View>
						)}
					>
						<Animated.View style={animatedStyle}>
							{/* Relative wrapper needed so absolute reactions render strictly below the bubble */}
							<View
								style={{
									position: "relative",
									marginBottom: hasReactions ? 18 : 6,
								}}
							>
								{senderNameBeside ? (
									<Text
										style={{
											color: colors.textSecondary,
											fontFamily: fonts.labelBold,
											fontSize: 9,
											marginLeft: 4,
											marginBottom: 3,
										}}
										numberOfLines={1}
									>
										{senderNameBeside}
									</Text>
								) : null}

								{/* The Message Bubble itself */}
								<Pressable
									onPress={handlePress}
									onPressIn={() =>
										(bubbleScale.value = withSpring(0.97, BUBBLE_SPRING))
									}
									onPressOut={() =>
										(bubbleScale.value = withSpring(1, BUBBLE_SPRING))
									}
									onLongPress={() => {
										Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
										onLongPress(message);
									}}
									className={`overflow-hidden ${isAttachmentOnly ? "px-0 py-0" : "px-4 py-2.5"}`}
									style={{
										backgroundColor: isAttachmentOnly
											? "transparent"
											: bubbleBackgroundColor,
										borderWidth: isHighlighted ? 1 : 0,
										borderColor: colors.accent,
										borderTopLeftRadius: isAttachmentOnly ? 0 : outgoingRadius,
										borderTopRightRadius: isAttachmentOnly ? 0 : outgoingRadius,
										borderBottomLeftRadius: isAttachmentOnly
											? 0
											: !isUser
												? 6
												: outgoingRadius,
										borderBottomRightRadius: isAttachmentOnly
											? 0
											: isUser
												? 6
												: outgoingRadius,
									}}
								>
									{/* Reply Context Bar */}
									{message.replyToMessageId != null && (
										<Pressable
											onPress={() =>
												onJumpToMessage?.(Number(message.replyToMessageId))
											}
											className="mb-2 p-2 rounded-lg border-l-2"
											style={{
												backgroundColor: isDark
													? "rgba(255,255,255,0.03)"
													: "rgba(0,0,0,0.03)",
												borderColor: isUser
													? "rgba(255,255,255,0.35)"
													: colors.accent,
											}}
										>
											<Text
												className="text-[10px] uppercase tracking-wide"
												style={{
													color: isUser
														? "rgba(255,255,255,0.95)"
														: colors.accent,
													fontFamily: fonts.labelBold,
												}}
											>
												Replying
											</Text>
											<Text
												className="text-xs mt-0.5"
												style={{
													color: isUser
														? "rgba(255,255,255,0.82)"
														: colors.textDim,
													fontFamily: fonts.bodyMedium,
												}}
												numberOfLines={1}
											>
												{message.replyPreview || resolvedReplyPreview}
											</Text>
										</Pressable>
									)}

									{/* Media */}
									{message.mediaUrl && message.contentType && (
										<View
											className={`${isAttachmentOnly ? "" : "mb-2"} overflow-hidden rounded-xl relative`}
										>
											<MessageMediaView
												uri={message.mediaUrl}
												contentType={message.contentType}
												width={mediaDimensions.width}
												height={mediaDimensions.height}
												onPress={() => setMediaOpen(true)}
											/>
											{isPendingMediaUpload ? (
												<Animated.View
													pointerEvents="none"
													className="absolute inset-0 items-center justify-center"
													style={[
														{ backgroundColor: "rgba(0,0,0,0.35)" },
														uploadOverlayStyle,
													]}
												>
													<ActivityIndicator size="small" color="#ffffff" />
													<Text
														className="mt-1 text-[11px]"
														style={{
															color: "#ffffff",
															fontFamily: fonts.labelBold,
														}}
													>
														Sending...
													</Text>
												</Animated.View>
											) : null}
										</View>
									)}

									{/* Body Text */}
									{message.text && (
										<Text
											className="text-[15px] leading-6"
											style={{
												color: bubbleTextColor,
												fontFamily: fonts.bodyMedium,
											}}
										>
											{message.text}
										</Text>
									)}

									{token &&
										urls.map((u) => (
											<OpenGraphPreview key={u} url={u} token={token} compact />
										))}

									{/* Meta Footer (Time & Status) */}
									<View className="flex-row items-center justify-end gap-1 mt-1.5">
										{onOpenReactionPicker && (
											<Pressable
												onPress={() => onOpenReactionPicker(message)}
												className="mr-auto h-5 w-5 items-center justify-center rounded-full"
											>
												<Ionicons
													name="add-outline"
													size={14}
													color={colors.textDim}
												/>
											</Pressable>
										)}
										<Text
											className="text-[10px]"
											style={{
												color: metaColor,
												fontFamily: fonts.labelMedium,
											}}
										>
											{message.time}
										</Text>
										{isUser && (
											<Ionicons
												name={
													message.status === "read"
														? "checkmark-done"
														: "checkmark"
												}
												size={14}
												color={
													message.status === "read"
														? "#D2F4FF"
														: "rgba(255,255,255,0.75)"
												}
											/>
										)}
									</View>
								</Pressable>

								{/* Floating Reactions (Rendered OUTSIDE the overflow-hidden bubble) */}
								{hasReactions && (
									<View
										className="absolute flex-row gap-1 z-50"
										style={{
											bottom: -8,
											flexWrap: "nowrap",
											[isUser ? "right" : "left"]: 8,
										}}
									>
										{reactions.slice(0, 1).map((r) => (
											<Pressable
												key={r.emoji}
												onPress={() => onReactionPress(message, r.emoji)}
												className="px-2 py-1 rounded-full border flex-row items-center gap-1"
												style={{
													backgroundColor: isDark
														? colors.surfaceHigh
														: "#FFFFFF",
													borderColor: colors.borderSubtle,
													...(isDark ? Shadows.none : Shadows.sm),
												}}
											>
												<Text className="text-[11px]">{r.emoji}</Text>
												<Text
													className="text-[10px]"
													style={{
														color: colors.textPrimary,
														fontFamily: fonts.labelBold,
													}}
												>
													{r.count}
												</Text>
											</Pressable>
										))}

										{reactions.length > 1 && (
											<Pressable
												onPress={() => setReactionsOpen(true)}
												className="px-2 py-1 rounded-full border flex-row items-center"
												style={{
													backgroundColor: isDark
														? colors.surfaceHigh
														: "#FFFFFF",
													borderColor: colors.borderSubtle,
													...Shadows.md,
												}}
											>
												<Text
													className="text-[10px]"
													style={{
														color: colors.textPrimary,
														fontFamily: fonts.labelBold,
													}}
												>
													+
												</Text>
											</Pressable>
										)}
									</View>
								)}
							</View>
						</Animated.View>
					</Swipeable>
				</View>
			</View>

			<ReactionsListModal
				open={reactionsOpen}
				onClose={() => setReactionsOpen(false)}
				reactions={reactions}
				resolveUserName={(userId) =>
					resolveReactionUserName?.(userId) ?? `User ${userId}`
				}
			/>

			<FullScreenMediaModal
				visible={mediaOpen}
				onClose={() => setMediaOpen(false)}
				uri={message.mediaUrl ?? null}
				contentType={message.contentType}
			/>
		</View>
	);
}

export const MessageBubble = React.memo(
	MessageBubbleComponent,
	(prev, next) => {
		if (prev.selfUserId !== next.selfUserId) return false;
		if (prev.isGroupThread !== next.isGroupThread) return false;
		if (prev.isHighlighted !== next.isHighlighted) return false;
		if (prev.token !== next.token) return false;
		const prevMessage = prev.message;
		const nextMessage = next.message;
		if (prevMessage === nextMessage) return true;
		return (
			prevMessage.id === nextMessage.id &&
			prevMessage.text === nextMessage.text &&
			prevMessage.time === nextMessage.time &&
			prevMessage.status === nextMessage.status &&
			prevMessage.mediaUrl === nextMessage.mediaUrl &&
			prevMessage.contentType === nextMessage.contentType &&
			prevMessage.replyToMessageId === nextMessage.replyToMessageId &&
			prevMessage.replyPreview === nextMessage.replyPreview &&
			prevMessage.authorName === nextMessage.authorName &&
			prevMessage.authorAvatar === nextMessage.authorAvatar &&
			prevMessage.reactions === nextMessage.reactions
		);
	},
);
