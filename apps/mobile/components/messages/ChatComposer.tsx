import { Ionicons } from "@expo/vector-icons";
import {
	ActivityIndicator,
	Platform,
	Pressable,
	StyleSheet,
	View,
} from "react-native";
import { Image } from "expo-image";
import Animated, {
	FadeIn,
	FadeOut,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import type { EdgeInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { TextInput } from "@/components/ScaledText";

interface Props {
	draft: string;
	onDraftChange: (v: string) => void;
	onSend: () => void;
	onOpenMenu: () => void;
	onOpenVoiceRecorder?: () => void;
	pendingAttachment?: {
		uri: string;
		isImage: boolean;
		fileName: string;
		sizeBytes: number;
	} | null;
	onRemoveAttachment?: () => void;
	isUploading?: boolean;
	disabled?: boolean;
	placeholder?: string;
	isKeyboardVisible: boolean;
	insets: EdgeInsets;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ChatComposer({
	draft,
	onDraftChange,
	onSend,
	onOpenMenu,
	onOpenVoiceRecorder,
	pendingAttachment,
	onRemoveAttachment,
	isUploading,
	disabled,
	placeholder,
	isKeyboardVisible,
	insets,
}: Props) {
	const { colors, isDark } = useAppTheme();
	const plusButtonScale = useSharedValue(1);
	const sendButtonScale = useSharedValue(1);

	const plusStyle = useAnimatedStyle(() => ({
		transform: [{ scale: plusButtonScale.value }],
	}));
	const sendStyle = useAnimatedStyle(() => ({
		transform: [{ scale: sendButtonScale.value }],
	}));

	const hasContent = draft.trim().length > 0 || !!pendingAttachment;
	const canSend = !disabled && !isUploading && hasContent;
	const containerBg = isDark ? colors.background : "hsl(220, 5%, 98%)";
	const composerBg = isDark ? "rgba(255,255,255,0.08)" : "hsl(220, 10%, 96%)";
	const addButtonBg = isDark ? "rgba(255,255,255,0.08)" : "hsl(220, 5%, 98%)";
	const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
	const dangerColor = isDark ? "hsl(0, 35%, 60%)" : "hsl(0, 40%, 48%)";
	const sendButtonSize = 44;
	const inputFontSize = Platform.OS === "ios" ? 17 : 16;

	return (
		<View
			style={{
				backgroundColor: containerBg,
				paddingBottom: isKeyboardVisible
					? Platform.OS === "ios"
						? 10
						: 8
					: Math.max(14, insets.bottom + 6),
				paddingTop: 8,
				paddingHorizontal: 10,
				borderTopWidth: StyleSheet.hairlineWidth,
				borderTopColor: borderColor,
			}}
		>
			{pendingAttachment && (
				<View
					style={{
						marginBottom: 10,
						marginHorizontal: 2,
						borderRadius: 20,
						padding: 12,
						backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "hsl(220, 15%, 97%)",
						borderWidth: 1,
						borderColor,
					}}
				>
					<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
						<View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
							{pendingAttachment.isImage ? (
								<Image
									source={{ uri: pendingAttachment.uri }}
									style={{ width: 56, height: 56, borderRadius: 14 }}
									contentFit="cover"
								/>
							) : (
								<View
									style={{
										width: 56,
										height: 56,
										borderRadius: 14,
										alignItems: "center",
										justifyContent: "center",
										backgroundColor: isDark ? `${colors.accent}18` : `${colors.accent}12`,
									}}
								>
									<Ionicons name="document-text-outline" size={22} color={colors.accent} />
								</View>
							)}
						</View>
						<Pressable onPress={onRemoveAttachment} disabled={isUploading}>
							<Ionicons name="close-circle" size={24} color={dangerColor} />
						</Pressable>
					</View>
					{isUploading && (
						<View
							style={{
								height: 6,
								backgroundColor: isDark ? `${colors.accent}18` : `${colors.accent}12`,
								borderRadius: 99,
								marginTop: 12,
								overflow: "hidden",
							}}
						>
							<View style={{ height: "100%", backgroundColor: colors.accent, width: "33%" }} />
						</View>
					)}
				</View>
			)}

			<View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
				<View
					style={[
						styles.composerShell,
						{
							backgroundColor: composerBg,
							borderColor,
						},
					]}
				>
					<AnimatedPressable
						onPress={onOpenMenu}
						style={[
							styles.addButton,
							plusStyle,
							{
								backgroundColor: addButtonBg,
								borderColor,
							},
						]}
						onPressIn={() => (plusButtonScale.value = withSpring(0.9))}
						onPressOut={() => (plusButtonScale.value = withSpring(1))}
					>
						<Ionicons name="add" size={22} color={colors.accent} />
					</AnimatedPressable>

					<TextInput
						style={[
							styles.input,
							{
								color: colors.textPrimary,
								fontFamily: "Outfit-Regular",
								fontSize: inputFontSize,
								lineHeight: inputFontSize + 5,
							},
						]}
						placeholder={placeholder}
						placeholderTextColor={colors.textSecondary}
						value={draft}
						onChangeText={onDraftChange}
						multiline
						maxLength={2000}
						editable={!disabled && !isUploading}
					/>
				</View>

				{hasContent || !onOpenVoiceRecorder ? (
					<Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} key="send">
						<AnimatedPressable
							onPress={onSend}
							disabled={!canSend}
							style={[
								styles.sendButton,
								sendStyle,
								{
									width: sendButtonSize,
									height: sendButtonSize,
									borderRadius: sendButtonSize / 2,
								},
								{
									backgroundColor: colors.accent,
									opacity: canSend ? 1 : 0.5,
								},
							]}
							onPressIn={() => (sendButtonScale.value = withSpring(0.85))}
							onPressOut={() => (sendButtonScale.value = withSpring(1))}
						>
							{isUploading || disabled ? (
								<ActivityIndicator size="small" color="hsl(220, 5%, 98%)" />
							) : (
								<Ionicons name="arrow-up" size={20} color="hsl(220, 5%, 98%)" />
							)}
						</AnimatedPressable>
					</Animated.View>
				) : (
					<Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} key="mic">
						<AnimatedPressable
							onPress={onOpenVoiceRecorder}
							style={[
								styles.sendButton,
								sendStyle,
								{
									width: sendButtonSize,
									height: sendButtonSize,
									borderRadius: sendButtonSize / 2,
								},
								{
									backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
								},
							]}
							onPressIn={() => (sendButtonScale.value = withSpring(0.85))}
							onPressOut={() => (sendButtonScale.value = withSpring(1))}
						>
							<Ionicons name="mic" size={22} color={colors.accent} />
						</AnimatedPressable>
					</Animated.View>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	composerShell: {
		flex: 1,
		minHeight: 48,
		borderRadius: 24,
		borderWidth: 1,
		flexDirection: "row",
		alignItems: "flex-end",
		paddingHorizontal: 6,
		paddingVertical: 4,
	},
	addButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		marginBottom: 2,
	},
	input: {
		flex: 1,
		marginHorizontal: 8,
		marginVertical: 6,
		minHeight: 24,
		maxHeight: 150,
	},
	sendButton: {
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
		elevation: 2,
	},
});
