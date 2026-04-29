import {
	InstagramLogo,
	LinkedinLogo,
	TwitterLogo,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { usePortalConfig } from "../hooks/usePortalConfig";

export default function Footer() {
	const portalCfg = usePortalConfig();
	const year = new Date().getFullYear();
	const tagline = portalCfg.footer.tagline ||
		"Empowering elite athletes and teams with professional tracking, performance analytics, and specialized coaching tools.";
	const platformLinks = portalCfg.footer.platformLinks.length
		? portalCfg.footer.platformLinks
		: [
			{ label: "Features", href: "/features" },
			{ label: "About Us", href: "/about" },
		];
	const legalLinks = portalCfg.footer.legalLinks.length
		? portalCfg.footer.legalLinks
		: [
			{ label: "Terms of Service", href: "/terms-privacy" },
			{ label: "Privacy Policy", href: "/terms-privacy" },
		];
	const copyright = portalCfg.footer.copyright || `© ${year} PH Performance. All rights reserved.`;

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
									alt={portalCfg.footer.brand}
									className="w-full h-full object-cover"
								/>
							</div>
							<span
								className="font-black uppercase tracking-widest text-foreground group-hover:text-primary transition-colors"
								style={{ fontFamily: "var(--font-display)", fontSize: "1rem", letterSpacing: "0.12em", transitionDuration: "var(--duration-micro)" }}
							>
								{portalCfg.footer.brand}
							</span>
						</Link>
						<p className="text-sm text-muted-foreground/60 leading-relaxed max-w-sm">
							{tagline}
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
							{platformLinks.map((link) => (
								<li key={`${link.label}-${link.href}`}>
									<a
										href={link.href}
										className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-primary transition-all hover:translate-x-1 inline-block"
										style={{ transitionDuration: "var(--duration-micro)" }}
									>
										{link.label}
									</a>
								</li>
							))}
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
							{legalLinks.map((link) => (
								<li key={`${link.label}-${link.href}`}>
									<a
										href={link.href}
										className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-primary transition-all hover:translate-x-1 inline-block"
										style={{ transitionDuration: "var(--duration-micro)" }}
									>
										{link.label}
									</a>
								</li>
							))}
						</ul>
					</div>
				</div>

				<div className="mt-24 pt-10 border-t border-border/40 flex flex-col items-center justify-between gap-8 md:flex-row">
					<p
						className="font-black uppercase text-muted-foreground/30"
						style={{ fontSize: "0.6rem", letterSpacing: "0.2em" }}
					>
						{copyright}
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
