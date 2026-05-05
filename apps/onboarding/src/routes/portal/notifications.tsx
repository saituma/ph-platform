import { createFileRoute } from "@tanstack/react-router";
import { Bell, BellOff, CheckCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePortalNotifications } from "@/hooks/usePortalNotifications";
import {
	motion,
	PageTransition,
	Skeleton,
	StaggerItem,
	StaggerList,
} from "@/lib/motion";
import { cn } from "@/lib/utils";
import { usePortal } from "@/portal/PortalContext";
import { settingsService } from "@/services/settingsService";

export const Route = createFileRoute("/portal/notifications")({
	component: NotificationsPage,
});

function relativeDate(dateString: string) {
	const diff = Date.now() - new Date(dateString).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "Just now";
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return new Date(dateString).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});
}

function NotificationsPage() {
	const { token, loading: portalLoading } = usePortal();
	const { notifications, isLoading, unreadCount, refreshNotifications } =
		usePortalNotifications({
			token,
			enabled: !!token && !portalLoading,
		});
	const [markingAll, setMarkingAll] = useState(false);

	const handleMarkRead = async (id: number) => {
		try {
			await settingsService.markNotificationRead(id);
			await refreshNotifications(false);
		} catch {
			toast.error("Failed to mark as read");
		}
	};

	const handleMarkAllRead = async () => {
		const unread = notifications.filter((n) => !n.read);
		if (!unread.length) return;
		setMarkingAll(true);
		try {
			await Promise.all(
				unread.map((n) => settingsService.markNotificationRead(n.id)),
			);
			await refreshNotifications(false);
			toast.success("All notifications marked as read");
		} catch {
			toast.error("Failed to mark all as read");
		} finally {
			setMarkingAll(false);
		}
	};

	return (
		<PageTransition className="p-6 max-w-2xl mx-auto space-y-6">
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
				className="flex items-start justify-between gap-4"
			>
				<div className="space-y-1">
					<h1 className="text-3xl font-black uppercase italic tracking-tighter">
						Notifications
					</h1>
					<p className="text-muted-foreground">
						{unreadCount > 0
							? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
							: "You're all caught up"}
					</p>
				</div>
				{unreadCount > 0 && (
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.2 }}
					>
						<Button
							variant="outline"
							size="sm"
							className="rounded-xl font-bold border-2 shrink-0"
							onClick={() => void handleMarkAllRead()}
							disabled={markingAll}
						>
							{markingAll ? (
								<Loader2 className="mr-2 h-3 w-3 animate-spin" />
							) : (
								<CheckCheck className="mr-2 h-3 w-3" />
							)}
							Mark all read
						</Button>
					</motion.div>
				)}
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
			>
				<Card className="border-2">
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base font-bold uppercase tracking-tight">
							<Bell className="h-4 w-4 text-primary" />
							Inbox
							{unreadCount > 0 && (
								<motion.div
									key={unreadCount}
									initial={{ scale: 0.5, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									transition={{ type: "spring", stiffness: 400 }}
								>
									<Badge className="rounded-full font-black text-xs px-2">
										{unreadCount}
									</Badge>
								</motion.div>
							)}
						</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						{isLoading ? (
							<div className="divide-y">
								{[1, 2, 3, 4].map((i) => (
									<div key={i} className="flex items-start gap-4 px-5 py-4">
										<Skeleton className="h-2 w-2 rounded-full mt-2 shrink-0" />
										<div className="flex-1 space-y-2">
											<Skeleton className="h-2.5 w-16" />
											<Skeleton className="h-4 w-full" />
										</div>
										<Skeleton className="h-3 w-12 shrink-0" />
									</div>
								))}
							</div>
						) : notifications.length === 0 ? (
							<motion.div
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground"
							>
								<BellOff className="h-8 w-8 opacity-30" />
								<p className="text-sm font-medium">No notifications yet</p>
							</motion.div>
						) : (
							<StaggerList className="divide-y">
								{notifications.map((notif) => (
									<StaggerItem key={notif.id}>
										<motion.button
											whileHover={{ x: 2 }}
											transition={{ duration: 0.15 }}
											type="button"
											onClick={() => {
												if (!notif.read) void handleMarkRead(notif.id);
												if (notif.link) window.location.href = notif.link;
											}}
											className={cn(
												"w-full flex items-start gap-4 px-5 py-4 text-left transition-colors",
												!notif.read
													? "bg-primary/5 hover:bg-primary/10"
													: "hover:bg-muted/40",
											)}
										>
											<motion.div
												animate={!notif.read ? { scale: [1, 1.3, 1] } : {}}
												transition={{
													repeat: Infinity,
													duration: 2,
													ease: "easeInOut",
												}}
												className={cn(
													"mt-0.5 h-2 w-2 shrink-0 rounded-full",
													!notif.read ? "bg-primary" : "bg-transparent",
												)}
											/>
											<div className="min-w-0 flex-1">
												{notif.type && (
													<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">
														{notif.type.replace(/_/g, " ")}
													</p>
												)}
												<p
													className={cn(
														"text-sm leading-snug",
														!notif.read
															? "font-bold text-foreground"
															: "text-muted-foreground",
													)}
												>
													{notif.content || "—"}
												</p>
											</div>
											<span className="shrink-0 text-xs text-muted-foreground">
												{relativeDate(notif.createdAt)}
											</span>
										</motion.button>
									</StaggerItem>
								))}
							</StaggerList>
						)}
					</CardContent>
				</Card>
			</motion.div>
		</PageTransition>
	);
}
