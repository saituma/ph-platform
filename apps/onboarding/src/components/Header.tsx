import { Layout, SignOut, User as UserIcon } from "@phosphor-icons/react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
	AnimatePresence,
	LayoutGroup,
	motion,
	useMotionValue,
	useScroll,
} from "framer-motion";
import { Bell, Search, X as XIcon, Menu, X } from "lucide-react";
import {
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { authClient } from "../lib/auth-client";
import { config } from "../lib/config";
import { clearAuthToken, getAuthHeaders, getTokenStatus } from "../lib/client-storage";
import { usePortalConfig } from "../hooks/usePortalConfig";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { PortalSocketContext } from "../portal/PortalSocketContext";
import { settingsService } from "../services/settingsService";
import { fetchBookings, formatDateKey } from "../services/scheduleService";

const NAV_LINKS = [
	{ label: "Home", href: "/" },
	{ label: "About", href: "/about" },
	{ label: "Services", href: "/services" },
	{ label: "App", href: "/app-download" },
	{ label: "Results", href: "/gallery" },
	{ label: "Contact", href: "/contact" },
];

const COMMAND_LINKS = [
	...NAV_LINKS,
	{ label: "Dashboard", href: "/portal/dashboard" },
	{ label: "Profile", href: "/portal/profile" },
	{ label: "Settings", href: "/portal/settings" },
	{ label: "Billing", href: "/portal/billing" },
];

// Safe hook — returns null when outside PortalSocketProvider
function useSafePortalSocket() {
	const ctx = useContext(PortalSocketContext);
	return ctx;
}

// Relative time helper
function relativeTime(dateStr: string) {
	const diff = Date.now() - new Date(dateStr).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	return `${Math.floor(hrs / 24)}d ago`;
}

export default function Header() {
	usePortalConfig();
	const router = useRouter();
	const pathname = router.state.location.pathname;
	const [isPending, setIsPending] = useState(true);
	const [sessionUser, setSessionUser] = useState<{
		name: string;
		email: string;
		image: string;
	} | null>(null);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const navigate = useNavigate();
	const isLoggedIn = !isPending && !!sessionUser;

	// --- Feature 7: Command palette state ---
	const [cmdOpen, setCmdOpen] = useState(false);
	const [cmdSearch, setCmdSearch] = useState("");
	const cmdInputRef = useRef<HTMLInputElement>(null);

	// --- Feature 8: Announcement banner state ---
	const [dismissedIds, setDismissedIds] = useState<Set<number>>(() => {
		try {
			const raw = sessionStorage.getItem("dismissed_announcements");
			return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
		} catch {
			return new Set();
		}
	});

	const isActive = useCallback((href: string) => pathname === href, [pathname]);

	// --- Feature 1: Scroll-to-hide ---
	const { scrollYProgress, scrollY } = useScroll();
	const headerY = useMotionValue(0);
	const lastScrollY = useRef(0);

	useEffect(() => {
		const unsubscribe = scrollY.on("change", (current) => {
			if (current < 10) {
				headerY.set(0);
			} else if (current > lastScrollY.current) {
				headerY.set(-64);
			} else {
				headerY.set(0);
			}
			lastScrollY.current = current;
		});
		return unsubscribe;
	}, [scrollY, headerY]);

	// --- Feature 7: Cmd+K listener ---
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setCmdOpen((o) => !o);
			}
			if (e.key === "Escape") setCmdOpen(false);
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, []);

	useEffect(() => {
		if (cmdOpen) {
			setTimeout(() => cmdInputRef.current?.focus(), 50);
			setCmdSearch("");
		}
	}, [cmdOpen]);

	useEffect(() => {
		document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
		return () => { document.body.style.overflow = ""; };
	}, [mobileMenuOpen]);

	useEffect(() => {
		let cancelled = false;
		const syncSession = async () => {
			try {
				const status = await getTokenStatus();
				if (!status.authenticated) {
					if (!cancelled) setSessionUser(null);
					return;
				}

				const baseUrl = config.api.baseUrl.replace(/\/+$/, "");
				let response = await fetch(`${baseUrl}/api/auth/me`, {
					credentials: "include",
					cache: "no-store",
					headers: getAuthHeaders(),
				});

				if (response.status === 401) {
					await new Promise((resolve) => setTimeout(resolve, 200));
					response = await fetch(`${baseUrl}/api/auth/me`, {
						credentials: "include",
						cache: "no-store",
						headers: getAuthHeaders(),
					});
				}

				if (response.status === 401 || response.status === 403) {
					await clearAuthToken();
					localStorage.removeItem("user_type");
					localStorage.removeItem("pending_email");
					if (!cancelled) setSessionUser(null);
					return;
				}

				if (response.status === 200) {
					const data = (await response.json()) as {
						user?: {
							name?: string | null;
							email?: string | null;
							profilePicture?: string | null;
						};
					};
					const name = data?.user?.name?.trim() || "User";
					const email = data?.user?.email?.trim() || "";
					const image = data?.user?.profilePicture?.trim() || "";
					if (!cancelled) setSessionUser({ name, email, image });
					return;
				}

				if (response.status === 304 || response.status >= 500) {
					if (!cancelled) {
						setSessionUser((prev) =>
							prev ?? { name: "User", email: "", image: "" },
						);
					}
					return;
				}

				if (!cancelled) setSessionUser(null);
			} catch {
				if (!cancelled) {
					setSessionUser((prev) => prev ?? { name: "User", email: "", image: "" });
				}
			} finally {
				if (!cancelled) setIsPending(false);
			}
		};

		void syncSession();
		return () => { cancelled = true; };
	}, []);

	const handleSignOut = async () => {
		await clearAuthToken();
		localStorage.removeItem("user_type");
		localStorage.removeItem("pending_email");
		setSessionUser(null);
		await authClient.signOut().catch(() => undefined);
		navigate({ to: "/" });
	};

	// --- Feature 5: Notification bell ---
	const { data: notifData, refetch: refetchNotifs } = useQuery({
		queryKey: ["header-notifications"],
		queryFn: () => settingsService.getNotifications(),
		enabled: isLoggedIn,
		refetchInterval: 60_000,
		staleTime: 30_000,
	});
	const notifications = notifData?.items ?? [];
	const unreadCount = notifications.filter((n) => !n.read).length;
	const [notifOpen, setNotifOpen] = useState(false);

	const handleMarkRead = async (id: number) => {
		await settingsService.markNotificationRead(id).catch(() => undefined);
		refetchNotifs();
	};

	// --- Feature 4: Session-today badge ---
	const { data: bookingsData } = useQuery({
		queryKey: ["session-today"],
		queryFn: () => fetchBookings(),
		enabled: isLoggedIn,
		staleTime: 5 * 60_000,
	});
	const todayKey = formatDateKey(new Date());
	const hasSessionToday = (bookingsData ?? []).some((e) => e.dateKey === todayKey);

	// --- Feature 6: Socket online status (safe — null outside portal) ---
	const socketCtx = useSafePortalSocket();
	const socketStatus = socketCtx?.status ?? "idle";

	// --- Feature 8: Announcement banner ---
	const { data: announcementsData } = useQuery({
		queryKey: ["header-announcements"],
		queryFn: () => settingsService.getNotifications(),
		staleTime: 5 * 60_000,
	});
	const latestAnnouncement = (announcementsData?.items ?? [])
		.filter((n) => n.type === "announcement" && !n.read && !dismissedIds.has(n.id))
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;

	const dismissAnnouncement = (id: number) => {
		setDismissedIds((prev) => {
			const next = new Set(prev);
			next.add(id);
			try {
				sessionStorage.setItem("dismissed_announcements", JSON.stringify([...next]));
			} catch { /* no-op */ }
			return next;
		});
	};

	// Filtered command links
	const filteredCmdLinks = COMMAND_LINKS.filter((l) =>
		l.label.toLowerCase().includes(cmdSearch.toLowerCase()),
	);

	return (
		<>
			{/* Feature 8: Announcement banner */}
			<AnimatePresence>
				{latestAnnouncement && (
					<motion.div
						initial={{ y: -32, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: -32, opacity: 0 }}
						transition={{ type: "spring", stiffness: 300, damping: 28 }}
						className="fixed top-0 left-0 right-0 z-[60] bg-[#8aff00]/10 border-b border-[#8aff00]/20 py-2 px-4 flex items-center justify-center gap-3"
					>
						<span className="text-[11px] text-[#8aff00] text-center truncate max-w-[80ch]">
							{(latestAnnouncement.content ?? "").length > 80
								? `${(latestAnnouncement.content ?? "").slice(0, 80)}…`
								: (latestAnnouncement.content ?? "")}
						</span>
						<button
							type="button"
							onClick={() => dismissAnnouncement(latestAnnouncement.id)}
							className="shrink-0 text-[#8aff00]/60 hover:text-[#8aff00] transition-colors"
							aria-label="Dismiss announcement"
						>
							<XIcon size={13} />
						</button>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Feature 1: Scroll-to-hide header wrapped in motion.header */}
			<motion.header
				style={{
					y: headerY,
					top: latestAnnouncement ? 33 : 0,
				}}
				transition={{ type: "spring", stiffness: 300, damping: 30 }}
				className="fixed left-0 right-0 z-50"
			>
				<nav
					aria-label="Main navigation"
					className="bg-[#0a0a0a]/95 backdrop-blur-sm relative"
				>
					<div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 flex items-center justify-between h-16">
						{/* Logo */}
						<Link to="/" className="flex items-center gap-2 shrink-0">
							<img
								src="/logo.png"
								alt="PH Performance"
								className="w-20 h-20 rounded object-cover"
							/>
						</Link>

						{/* Desktop nav links — Feature 2: sliding indicator */}
						<LayoutGroup>
							<div className="hidden lg:flex items-center">
								{NAV_LINKS.map((link) => (
									<Link
										key={link.label}
										to={link.href}
										aria-current={isActive(link.href) ? "page" : undefined}
										className={`relative px-[18px] py-2 text-[12px] font-medium tracking-[0.16em] uppercase transition-colors ${
											isActive(link.href)
												? "text-[#8aff00]"
												: "text-white/50 hover:text-white"
										}`}
									>
										{link.label}
										{isActive(link.href) && (
											<motion.span
												layoutId="nav-indicator"
												className="absolute bottom-0 left-[18px] right-[18px] h-[2px] bg-[#8aff00]"
												transition={{ type: "spring", stiffness: 380, damping: 30 }}
											/>
										)}
									</Link>
								))}
							</div>
						</LayoutGroup>

						{/* Desktop right side — auth */}
						<div className="hidden lg:flex items-center gap-3">
							{/* Feature 7: Cmd+K hint */}
							<button
								type="button"
								onClick={() => setCmdOpen(true)}
								className="text-[9px] text-white/20 border border-white/10 px-1.5 py-0.5 rounded hover:text-white/40 hover:border-white/20 transition-colors"
								aria-label="Open command palette"
							>
								⌘K
							</button>

							{isPending ? (
								<div className="h-7 w-7 rounded-full bg-white/10 animate-pulse" />
							) : sessionUser ? (
								<div className="flex items-center gap-3">
									<Link
										to="/portal/dashboard"
										className="border border-[#8aff00] rounded-[4px] px-5 py-2.5 hover:bg-[#8aff00]/5 transition-all flex items-center gap-3"
									>
										<span className="w-[7px] h-[7px] rounded-full bg-[#8aff00] shrink-0" />
										<div className="text-left">
											<span className="block text-[11px] font-bold tracking-[0.08em] uppercase leading-tight text-[#8aff00]">
												GO TO DASHBOARD
											</span>
											<span className="block text-[9px] font-normal text-white/40 tracking-wide mt-[2px]">
												Learn more
											</span>
										</div>
									</Link>

									{/* Feature 5: Notification bell */}
									<div className="relative">
										<DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
											<DropdownMenuTrigger asChild>
												<button
													type="button"
													className="relative p-1.5 rounded-[4px] hover:bg-white/5 transition-colors cursor-pointer"
													aria-label="Notifications"
												>
													<Bell
														size={16}
														className={unreadCount > 0 ? "text-white/70" : "text-white/30"}
													/>
													{unreadCount > 0 && (
														<span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center font-bold">
															{unreadCount > 9 ? "9+" : unreadCount}
														</span>
													)}
												</button>
											</DropdownMenuTrigger>
											<DropdownMenuContent
												className="w-72 mt-1 bg-[#111] border-white/10"
												align="end"
												forceMount
											>
												<DropdownMenuLabel className="font-normal px-3 py-2 text-[11px] text-white/40 uppercase tracking-wider">
													Notifications
												</DropdownMenuLabel>
												<DropdownMenuSeparator className="bg-white/10" />
												{notifications.length === 0 ? (
													<div className="px-3 py-4 text-[12px] text-white/30 text-center">
														No notifications
													</div>
												) : (
													<div className="p-1 max-h-64 overflow-y-auto">
														{notifications.slice(0, 5).map((n) => (
															<DropdownMenuItem
																key={n.id}
																onClick={() => handleMarkRead(n.id)}
																className={`flex flex-col items-start gap-0.5 px-3 py-2.5 cursor-pointer rounded-[4px] focus:bg-white/5 ${
																	n.read ? "opacity-50" : ""
																}`}
															>
																<span className="text-[12px] text-white leading-snug line-clamp-2">
																	{n.content}
																</span>
																<span className="text-[10px] text-white/30">
																	{relativeTime(n.createdAt)}
																</span>
															</DropdownMenuItem>
														))}
													</div>
												)}
											</DropdownMenuContent>
										</DropdownMenu>
									</div>

									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<button
												type="button"
												className="flex items-center gap-2 px-2 py-1.5 rounded-[4px] hover:bg-white/5 transition-colors cursor-pointer"
											>
												{/* Feature 4 + 6: Avatar with session badge + online dot */}
												<div className="relative">
													<Avatar className="h-7 w-7">
														<AvatarImage src={sessionUser.image || ""} alt={sessionUser.name || "User"} />
														<AvatarFallback className="bg-white/10 text-white text-[10px] font-medium">
															{sessionUser.name?.split(" ").map((n) => n[0]).join("") || "U"}
														</AvatarFallback>
													</Avatar>
													{/* Feature 4: Session today badge */}
													{hasSessionToday && (
														<span
															title="You have a session today"
															className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#8aff00] ring-1 ring-[#0a0a0a] animate-pulse"
														/>
													)}
													{/* Feature 6: Online status dot */}
													{socketStatus === "connected" && !hasSessionToday && (
														<span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#8aff00] ring-1 ring-[#0a0a0a]" />
													)}
													{socketStatus === "connecting" && !hasSessionToday && (
														<span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-yellow-400 ring-1 ring-[#0a0a0a] animate-pulse" />
													)}
												</div>
											</button>
										</DropdownMenuTrigger>
										<DropdownMenuContent className="w-56 mt-1 bg-[#111] border-white/10" align="end" forceMount>
											<DropdownMenuLabel className="font-normal p-3">
												<div className="flex flex-col space-y-1">
													<p className="text-sm font-medium leading-none text-white">{sessionUser.name}</p>
													<p className="text-xs leading-none text-white/40 truncate">{sessionUser.email}</p>
												</div>
											</DropdownMenuLabel>
											<DropdownMenuSeparator className="bg-white/10" />
											<div className="p-1">
												<DropdownMenuItem asChild className="px-3 py-2 text-sm cursor-pointer gap-2 text-white/70 hover:text-white focus:bg-white/5 focus:text-white">
													<Link to="/portal/dashboard">
														<Layout weight="bold" size={16} />
														Dashboard
													</Link>
												</DropdownMenuItem>
												<DropdownMenuItem asChild className="px-3 py-2 text-sm cursor-pointer gap-2 text-white/70 hover:text-white focus:bg-white/5 focus:text-white">
													<Link to="/portal/profile">
														<UserIcon weight="bold" size={16} />
														Profile
													</Link>
												</DropdownMenuItem>
											</div>
											<DropdownMenuSeparator className="bg-white/10" />
											<div className="p-1">
												<DropdownMenuItem
													onClick={handleSignOut}
													className="px-3 py-2 text-sm text-red-400 cursor-pointer gap-2 focus:bg-white/5 focus:text-red-400"
												>
													<SignOut weight="bold" size={16} />
													Sign Out
												</DropdownMenuItem>
											</div>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							) : (
								<button
									type="button"
									onClick={() => navigate({ to: "/register" })}
									className="border border-[#8aff00] rounded-[4px] px-5 py-2.5 hover:bg-[#8aff00]/5 transition-all flex items-center gap-3"
								>
									<span className="w-[7px] h-[7px] rounded-full bg-[#8aff00] shrink-0" />
									<div className="text-left">
										<span className="block text-[11px] font-bold tracking-[0.08em] uppercase leading-tight text-[#8aff00]">
											SIGN UP TO APP NOW
										</span>
										<span className="block text-[9px] font-normal text-white/40 tracking-wide mt-[2px]">
											Start your journey today
										</span>
									</div>
								</button>
							)}
						</div>

						{/* Mobile hamburger */}
						<button
							type="button"
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							aria-expanded={mobileMenuOpen}
							aria-controls="mobile-menu"
							aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
							className="lg:hidden text-white p-2"
						>
							{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
						</button>
					</div>

					{/* Feature 3: Scroll progress bar */}
					<motion.div
						className="absolute bottom-0 left-0 h-[1px] bg-[#8aff00]/40 origin-left"
						style={{ scaleX: scrollYProgress, width: "100%" }}
					/>

					{/* Mobile menu */}
					<AnimatePresence>
						{mobileMenuOpen && (
							<motion.div
								id="mobile-menu"
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: "auto" }}
								exit={{ opacity: 0, height: 0 }}
								transition={{ duration: 0.2 }}
								className="lg:hidden bg-[#0a0a0a] border-t border-white/5 px-5 pb-4 overflow-hidden"
							>
								{NAV_LINKS.map((link) => (
									<Link
										key={link.label}
										to={link.href}
										onClick={() => setMobileMenuOpen(false)}
										className={`block py-3 text-[12px] font-medium uppercase tracking-[0.14em] border-b border-white/5 ${
											isActive(link.href)
												? "text-[#8aff00]"
												: "text-white/50 hover:text-white"
										}`}
									>
										{link.label}
									</Link>
								))}

								{!isPending && sessionUser ? (
									<div className="mt-3 space-y-3">
										<Link
											to="/portal/dashboard"
											onClick={() => setMobileMenuOpen(false)}
											className="w-full flex items-center justify-center gap-2 border border-[#8aff00] text-[#8aff00] rounded-[4px] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em]"
										>
											GO TO DASHBOARD
										</Link>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<div className="relative">
													<Avatar className="h-6 w-6">
														<AvatarImage src={sessionUser.image || ""} alt={sessionUser.name || "User"} />
														<AvatarFallback className="bg-white/10 text-white text-[10px]">
															{sessionUser.name?.split(" ").map((n) => n[0]).join("") || "U"}
														</AvatarFallback>
													</Avatar>
													{hasSessionToday && (
														<span
															title="You have a session today"
															className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#8aff00] ring-1 ring-[#0a0a0a] animate-pulse"
														/>
													)}
												</div>
												<span className="text-[12px] text-white/60 uppercase tracking-wider">{sessionUser.name?.split(" ")[0]}</span>
											</div>
											<button
												type="button"
												onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}
												className="text-[11px] text-red-400 uppercase tracking-wider"
											>
												Sign Out
											</button>
										</div>
									</div>
								) : (
									<button
										type="button"
										onClick={() => {
											setMobileMenuOpen(false);
											navigate({ to: "/register" });
										}}
										className="w-full mt-3 border border-[#8aff00] text-[#8aff00] rounded-[4px] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em]"
									>
										SIGN UP TO APP NOW
									</button>
								)}
							</motion.div>
						)}
					</AnimatePresence>
				</nav>
			</motion.header>

			{/* Spacer for fixed nav — accounts for banner */}
			<div style={{ height: latestAnnouncement ? 33 + 64 : 64 }} />

			{/* Feature 7: Command palette */}
			<AnimatePresence>
				{cmdOpen && (
					<motion.div
						key="cmd-backdrop"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
						className="fixed inset-0 z-[200] flex items-start justify-center pt-[20vh]"
						onClick={() => setCmdOpen(false)}
					>
						<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
						<motion.div
							key="cmd-panel"
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							transition={{ type: "spring", stiffness: 400, damping: 30 }}
							onClick={(e) => e.stopPropagation()}
							className="relative w-full max-w-md bg-[#111] border border-white/10 shadow-2xl rounded-[6px] overflow-hidden"
						>
							{/* Search input */}
							<div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
								<Search size={14} className="text-white/30 shrink-0" />
								<input
									ref={cmdInputRef}
									type="text"
									placeholder="Search pages..."
									value={cmdSearch}
									onChange={(e) => setCmdSearch(e.target.value)}
									className="flex-1 bg-transparent text-[13px] text-white placeholder-white/20 outline-none"
								/>
								<button
									type="button"
									onClick={() => setCmdOpen(false)}
									className="text-white/30 hover:text-white transition-colors"
									aria-label="Close"
								>
									<XIcon size={14} />
								</button>
							</div>
							{/* Links */}
							<div className="py-1 max-h-60 overflow-y-auto">
								{filteredCmdLinks.length === 0 ? (
									<div className="px-4 py-3 text-[12px] text-white/30">
										No results
									</div>
								) : (
									filteredCmdLinks.map((link) => (
										<button
											key={link.href}
											type="button"
											onClick={() => {
												setCmdOpen(false);
												navigate({ to: link.href });
											}}
											className="w-full text-left px-4 py-2.5 text-[12px] text-white/60 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-[0.1em]"
										>
											{link.label}
										</button>
									))
								)}
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
