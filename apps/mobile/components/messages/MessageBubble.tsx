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
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
	Easing,
	cancelAnimation,
	interpolate,
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSpring,
	withTiming,
	type SharedValue,
} from "react-native-reanimated";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { OpenGraphPreview } from "@/components/media/OpenGraphPreview";
import { Text } from "@/components/ScaledText";
import type { ChatMessage } from "@/constants/messages";
import { fonts } from "@/constants/theme";

import type { GroupPosition } from "@/lib/messages/messageGrouping";
import { useMessageDimensions } from "@/hooks/messages/useMessageDimensions";
import { FullScreenMediaModal } from "./FullScreenMediaModal";
import { MessageMediaView } from "./MessageMediaView";
import { ReactionsListModal } from "./ReactionsListModal";

type MessageBubbleProps = {
	message: ChatMessage;
	selfUserId: number;
	isGroupThread?: boolean;
	groupPosition?: GroupPosition;
	showGroupAvatar?: boolean;
	showGroupSenderName?: boolean;
	resolveReactionUserName?: (userId: number) => string;
	onLongPress: (message: ChatMessage) => void;
	onReactionPress: (message: ChatMessage, emoji: string) => void;
	onOpenReactionPicker?: (message: ChatMessage) => void;
	onReply: (message: ChatMessage) => void;
	onJumpToMessage?: (messageId: number) => void;
	onAvatarPress?: (senderId: number, name: string, avatar?: string | null) => void;
	isHighlighted?: boolean;
	resolvedReplyPreview?: string | null;
	token?: string | null;
};


