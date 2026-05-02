import { Layout, SignOut, User as UserIcon } from "@phosphor-icons/react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";
import { config } from "../lib/config";
import { clearAuthToken, getTokenStatus } from "../lib/client-storage";
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

const NAV_LINKS = [
	{ label: "Home", href: "/" },
	{ label: "About", href: "/about" },
	{ label: "Services", href: "/services" },
	{ label: "App", href: "/app-download" },
	{ label: "Results", href: "/gallery" },
	{ label: "Contact", href: "/contact" },
];

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

	const isActive = useCallback((href: string) => pathname === href, [pathname]);

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
				});

				if (response.status === 401) {
					await new Promise((resolve) => setTimeout(resolve, 200));
					response = await fetch(`${baseUrl}/api/auth/me`, {
						credentials: "include",
						cache: "no-store",
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

	return (
		<>
			<nav aria-label="Main navigation" className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-sm">
				<div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 flex items-center justify-between h-16">
					{/* Logo */}
					<Link to="/" className="flex items-center gap-2 shrink-0">
						<img
							src="/ph.jpg"
							alt=""
							aria-hidden="true"
							className="w-[34px] h-[34px] rounded object-cover"
						/>
						<span className="text-white text-[15px] tracking-wide">
							<span className="font-black italic">P</span>
							<span className="font-black italic text-[#8aff00]">H</span>
							<span className="font-light ml-1 tracking-[0.18em] text-[12px]">PERFORMANCE</span>
						</span>
					</Link>

					{/* Desktop nav links */}
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
									<span className="absolute bottom-0 left-[18px] right-[18px] h-[2px] bg-[#8aff00]" />
								)}
							</Link>
						))}
					</div>

					{/* Desktop right side — auth */}
					<div className="hidden lg:flex items-center gap-3">
						{isPending ? (
							<div className="h-7 w-7 rounded-full bg-white/10 animate-pulse" />
						) : sessionUser ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										className="flex items-center gap-2 px-3 py-1.5 rounded-[4px] hover:bg-white/5 transition-colors cursor-pointer"
									>
										<Avatar className="h-6 w-6">
											<AvatarImage src={sessionUser.image || ""} alt={sessionUser.name || "User"} />
											<AvatarFallback className="bg-white/10 text-white text-[10px] font-medium">
												{sessionUser.name?.split(" ").map((n) => n[0]).join("") || "U"}
											</AvatarFallback>
										</Avatar>
										<span className="text-[12px] font-medium uppercase tracking-[0.12em] text-white/60">
											{sessionUser.name?.split(" ")[0]}
										</span>
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
								<div className="mt-3 flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Avatar className="h-6 w-6">
											<AvatarImage src={sessionUser.image || ""} alt={sessionUser.name || "User"} />
											<AvatarFallback className="bg-white/10 text-white text-[10px]">
												{sessionUser.name?.split(" ").map((n) => n[0]).join("") || "U"}
											</AvatarFallback>
										</Avatar>
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

			{/* Spacer for fixed nav */}
			<div className="h-16" />
		</>
	);
}
