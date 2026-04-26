import { Image, Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Transition } from "@/components/navigation/TransitionStack";
import { Text } from "@/components/ScaledText";
import { Feather } from "@/components/ui/theme-icons";
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
			<Animated.View className="px-3 py-2">
				<Transition.View
					sharedBoundTag={sharedBoundTag}
					className="flex-row items-center gap-3"
				>
					<Pressable
						onPress={onBack}
						className="h-9 w-9 rounded-full items-center justify-center active:opacity-70"
						style={{ backgroundColor: mutedPill }}
					>
						<Feather name="chevron-left" size={20} color={colors.text} />
					</Pressable>

					<Transition.View sharedBoundTag={sharedAvatarTag}>
						{thread.avatarUrl ? (
							<View
								className="h-10 w-10 rounded-full overflow-hidden border"
								style={{ borderColor: headerBorder }}
							>
								<Image
									source={{ uri: thread.avatarUrl }}
									className="h-full w-full"
									resizeMode="cover"
								/>
							</View>
						) : (
							<View
								className="h-10 w-10 rounded-full items-center justify-center border"
								style={{ backgroundColor: avatarBg, borderColor: headerBorder }}
							>
								<Text
									className="font-outfit text-base font-bold"
									style={{ color: colors.accent }}
								>
									{getInitials(thread.name)}
								</Text>
							</View>
						)}
					</Transition.View>

					<View className="flex-1">
						<Text
							className="font-outfit text-[16px] font-semibold"
							numberOfLines={1}
							style={{ color: colors.text }}
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
										backgroundColor: "#22c55e",
									}}
								/>
							)}
							<Text
								className="text-[12px] font-outfit"
								numberOfLines={1}
								style={{ color: isOnline ? "#22c55e" : colors.textSecondary }}
							>
								{statusLine}
							</Text>
						</View>
					</View>

					<View
						className="rounded-full px-2.5 py-1"
						style={{
							backgroundColor: isDark
								? "rgba(255,255,255,0.08)"
								: "rgba(15,23,42,0.06)",
						}}
					>
						<Text
							className="text-[10px] font-outfit font-semibold"
							style={{ color: colors.textSecondary }}
						>
							{summaryLabel}
						</Text>
					</View>
				</Transition.View>
			</Animated.View>
		</View>
	);
}
