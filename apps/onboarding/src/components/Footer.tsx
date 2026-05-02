import { Instagram, Twitter } from "lucide-react";
import { Link } from "@tanstack/react-router";

export default function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="bg-[#0a0a0a] border-t border-white/5">
			<div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
				<div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
					{/* Logo + copyright */}
					<div className="flex items-center gap-3">
						<Link to="/" className="flex items-center gap-2">
							<img
								src="/ph.jpg"
								alt=""
								aria-hidden="true"
								className="w-5 h-5 rounded object-cover"
							/>
							<span className="text-white/50 text-[11px] tracking-[0.18em] uppercase hover:text-white/80 transition-colors">
								PH PERFORMANCE
							</span>
						</Link>
						<span className="text-white/10 text-[10px]">|</span>
						<span className="text-[11px] text-white/30 tracking-wider">
							{year} PH Performance
						</span>
					</div>

					{/* Links */}
					<div className="flex items-center gap-1 flex-wrap">
						{[
							{ label: "Features", href: "/features" },
							{ label: "About", href: "/about" },
							{ label: "Gallery", href: "/gallery" },
						].map((link, i, arr) => (
							<span key={link.label} className="flex items-center">
								<Link
									to={link.href}
									className="text-[11px] text-white/40 hover:text-white/70 transition-colors uppercase tracking-[0.14em] px-1.5"
								>
									{link.label}
								</Link>
								{i < arr.length - 1 && (
									<span className="text-white/10 text-[10px]">|</span>
								)}
							</span>
						))}
						<span className="text-white/10 text-[10px] mx-1">|</span>
						{[
							{ label: "Terms", href: "/terms-privacy" },
							{ label: "Privacy", href: "/terms-privacy" },
						].map((link, i, arr) => (
							<span key={link.label} className="flex items-center">
								<Link
									to={link.href}
									className="text-[11px] text-white/40 hover:text-white/70 transition-colors uppercase tracking-[0.14em] px-1.5"
								>
									{link.label}
								</Link>
								{i < arr.length - 1 && (
									<span className="text-white/10 text-[10px]">|</span>
								)}
							</span>
						))}
					</div>

					{/* Social */}
					<div className="flex items-center gap-3">
						<a
							href="https://instagram.com"
							target="_blank"
							rel="noreferrer"
							className="text-white/25 hover:text-white/50 transition-colors"
							aria-label="Instagram"
						>
							<Instagram size={14} />
						</a>
						<a
							href="https://twitter.com"
							target="_blank"
							rel="noreferrer"
							className="text-white/25 hover:text-white/50 transition-colors"
							aria-label="Twitter"
						>
							<Twitter size={14} />
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}
