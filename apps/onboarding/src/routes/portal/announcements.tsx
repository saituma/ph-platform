import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { usePortal } from "@/portal/PortalContext";
import { settingsService } from "@/services/settingsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radio, RefreshCw, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, PageTransition, Skeleton } from "@/lib/motion";

export const Route = createFileRoute("/portal/announcements")({
	component: AnnouncementsPage,
});

function AnnouncementsPage() {
	const { user } = usePortal();
	const [items, setItems] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await settingsService.getAnnouncements(user?.id);
			setItems(Array.isArray(res.items) ? res.items : []);
		} catch (error) {
			console.error("Failed to load announcements", error);
		} finally {
			setLoading(false);
		}
	}, [user]);

	useEffect(() => {
		load();
	}, [load]);

	return (
		<PageTransition className="p-6 max-w-4xl mx-auto space-y-6">
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
				className="flex items-center justify-between"
			>
				<div className="flex flex-col gap-1">
					<h1 className="text-3xl font-black uppercase italic tracking-tighter">Announcements</h1>
					<p className="text-muted-foreground">Stay updated with the latest news and broadcasts.</p>
				</div>
				<Button variant="outline" size="icon" onClick={load} disabled={loading} className="rounded-xl border-2">
					<RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
				</Button>
			</motion.div>

			{loading ? (
				<div className="space-y-4">
					{[1, 2].map((i) => (
						<div key={i} className="rounded-2xl border-2 p-6 space-y-3">
							<Skeleton className="h-6 w-48" />
							<Skeleton className="h-3 w-24" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-3/4" />
						</div>
					))}
				</div>
			) : items.length === 0 ? (
				<Card className="border-2 border-dashed flex flex-col items-center justify-center py-20 text-center space-y-4">
					<div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center text-primary/40">
						<Megaphone className="h-8 w-8" />
					</div>
					<div className="space-y-1">
						<p className="font-bold">No announcements yet</p>
						<p className="text-sm text-muted-foreground">Check back later for updates.</p>
					</div>
				</Card>
			) : (
				<div className="grid gap-6">
					{items.map((item) => (
						<Card key={item.id} className="border-2 overflow-hidden">
							<CardHeader className="flex flex-row items-start justify-between gap-4">
								<div className="space-y-1">
									<CardTitle className="text-xl font-bold">{item.title || "Announcement"}</CardTitle>
									<p className="text-xs text-muted-foreground">
										{new Date(item.updatedAt || item.createdAt).toLocaleString()}
									</p>
								</div>
								<div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
									<Radio className="h-5 w-5" />
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="prose prose-sm dark:prose-invert max-w-none text-foreground/80 leading-relaxed">
									{item.body || item.content}
								</div>
								{!item.isActive && (
									<Badge variant="destructive" className="uppercase font-black text-[10px]">Inactive</Badge>
								)}
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</PageTransition>
	);
}
