import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import React from "react";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { fonts } from "@/constants/theme";

type DmProfile = {
	kind: "dm";
	id: number;
	name: string;
	avatar?: string | null;
	role?: string;
	lastSeen?: string;
};

type GroupProfile = {
	kind: "group";
	id: string;
	name: string;
	avatar?: string | null;
	memberCount?: number;
};

export type ProfileTarget = DmProfile | GroupProfile;

type Props = {
	target: ProfileTarget | null;
	onClose: () => void;
};

function getInitials(name: string) {
	return name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((p) => p[0].toUpperCase())
		.join("");
}

export function UserProfileSheet({ target, onClose }: Props) {
	const { colors, isDark } = useAppTheme();
	if (!target) return null;

	const cardBg = isDark ? "rgba(30,30,30,0.97)" : "rgba(255,255,255,0.97)";
	const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
	const isOnline = target.kind === "dm" && target.lastSeen === "Online";

	const subtitle =
		target.kind === "group"
			? target.memberCount != null
				? `Group · ${target.memberCount} members`
				: "Group"
			: target.role ?? null;

	const showStatus = target.kind === "dm" && !!target.lastSeen;

	return (
		<Modal visible transparent animationType="none" onRequestClose={onClose}>
			<Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={StyleSheet.absoluteFill}>
				<Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
					{Platform.OS === "ios" ? (
						<BlurView intensity={60} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
					) : (
						<View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.35)" }]} />
					)}
				</Pressable>

				<View style={styles.wrapper}>
					<Animated.View
						entering={SlideInDown.duration(300).springify().damping(18)}
						style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
					>
						{/* Avatar */}
						<View style={styles.avatarSection}>
							{target.avatar ? (
								<Image
									source={{ uri: target.avatar }}
									style={styles.avatar}
									contentFit="cover"
								/>
							) : (
								<View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}>
									<Text style={{ fontSize: 28, fontFamily: fonts.heroDisplay, color: colors.accent }}>
										{getInitials(target.name)}
									</Text>
								</View>
							)}
							{isOnline && <View style={[styles.onlineDot, { borderColor: cardBg }]} />}
						</View>

						{/* Name */}
						<Text style={[styles.name, { color: colors.textPrimary, fontFamily: fonts.heading2 }]}>
							{target.name}
						</Text>

						{/* Subtitle (role for DM, member count for group) */}
						{subtitle && (
							<Text style={[styles.role, { color: colors.textSecondary, fontFamily: fonts.bodyMedium }]}>
								{subtitle}
							</Text>
						)}

						{/* Online status — DM only */}
						{showStatus && (
							<View style={styles.statusRow}>
								{isOnline && <View style={[styles.statusDot, { backgroundColor: "#22c55e" }]} />}
								<Text style={[styles.statusText, { color: isOnline ? "#22c55e" : colors.textDim, fontFamily: fonts.bodyRegular }]}>
									{(target as DmProfile).lastSeen}
								</Text>
							</View>
						)}

						{/* Divider */}
						<View style={[styles.divider, { backgroundColor: cardBorder }]} />

						{/* Actions */}
						<View style={styles.actions}>
							<Pressable
								onPress={() => {
									Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
									onClose();
								}}
								style={({ pressed }) => [
									styles.actionButton,
									{
										backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
										opacity: pressed ? 0.7 : 1,
									},
								]}
							>
								<Ionicons name="close" size={18} color={colors.textSecondary} />
								<Text style={[styles.actionText, { color: colors.textSecondary, fontFamily: fonts.bodyMedium }]}>
									Close
								</Text>
							</Pressable>
						</View>
					</Animated.View>
				</View>
			</Animated.View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 40,
	},
	card: {
		width: "100%",
		borderRadius: 20,
		borderWidth: 1,
		paddingVertical: 32,
		paddingHorizontal: 28,
		alignItems: "center",
	},
	avatarSection: {
		position: "relative",
		marginBottom: 16,
	},
	avatar: {
		width: 80,
		height: 80,
		borderRadius: 40,
	},
	avatarPlaceholder: {
		alignItems: "center",
		justifyContent: "center",
	},
	onlineDot: {
		position: "absolute",
		right: 2,
		bottom: 2,
		width: 16,
		height: 16,
		borderRadius: 8,
		backgroundColor: "#22c55e",
		borderWidth: 3,
	},
	name: {
		fontSize: 20,
		textAlign: "center",
	},
	role: {
		fontSize: 14,
		marginTop: 4,
		textAlign: "center",
	},
	statusRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginTop: 6,
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	statusText: {
		fontSize: 13,
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		width: "100%",
		marginTop: 20,
		marginBottom: 16,
	},
	actions: {
		flexDirection: "row",
		width: "100%",
	},
	actionButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		paddingVertical: 12,
		borderRadius: 12,
	},
	actionText: {
		fontSize: 15,
	},
});
