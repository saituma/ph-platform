import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { getPublicApiBaseUrl } from "@/lib/public-api";
import { settingsService } from "@/services/settingsService";

export type PortalNotification = {
	id: number;
	type: string | null;
	content: string | null;
	read: boolean;
	link: string | null;
	createdAt: string;
};

const REALTIME_NOTIFICATION_EVENTS = [
	"message:new",
	"group:message",
	"schedule:changed",
	"video:reviewed",
	"physio:referral:updated",
	"physio:referral:deleted",
] as const;

export const portalNotificationKeys = {
	list: (token: string | null) =>
		["portal-notifications", token ?? "guest"] as const,
};

type UsePortalNotificationsOptions = {
	token: string | null;
	enabled: boolean;
};

function toNotificationList(data: unknown): PortalNotification[] {
	if (!data || typeof data !== "object") return [];
	const items = (data as { items?: unknown }).items;
	return Array.isArray(items) ? (items as PortalNotification[]) : [];
}

export function usePortalNotifications(options: UsePortalNotificationsOptions) {
	const { token, enabled } = options;
	const queryClient = useQueryClient();
	const queryKey = portalNotificationKeys.list(token);
	const knownNotificationIdsRef = useRef<Set<number> | null>(null);

	const notificationsQuery = useQuery({
		queryKey,
		queryFn: async () =>
			toNotificationList(await settingsService.getNotifications()),
		enabled,
		staleTime: 1000 * 30,
		refetchInterval: enabled ? 1000 * 60 : false,
	});

	const notifications = notificationsQuery.data ?? [];
	const unreadCount = notifications.reduce(
		(count, item) => count + (item.read ? 0 : 1),
		0,
	);

	useEffect(() => {
		if (!notifications.length) return;
		if (!knownNotificationIdsRef.current) {
			knownNotificationIdsRef.current = new Set(
				notifications.map((item) => item.id),
			);
		}
	}, [notifications]);

	const refreshNotifications = useCallback(
		async (showToastOnNew: boolean) => {
			const next = toNotificationList(await settingsService.getNotifications());
			queryClient.setQueryData(queryKey, next);

			const knownIds = knownNotificationIdsRef.current;
			const nextIds = new Set(next.map((item) => item.id));
			knownNotificationIdsRef.current = nextIds;

			if (!showToastOnNew || !knownIds) return next;
			const hasNew = next.some((item) => !knownIds.has(item.id));
			if (hasNew) {
				toast.info("You have new notification", { position: "top-right" });
			}
			return next;
		},
		[queryClient, queryKey],
	);

	useEffect(() => {
		if (!enabled || !token || typeof window === "undefined") return;

		const rawSocket = String(
			(import.meta.env as Record<string, string | undefined>)
				.VITE_PUBLIC_SOCKET_URL ?? "",
		).trim();
		const apiBase = getPublicApiBaseUrl();
		const socketUrl = rawSocket
			? rawSocket.replace(/\/api\/?$/, "")
			: apiBase
				? apiBase.replace(/\/api\/?$/, "")
				: window.location.origin;

		const socket: Socket = io(socketUrl, {
			path: "/socket.io",
			auth: { token },
			transports: ["polling", "websocket"],
			reconnection: true,
			reconnectionDelayMax: 10000,
		});

		const handlePossibleNotification = () => {
			void refreshNotifications(true);
		};

		socket.on("connect", () => {
			void refreshNotifications(false);
		});

		for (const event of REALTIME_NOTIFICATION_EVENTS) {
			socket.on(event, handlePossibleNotification);
		}

		return () => {
			for (const event of REALTIME_NOTIFICATION_EVENTS) {
				socket.off(event, handlePossibleNotification);
			}
			socket.disconnect();
		};
	}, [enabled, token, refreshNotifications]);

	return {
		notifications,
		unreadCount,
		isLoading: notificationsQuery.isLoading,
		refreshNotifications,
	};
}
