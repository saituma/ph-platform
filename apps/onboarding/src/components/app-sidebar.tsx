import { Link } from "@tanstack/react-router";
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
import { usePortal } from "@/portal/PortalContext";

function normalizePortalPathname(pathname: string): string {
	const pathOnly = pathname.split("?")[0] ?? pathname;
	if (pathOnly.length > 1 && pathOnly.endsWith("/")) {
		return pathOnly.slice(0, -1);
	}
	return pathOnly;
}

/** Match exact path or nested routes (e.g. programs/module/…), without prefix false-positives. */
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

	const handleLogout = () => {
		localStorage.removeItem("auth_token");
		window.location.href = "/login";
	};

	return (
		<Sidebar collapsible="icon" side="left">
			<SidebarHeader className="h-16 border-b p-2 shrink-0">
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
									className="flex items-center gap-2 font-black uppercase italic tracking-tighter"
								>
									<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-all group-data-[collapsible=icon]:size-8">
										<Dumbbell className="h-5 w-5" />
									</div>
									<div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden ml-1">
										<span className="truncate text-foreground font-black uppercase italic tracking-tighter">
											PH App
										</span>
										<span className="truncate text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
											Performance
										</span>
									</div>
								</Link>
							) : (
								<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-all group-data-[collapsible=icon]:size-8">
									<PanelLeftOpen className="h-5 w-5 animate-pulse" />
								</div>
							)}
						</SidebarMenuButton>
						<SidebarMenuAction
							onClick={() => toggleSidebar()}
							className="group-data-[collapsible=icon]:hidden hover:bg-accent rounded-md transition-all duration-300"
							title={
								state === "expanded" ? "Collapse Sidebar" : "Expand Sidebar"
							}
						>
							<PanelLeftClose className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
						</SidebarMenuAction>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent className="py-6 scrollbar-hide">
				<SidebarGroup>
					<SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
						Navigation
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{mainNavItems.map((item) => {
								const Icon = item.icon;
								const active = isActive(item.path);
								return (
									<SidebarMenuItem key={item.path}>
										<SidebarMenuButton
											asChild
											isActive={active}
											tooltip={item.label}
											className={cn(
												"transition-all duration-200 h-10",
												active
													? "bg-primary text-primary-foreground shadow-md font-bold"
													: "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
											)}
										>
											<Link to={item.path}>
												<Icon
													className={cn(
														"h-5 w-5",
														active ? "fill-current" : "",
													)}
												/>
												<span className="font-bold">{item.label}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
							{isPortalCoachLikeRole(user?.role)
								? coachOnlyNavItems.map((item) => {
										const Icon = item.icon;
										const active = isActive(item.path);
										return (
											<SidebarMenuItem key={item.path}>
												<SidebarMenuButton
													asChild
													isActive={active}
													tooltip={item.label}
													className={cn(
														"transition-all duration-200 h-10",
														active
															? "bg-primary text-primary-foreground shadow-md font-bold"
															: "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
													)}
												>
													<Link to={item.path}>
														<Icon
															className={cn(
																"h-5 w-5",
																active ? "fill-current" : "",
															)}
														/>
														<span className="font-bold">{item.label}</span>
													</Link>
												</SidebarMenuButton>
											</SidebarMenuItem>
										);
									})
								: null}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup>
					<SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
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
								.map((item) => {
									const active = isActive(item.path);
									return (
										<SidebarMenuItem key={item.label}>
											<SidebarMenuButton
												asChild
												isActive={active}
												tooltip={item.label}
												className={cn(
													"transition-all duration-200 h-10",
													active
														? "bg-primary text-primary-foreground shadow-md font-bold"
														: "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
												)}
											>
												<Link to={item.path}>
													<item.icon
														className={cn(
															"h-5 w-5",
															active ? "fill-current" : "",
														)}
													/>
													<span className="font-semibold">{item.label}</span>
												</Link>
											</SidebarMenuButton>
										</SidebarMenuItem>
									);
								})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup>
					<SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
						Support & About
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{supportItems.map((item) => {
								const active = isActive(item.path);
								return (
									<SidebarMenuItem key={item.label}>
										<SidebarMenuButton
											asChild
											isActive={active}
											tooltip={item.label}
											className={cn(
												"transition-all duration-200 h-10",
												active
													? "bg-primary text-primary-foreground shadow-md font-bold"
													: "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
											)}
										>
											<Link to={item.path}>
												<item.icon
													className={cn(
														"h-5 w-5",
														active ? "fill-current" : "",
													)}
												/>
												<span className="font-semibold">{item.label}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup>
					<SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
						Legal
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{legalItems.map((item) => {
								const active = isActive(item.path);
								return (
									<SidebarMenuItem key={item.label}>
										<SidebarMenuButton
											asChild
											isActive={active}
											tooltip={item.label}
											className={cn(
												"transition-all duration-200 h-10",
												active
													? "bg-primary text-primary-foreground shadow-md font-bold"
													: "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
											)}
										>
											<Link to={item.path}>
												<item.icon
													className={cn(
														"h-5 w-5",
														active ? "fill-current" : "",
													)}
												/>
												<span className="font-semibold">{item.label}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup className="mt-auto border-t border-sidebar-border/50">
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									onClick={() => toggleSidebar()}
									tooltip={
										state === "expanded" ? "Collapse Sidebar" : "Expand Sidebar"
									}
									className="h-10 text-muted-foreground hover:text-foreground transition-all duration-300"
								>
									{state === "expanded" ? (
										<>
											<ChevronLeft className="h-4 w-4" />
											<span className="font-bold uppercase italic tracking-wider text-[10px]">
												Collapse Sidebar
											</span>
										</>
									) : (
										<ChevronRight className="h-4 w-4 mx-auto text-primary animate-pulse" />
									)}
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="border-t p-4 shrink-0 bg-sidebar">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							size="lg"
							tooltip={user?.name || "Athlete"}
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground border border-transparent hover:border-primary/20"
						>
							<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
								<User className="size-4" />
							</div>
							<div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden ml-1">
								<span className="truncate font-black uppercase italic tracking-tight text-foreground">
									{user?.name || "Athlete"}
								</span>
								<span className="truncate text-[10px] text-muted-foreground font-medium">
									{user?.email || "Connect account"}
								</span>
							</div>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton
							onClick={handleLogout}
							tooltip="Logout"
							className="text-destructive hover:bg-destructive/10 hover:text-destructive mt-1 h-10"
						>
							<LogOut className="size-4" />
							<span className="font-black uppercase italic tracking-wider text-xs group-data-[collapsible=icon]:hidden">
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
