import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { ChevronLeft, EllipsisVertical, Search } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Transition } from "@/components/navigation/TransitionStack";
import { Text } from "@/components/ScaledText";
import type { MessageThread } from "@/types/messages";

type ThreadHeaderProps = {
	thread: MessageThread;
	onBack: () => void;
	onSearch?: () => void;
	onMore?: () => void;
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
	onMore,
	onHeaderPress,
	sharedBoundTag,
	sharedAvatarTag,
}: ThreadHeaderProps) {
	const p = useAdminPastel();
	const { isDark } = useAppTheme();

	const isOnline = thread.lastSeen === "Online";
	const isGroup = thread.id.startsWith("group:");
	const statusLine = isGroup
		? (thread.responseTime ?? "Group chat")
		: isOnline
			? "Online"
			: (thread.lastSeen ?? thread.responseTime ?? "Coaching chat");

	const headerBg = isDark ? p.cardWhite : "#FFFFFF";
	const shadowStyle = Platform.select({
		ios: {
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 1 },
			shadowOpacity: isDark ? 0.3 : 0.06,
			shadowRadius: 4,
		},
		android: {
			elevation: 2,
		},
	});

	return (
		<SafeAreaView
			edges={["top"]}
			style={[{ backgroundColor: headerBg }, shadowStyle]}
		>
			<View style={styles.row}>
				<Transition.View
					sharedBoundTag={sharedBoundTag}
					style={styles.innerRow}
				>
					<Pressable
						onPress={onBack}
						hitSlop={12}
						style={({ pressed }) => [
							styles.iconButton,
							{
								backgroundColor: isDark
									? "rgba(255,255,255,0.06)"
									: "rgba(0,0,0,0.03)",
								opacity: pressed ? 0.6 : 1,
							},
						]}
					>
						<ChevronLeft size={22} color={p.textPrimary} />
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
							gap: 12,
							opacity: pressed && onHeaderPress ? 0.7 : 1,
						})}
					>
						<Transition.View
							sharedBoundTag={sharedAvatarTag}
							style={styles.avatarWrap}
						>
							{thread.avatarUrl ? (
								<Image
									source={{ uri: thread.avatarUrl }}
									style={styles.avatarImage}
									contentFit="cover"
								/>
							) : (
								<View
									style={[
										styles.avatarFallback,
										{ backgroundColor: p.accentSoft },
									]}
								>
									<Text
										style={{
											fontFamily: "Outfit-Bold",
											fontSize: 15,
											color: p.accent,
										}}
									>
										{getInitials(thread.name)}
									</Text>
								</View>
							)}
							{isOnline && (
								<View
									style={[
										styles.onlineDot,
										{
											backgroundColor: p.success,
											borderColor: headerBg,
										},
									]}
								/>
							)}
						</Transition.View>

						<View style={{ flex: 1, minWidth: 0 }}>
							<Text
								numberOfLines={1}
								style={{
									fontFamily: "Outfit-SemiBold",
									fontSize: 17,
									color: p.textPrimary,
									letterSpacing: -0.2,
								}}
							>
								{thread.name}
							</Text>
							<Text
								numberOfLines={1}
								style={{
									fontSize: 12,
									fontFamily: "Outfit-Regular",
									color: isOnline ? p.success : p.textMuted,
									marginTop: 1,
								}}
							>
								{statusLine}
							</Text>
						</View>
					</Pressable>

					{onSearch && (
						<Pressable
							onPress={onSearch}
							hitSlop={12}
							style={({ pressed }) => [
								styles.iconButton,
								{
									backgroundColor: isDark
										? "rgba(255,255,255,0.06)"
										: "rgba(0,0,0,0.03)",
									opacity: pressed ? 0.6 : 1,
								},
							]}
						>
							<Search size={18} color={p.textMuted} />
						</Pressable>
					)}
					{onMore && (
						<Pressable
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
								onMore();
							}}
							hitSlop={12}
							style={({ pressed }) => [
								styles.iconButton,
								{
									backgroundColor: isDark
										? "rgba(255,255,255,0.06)"
										: "rgba(0,0,0,0.03)",
									opacity: pressed ? 0.6 : 1,
								},
							]}
						>
							<EllipsisVertical size={18} color={p.textMuted} />
						</Pressable>
					)}
				</Transition.View>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	row: {
		paddingHorizontal: 12,
		paddingTop: 6,
		paddingBottom: 10,
	},
	innerRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	iconButton: {
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: "center",
		justifyContent: "center",
	},
	avatarWrap: {
		width: 42,
		height: 42,
		borderRadius: 21,
		overflow: "visible",
	},
	avatarImage: {
		width: 42,
		height: 42,
		borderRadius: 21,
	},
	avatarFallback: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: "center",
		justifyContent: "center",
	},
	onlineDot: {
		position: "absolute",
		bottom: 0,
		right: 0,
		width: 12,
		height: 12,
		borderRadius: 6,
		borderWidth: 2,
	},
});
