import React, { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Megaphone } from "lucide-react-native";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { AgeGate } from "@/components/AgeGate";
import { InboxScreen } from "@/components/messages/InboxScreen";
import { StoriesRow } from "@/components/messages/StoriesRow";
import { Text } from "@/components/ScaledText";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { useSafeRouter } from "@/hooks/navigation/useSafeExpoRouter";
import { useMessagesController } from "@/hooks/useMessagesController";
import { useStories } from "@/hooks/useStories";
import { apiRequest } from "@/lib/api";
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
	const p = useAdminPastel();
	const token = useAppSelector((state) => state.user.token);
	const athleteUserId = useAppSelector((state) => state.user.athleteUserId);
	const { isSectionHidden } = useAgeExperience();

	const { data: stories = [] } = useStories();
	const router = useSafeRouter();
	const isMessagesSurface = true;
	const {
		sortedThreads,
		typingStatus,
		isLoading,
		openingThreadId,
		openThread,
		loadMessages,
		resetOpeningThread,
	} = useMessagesController({ enabled: isMessagesSurface });

	const unreadCount = React.useMemo(
		() =>
			sortedThreads.reduce(
				(sum, thread) => sum + (Number(thread.unread) || 0),
				0,
			),
		[sortedThreads],
	);

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
			if (inboxFilter === "direct") {
				return sortedThreads.filter((t) => (t.unread ?? 0) > 0);
			}
			return sortedThreads;
		}
		if (inboxFilter === "direct") {
			return sortedThreads.filter((thread) => thread.channelType === "direct");
		}
		if (inboxFilter === "team") {
			return sortedThreads.filter((thread) => thread.channelType === "team");
		}
		return sortedThreads;
	}, [inboxFilter, mode, sortedThreads]);

	React.useEffect(() => {
		if (!isMessagesSurface || !token) {
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
	}, [athleteUserId, isMessagesSurface, token]);

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

	const filterItems =
		mode === "team"
			? ([
					{ key: "all", label: "All" },
					{ key: "direct", label: "Direct" },
					{ key: "team", label: "Team" },
				] as const)
			: ([
					{ key: "all", label: "All" },
					{
						key: "direct",
						label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`,
					},
				] as const);

	return (
		<SafeAreaView
			edges={["top"]}
			style={{ flex: 1, backgroundColor: p.pageBg }}
		>
			<View style={styles.header}>
				<Text
					style={{
						fontFamily: "Outfit-Bold",
						fontSize: 28,
						letterSpacing: -0.5,
						color: p.textPrimary,
					}}
				>
					Messages
				</Text>

				<View style={styles.headerRight}>
					{unreadCount > 0 && (
						<View
							style={[styles.unreadPill, { backgroundColor: p.accent }]}
						>
							<Text
								style={{
									fontFamily: "Outfit-Bold",
									fontSize: 13,
									color: p.buttonPrimaryText,
								}}
							>
								{unreadCount}
							</Text>
						</View>
					)}
				</View>
			</View>

			<View
				style={[
					styles.switcherWrap,
					{ backgroundColor: p.inputBg },
				]}
			>
				{filterItems.map((item) => {
					const isActive = inboxFilter === item.key;
					const hasUnread =
						item.key === "direct" && mode !== "team" && unreadCount > 0;
					return (
						<Pressable
							key={item.key}
							onPress={() => setInboxFilter(item.key)}
							style={[
								styles.switcherItem,
								{
									backgroundColor: isActive ? p.cardWhite : "transparent",
								},
							]}
						>
							<Text
								style={{
									fontFamily: isActive ? "Outfit-Bold" : "Outfit-Regular",
									fontSize: 14,
									letterSpacing: -0.1,
									color: hasUnread
										? p.accent
										: isActive
											? p.textPrimary
											: p.textSecondary,
								}}
							>
								{item.label}
							</Text>
						</Pressable>
					);
				})}
			</View>

			<InboxScreen
				threads={inboxThreads}
				typingStatus={typingStatus}
				isLoading={isLoading}
				openingThreadId={openingThreadId}
				onRefresh={loadMessages}
				onOpenThread={openThread}
				variant={mode === "team" ? "team" : "default"}
				showEmptySections={mode === "team"}
				headerContent={
					<>
						{stories.length > 0 && <StoriesRow stories={stories} />}
						{!announcementsLoading && announcementsMeta && (
							<View style={styles.announcementWrapper}>
								<Pressable
									onPress={handleOpenAnnouncements}
									style={[
										styles.announcementBtn,
										{ backgroundColor: p.cardWhite },
									]}
								>
									<View style={styles.announcementLeft}>
										<View
											style={[
												styles.announcementIcon,
												{ backgroundColor: p.accentSoft },
											]}
										>
											<Megaphone size={22} color={p.accent} strokeWidth={2} />
										</View>
										<View style={styles.announcementContent}>
											<Text
												style={{
													fontFamily: "Outfit-Bold",
													fontSize: 16,
													letterSpacing: -0.3,
													color: p.textPrimary,
												}}
												numberOfLines={1}
											>
												{announcementsMeta.title}
											</Text>
											<Text
												style={{
													fontFamily: "Outfit-Regular",
													fontSize: 13,
													color: p.textMuted,
												}}
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
											{ backgroundColor: p.accent },
										]}
									>
										<Text
											style={{
												fontFamily: "Outfit-Bold",
												fontSize: 12,
												color: p.buttonPrimaryText,
											}}
										>
											{announcementsMeta.count}
										</Text>
									</View>
								)}
							</View>
						)}
					</>
				}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	header: {
		paddingHorizontal: 20,
		paddingTop: 16,
		paddingBottom: 4,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	headerRight: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	unreadPill: {
		minWidth: 24,
		height: 24,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 8,
	},
	switcherWrap: {
		marginHorizontal: 16,
		marginTop: 12,
		marginBottom: 6,
		padding: 4,
		borderRadius: 22,
		flexDirection: "row",
		alignItems: "center",
	},
	switcherItem: {
		flex: 1,
		height: 40,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	announcementWrapper: {
		marginHorizontal: 16,
		marginBottom: 16,
		position: "relative",
	},
	announcementBtn: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 18,
		paddingVertical: 16,
		borderRadius: 22,
	},
	announcementLeft: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
		minWidth: 0,
	},
	announcementIcon: {
		width: 48,
		height: 48,
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
	announcementBadge: {
		position: "absolute",
		top: -8,
		left: 50,
		minWidth: 22,
		height: 22,
		borderRadius: 11,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 6,
		zIndex: 10,
	},
});
