import { InstagramLogo } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

export default function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="mt-20 border-t border-border/40 bg-background py-12 px-4">
			<div className="mx-auto max-w-7xl">
				<div className="grid grid-cols-1 gap-12 sm:grid-cols-2">
					<div className="flex flex-col gap-4">
						<Link to="/" className="flex items-center gap-2 group">
							<div className="relative h-8 w-8 overflow-hidden rounded-lg border border-border shadow-sm">
								<img
									src="/ph.jpg"
									alt="PH Platform Logo"
									className="h-full w-full object-cover"
								/>
							</div>
							<span className="text-lg font-bold tracking-tight text-foreground">
								PH <span className="text-primary">Platform</span>
							</span>
						</Link>
						<p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
							Elite performance coaching for everyone—from youth athletes to
							adults. Join thousands of players building their future with us.
						</p>
						<div className="flex gap-4 mt-2">
							<a
								href="https://www.instagram.com/ph.perform"
								target="_blank"
								rel="noreferrer"
								className="text-muted-foreground hover:text-primary transition-colors"
								aria-label="Follow PH Platform on Instagram"
							>
								<InstagramLogo size={24} weight="regular" />
							</a>
						</div>
					</div>

					<div className="sm:ml-auto">
						<h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">
							Support
						</h3>
						<ul className="space-y-3">
							<li>
								<Link
									to="/about"
									className="text-sm text-muted-foreground hover:text-primary transition-colors"
								>
									About Us
								</Link>
							</li>
							<li>
								<Link
									to="/education-faq"
									className="text-sm text-muted-foreground hover:text-primary transition-colors"
								>
									Education & FAQ
								</Link>
							</li>
							<li>
								<Link
									to="/terms-privacy"
									className="text-sm text-muted-foreground hover:text-primary transition-colors"
								>
									Terms & Privacy
								</Link>
							</li>
						</ul>
					</div>
				</div>

				<div className="mt-16 pt-8 border-t border-border/40 flex flex-col items-center justify-between gap-4 sm:flex-row">
					<p className="text-xs text-muted-foreground">
						&copy; {year} PH Platform. All rights reserved.
					</p>
					<p className="text-xs text-muted-foreground">
						Made in{" "}
						<a
							href="http://clientreach.ai/"
							target="_blank"
							rel="noreferrer"
							className="font-medium text-foreground hover:text-primary transition-colors"
						>
							Client Reach AI
						</a>
					</p>
				</div>
			</div>
		</footer>
	);
}
