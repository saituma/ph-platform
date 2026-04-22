import { Layout, SignOut, User as UserIcon } from "@phosphor-icons/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";
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
	const [scrolled, setScrolled] = useState(false);
	const { data: session, isPending } = authClient.useSession();
	const navigate = useNavigate();

	useEffect(() => {
		const handleScroll = () => setScrolled(window.scrollY > 10);
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const handleSignOut = async () => {
		await authClient.signOut();
		navigate({ to: "/" });
	};

	return (
		<header
			className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
				scrolled
					? "bg-background/40 backdrop-blur-3xl border-b border-white/10 py-3 shadow-2xl"
					: "bg-transparent py-5"
			}`}
		>
			<div className="mx-auto flex max-max-w-7xl items-center justify-between px-6 md:px-8">
				<div className="flex items-center gap-2">
					<Link to="/" className="flex items-center gap-3 group">
						<div className="w-10 h-10 rounded-2xl overflow-hidden border border-white/10 transition-all duration-500 group-hover:rounded-xl group-hover:scale-105 shadow-lg">
							<img
								src="/ph.jpg"
								alt="PH Performance"
								className="w-full h-full object-cover"
							/>
						</div>
						<span className="text-xl font-black uppercase italic tracking-tighter text-foreground sm:inline-block">
							PH{" "}
							<span className="text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.2)]">
								Performance
							</span>
						</span>
					</Link>
				</div>

				<nav className="hidden md:flex items-center gap-10 text-xs font-black uppercase tracking-widest text-muted-foreground/60">
					<Link
						to="/features"
						className="hover:text-primary transition-all hover:tracking-[0.15em]"
					>
						Features
					</Link>
					<Link
						to="/about"
						className="hover:text-primary transition-all hover:tracking-[0.15em]"
					>
						About
					</Link>
				</nav>

				<div className="flex items-center gap-4">
					<ThemeToggle />

					{isPending ? (
						<div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
					) : session?.user ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									className="relative h-10 w-10 rounded-full p-0 border border-white/10 hover:border-primary/40 transition-all active:scale-95 shadow-lg"
								>
									<Avatar className="h-9 w-9 border-none">
										<AvatarImage
											src={session.user.image || ""}
											alt={session.user.name || "User"}
										/>
										<AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black uppercase">
											{session.user.name
												?.split(" ")
												.map((n) => n[0])
												.join("") || "U"}
										</AvatarFallback>
									</Avatar>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-56 mt-2 bg-background/60 backdrop-blur-3xl border-white/10 rounded-2xl shadow-2xl"
								align="end"
								forceMount
							>
								<DropdownMenuLabel className="font-normal p-4">
									<div className="flex flex-col space-y-1">
										<p className="text-xs font-black uppercase tracking-widest leading-none">
											{session.user.name}
										</p>
										<p className="text-[10px] leading-none text-muted-foreground font-bold uppercase tracking-wider truncate">
											{session.user.email}
										</p>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator className="bg-white/5" />
								<div className="p-2">
									<DropdownMenuItem
										asChild
										className="rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary transition-all cursor-pointer gap-3"
									>
										<Link to="/portal/dashboard">
											<Layout weight="bold" size={16} />
											<span>Dashboard</span>
										</Link>
									</DropdownMenuItem>
									<DropdownMenuItem
										asChild
										className="rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary transition-all cursor-pointer gap-3"
									>
										<Link to="/portal/profile">
											<UserIcon weight="bold" size={16} />
											<span>Profile</span>
										</Link>
									</DropdownMenuItem>
								</div>
								<DropdownMenuSeparator className="bg-white/5" />
								<div className="p-2">
									<DropdownMenuItem
										onClick={handleSignOut}
										className="rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive transition-all cursor-pointer gap-3"
									>
										<SignOut weight="bold" size={16} />
										<span>Sign Out</span>
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
								className="hidden sm:flex font-black uppercase tracking-widest text-[10px] text-muted-foreground/50 hover:text-primary transition-all active:scale-[0.95]"
							>
								<Link to="/login">Log In</Link>
							</Button>
							<Button
								size="sm"
								className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase italic tracking-tighter px-6 rounded-2xl shadow-xl shadow-primary/10 transition-all hover:-translate-y-0.5 active:scale-[0.95]"
								asChild
							>
								<Link to="/onboarding/create-account">Get Started</Link>
							</Button>
						</>
					)}
				</div>
			</div>
		</header>
	);
}
