import { Link } from "@tanstack/react-router";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
	return (
		<header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
				<div className="flex items-center gap-2">
					<Link to="/" className="flex items-center gap-2 group">
						<div className="relative h-9 w-9 overflow-hidden rounded-lg border border-border shadow-sm transition-transform group-hover:scale-105">
							<img
								src="/ph.jpg"
								alt="PH Platform Logo"
								className="h-full w-full object-cover"
							/>
						</div>
						<span className="text-xl font-bold tracking-tight text-foreground sm:inline-block">
							PH <span className="text-primary">Platform</span>
						</span>
					</Link>
				</div>
				<div className="flex items-center gap-4">
					<ThemeToggle />
				</div>
			</div>
		</header>
	);
}
