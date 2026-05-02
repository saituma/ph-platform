import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
	Bell,
	CalendarCheck,
	ChevronLeft,
	ChevronRight,
	Clipboard,
	CreditCard,
	Dumbbell,
	FileText,
	Gift,
	HelpCircle,
	House,
	Info,
	Lock,
	LogOut,
	MessageCircle,
	MessageSquare,
	PanelLeftClose,
	PanelLeftOpen,
	Radio,
	Shield,
	Star,
	Stethoscope,
	User,
	Users,
} from "lucide-react";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	useSidebar,
} from "@/components/ui/sidebar";
import {
	isPortalCoachLikeRole,
	showPortalNutritionNav,
	showPortalPhysioReferralNav,
} from "@/lib/portal-roles";
import { useRouterPathname } from "@/lib/use-router-pathname";
import { cn } from "@/lib/utils";
import { clearAuthToken } from "@/lib/client-storage";
import { usePortal } from "@/portal/PortalContext";

function normalizePortalPathname(pathname: string): string {
	const pathOnly = pathname.split("?")[0] ?? pathname;
	if (pathOnly.length > 1 && pathOnly.endsWith("/")) {
		return pathOnly.slice(0, -1);
	}
	return pathOnly;
}

function portalNavItemIsActive(pathname: string, itemPath: string): boolean {
	const current = normalizePortalPathname(pathname);
	const base = itemPath.split("?")[0];

	if (base === "/portal/dashboard") {
		return (
			current === "/portal/dashboard" ||
			current === "/portal" ||
			current === "/"
		);
	}

	return current === base || current.startsWith(`${base}/`);
}

const mainNavItems = [
	{ label: "Dashboard", path: "/portal/dashboard", icon: House },
	{ label: "Programs", path: "/portal/programs", icon: Dumbbell },
	{ label: "Schedule", path: "/portal/schedule", icon: CalendarCheck },
	{ label: "Messages", path: "/portal/messages", icon: MessageCircle },
];

const coachOnlyNavItems = [
	{ label: "Team", path: "/portal/team", icon: Users },
] as const;

const accountItems = [
	{ label: "Profile Information", path: "/portal/profile", icon: User },
	{ label: "Billing & Plan", path: "/portal/billing", icon: CreditCard },
	{ label: "Referral Program", path: "/portal/referral", icon: Gift },
	{ label: "Permissions", path: "/portal/permissions", icon: Shield },
	{ label: "Nutrition Tracking", path: "/portal/nutrition", icon: Clipboard },
	{ label: "My Referral", path: "/portal/physio-referral", icon: Stethoscope },
	{ label: "Notifications", path: "/portal/notifications", icon: Bell },
	{ label: "Privacy & Security", path: "/portal/privacy-security", icon: Lock },
];

const supportItems = [
	{ label: "Submit Testimonial", path: "/portal/testimonial", icon: Star },
	{ label: "Announcements", path: "/portal/announcements", icon: Radio },
	{ label: "Help Center", path: "/portal/help", icon: HelpCircle },
	{ label: "Send Feedback", path: "/portal/feedback", icon: MessageSquare },
	{ label: "About Platform", path: "/portal/about", icon: Info },
];

const legalItems = [
	{ label: "Terms of Service", path: "/portal/terms", icon: FileText },
	{ label: "Privacy Policy", path: "/portal/privacy-policy", icon: Shield },
];

