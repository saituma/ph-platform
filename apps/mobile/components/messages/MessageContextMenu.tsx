import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React from "react";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import type { ChatMessage } from "@/constants/messages";
import { fonts } from "@/constants/theme";

const QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

type Action = {
	key: string;
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
	destructive?: boolean;
};

type Props = {
	message: ChatMessage | null;
	selfUserId: number;
	onClose: () => void;
	onReaction: (message: ChatMessage, emoji: string) => void;
	onReply: (message: ChatMessage) => void;
	onCopy: (message: ChatMessage) => void;
	onForward?: (message: ChatMessage) => void;
	onPin?: (message: ChatMessage) => void;
	onDelete?: (message: ChatMessage) => void;
	onOpenEmojiPicker?: (message: ChatMessage) => void;
};

export function MessageContextMenu({
	message,
	selfUserId,
	onClose,
	onReaction,
	onReply,
	onCopy,
	onForward,
	onPin,
	onDelete,
	onOpenEmojiPicker,
}: Props) {
	const { colors, isDark } = useAppTheme();
	if (!message) return null;

	const isOwn = Number(message.senderId) === selfUserId;

	const actions: Action[] = [
		{ key: "reply", label: "Reply", icon: "arrow-undo" },
		{ key: "copy", label: "Copy", icon: "copy-outline" },
		...(onForward ? [{ key: "forward", label: "Forward", icon: "arrow-redo-outline" } as Action] : []),
		...(onPin ? [{ key: "pin", label: "Pin", icon: "pin-outline" } as Action] : []),
		...(isOwn && onDelete
			? [{ key: "delete", label: "Delete", icon: "trash-outline", destructive: true } as Action]
			: []),
	];

	const handleAction = (key: string) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		switch (key) {
			case "reply": onReply(message); break;
			case "copy": onCopy(message); break;
			case "forward": onForward?.(message); break;
			case "pin": onPin?.(message); break;
			case "delete": onDelete?.(message); break;
		}
		onClose();
	};

	const handleReaction = (emoji: string) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onReaction(message, emoji);
		onClose();
	};

	const cardBg = isDark ? "rgba(30,30,30,0.95)" : "rgba(255,255,255,0.95)";
	const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
	const actionHoverBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
	const separatorColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

	return (
		<Modal visible transparent animationType="none" onRequestClose={onClose}>
			<Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={StyleSheet.absoluteFill}>
				<Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
					{Platform.OS === "ios" ? (
						<BlurView intensity={65} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
					) : (
						<View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.35)" }]} />
					)}
				</Pressable>

				<View style={styles.centeredContent}>
					{/* Quick Reactions Bar */}
					<Animated.View
						entering={FadeIn.delay(40).duration(160)}
						style={[styles.reactionsBar, { backgroundColor: cardBg, borderColor: cardBorder }]}
					>
						{QUICK_REACTIONS.map((emoji, i) => (
							<Pressable
								key={emoji}
								onPress={() => handleReaction(emoji)}
								style={({ pressed }) => [
									styles.reactionButton,
									pressed && { transform: [{ scale: 1.2 }], backgroundColor: actionHoverBg },
								]}
							>
								<Animated.Text
									entering={FadeIn.delay(60 + i * 20).duration(140)}
									style={styles.reactionEmoji}
								>
									{emoji}
								</Animated.Text>
							</Pressable>
						))}
						{onOpenEmojiPicker && (
							<Pressable
								onPress={() => { onOpenEmojiPicker(message); onClose(); }}
								style={({ pressed }) => [
									styles.reactionButton,
									pressed && { backgroundColor: actionHoverBg },
								]}
							>
								<Ionicons name="add-circle-outline" size={24} color={colors.textDim} />
							</Pressable>
						)}
					</Animated.View>

					{/* Message Preview */}
					<Animated.View
						entering={FadeIn.delay(80).duration(160)}
						style={[
							styles.previewBubble,
							{
								backgroundColor: isOwn ? colors.accent : (isDark ? "rgba(255,255,255,0.08)" : "hsl(220, 10%, 96%)"),
								alignSelf: isOwn ? "flex-end" : "flex-start",
								borderRadius: 17,
							},
						]}
					>
						<Text
							numberOfLines={4}
							style={{
								fontSize: 15,
								lineHeight: 21,
								color: isOwn ? "hsl(220, 5%, 98%)" : colors.textPrimary,
								fontFamily: Platform.select({ ios: undefined, default: fonts.bodyMedium }),
							}}
						>
							{message.text || "[Media]"}
						</Text>
					</Animated.View>

					{/* Actions */}
					<Animated.View
						entering={FadeIn.delay(100).duration(180)}
						style={[styles.actionsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
					>
						{actions.map((action, i) => (
							<React.Fragment key={action.key}>
								{i > 0 && <View style={[styles.separator, { backgroundColor: separatorColor }]} />}
								<Pressable
									onPress={() => handleAction(action.key)}
									style={({ pressed }) => [
										styles.actionRow,
										pressed && { backgroundColor: actionHoverBg },
									]}
								>
									<Text
										style={[
											styles.actionLabel,
											{
												color: action.destructive ? "#FF3B30" : colors.textPrimary,
												fontFamily: fonts.bodyMedium,
											},
										]}
									>
										{action.label}
									</Text>
									<Ionicons
										name={action.icon as any}
										size={20}
										color={action.destructive ? "#FF3B30" : colors.textDim}
									/>
								</Pressable>
							</React.Fragment>
						))}
					</Animated.View>
				</View>
			</Animated.View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	centeredContent: {
		flex: 1,
		justifyContent: "center",
		paddingHorizontal: 24,
		gap: 8,
	},
	reactionsBar: {
		flexDirection: "row",
		alignItems: "center",
		gap: 2,
		padding: 6,
		borderRadius: 28,
		borderWidth: 1,
		alignSelf: "center",
	},
	reactionButton: {
		width: 42,
		height: 42,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 21,
	},
	reactionEmoji: {
		fontSize: 24,
	},
	previewBubble: {
		paddingHorizontal: 14,
		paddingVertical: 10,
		maxWidth: "80%",
	},
	actionsCard: {
		borderRadius: 14,
		borderWidth: 1,
		overflow: "hidden",
	},
	actionRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	actionLabel: {
		fontSize: 16,
	},
	separator: {
		height: StyleSheet.hairlineWidth,
		marginHorizontal: 16,
	},
});
