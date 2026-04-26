import { Feather, Ionicons } from "@expo/vector-icons";
import {
	ActivityIndicator,
	Image,
	Platform,
	Pressable,
	StyleSheet,
	View,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import type { EdgeInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { TextInput } from "@/components/ScaledText";
import { Shadows } from "@/constants/theme";

interface Props {
	draft: string;
	onDraftChange: (v: string) => void;
	onSend: () => void;
	onOpenMenu: () => void;
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
	const containerBg = isDark ? colors.background : "#FFFFFF";
	const composerBg = isDark ? "rgba(255,255,255,0.08)" : "#F2F2F7";
	const addButtonBg = isDark ? "rgba(255,255,255,0.08)" : "#FFFFFF";
	const sendButtonSize = Platform.OS === "ios" ? 42 : 44;
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
				borderTopColor: isDark
					? "rgba(255,255,255,0.08)"
					: "rgba(15,23,42,0.06)",
			}}
		>
			{pendingAttachment && (
				<View
					style={[
						styles.attachmentCard,
						{
							backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F8FAFC",
						},
						isDark ? Shadows.none : Shadows.sm,
					]}
				>
					<View className="flex-row items-center justify-between">
						<View className="flex-1 flex-row items-center gap-3">
							{pendingAttachment.isImage ? (
								<Image
									source={{ uri: pendingAttachment.uri }}
									className="w-14 h-14 rounded-[18px]"
								/>
							) : (
								<View className="w-14 h-14 rounded-[18px] items-center justify-center bg-accent/10">
									<Feather name="file-text" size={22} color={colors.accent} />
								</View>
							)}
						</View>
						<Pressable onPress={onRemoveAttachment} disabled={isUploading}>
							<Ionicons name="close-circle" size={24} color="#EF4444" />
						</Pressable>
					</View>
					{isUploading && (
						<View className="h-1.5 bg-accent/10 rounded-full mt-3 overflow-hidden">
							<View className="h-full bg-accent w-1/3" />
						</View>
					)}
				</View>
			)}

			<View className="flex-row items-end gap-2.5">
				<View
					style={[
						styles.composerShell,
						{
							backgroundColor: composerBg,
							borderColor: isDark
								? "rgba(255,255,255,0.08)"
								: "rgba(15,23,42,0.06)",
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
								borderColor: isDark
									? "rgba(255,255,255,0.08)"
									: "rgba(15,23,42,0.06)",
							},
						]}
						onPressIn={() => (plusButtonScale.value = withSpring(0.9))}
						onPressOut={() => (plusButtonScale.value = withSpring(1))}
					>
						<Feather name="plus" size={22} color={colors.accent} />
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
						editable={!disabled && !isUploading}
					/>
				</View>

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
							backgroundColor: canSend
								? colors.accent
								: isDark
									? "rgba(255,255,255,0.12)"
									: "rgba(0,0,0,0.08)",
						},
					]}
					onPressIn={() => (sendButtonScale.value = withSpring(0.85))}
					onPressOut={() => (sendButtonScale.value = withSpring(1))}
				>
					{isUploading || disabled ? (
						<ActivityIndicator size="small" color="white" />
					) : (
						<Ionicons name="send" size={20} color="white" />
					)}
				</AnimatedPressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	attachmentCard: {
		marginBottom: 10,
		marginHorizontal: 2,
		borderRadius: 20,
		padding: 12,
	},
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
	},
});
