import { Link, useRouter } from "@tanstack/react-router";
import {
	CalendarCheck,
	Dumbbell,
	House,
	Menu,
	MessageCircle,
	Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
	children: React.ReactNode;
}

interface NavItem {
	label: string;
	path: string;
	icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
	{ label: "Dashboard", path: "/portal/dashboard", icon: House },
	{ label: "Programs", path: "/portal/programs", icon: Dumbbell },
	{ label: "Schedule", path: "/portal/schedule", icon: CalendarCheck },
	{ label: "Tracking", path: "/portal/tracking", icon: Users },
	{ label: "Messages", path: "/portal/messages", icon: MessageCircle },
	{ label: "More", path: "/portal/more", icon: Menu },
];

export function BottomNav({ children }: BottomNavProps) {
	const router = useRouter();
	const [currentPath, setCurrentPath] = useState(
		router.state.location.pathname,
	);

	useEffect(() => {
		setCurrentPath(router.state.location.pathname);
	}, [router.state.location.pathname]);

	const isActive = (path: string) => {
		if (path === "/portal/dashboard") {
			return (
				currentPath === "/portal/dashboard" ||
				currentPath === "/portal" ||
				currentPath === "/"
			);
		}
		return currentPath.startsWith(path.split("?")[0]);
	};

	return (
		<div className="min-h-screen">
			{/* Desktop icon rail */}
			<nav className="hidden md:flex fixed inset-y-0 left-0 z-50 w-20 flex-col items-center gap-3 border-r border-border bg-card/95 backdrop-blur px-3 py-6">
				<div className="flex flex-1 flex-col items-center gap-3">
					{navItems.map((item) => {
						const Icon = item.icon;
						const active = isActive(item.path);

						return (
							<Link
								key={item.path}
								to={item.path}
								activeOptions={{ exact: false }}
								title={item.label}
								className={cn(
									"flex h-12 w-12 items-center justify-center rounded-2xl transition-colors",
									active
										? "bg-primary text-primary-foreground shadow-sm"
										: "text-muted-foreground hover:bg-muted hover:text-foreground",
								)}
							>
								<Icon className={cn("h-5 w-5", active ? "fill-current" : "")} />
								<span className="sr-only">{item.label}</span>
							</Link>
						);
					})}
				</div>
			</nav>

			<div className="min-h-screen md:pl-20">
				<div className="min-h-screen overflow-y-auto pb-20 md:pb-0">
					{children}
				</div>
			</div>

			{/* Mobile bottom bar */}
			<nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
				<div className="mx-auto max-w-4xl">
					<div className="flex items-center justify-around border-t border-border bg-card/95 backdrop-blur">
						{navItems.map((item) => {
							const Icon = item.icon;
							const active = isActive(item.path);

							return (
								<Link
									key={item.path}
									to={item.path}
									activeOptions={{ exact: false }}
									className={cn(
										"flex h-16 flex-col items-center justify-center px-3 py-2 transition-colors",
										active
											? "text-primary"
											: "text-muted-foreground hover:text-primary/80",
									)}
								>
									<Icon
										className={cn("mb-1 h-5 w-5", active ? "fill-primary" : "")}
									/>
									<span className="text-xs font-medium tracking-wide">
										{item.label}
									</span>
								</Link>
							);
						})}
					</div>
				</div>
			</nav>
		</div>
	);
}
