import {
	InstagramLogo,
	LinkedinLogo,
	TwitterLogo,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

export default function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="border-t border-border/40 bg-background py-24 px-6 md:px-8 overflow-hidden relative">
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
			<div className="mx-auto max-w-7xl">
				<div className="grid grid-cols-1 gap-12 lg:grid-cols-4 md:grid-cols-2">
					<div className="flex flex-col gap-8 col-span-1 lg:col-span-2">
						<Link to="/" className="flex items-center gap-4 group">
							<div className="w-10 h-10 overflow-hidden ring-1 ring-primary/20 group-hover:ring-primary/50 transition-all duration-300">
								<img
									src="/ph.jpg"
									alt="PH Performance"
									className="w-full h-full object-cover"
								/>
							</div>
							<span
								className="font-black uppercase tracking-widest text-foreground group-hover:text-primary transition-colors"
								style={{ fontFamily: "var(--font-display)", fontSize: "1rem", letterSpacing: "0.12em", transitionDuration: "var(--duration-micro)" }}
							>
								PH <span className="text-primary">Performance</span>
							</span>
						</Link>
						<p className="text-sm text-muted-foreground/60 leading-relaxed max-w-sm">
							Empowering elite athletes and teams with professional tracking,
							performance analytics, and specialized coaching tools.
						</p>
						<div className="flex gap-5">
							<a
								href="https://instagram.com"
								className="text-muted-foreground/40 hover:text-primary transition-all hover:scale-110 active:scale-90"
								style={{ transitionDuration: "var(--duration-micro)" }}
							>
								<InstagramLogo size={24} weight="fill" />
							</a>
							<a
								href="https://twitter.com"
								className="text-muted-foreground/40 hover:text-primary transition-all hover:scale-110 active:scale-90"
								style={{ transitionDuration: "var(--duration-micro)" }}
							>
								<TwitterLogo size={24} weight="fill" />
							</a>
							<a
								href="https://linkedin.com"
								className="text-muted-foreground/40 hover:text-primary transition-all hover:scale-110 active:scale-90"
								style={{ transitionDuration: "var(--duration-micro)" }}
							>
								<LinkedinLogo size={24} weight="fill" />
							</a>
						</div>
					</div>

					<div>
						<h3
							className="font-black uppercase text-foreground/40 mb-8"
							style={{ fontSize: "0.6rem", letterSpacing: "0.2em" }}
						>
							Platform
						</h3>
						<ul className="space-y-4">
							<li>
								<Link
									to="/features"
									className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-primary transition-all hover:translate-x-1 inline-block"
									style={{ transitionDuration: "var(--duration-micro)" }}
								>
									Features
								</Link>
							</li>
							<li>
								<Link
									to="/about"
									className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-primary transition-all hover:translate-x-1 inline-block"
									style={{ transitionDuration: "var(--duration-micro)" }}
								>
									About Us
								</Link>
							</li>
						</ul>
					</div>

					<div>
						<h3
							className="font-black uppercase text-foreground/40 mb-8"
							style={{ fontSize: "0.6rem", letterSpacing: "0.2em" }}
						>
							Legal
						</h3>
						<ul className="space-y-4">
							<li>
								<Link
									to="/terms-privacy"
									className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-primary transition-all hover:translate-x-1 inline-block"
									style={{ transitionDuration: "var(--duration-micro)" }}
								>
									Terms of Service
								</Link>
							</li>
							<li>
								<Link
									to="/terms-privacy"
									className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-primary transition-all hover:translate-x-1 inline-block"
									style={{ transitionDuration: "var(--duration-micro)" }}
								>
									Privacy Policy
								</Link>
							</li>
						</ul>
					</div>
				</div>

				<div className="mt-24 pt-10 border-t border-border/40 flex flex-col items-center justify-between gap-8 md:flex-row">
					<p
						className="font-black uppercase text-muted-foreground/30"
						style={{ fontSize: "0.6rem", letterSpacing: "0.2em" }}
					>
						&copy; {year} PH Performance. All rights reserved.
					</p>
					<div className="flex items-center gap-8">
						<a
							href="https://clientreach.ai"
							target="_blank"
							rel="noreferrer"
							className="font-black text-muted-foreground/30 hover:text-primary transition-colors uppercase"
							style={{ fontSize: "0.6rem", letterSpacing: "0.2em", transitionDuration: "var(--duration-micro)" }}
						>
							Built by Client Reach AI
						</a>
						<span
							className="font-black uppercase text-primary/50 border-l-2 border-primary/40 pl-3 animate-pulse"
							style={{ fontSize: "0.6rem", letterSpacing: "0.25em" }}
						>
							Stay Elite
						</span>
					</div>
				</div>
			</div>
		</footer>
	);
}
