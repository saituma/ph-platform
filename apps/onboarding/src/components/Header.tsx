import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { Button } from "./ui/button";

export default function Header() {
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const handleScroll = () => setScrolled(window.scrollY > 10);
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<header
			className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
				scrolled
					? "bg-background/40 backdrop-blur-3xl border-b border-white/10 py-3 shadow-2xl"
					: "bg-transparent py-5"
			}`}
		>
			<div className="mx-auto flex max-w-7xl items-center justify-between px-6 md:px-8">
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
				</div>
			</div>
		</header>
	);
}
