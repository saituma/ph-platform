import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
	LayoutDashboard,
	Users,
	CreditCard,
	MessageSquare,
	User,
	LogOut,
	Menu,
	X,
	ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "#/lib/api-client";
import { clearAuthToken, getTokenStatus } from "#/lib/client-storage";
import { queryKeys } from "#/lib/query-keys";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_app")({
	beforeLoad: async () => {
		const status = await getTokenStatus();
		if (!status.authenticated) throw redirect({ to: "/login" });
		const onboardingDone = typeof window !== "undefined" && localStorage.getItem("ph_parent_onboarding_done");
		if (!onboardingDone) throw redirect({ to: "/onboarding/step-1" });
	},
	component: AppLayout,
});

type Me = {
	id: string;
	name: string;
	email: string;
	role: string;
	guardian?: { id: string; relationToAthlete: string | null };
};

const navItems = [
	{ to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
	{ to: "/children", icon: Users, label: "My Children" },
	{ to: "/billing", icon: CreditCard, label: "Billing" },
	{ to: "/messages", icon: MessageSquare, label: "Messages" },
	{ to: "/profile", icon: User, label: "Profile" },
];

function AppLayout() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const pathname = window.location.pathname;

	const { data: me } = useQuery<Me>({
		queryKey: queryKeys.me,
		queryFn: () => api.get<Me>("/api/portal/me"),
		staleTime: 1000 * 60 * 10,
	});

	const handleLogout = async () => {
		await clearAuthToken();
		queryClient.clear();
		toast.success("Signed out");
		navigate({ to: "/login", replace: true });
	};

	return (
		<div className="flex h-screen bg-background overflow-hidden">
			{/* Mobile overlay */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 bg-black/40 z-20 lg:hidden"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			{/* Sidebar */}
			<aside
				className={cn(
					"fixed inset-y-0 left-0 z-30 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200",
					"lg:relative lg:translate-x-0",
					sidebarOpen ? "translate-x-0" : "-translate-x-full",
				)}
			>
				{/* Logo */}
				<div className="flex items-center justify-between h-14 px-5 border-b border-sidebar-border flex-shrink-0">
					<div className="flex items-center gap-2">
						<div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
							<span className="text-primary-foreground font-bold text-xs">PH</span>
						</div>
						<span className="font-semibold text-sidebar-foreground text-sm">Parent Portal</span>
					</div>
					<button
						type="button"
						onClick={() => setSidebarOpen(false)}
						className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
					>
						<X size={18} />
					</button>
				</div>

				{/* Navigation */}
				<nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
					{navItems.map(({ to, icon: Icon, label }) => {
						const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
						return (
							<a
								key={to}
								href={to}
								onClick={(e) => {
									e.preventDefault();
									navigate({ to });
									setSidebarOpen(false);
								}}
								className={cn(
									"flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
									active
										? "bg-sidebar-primary text-sidebar-primary-foreground"
										: "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
								)}
							>
								<Icon size={16} />
								{label}
								{active && <ChevronRight size={14} className="ml-auto opacity-60" />}
							</a>
						);
					})}
				</nav>

				{/* User footer */}
				<div className="px-3 py-3 border-t border-sidebar-border flex-shrink-0">
					<div className="flex items-center gap-3 px-3 py-2 rounded-lg">
						<div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
							<span className="text-primary text-xs font-bold">
								{me?.name?.charAt(0)?.toUpperCase() ?? "P"}
							</span>
						</div>
						<div className="flex-1 min-w-0">
							<div className="text-xs font-medium text-sidebar-foreground truncate">{me?.name ?? "Parent"}</div>
							<div className="text-xs text-sidebar-foreground/50 truncate">{me?.email ?? ""}</div>
						</div>
						<button
							type="button"
							onClick={handleLogout}
							title="Sign out"
							className="text-sidebar-foreground/50 hover:text-destructive transition-colors"
						>
							<LogOut size={15} />
						</button>
					</div>
				</div>
			</aside>

			{/* Main content */}
			<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
				{/* Mobile topbar */}
				<header className="lg:hidden flex items-center h-14 px-4 border-b border-border flex-shrink-0">
					<button
						type="button"
						onClick={() => setSidebarOpen(true)}
						className="text-foreground/70 hover:text-foreground mr-3"
					>
						<Menu size={20} />
					</button>
					<span className="font-semibold text-sm">PH Parent Portal</span>
				</header>

				<main className="flex-1 overflow-y-auto">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