function MessageBubbleComponent({
	message,
	selfUserId,
	isGroupThread = false,
	groupPosition = "solo",
	showGroupAvatar,
	showGroupSenderName,
	resolveReactionUserName,
	onLongPress,
	onReactionPress,
	onOpenReactionPicker,
	onReply,
	onJumpToMessage,
	onAvatarPress,
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

	const swipeRef = useRef<React.ComponentRef<typeof ReanimatedSwipeable> | null>(null);
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
	const shouldShowAvatar = showGroupAvatar ?? (isGroupThread && !isUser);
	const shouldShowName = showGroupSenderName ?? (isGroupThread && !isUser);
	const showLeadingAvatar = isGroupThread && !isUser;
	const senderNameBeside = useMemo(() => {
		if (!shouldShowName) return null;
		return (message.authorName || "Team Member").trim() || "Team Member";
	}, [message.authorName, shouldShowName]);

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

	const handleLongPress = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		onLongPress(message);
	};

	const bubbleTap = Gesture.Tap()
		.onBegin(() => {
			'worklet';
			bubbleScale.value = withSpring(0.96, { damping: 15, stiffness: 400, mass: 0.3 });
			runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
		})
		.onFinalize(() => {
			'worklet';
			bubbleScale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.4 });
		})
		.onEnd(() => {
			'worklet';
			runOnJS(handlePress)();
		});

	const bubbleLongPress = Gesture.LongPress()
		.minDuration(500)
		.onBegin(() => {
			'worklet';
			bubbleScale.value = withSpring(0.96, { damping: 15, stiffness: 400, mass: 0.3 });
		})
		.onStart(() => {
			'worklet';
			runOnJS(handleLongPress)();
		})
		.onFinalize(() => {
			'worklet';
			bubbleScale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.4 });
		});

	const bubbleGesture = Gesture.Exclusive(bubbleLongPress, bubbleTap);

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
	const R = 17;
	const r = 4;
	const isFirst = groupPosition === "first" || groupPosition === "solo";
	const isLast = groupPosition === "last" || groupPosition === "solo";
	const groupGap = isLast ? 8 : 2;
	const reactionPillBg = isDark ? colors.surfaceHigh : "hsl(220, 5%, 97%)";
	const reactionBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";

	return (
		<View style={{ marginBottom: groupGap, width: "100%" }}>
			<View
				style={{
					flexDirection: "row",
					alignItems: "flex-end",
					gap: 6,
					width: "100%",
					justifyContent: isUser ? "flex-end" : "flex-start",
				}}
			>
				{showLeadingAvatar && (
					shouldShowAvatar ? (
						<Pressable
							onPress={() => {
								if (onAvatarPress) {
									Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
									onAvatarPress(senderId, message.authorName || "User", message.authorAvatar);
								}
							}}
							style={({ pressed }) => [{ alignItems: "center", opacity: pressed && onAvatarPress ? 0.7 : 1 }]}
							disabled={!onAvatarPress}
						>
							{message.authorAvatar ? (
								<Image
									source={{ uri: message.authorAvatar }}
									style={{ height: 28, width: 28, borderRadius: 14 }}
									contentFit="cover"
								/>
							) : (
								<View
									style={{
										height: 28,
										width: 28,
										borderRadius: 14,
										alignItems: "center",
										justifyContent: "center",
										backgroundColor: colors.surfaceHigher,
									}}
								>
									<Text
										style={{
											fontSize: 9,
											fontFamily: fonts.labelBold,
											textTransform: "uppercase",
											color: colors.textSecondary,
										}}
									>
										{initials}
									</Text>
								</View>
							)}
						</Pressable>
					) : (
						<View style={{ width: 28 }} />
					)
				)}

				<View
					style={{
						maxWidth: bubbleMaxWidth,
						alignSelf: isUser ? "flex-end" : "flex-start",
					}}
				>
					<ReanimatedSwipeable
						ref={swipeRef}
						friction={1.5}
						rightThreshold={40}
						onSwipeableWillOpen={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
						}}
						onSwipeableOpen={handleSwipeOpen}
						renderLeftActions={(_progress: SharedValue<number>, dragX: SharedValue<number>) => {
							const AnimatedAction = () => {
								const style = useAnimatedStyle(() => ({
									transform: [{ translateX: interpolate(dragX.value, [0, 64], [-64, 0], 'clamp') }],
									opacity: interpolate(dragX.value, [0, 32, 64], [0, 0.5, 1], 'clamp'),
								}));
								return (
									<Animated.View style={[{ width: 64, alignItems: "center", justifyContent: "center", paddingLeft: 8 }, style]}>
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
									</Animated.View>
								);
							};
							return <AnimatedAction />;
						}}
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

								<GestureDetector gesture={bubbleGesture}>
								<Animated.View
									accessible
									accessibilityRole="button"
									style={{
										overflow: "hidden",
										paddingHorizontal: isAttachmentOnly ? 0 : 16,
										paddingVertical: isAttachmentOnly ? 0 : 10,
										backgroundColor: isAttachmentOnly
											? "transparent"
											: bubbleBackgroundColor,
										borderWidth: isHighlighted ? 1 : 0,
										borderColor: colors.accent,
										borderTopLeftRadius: isAttachmentOnly ? 0 : (isUser ? R : (isFirst ? R : r)),
										borderTopRightRadius: isAttachmentOnly ? 0 : (isUser ? (isFirst ? R : r) : R),
										borderBottomLeftRadius: isAttachmentOnly
											? 0
											: isUser ? R : (isLast ? R : r),
										borderBottomRightRadius: isAttachmentOnly
											? 0
											: isUser ? (isLast ? R : r) : R,
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
												fontSize: 16,
												lineHeight: 22,
												color: bubbleTextColor,
												fontFamily: Platform.select({ ios: undefined, default: fonts.bodyMedium }),
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
										{message.pinnedAt && (
											<Ionicons name="pin" size={10} color={metaColor} />
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
								</Animated.View>
							</GestureDetector>

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
					</ReanimatedSwipeable>
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
		if (prev.groupPosition !== next.groupPosition) return false;
		if (prev.showGroupAvatar !== next.showGroupAvatar) return false;
		if (prev.showGroupSenderName !== next.showGroupSenderName) return false;
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
			JSON.stringify(prevMessage.reactions) === JSON.stringify(nextMessage.reactions) &&
			prevMessage.pinnedAt === nextMessage.pinnedAt
		);
	},
);
