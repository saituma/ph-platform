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
	const platformLinks = portalCfg.footer.platformLinks.length
		? portalCfg.footer.platformLinks
		: [
			{ label: "Features", href: "/features" },
			{ label: "About", href: "/about" },
			{ label: "Gallery", href: "/gallery" },
		];
	const legalLinks = portalCfg.footer.legalLinks.length
		? portalCfg.footer.legalLinks
		: [
			{ label: "Terms", href: "/terms-privacy" },
			{ label: "Privacy", href: "/terms-privacy" },
		];
	const copyright = portalCfg.footer.copyright || `${year} ${portalCfg.footer.brand}`;

	return (
		<footer className="border-t border-foreground/[0.06] bg-background">
			<div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-7">
				<div className="flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
					<div className="flex items-center gap-4">
						<Link to="/" className="flex items-center gap-2 group">
							<div className="w-5 h-5 overflow-hidden">
								<img
									src="/ph.jpg"
									alt={portalCfg.footer.brand}
									className="w-full h-full object-cover"
								/>
							</div>
							<span className="select-none font-mono text-[11px] uppercase leading-none tracking-wider text-foreground/50 hover:text-foreground/80 transition-colors duration-150">
								{portalCfg.footer.brand}.
							</span>
						</Link>
						<span className="text-foreground/10 text-[10px]">|</span>
						<span className="font-mono text-[11px] text-foreground/35 tracking-wider">
							{copyright}
						</span>
					</div>

					<div className="flex items-center gap-1 flex-wrap">
						{platformLinks.map((link, i) => (
							<span key={`${link.label}-${link.href}`} className="flex items-center">
								<a
									href={link.href}
									className="font-mono text-[11px] text-foreground/50 hover:text-foreground/80 transition-colors duration-150 uppercase tracking-wider px-1.5"
								>
									{link.label}
								</a>
								{i < platformLinks.length - 1 && (
									<span className="text-foreground/10 text-[10px]">|</span>
								)}
							</span>
						))}
						<span className="text-foreground/10 text-[10px] mx-1">|</span>
						{legalLinks.map((link, i) => (
							<span key={`${link.label}-${link.href}`} className="flex items-center">
								<a
									href={link.href}
									className="font-mono text-[11px] text-foreground/50 hover:text-foreground/80 transition-colors duration-150 uppercase tracking-wider px-1.5"
								>
									{link.label}
								</a>
								{i < legalLinks.length - 1 && (
									<span className="text-foreground/10 text-[10px]">|</span>
								)}
							</span>
						))}
					</div>

					<div className="flex items-center gap-3">
						<a
							href="https://instagram.com"
							target="_blank"
							rel="noreferrer"
							className="flex items-center justify-center p-1 text-foreground/30 hover:text-foreground/60 transition-colors duration-150"
							aria-label="Instagram"
						>
							<InstagramLogo size={14} weight="fill" />
						</a>
						<a
							href="https://twitter.com"
							target="_blank"
							rel="noreferrer"
							className="flex items-center justify-center p-1 text-foreground/30 hover:text-foreground/60 transition-colors duration-150"
							aria-label="Twitter"
						>
							<TwitterLogo size={14} weight="fill" />
						</a>
						<a
							href="https://linkedin.com"
							target="_blank"
							rel="noreferrer"
							className="flex items-center justify-center p-1 text-foreground/30 hover:text-foreground/60 transition-colors duration-150"
							aria-label="LinkedIn"
						>
							<LinkedinLogo size={14} weight="fill" />
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}
