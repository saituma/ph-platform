import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	SidebarInset,
	SidebarProvider,
} from "@/components/ui/sidebar";
import { usePortalNotifications } from "@/hooks/usePortalNotifications";
import { usePortal } from "@/portal/PortalContext";
import { AppSidebar } from "./app-sidebar";
import { PortalDock } from "./PortalDock";

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
					className="flex-1 overflow-y-auto pb-28"
				>
					{children}
				</motion.main>

				<PortalDock />
			</SidebarInset>
		</SidebarProvider>
	);
}
