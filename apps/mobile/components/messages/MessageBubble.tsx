import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Platform,
	Pressable,
	useWindowDimensions,
	View,
} from "react-native";
import { Image } from "expo-image";
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
import { fonts } from "@/constants/theme";

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
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
			onReactionPress(message, "❤️");
			lastTapRef.current = 0;
		} else {
			lastTapRef.current = now;
		}
	};

	const bubbleBackgroundColor = isUser
		? colors.accent
		: isDark
			? "rgba(255,255,255,0.08)"
			: "hsl(220, 10%, 96%)";
	const bubbleTextColor = isUser ? "hsl(220, 5%, 98%)" : colors.textPrimary;
	const metaColor = isUser ? "rgba(255,255,255,0.8)" : colors.textDim;
	const readReceiptColor = isUser
		? message.status === "read"
			? "hsl(195, 40%, 85%)"
			: "rgba(255,255,255,0.75)"
		: colors.textDim;
	const bubbleMaxWidth = Math.min(
		viewportWidth * (Platform.OS === "ios" ? 0.78 : 0.82),
		420,
	);
	const outgoingRadius = Platform.OS === "ios" ? 17 : 18;
	const reactionPillBg = isDark ? colors.surfaceHigh : "hsl(220, 5%, 97%)";
	const reactionBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";

	return (
		<View style={{ marginBottom: 1, width: "100%" }}>
			<View
				style={{
					flexDirection: "row",
					alignItems: "flex-end",
					gap: 8,
					width: "100%",
					justifyContent: isUser ? "flex-end" : "flex-start",
				}}
			>
				{showLeadingAvatar && (
					<View style={{ alignItems: "center" }}>
						{message.authorAvatar ? (
							<Image
								source={{ uri: message.authorAvatar }}
								style={{ height: 32, width: 32, borderRadius: 16 }}
								contentFit="cover"
							/>
						) : (
							<View
								style={{
									height: 32,
									width: 32,
									borderRadius: 16,
									alignItems: "center",
									justifyContent: "center",
									backgroundColor: colors.surfaceHigher,
								}}
							>
								<Text
									style={{
										fontSize: 10,
										fontFamily: fonts.labelBold,
										textTransform: "uppercase",
										color: colors.textSecondary,
									}}
								>
									{initials}
								</Text>
							</View>
						)}
					</View>
				)}

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
							<View style={{ width: 64, alignItems: "center", justifyContent: "center", paddingLeft: 8 }}>
								<View
									style={{
										height: 40,
										width: 40,
										borderRadius: 20,
										alignItems: "center",
										justifyContent: "center",
										backgroundColor: colors.surfaceHigher,
									}}
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
									style={{
										overflow: "hidden",
										paddingHorizontal: isAttachmentOnly ? 0 : 16,
										paddingVertical: isAttachmentOnly ? 0 : 10,
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
									{message.replyToMessageId != null && (
										<Pressable
											onPress={() =>
												onJumpToMessage?.(Number(message.replyToMessageId))
											}
											style={{
												marginBottom: 8,
												padding: 8,
												borderRadius: 8,
												borderLeftWidth: 2,
												backgroundColor: isDark
													? "rgba(255,255,255,0.03)"
													: "rgba(0,0,0,0.03)",
												borderColor: isUser
													? "rgba(255,255,255,0.35)"
													: colors.accent,
											}}
										>
											<Text
												style={{
													fontSize: 10,
													textTransform: "uppercase",
													letterSpacing: 0.8,
													color: isUser
														? "rgba(255,255,255,0.95)"
														: colors.accent,
													fontFamily: fonts.labelBold,
												}}
											>
												Replying
											</Text>
											<Text
												numberOfLines={1}
												style={{
													fontSize: 12,
													marginTop: 2,
													color: isUser
														? "rgba(255,255,255,0.82)"
														: colors.textDim,
													fontFamily: fonts.bodyMedium,
												}}
											>
												{message.replyPreview || resolvedReplyPreview}
											</Text>
										</Pressable>
									)}

									{message.mediaUrl && message.contentType && (
										<View
											style={{
												marginBottom: isAttachmentOnly ? 0 : 8,
												overflow: "hidden",
												borderRadius: 12,
												position: "relative",
											}}
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
													style={[
														{
															position: "absolute",
															top: 0,
															left: 0,
															right: 0,
															bottom: 0,
															alignItems: "center",
															justifyContent: "center",
															backgroundColor: "rgba(0,0,0,0.35)",
														},
														uploadOverlayStyle,
													]}
												>
													<ActivityIndicator size="small" color="hsl(220, 5%, 98%)" />
													<Text
														style={{
															marginTop: 4,
															fontSize: 11,
															color: "hsl(220, 5%, 98%)",
															fontFamily: fonts.labelBold,
														}}
													>
														Sending...
													</Text>
												</Animated.View>
											) : null}
										</View>
									)}

									{message.text && (
										<Text
											style={{
												fontSize: 15,
												lineHeight: 24,
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

									<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 6 }}>
										{onOpenReactionPicker && (
											<Pressable
												onPress={() => onOpenReactionPicker(message)}
												style={{ marginRight: "auto", height: 20, width: 20, alignItems: "center", justifyContent: "center", borderRadius: 10 }}
											>
												<Ionicons
													name="add-outline"
													size={14}
													color={colors.textDim}
												/>
											</Pressable>
										)}
										<Text
											style={{
												fontSize: 10,
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
												color={readReceiptColor}
											/>
										)}
									</View>
								</Pressable>

								{hasReactions && (
									<View
										style={{
											position: "absolute",
											flexDirection: "row",
											gap: 4,
											zIndex: 50,
											bottom: -8,
											flexWrap: "nowrap",
											...(isUser ? { right: 8 } : { left: 8 }),
										}}
									>
										{reactions.slice(0, 1).map((r) => (
											<Pressable
												key={r.emoji}
												onPress={() => onReactionPress(message, r.emoji)}
												style={{
													paddingHorizontal: 8,
													paddingVertical: 4,
													borderRadius: 99,
													borderWidth: 1,
													flexDirection: "row",
													alignItems: "center",
													gap: 4,
													backgroundColor: reactionPillBg,
													borderColor: reactionBorder,
												}}
											>
												<Text style={{ fontSize: 11 }}>{r.emoji}</Text>
												<Text
													style={{
														fontSize: 10,
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
												style={{
													paddingHorizontal: 8,
													paddingVertical: 4,
													borderRadius: 99,
													borderWidth: 1,
													flexDirection: "row",
													alignItems: "center",
													backgroundColor: reactionPillBg,
													borderColor: reactionBorder,
												}}
											>
												<Text
													style={{
														fontSize: 10,
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
