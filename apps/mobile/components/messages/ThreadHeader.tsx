import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Transition } from "@/components/navigation/TransitionStack";
import { Text } from "@/components/ScaledText";
import { fonts } from "@/constants/theme";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import type { MessageThread } from "@/types/messages";

type ThreadHeaderProps = {
	thread: MessageThread;
	onBack: () => void;
	sharedBoundTag?: string;
	sharedAvatarTag?: string;
};

function getInitials(name: string) {
	return name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join("");
}

export function ThreadHeader({
	thread,
	onBack,
	sharedBoundTag,
	sharedAvatarTag,
}: ThreadHeaderProps) {
	const { colors, isDark } = useAppTheme();
	const insets = useAppSafeAreaInsets();
	const headerBorder = isDark
		? "rgba(255,255,255,0.08)"
		: "rgba(15,23,42,0.06)";
	const avatarBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(34,197,94,0.12)";
	const mutedPill = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
	const textPrimary = isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,10%)";
	const textSecondary = isDark ? "hsl(220,5%,55%)" : "hsl(220,5%,45%)";
	const onlineColor = isDark ? "hsl(155, 30%, 55%)" : "hsl(155, 40%, 38%)";

	const summaryLabel = thread.id.startsWith("group:")
		? "Group"
		: thread.premium
			? "Priority"
			: "Direct";
	const isOnline = thread.lastSeen === "Online";
	const statusLine = thread.lastSeen ?? thread.responseTime ?? "Coaching chat";

	return (
		<View
			style={{
				borderBottomWidth: StyleSheet.hairlineWidth,
				borderBottomColor: headerBorder,
				backgroundColor: colors.background,
				paddingTop: insets.top,
			}}
		>
			<Animated.View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
				<Transition.View
					sharedBoundTag={sharedBoundTag}
					style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
				>
					<Pressable
						onPress={onBack}
						style={({ pressed }) => ({
							height: 36,
							width: 36,
							borderRadius: 18,
							alignItems: "center",
							justifyContent: "center",
							backgroundColor: mutedPill,
							opacity: pressed ? 0.7 : 1,
						})}
					>
						<Ionicons name="chevron-back" size={20} color={textPrimary} />
					</Pressable>

					<Transition.View sharedBoundTag={sharedAvatarTag}>
						{thread.avatarUrl ? (
							<View
								style={{
									height: 40,
									width: 40,
									borderRadius: 20,
									overflow: "hidden",
									borderWidth: 1,
									borderColor: headerBorder,
								}}
							>
								<Image
									source={{ uri: thread.avatarUrl }}
									style={{ height: 40, width: 40 }}
									contentFit="cover"
								/>
							</View>
						) : (
							<View
								style={{
									height: 40,
									width: 40,
									borderRadius: 20,
									alignItems: "center",
									justifyContent: "center",
									borderWidth: 1,
									backgroundColor: avatarBg,
									borderColor: headerBorder,
								}}
							>
								<Text
									style={{
										fontFamily: fonts.bodyBold,
										fontSize: 15,
										color: colors.accent,
									}}
								>
									{getInitials(thread.name)}
								</Text>
							</View>
						)}
					</Transition.View>

					<View style={{ flex: 1 }}>
						<Text
							numberOfLines={1}
							style={{
								fontFamily: fonts.bodyBold,
								fontSize: 16,
								color: textPrimary,
							}}
						>
							{thread.name}
						</Text>
						<View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
							{isOnline && (
								<View
									style={{
										width: 7,
										height: 7,
										borderRadius: 4,
										backgroundColor: onlineColor,
									}}
								/>
							)}
							<Text
								numberOfLines={1}
								style={{
									fontSize: 12,
									fontFamily: "Outfit",
									color: isOnline ? onlineColor : textSecondary,
								}}
							>
								{statusLine}
							</Text>
						</View>
					</View>

					<View
						style={{
							borderRadius: 99,
							paddingHorizontal: 10,
							paddingVertical: 4,
							backgroundColor: mutedPill,
						}}
					>
						<Text
							style={{
								fontSize: 10,
								fontFamily: fonts.bodyBold,
								color: textSecondary,
							}}
						>
							{summaryLabel}
						</Text>
					</View>
				</Transition.View>
			</Animated.View>
		</View>
	);
}
