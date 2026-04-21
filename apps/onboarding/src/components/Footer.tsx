import {
	InstagramLogo,
	LinkedinLogo,
	TwitterLogo,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

export default function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="border-t border-white/10 bg-background/50 py-24 px-6 md:px-8 overflow-hidden relative">
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
			<div className="mx-auto max-w-7xl">
				<div className="grid grid-cols-1 gap-12 lg:grid-cols-4 md:grid-cols-2">
					<div className="flex flex-col gap-8 col-span-1 lg:col-span-2">
						<Link to="/" className="flex items-center gap-4 group">
							<div className="w-10 h-10 rounded-2xl overflow-hidden border border-white/10 transition-all duration-500 group-hover:border-primary/40 group-hover:scale-105 shadow-lg">
								<img
									src="/ph.jpg"
									alt="PH Performance"
									className="w-full h-full object-cover"
								/>
							</div>
							<span className="text-xl font-black uppercase italic tracking-tighter text-foreground">
								PH{" "}
								<span className="text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.2)]">
									Performance
								</span>
							</span>
						</Link>
						<p className="text-sm font-medium text-muted-foreground/60 leading-relaxed max-w-sm">
							Empowering elite athletes and teams with professional tracking,
							performance analytics, and specialized coaching tools.
						</p>
						<div className="flex gap-6">
							<a
								href="https://instagram.com"
								className="text-muted-foreground/40 hover:text-primary transition-all hover:scale-110 active:scale-90"
							>
								<InstagramLogo size={22} weight="fill" />
							</a>
							<a
								href="https://twitter.com"
								className="text-muted-foreground/40 hover:text-primary transition-all hover:scale-110 active:scale-90"
							>
								<TwitterLogo size={22} weight="fill" />
							</a>
							<a
								href="https://linkedin.com"
								className="text-muted-foreground/40 hover:text-primary transition-all hover:scale-110 active:scale-90"
							>
								<LinkedinLogo size={22} weight="fill" />
							</a>
						</div>
					</div>

					<div>
						<h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 mb-8">
							Platform
						</h3>
						<ul className="space-y-4">
							<li>
								<Link
									to="/features"
									className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-primary transition-all hover:translate-x-1 inline-block"
								>
									Features
								</Link>
							</li>
							<li>
								<Link
									to="/about"
									className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-primary transition-all hover:translate-x-1 inline-block"
								>
									About Us
								</Link>
							</li>
						</ul>
					</div>

					<div>
						<h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 mb-8">
							Legal
						</h3>
						<ul className="space-y-4">
							<li>
								<Link
									to="/terms-privacy"
									className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-primary transition-all hover:translate-x-1 inline-block"
								>
									Terms of Service
								</Link>
							</li>
							<li>
								<Link
									to="/terms-privacy"
									className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-primary transition-all hover:translate-x-1 inline-block"
								>
									Privacy Policy
								</Link>
							</li>
						</ul>
					</div>
				</div>

				<div className="mt-24 pt-10 border-t border-white/5 flex flex-col items-center justify-between gap-8 md:flex-row">
					<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">
						&copy; {year} PH Performance. All rights reserved.
					</p>
					<div className="flex items-center gap-8">
						<a
							href="https://clientreach.ai"
							target="_blank"
							rel="noreferrer"
							className="text-[10px] font-black text-muted-foreground/30 hover:text-primary transition-colors uppercase tracking-[0.2em]"
						>
							Built by Client Reach AI
						</a>
						<span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">
							Stay Elite
						</span>
					</div>
				</div>
			</div>
		</footer>
	);
}
