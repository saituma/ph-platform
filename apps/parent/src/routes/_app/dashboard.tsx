import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Activity, Calendar, TrendingUp, ArrowRight } from "lucide-react";
import { api } from "#/lib/api-client";
import { queryKeys } from "#/lib/query-keys";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_app/dashboard")({
	component: DashboardPage,
});

type Child = {
	id: string;
	name: string;
	age: number | null;
	athleteType: string;
	team?: { name: string } | null;
	currentProgramTier?: string | null;
};

type Guardian = {
	id: string;
	children: Child[];
};

function DashboardPage() {
	const navigate = useNavigate();

	const { data: guardian, isLoading } = useQuery<Guardian>({
		queryKey: queryKeys.children,
		queryFn: () => api.get<Guardian>("/api/portal/guardian/children"),
	});

	const children = guardian?.children ?? [];

	return (
		<div className="p-6 max-w-5xl mx-auto space-y-8">
			{/* Page heading */}
			<div className="space-y-1">
				<p className="label-mono">Overview</p>
				<h1 className="text-2xl font-black uppercase tracking-tight text-foreground">Dashboard</h1>
				<p className="text-muted-foreground text-sm">Your children's athletic journey at a glance</p>
			</div>

			{/* Stats row */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
				{[
					{ label: "Children",       value: children.length,                                         icon: Users,       accent: "text-foreground" },
					{ label: "Active Programs", value: children.filter((c) => c.currentProgramTier).length,    icon: Activity,    accent: "text-primary" },
					{ label: "Teams",           value: children.filter((c) => c.team).length,                  icon: Calendar,    accent: "text-foreground" },
					{ label: "Youth Athletes",  value: children.filter((c) => c.athleteType === "youth").length, icon: TrendingUp, accent: "text-foreground" },
				].map(({ label, value, icon: Icon, accent }) => (
					<div key={label} className="bento-card p-4">
						<div className="flex items-center justify-between mb-3">
							<span className="label-mono">{label}</span>
							<Icon size={14} className={accent} />
						</div>
						<div className="text-3xl font-black text-foreground">{isLoading ? "—" : value}</div>
					</div>
				))}
			</div>

			{/* Children section */}
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="label-mono">My children</h2>
					<button
						type="button"
						onClick={() => navigate({ to: "/children" })}
						className="flex items-center gap-1 text-xs text-primary hover:underline font-mono uppercase tracking-wider"
					>
						View all <ArrowRight size={11} />
					</button>
				</div>

				{isLoading ? (
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{[1, 2].map((i) => (
							<div key={i} className="bento-card p-5 animate-pulse">
								<div className="h-4 bg-muted w-2/3 mb-2" />
								<div className="h-3 bg-muted w-1/2" />
							</div>
						))}
					</div>
				) : children.length === 0 ? (
					<div className="border border-dashed border-border p-10 text-center">
						<Users size={32} className="mx-auto text-muted-foreground/30 mb-3" />
						<p className="text-sm font-bold text-foreground uppercase tracking-wide mb-1">No children added</p>
						<p className="text-xs text-muted-foreground mb-5 font-mono">
							Add your child to start tracking their progress
						</p>
						<button
							type="button"
							onClick={() => navigate({ to: "/children/add" })}
							className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
						>
							Add child
						</button>
					</div>
				) : (
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{children.map((child) => (
							<button
								key={child.id}
								type="button"
								onClick={() => navigate({ to: "/children/$athleteId", params: { athleteId: child.id } })}
								className="bento-card p-5 text-left group"
							>
								<div className="flex items-center gap-3 mb-3">
									<div className="w-9 h-9 bg-primary/10 flex items-center justify-center flex-shrink-0">
										<span className="text-primary font-black text-sm">{child.name.charAt(0)}</span>
									</div>
									<div className="flex-1 min-w-0">
										<div className="font-bold text-sm text-foreground truncate">{child.name}</div>
										{child.age && <div className="text-xs text-muted-foreground font-mono">Age {child.age}</div>}
									</div>
									<ArrowRight size={14} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
								</div>
								<div className="flex flex-wrap gap-1.5">
									<span className={cn(
										"px-2 py-0.5 text-xs font-mono uppercase tracking-wide border",
										child.athleteType === "youth"
											? "bg-primary/5 text-primary border-primary/20"
											: "bg-muted text-muted-foreground border-border",
									)}>
										{child.athleteType}
									</span>
									{child.team && (
										<span className="px-2 py-0.5 text-xs font-mono border border-border bg-muted text-muted-foreground">
											{child.team.name}
										</span>
									)}
									{child.currentProgramTier && (
										<span className="px-2 py-0.5 text-xs font-mono bg-primary/5 text-primary border border-primary/20">
											{child.currentProgramTier}
										</span>
									)}
								</div>
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
