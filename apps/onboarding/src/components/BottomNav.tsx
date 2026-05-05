import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { usePortalNotifications } from "@/hooks/usePortalNotifications";
import { usePortal } from "@/portal/PortalContext";
import { AppSidebar } from "./app-sidebar";

interface BottomNavProps {
	children: React.ReactNode;
}

export function BottomNav({ children }: BottomNavProps) {
	const { token, loading: portalLoading } = usePortal();
	const { unreadCount } = usePortalNotifications({
		token,
		enabled: !!token && !portalLoading,
	});

	return (
		<SidebarProvider>
			<nav aria-label="Portal navigation">
				<AppSidebar />
			</nav>
			<SidebarInset className="flex flex-col min-h-svh bg-background">
				<header className="sticky top-0 z-40 flex h-14 items-center justify-end border-b border-foreground/[0.06] bg-background/95 px-4 backdrop-blur">
					<Link
						to="/portal/notifications"
						className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-foreground/[0.1] text-foreground/70 transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
						aria-label="Open notifications"
					>
						<Bell className="h-4 w-4" />
						{unreadCount > 0 && (
							<Badge className="absolute -right-1.5 -top-1.5 h-5 min-w-5 rounded-full px-1 text-[10px] font-black leading-none">
								{unreadCount > 99 ? "99+" : unreadCount}
							</Badge>
						)}
					</Link>
				</header>
				<motion.main
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.3, ease: "easeOut" }}
					className="flex-1 overflow-y-auto"
				>
					{children}
				</motion.main>

				<footer className="flex h-14 shrink-0 items-center gap-2 border-t border-foreground/[0.06] px-4 md:hidden bg-background sticky bottom-0 z-50">
					<SidebarTrigger className="h-10 w-10 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors" />

					<div className="flex flex-1 flex-col items-center justify-center">
						<span className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
							PH Performance
						</span>
					</div>

					<div className="w-10 h-10 flex items-center justify-center">
						<motion.div
							animate={{ opacity: [0.3, 0.6, 0.3] }}
							transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
							className="h-1.5 w-1.5 rounded-full bg-primary"
						/>
					</div>
				</footer>
			</SidebarInset>
		</SidebarProvider>
	);
}
