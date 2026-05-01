import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Transition } from "@/components/navigation/TransitionStack";
import { Text } from "@/components/ScaledText";
import { fonts } from "@/constants/theme";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import type { MessageThread } from "@/types/messages";

type ThreadHeaderProps = {
	thread: MessageThread;
	onBack: () => void;
	onSearch?: () => void;
	onHeaderPress?: () => void;
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
	onSearch,
	onHeaderPress,
	sharedBoundTag,
	sharedAvatarTag,
}: ThreadHeaderProps) {
	const { colors, isDark } = useAppTheme();
	const insets = useAppSafeAreaInsets();
	const headerBorder = isDark
		? "rgba(255,255,255,0.08)"
		: "rgba(15,23,42,0.06)";
	const avatarBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(34,197,94,0.12)";
	const textPrimary = isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,10%)";
	const textSecondary = isDark ? "hsl(220,5%,55%)" : "hsl(220,5%,45%)";
	const onlineColor = isDark ? "hsl(155, 30%, 55%)" : "hsl(155, 40%, 38%)";

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
			<Animated.View style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
				<Transition.View
					sharedBoundTag={sharedBoundTag}
					style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}
				>
					<Pressable
						onPress={onBack}
						hitSlop={12}
						style={({ pressed }) => ({
							paddingHorizontal: 4,
							paddingVertical: 8,
							opacity: pressed ? 0.5 : 1,
						})}
					>
						<Ionicons name="chevron-back" size={28} color={textPrimary} />
					</Pressable>

					<Pressable
						onPress={() => {
							if (onHeaderPress) {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
								onHeaderPress();
							}
						}}
						disabled={!onHeaderPress}
						style={({ pressed }) => ({
							flex: 1,
							flexDirection: "row",
							alignItems: "center",
							gap: 10,
							opacity: pressed && onHeaderPress ? 0.75 : 1,
						})}
					>
						<Transition.View sharedBoundTag={sharedAvatarTag}>
							{thread.avatarUrl ? (
								<View
									style={{
										height: 36,
										width: 36,
										borderRadius: 18,
										overflow: "hidden",
									}}
								>
									<Image
										source={{ uri: thread.avatarUrl }}
										style={{ height: 36, width: 36 }}
										contentFit="cover"
									/>
								</View>
							) : (
								<View
									style={{
										height: 36,
										width: 36,
										borderRadius: 18,
										alignItems: "center",
										justifyContent: "center",
										backgroundColor: avatarBg,
									}}
								>
									<Text
										style={{
											fontFamily: fonts.bodyBold,
											fontSize: 14,
											color: colors.accent,
										}}
									>
										{getInitials(thread.name)}
									</Text>
								</View>
							)}
						</Transition.View>

						<View style={{ flex: 1, minWidth: 0 }}>
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
					</Pressable>
						{onSearch && (
							<Pressable
								onPress={onSearch}
								hitSlop={12}
								style={({ pressed }) => ({
									padding: 6,
									opacity: pressed ? 0.5 : 1,
								})}
							>
								<Ionicons name="search" size={20} color={textSecondary} />
							</Pressable>
						)}
				</Transition.View>
			</Animated.View>
		</View>
	);
}
