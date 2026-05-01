import { Layout, SignOut, User as UserIcon } from "@phosphor-icons/react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";
import { config } from "../lib/config";
import { usePortalConfig } from "../hooks/usePortalConfig";
import ThemeToggle from "./ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface NavFileItem {
	name: string;
	href: string;
}

export default function Header() {
	const portalCfg = usePortalConfig();
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

	const navFiles: NavFileItem[] = [
		{ name: "home", href: "/" },
		{ name: "features", href: "/features" },
		{ name: "about", href: "/about" },
		{ name: "gallery", href: "/gallery" },
	];

	const isActive = useCallback((href: string) => pathname === href, [pathname]);

	useEffect(() => {
		document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
		return () => { document.body.style.overflow = ""; };
	}, [mobileMenuOpen]);

	useEffect(() => {
		let cancelled = false;
		const syncSession = async () => {
			try {
				const token = localStorage.getItem("auth_token");
				if (!token) {
					if (!cancelled) setSessionUser(null);
					return;
				}

				const baseUrl = config.api.baseUrl.replace(/\/+$/, "");
				let response = await fetch(`${baseUrl}/api/auth/me`, {
					headers: { Authorization: `Bearer ${token}` },
					cache: "no-store",
				});

				if (response.status === 401) {
					await new Promise((resolve) => setTimeout(resolve, 200));
					response = await fetch(`${baseUrl}/api/auth/me`, {
						headers: { Authorization: `Bearer ${token}` },
						cache: "no-store",
					});
				}

				if (response.status === 401 || response.status === 403) {
					localStorage.removeItem("auth_token");
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
		localStorage.removeItem("auth_token");
		localStorage.removeItem("user_type");
		localStorage.removeItem("pending_email");
		setSessionUser(null);
		await authClient.signOut().catch(() => undefined);
		navigate({ to: "/" });
	};

	return (
		<>
			<div className="fixed top-0 left-0 right-0 z-[99] flex items-start pointer-events-none">
				{/* Left — Logo (desktop) */}
				<motion.div
					initial={{ x: -20, opacity: 0 }}
					animate={{ x: 0, opacity: 1 }}
					transition={{ duration: 0.28, ease: "easeOut" }}
					className="w-[40%] hidden lg:flex h-[var(--topbar-height)] items-stretch shrink-0 pointer-events-auto transition-[width] duration-300 ease-out"
				>
					<Link
						to="/"
						className="flex h-full items-center gap-2 px-4 py-3 transition-colors duration-150"
					>
						<div className="w-7 h-7 overflow-hidden">
							<img
								src="/ph.jpg"
								alt={portalCfg.nav.brand}
								className="w-full h-full object-cover"
							/>
						</div>
						<p className="select-none font-mono text-sm uppercase leading-none tracking-wider">
							{portalCfg.nav.brand}.
						</p>
					</Link>
				</motion.div>

				{/* Mobile — Logo + hamburger */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.28, ease: "easeOut" }}
					className="lg:hidden flex items-center justify-between w-full h-[var(--topbar-height)] pointer-events-auto bg-background border-b border-foreground/[0.06]"
				>
					<Link
						to="/"
						className="flex h-full items-center gap-2 px-4 transition-colors duration-150"
					>
						<div className="w-6 h-6 overflow-hidden">
							<img src="/ph.jpg" alt={portalCfg.nav.brand} className="w-full h-full object-cover" />
						</div>
						<p className="select-none font-mono text-sm uppercase leading-none tracking-wider">
							{portalCfg.nav.brand}.
						</p>
					</Link>
					<div className="flex items-center gap-1 pr-2">
						<div className="flex items-center justify-center size-8">
							<ThemeToggle />
						</div>
						<button
							type="button"
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							className="flex items-center justify-center size-8 text-foreground/75 dark:text-foreground/60 hover:text-foreground/85 transition-colors"
						>
							{mobileMenuOpen ? (
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
									<path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z" />
								</svg>
							) : (
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
									<path fill="currentColor" d="M3 18h18v-2H3zm0-5h18v-2H3zm0-7v2h18V6z" />
								</svg>
							)}
						</button>
					</div>
				</motion.div>

				{/* Right — Nav tabs (desktop) */}
				<motion.div
					initial={{ y: -10, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					transition={{ duration: 0.28, delay: 0.04, ease: "easeOut" }}
					className="flex-1 hidden lg:flex h-[calc(var(--topbar-height)+1px)] items-stretch border-b bg-background pointer-events-auto min-w-0 border-foreground/[0.06]"
				>
					{navFiles.map((item, index) => {
						const active = isActive(item.href);
						return (
							<motion.div
								key={item.name}
								initial={{ opacity: 0, y: -4 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{
									duration: 0.2,
									delay: 0.05 + index * 0.03,
									ease: "easeOut",
								}}
								className="flex-1"
							>
								<Link
									to={item.href}
									className={`group/tab relative flex items-center justify-center gap-1.5 px-2 xl:px-4 py-3 h-full border-r border-foreground/[0.06] transition-colors duration-150 ${
										active
											? "bg-background border-b-2 border-b-foreground/60"
											: "bg-transparent hover:bg-foreground/[0.03]"
									}`}
								>
									<span
										className={`font-mono text-xs uppercase tracking-wider transition-colors duration-150 whitespace-nowrap ${
											active
												? "text-foreground"
												: "text-foreground/65 dark:text-foreground/50 group-hover/tab:text-foreground/75"
										}`}
									>
										{item.name}
									</span>
								</Link>
							</motion.div>
						);
					})}

					{/* Theme + Auth area */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.2, delay: 0.2, ease: "easeOut" }}
						className="flex items-stretch shrink-0"
					>
						<div className="flex items-center px-3 border-r border-foreground/[0.06]">
							<ThemeToggle />
						</div>

						{isPending ? (
							<div className="flex items-center px-5">
								<div className="h-7 w-7 rounded-full bg-muted animate-pulse" />
							</div>
						) : sessionUser ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										className="flex items-center gap-2 px-4 py-3 hover:bg-foreground/[0.03] transition-colors duration-150 cursor-pointer"
									>
										<Avatar className="h-6 w-6">
											<AvatarImage src={sessionUser.image || ""} alt={sessionUser.name || "User"} />
											<AvatarFallback className="bg-foreground/10 text-foreground text-[10px] font-medium">
												{sessionUser.name?.split(" ").map((n) => n[0]).join("") || "U"}
											</AvatarFallback>
										</Avatar>
										<span className="font-mono text-xs uppercase tracking-wider text-foreground/65">
											{sessionUser.name?.split(" ")[0]}
										</span>
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="w-56 mt-1" align="end" forceMount>
									<DropdownMenuLabel className="font-normal p-3">
										<div className="flex flex-col space-y-1">
											<p className="text-sm font-medium leading-none">{sessionUser.name}</p>
											<p className="text-xs leading-none text-muted-foreground truncate">{sessionUser.email}</p>
										</div>
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<div className="p-1">
										<DropdownMenuItem asChild className="px-3 py-2 text-sm cursor-pointer gap-2">
											<Link to="/portal/dashboard">
												<Layout weight="bold" size={16} />
												Dashboard
											</Link>
										</DropdownMenuItem>
										<DropdownMenuItem asChild className="px-3 py-2 text-sm cursor-pointer gap-2">
											<Link to="/portal/profile">
												<UserIcon weight="bold" size={16} />
												Profile
											</Link>
										</DropdownMenuItem>
									</div>
									<DropdownMenuSeparator />
									<div className="p-1">
										<DropdownMenuItem
											onClick={handleSignOut}
											className="px-3 py-2 text-sm text-destructive cursor-pointer gap-2"
										>
											<SignOut weight="bold" size={16} />
											Sign Out
										</DropdownMenuItem>
									</div>
								</DropdownMenuContent>
							</DropdownMenu>
						) : (
							<Link
								to="/register"
								className="flex items-center cursor-pointer gap-1.5 px-5 py-3 bg-foreground text-background hover:opacity-90 transition-colors duration-150"
							>
								<span className="font-mono text-xs uppercase tracking-wider">
									{portalCfg.nav.getStartedLabel || "get-started"}
								</span>
								<svg className="h-2.5 w-2.5 opacity-50" viewBox="0 0 10 10" fill="none">
									<path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.2" />
								</svg>
							</Link>
						)}
					</motion.div>
				</motion.div>
			</div>

			{/* Mobile menu overlay */}
			<AnimatePresence>
				{mobileMenuOpen && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
						className="lg:hidden fixed inset-0 z-[98] w-full bg-background/95 backdrop-blur-sm pointer-events-auto"
					>
						<div className="flex h-full flex-col pt-[var(--topbar-height)]">
							<div className="flex-1 min-h-0 overflow-y-auto">
								{navFiles.map((item) => (
									<Link
										key={item.name}
										to={item.href}
										onClick={() => setMobileMenuOpen(false)}
										className={`flex items-center gap-2.5 px-5 py-3.5 border-b border-foreground/6 transition-colors font-mono text-base uppercase tracking-wider ${
											isActive(item.href)
												? "text-foreground bg-foreground/4"
												: "text-foreground/75 dark:text-foreground/60 hover:bg-foreground/3"
										}`}
									>
										{item.name}
									</Link>
								))}

								{!sessionUser && (
									<Link
										to="/login"
										onClick={() => setMobileMenuOpen(false)}
										className="flex items-center gap-2.5 px-5 py-3.5 border-b border-foreground/6 transition-colors font-mono text-base uppercase tracking-wider text-foreground/75 dark:text-foreground/60 hover:bg-foreground/3"
									>
										sign-in
									</Link>
								)}
							</div>

							{!sessionUser && (
								<div className="shrink-0 border-t border-foreground/[0.06] bg-background px-5 py-4">
									<Link
										to="/register"
										onClick={() => setMobileMenuOpen(false)}
										className="flex items-center justify-center gap-1.5 w-full py-3 bg-foreground text-background font-mono text-sm uppercase tracking-wider transition-opacity hover:opacity-90"
									>
										get-started
										<svg className="h-2.5 w-2.5 opacity-50" viewBox="0 0 10 10" fill="none">
											<path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.2" />
										</svg>
									</Link>
								</div>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
