import { Layout, SignOut, User as UserIcon } from "@phosphor-icons/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";
import { config } from "../lib/config";
import { usePortalConfig } from "../hooks/usePortalConfig";
import ThemeToggle from "./ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export default function Header() {
	const portalCfg = usePortalConfig();
	const [scrolled, setScrolled] = useState(false);
	const [isPending, setIsPending] = useState(true);
	const [sessionUser, setSessionUser] = useState<{
		name: string;
		email: string;
		image: string;
	} | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		const handleScroll = () => setScrolled(window.scrollY > 10);
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

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
		return () => {
			cancelled = true;
		};
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
		<header
			className={`fixed top-0 left-0 right-0 z-50 transition-all ${
				scrolled
					? "bg-background/90 backdrop-blur-md border-b border-primary/20 py-3"
					: "bg-transparent py-5"
			}`}
			style={{ transitionDuration: "var(--duration-standard)", transitionTimingFunction: "var(--ease)" }}
		>
			<div className="mx-auto flex max-w-6xl items-center justify-between px-6">
				<Link to="/" className="flex items-center gap-3 group">
					<div className="w-12 h-12 rounded-lg overflow-hidden ring-1 ring-primary/20 group-hover:ring-primary/50 transition-all" style={{ transitionDuration: "var(--duration-micro)" }}>
						<img
							src="/ph.jpg"
							alt={portalCfg.nav.brand}
							className="w-full h-full object-cover"
						/>
					</div>
					<span
						className="hidden sm:inline-block font-black uppercase tracking-widest text-foreground"
						style={{ fontFamily: "var(--font-display)", fontSize: "1rem", letterSpacing: "0.12em" }}
					>
						{portalCfg.nav.brand}
					</span>
				</Link>

				<nav className="hidden md:flex items-center gap-8">
					{portalCfg.nav.links.map((link) => (
						<a
							key={`${link.label}-${link.href}`}
							href={link.href}
							className="nav-link text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
							style={{ transitionDuration: "var(--duration-micro)" }}
						>
							{link.label}
						</a>
					))}
				</nav>

				<div className="flex items-center gap-3">
					<ThemeToggle />

					{isPending ? (
						<div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
					) : sessionUser ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									className="relative h-9 w-9 rounded-full p-0 hover:ring-2 hover:ring-primary/30 transition-all"
									style={{ transitionDuration: "var(--duration-micro)" }}
								>
									<Avatar className="h-9 w-9">
										<AvatarImage
											src={sessionUser.image || ""}
											alt={sessionUser.name || "User"}
										/>
										<AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
											{sessionUser.name
												?.split(" ")
												.map((n) => n[0])
												.join("") || "U"}
										</AvatarFallback>
									</Avatar>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-56 mt-2 rounded-xl"
								align="end"
								forceMount
							>
								<DropdownMenuLabel className="font-normal p-4">
									<div className="flex flex-col space-y-1">
										<p className="text-sm font-semibold leading-none">
											{sessionUser.name}
										</p>
										<p className="text-xs leading-none text-muted-foreground truncate">
											{sessionUser.email}
										</p>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<div className="p-1">
									<DropdownMenuItem
										asChild
										className="rounded-lg px-3 py-2 text-sm cursor-pointer gap-2"
									>
										<Link to="/portal/dashboard">
											<Layout weight="bold" size={16} />
											Dashboard
										</Link>
									</DropdownMenuItem>
									<DropdownMenuItem
										asChild
										className="rounded-lg px-3 py-2 text-sm cursor-pointer gap-2"
									>
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
										className="rounded-lg px-3 py-2 text-sm text-destructive cursor-pointer gap-2"
									>
										<SignOut weight="bold" size={16} />
										Sign Out
									</DropdownMenuItem>
								</div>
							</DropdownMenuContent>
						</DropdownMenu>
					) : (
						<>
							<Button
								variant="ghost"
								size="sm"
								asChild
								className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
								style={{ transitionDuration: "var(--duration-micro)" }}
							>
								<Link to="/login">{portalCfg.nav.loginLabel}</Link>
							</Button>
							<Button
								size="sm"
								asChild
								className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-wider rounded-none px-5 text-xs transition-colors"
								style={{ transitionDuration: "var(--duration-micro)" }}
							>
								<Link to="/register">{portalCfg.nav.getStartedLabel}</Link>
							</Button>
						</>
					)}
				</div>
			</div>
		</header>
	);
}