export function AppSidebar() {
	const pathname = useRouterPathname();
	const { user } = usePortal();
	const { state, toggleSidebar } = useSidebar();

	const isActive = (path: string) => portalNavItemIsActive(pathname, path);

	const handleLogout = async () => {
		await clearAuthToken();
		window.location.href = "/login";
	};

	const renderNavItem = (item: { label: string; path: string; icon: any }, active: boolean) => {
		const Icon = item.icon;
		return (
			<SidebarMenuItem key={item.path} className="relative">
				{active && (
					<motion.div
						layoutId="sidebar-active"
						className="absolute inset-0 bg-primary/10 border-l-2 border-primary"
						transition={{ type: "spring", stiffness: 350, damping: 30 }}
					/>
				)}
				<SidebarMenuButton
					asChild
					isActive={active}
					tooltip={item.label}
					className={cn(
						"relative z-10 transition-colors duration-150 h-9",
						active
							? "text-primary font-medium bg-transparent"
							: "text-foreground/50 hover:text-foreground hover:bg-foreground/[0.04]",
					)}
				>
					<Link to={item.path}>
						<motion.div
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							transition={{ duration: 0.15 }}
						>
							<Icon className="h-4 w-4" />
						</motion.div>
						<span className="font-mono text-xs tracking-wide">{item.label}</span>
					</Link>
				</SidebarMenuButton>
			</SidebarMenuItem>
		);
	};

	return (
		<Sidebar collapsible="icon" side="left">
			<SidebarHeader className="h-12 border-b border-foreground/[0.06] p-2 shrink-0">
				<SidebarMenu>
					<SidebarMenuItem className="flex items-center gap-2">
						<SidebarMenuButton
							size="lg"
							asChild={state === "expanded"}
							onClick={
								state === "collapsed" ? () => toggleSidebar() : undefined
							}
							className="group-data-[collapsible=icon]:p-0"
							tooltip={state === "collapsed" ? "Expand Sidebar" : undefined}
						>
							{state === "expanded" ? (
								<Link
									to="/portal/dashboard"
									className="flex items-center gap-2"
								>
									<motion.div
										whileHover={{ rotate: 5 }}
										transition={{ type: "spring", stiffness: 300 }}
										className="flex aspect-square size-7 items-center justify-center bg-primary text-primary-foreground"
									>
										<Dumbbell className="h-4 w-4" />
									</motion.div>
									<div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden ml-1">
										<span className="font-mono text-xs uppercase tracking-wider text-foreground">
											PH App
										</span>
										<span className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
											Performance
										</span>
									</div>
								</Link>
							) : (
								<div className="flex aspect-square size-7 items-center justify-center bg-primary text-primary-foreground">
									<PanelLeftOpen className="h-4 w-4" />
								</div>
							)}
						</SidebarMenuButton>
						<SidebarMenuAction
							onClick={() => toggleSidebar()}
							className="group-data-[collapsible=icon]:hidden hover:bg-foreground/[0.04] transition-colors"
							title={
								state === "expanded" ? "Collapse Sidebar" : "Expand Sidebar"
							}
						>
							<PanelLeftClose className="h-4 w-4 text-foreground/40 hover:text-foreground transition-colors" />
						</SidebarMenuAction>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent className="py-4 scrollbar-hide">
				<SidebarGroup>
					<SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-2 font-mono text-[10px] uppercase tracking-wider text-foreground/30">
						Navigation
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{mainNavItems.map((item) => renderNavItem(item, isActive(item.path)))}
							{isPortalCoachLikeRole(user?.role)
								? coachOnlyNavItems.map((item) => renderNavItem(item, isActive(item.path)))
								: null}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup>
					<SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-2 font-mono text-[10px] uppercase tracking-wider text-foreground/30">
						Account
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{accountItems
								.filter(
									(item) =>
										(item.path !== "/portal/nutrition" ||
											showPortalNutritionNav(user?.role)) &&
										(item.path !== "/portal/physio-referral" ||
											showPortalPhysioReferralNav(user?.role)),
								)
								.map((item) => renderNavItem(item, isActive(item.path)))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup>
					<SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-2 font-mono text-[10px] uppercase tracking-wider text-foreground/30">
						Support & About
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{supportItems.map((item) => renderNavItem(item, isActive(item.path)))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup>
					<SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-2 font-mono text-[10px] uppercase tracking-wider text-foreground/30">
						Legal
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{legalItems.map((item) => renderNavItem(item, isActive(item.path)))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup className="mt-auto border-t border-foreground/[0.06]">
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									onClick={() => toggleSidebar()}
									tooltip={
										state === "expanded" ? "Collapse Sidebar" : "Expand Sidebar"
									}
									className="h-9 text-foreground/40 hover:text-foreground transition-colors"
								>
									{state === "expanded" ? (
										<>
											<ChevronLeft className="h-4 w-4" />
											<span className="font-mono text-[10px] uppercase tracking-wider">
												Collapse Sidebar
											</span>
										</>
									) : (
										<ChevronRight className="h-4 w-4 mx-auto text-foreground/40" />
									)}
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="border-t border-foreground/[0.06] p-3 shrink-0">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							size="lg"
							tooltip={user?.name || "Athlete"}
							className="hover:bg-foreground/[0.04]"
						>
							<div className="flex aspect-square size-7 items-center justify-center bg-foreground/10 text-foreground/60">
								<User className="size-3.5" />
							</div>
							<div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden ml-1">
								<span className="font-mono text-xs tracking-wide text-foreground truncate">
									{user?.name || "Athlete"}
								</span>
								<span className="font-mono text-[10px] text-foreground/40 truncate">
									{user?.email || "Connect account"}
								</span>
							</div>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton
							onClick={handleLogout}
							tooltip="Logout"
							className="text-foreground/40 hover:text-destructive hover:bg-destructive/5 h-9"
						>
							<LogOut className="size-3.5" />
							<span className="font-mono text-[10px] uppercase tracking-wider group-data-[collapsible=icon]:hidden">
								Logout
							</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
