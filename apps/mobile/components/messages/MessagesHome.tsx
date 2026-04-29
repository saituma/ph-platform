import { Ionicons } from "@expo/vector-icons";
import React, { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { AgeGate } from "@/components/AgeGate";
import { InboxScreen } from "@/components/messages/InboxScreen";
import { Text } from "@/components/ScaledText";
import { useActiveTabIndex } from "@/context/ActiveTabContext";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import {
	useSafePathname,
	useSafeRouter,
} from "@/hooks/navigation/useSafeExpoRouter";
import { useMessagesController } from "@/hooks/useMessagesController";
import { apiRequest } from "@/lib/api";
import { BASE_TEAM_TAB_ROUTES } from "@/roles/shared/tabs";
import { useAppSelector } from "@/store/hooks";

export type MessagesHomeMode = "team" | "adult" | "youth";
type InboxFilterKey = "all" | "direct" | "team";

type AnnouncementItem = {
	title?: string | null;
	body?: unknown;
	content?: string | null;
	createdAt?: string | null;
	updatedAt?: string | null;
};

function pickLatestAnnouncement(
	items: AnnouncementItem[],
): AnnouncementItem | null {
	if (!Array.isArray(items) || items.length === 0) return null;
	return [...items].sort((a, b) => {
		const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
		const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
		return tb - ta;
	})[0];
}

export function MessagesHome({ mode }: { mode: MessagesHomeMode }) {
	const { colors, isDark } = useAppTheme();
	const token = useAppSelector((state) => state.user.token);
	const athleteUserId = useAppSelector((state) => state.user.athleteUserId);
	const { isSectionHidden } = useAgeExperience();

	const {
		sortedThreads,
		typingStatus,
		isLoading,
		openingThreadId,
		openThread,
		loadMessages,
		resetOpeningThread,
	} = useMessagesController();
	const router = useSafeRouter();
	const pathname = useSafePathname("");
	const activeTabIndex = useActiveTabIndex();
	const messagesTabIndex = React.useMemo(
		() => BASE_TEAM_TAB_ROUTES.findIndex((t) => t.key === "messages"),
		[],
	);
	const isOnMessagesTab =
		messagesTabIndex >= 0 && activeTabIndex === messagesTabIndex;
	const isMessagesRoute =
		pathname.startsWith("/(tabs)/messages") || pathname.startsWith("/messages");
	const isMessagesSurface = isOnMessagesTab || isMessagesRoute;

	const unreadCount = React.useMemo(
		() =>
			sortedThreads.reduce(
				(sum, thread) => sum + (Number(thread.unread) || 0),
				0,
			),
		[sortedThreads],
	);

	// ── Announcements (compact) ──────────────────────────────────────
	const [announcementsLoading, setAnnouncementsLoading] = React.useState(true);
	const [announcementsMeta, setAnnouncementsMeta] = React.useState<{
		count: number;
		title: string;
		snippet: string;
		when: string;
	} | null>(null);
	const [inboxFilter, setInboxFilter] = React.useState<InboxFilterKey>("all");

	const inboxThreads = React.useMemo(() => {
		if (mode !== "team") {
			const base = sortedThreads.filter((thread) => thread.channelType !== "team");
			if (inboxFilter === "direct") return base.filter((t) => (t.unread ?? 0) > 0);
			return base;
		}
		if (inboxFilter === "direct") {
			return sortedThreads.filter((thread) => thread.channelType === "direct");
		}
		if (inboxFilter === "team") {
			return sortedThreads.filter((thread) => thread.channelType === "team");
		}
		// "all" filter in team mode: show every thread — team chats, coach groups,
		// direct messages (including admin and coach DMs). The Direct/Team pills
		// let the user narrow down when they want.
		return sortedThreads;
	}, [inboxFilter, mode, sortedThreads]);

	React.useEffect(() => {
		if (!token) {
			setAnnouncementsLoading(false);
			setAnnouncementsMeta(null);
			return;
		}
		let active = true;
		(async () => {
			setAnnouncementsLoading(true);
			try {
				const headers = athleteUserId
					? { "X-Acting-User-Id": String(athleteUserId) }
					: undefined;
				const res = await apiRequest<{ items?: AnnouncementItem[] }>(
					"/content/announcements",
					{
						token,
						headers,
						skipCache: true,
						forceRefresh: true,
						suppressStatusCodes: [401, 403, 404],
					},
				);
				const items = Array.isArray(res.items) ? res.items : [];
				const latest = pickLatestAnnouncement(items);
				if (!active) return;
				if (!latest) {
					setAnnouncementsMeta(null);
					return;
				}
				const title = String(latest.title ?? "").trim() || "Announcement";
				const rawBody =
					typeof latest.body === "string"
						? latest.body
						: latest.body
							? String(latest.body)
							: String(latest.content ?? "");
				const snippet = rawBody
					.replace(/!\[[^\]]*\]\([^)]+\)/g, "")
					.replace(/\[(.*?)\]\((.*?)\)/g, "$1")
					.replace(/\s+/g, " ")
					.trim()
					.slice(0, 120);
				const timestamp = latest.updatedAt ?? latest.createdAt ?? null;
				const when = timestamp ? new Date(timestamp).toLocaleString() : "";
				setAnnouncementsMeta({
					count: items.length,
					title,
					snippet,
					when,
				});
			} catch {
				if (!active) return;
				setAnnouncementsMeta(null);
			} finally {
				if (active) setAnnouncementsLoading(false);
			}
		})();
		return () => {
			active = false;
		};
	}, [athleteUserId, token]);

	React.useEffect(() => {
		if (!isMessagesSurface) return;
		resetOpeningThread();
	}, [isMessagesSurface, resetOpeningThread]);

	const handleOpenAnnouncements = useCallback(() => {
		router?.push("/announcements");
	}, [router]);

	if (isSectionHidden("messages")) {
		return (
			<AgeGate
				title="Messages locked"
				message="Messaging is restricted for this age."
			/>
		);
	}

	const screenBg = isDark ? colors.background : "#F4F6F8";

	return (
		<SafeAreaView
			className="flex-1"
			edges={["top"]}
			style={{ backgroundColor: screenBg }}
		>
			{/* ── Native-style Header ───────────────────────────── */}
			<View style={styles.header}>
				<Text
					style={[
						styles.headerTitle,
						{
							fontFamily: "Chillax-Semibold",
							color: colors.textPrimary,
							fontSize: 36,
						},
					]}
				>
					Messages
				</Text>

				<View style={styles.headerRight}>
					{unreadCount > 0 && (
						<View
							style={[styles.unreadPill, { backgroundColor: colors.accent }]}
						>
							<Text style={[styles.unreadText, { fontFamily: "Outfit-Bold" }]}>
								{unreadCount}
							</Text>
						</View>
					)}
				</View>
			</View>

			{mode === "team" ? (
				<View
					style={[
						styles.switcherWrap,
						{
							backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F2F4F7",
						},
					]}
				>
					{(
						[
							{ key: "all", label: "All" },
							{ key: "direct", label: "Direct" },
							{ key: "team", label: "Team" },
						] as const
					).map((item) => {
						const isActive = inboxFilter === item.key;
						return (
							<Pressable
								key={item.key}
								onPress={() => setInboxFilter(item.key)}
								style={[
									styles.switcherItem,
									{
										backgroundColor: isActive
											? colors.surface
											: "transparent",
										shadowColor: isActive && !isDark ? "#000" : "transparent",
										shadowOffset: { width: 0, height: 2 },
										shadowOpacity: 0.06,
										shadowRadius: 4,
										elevation: isActive && !isDark ? 2 : 0,
									},
								]}
							>
								<Text
									style={[
										styles.switcherText,
										{
											fontFamily: isActive ? "Outfit-Bold" : "Outfit-Medium",
											color: isActive
												? colors.textPrimary
												: colors.textSecondary,
										},
									]}
								>
									{item.label}
								</Text>
							</Pressable>
						);
					})}
				</View>
			) : (
				<View
					style={[
						styles.switcherWrap,
						{
							backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F2F4F7",
						},
					]}
				>
					{(
						[
							{ key: "all", label: "All" },
							{ key: "direct", label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
						] as const
					).map((item) => {
						const isActive = inboxFilter === item.key;
						const hasUnread = item.key === "direct" && unreadCount > 0;
						return (
							<Pressable
								key={item.key}
								onPress={() => setInboxFilter(item.key)}
								style={[
									styles.switcherItem,
									{
										backgroundColor: isActive
											? colors.surface
											: "transparent",
										shadowColor: isActive && !isDark ? "#000" : "transparent",
										shadowOffset: { width: 0, height: 2 },
										shadowOpacity: 0.06,
										shadowRadius: 4,
										elevation: isActive && !isDark ? 2 : 0,
									},
								]}
							>
								<Text
									style={[
										styles.switcherText,
										{
											fontFamily: isActive ? "Outfit-Bold" : "Outfit-Medium",
											color: hasUnread
												? colors.accent
												: isActive
												? colors.textPrimary
												: colors.textSecondary,
										},
									]}
								>
									{item.label}
								</Text>
							</Pressable>
						);
					})}
				</View>
			)}

			{/* ── Announcement Button ── */}
			{!announcementsLoading && announcementsMeta && (
				<View style={styles.announcementWrapper}>
					<Pressable
						onPress={handleOpenAnnouncements}
						style={({ pressed }) => [
							styles.announcementBtn,
							{
								backgroundColor: isDark
									? pressed ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.05)"
									: pressed ? "rgba(0,0,0,0.05)" : "#fff",
								borderColor: isDark
									? "rgba(255,255,255,0.10)"
									: "rgba(0,0,0,0.07)",
							},
						]}
					>
						<View style={styles.announcementLeft}>
							<View
								style={[
									styles.announcementIcon,
									{
										backgroundColor: isDark
											? "rgba(200,241,53,0.12)"
											: "rgba(34,197,94,0.10)",
									},
								]}
							>
								<Ionicons name="megaphone" size={20} color={colors.accent} />
							</View>
							<View style={styles.announcementContent}>
								<Text
									style={[
										styles.announcementTitle,
										{ fontFamily: "Outfit-SemiBold", color: colors.textPrimary },
									]}
									numberOfLines={1}
								>
									{announcementsMeta.title}
								</Text>
								<Text
									style={[
										styles.announcementSnippet,
										{ fontFamily: "Outfit-Regular", color: colors.textSecondary },
									]}
									numberOfLines={1}
								>
									{announcementsMeta.snippet}
								</Text>
							</View>
						</View>
					</Pressable>
					{announcementsMeta.count > 0 && (
						<View
							style={[
								styles.announcementBadge,
								{ backgroundColor: colors.accent },
							]}
						>
							<Text style={[styles.announcementBadgeText, { fontFamily: "Outfit-Bold" }]}>
								{announcementsMeta.count}
							</Text>
						</View>
					)}
				</View>
			)}

			{/* ── Thread List ─────────────────────────────────────── */}
			<InboxScreen
				threads={inboxThreads}
				typingStatus={typingStatus}
				isLoading={isLoading}
				openingThreadId={openingThreadId}
				onRefresh={loadMessages}
				onOpenThread={openThread}
				variant={mode === "team" ? "team" : "default"}
				showEmptySections={mode === "team"}
			/>
		</SafeAreaView>
	);
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	header: {
		paddingHorizontal: 20,
		paddingTop: 16,
		paddingBottom: 4,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	headerTitle: {
		letterSpacing: -1,
	},
	headerRight: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	composeButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: "center",
		justifyContent: "center",
	},
	unreadPill: {
		minWidth: 24,
		height: 24,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 8,
	},
	unreadText: {
		fontSize: 13,
		color: "#000",
	},
	switcherWrap: {
		marginHorizontal: 16,
		marginVertical: 12,
		padding: 6,
		borderRadius: 20,
		flexDirection: "row",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.04,
		shadowRadius: 8,
		elevation: 2,
	},
	switcherItem: {
		flex: 1,
		height: 40,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	switcherText: {
		fontSize: 14,
		letterSpacing: -0.1,
	},
	announcementWrapper: {
		marginHorizontal: 16,
		marginBottom: 24,
		position: "relative",
	},
	announcementBtn: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 18,
		paddingVertical: 16,
		borderRadius: 22,
		borderWidth: 1,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 6,
		elevation: 3,
	},
	announcementLeft: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
		minWidth: 0,
	},
	announcementIcon: {
		width: 52,
		height: 52,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
	},
	announcementContent: {
		flex: 1,
		gap: 4,
		minWidth: 0,
	},
	announcementTitle: {
		fontSize: 16,
		letterSpacing: -0.3,
	},
	announcementSnippet: {
		fontSize: 13,
		opacity: 0.75,
	},
	announcementBadge: {
		position: "absolute",
		top: -10,
		left: 52,
		minWidth: 24,
		height: 24,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 6,
		zIndex: 10,
		elevation: 10,
	},
	announcementBadgeText: {
		fontSize: 12,
		color: "#000",
	},
});
